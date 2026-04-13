import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import { inferenceEngine } from './inference.js';
import { listLocalModels, getModelInfo } from './models.js';
import { searchModels, downloadModel } from './download.js';
import { getProvider, isCloudProvider } from './providers/index.js';
import { checkResourcesForModelLoad } from './resources.js';
import type {
  WebSocketMessage,
  ChatRequest,
  LoadModelRequest,
  DownloadModelRequest,
  SearchModelsRequest,
  ListCloudModelsRequest,
  ValidateApiKeyRequest,
  ModelInfo,
  ProviderType,
} from './types.js';

const PORT = parseInt(process.env.PORT ?? '8080', 10);

const wss = new WebSocketServer({ port: PORT });

const activeDownloads = new Map<string, AbortController>();
let loadedModelId: string | null = null;

function send(ws: WebSocket, message: WebSocketMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function broadcast(message: WebSocketMessage): void {
  wss.clients.forEach((client) => {
    send(client, message);
  });
}

function sendError(ws: WebSocket, id: string, error: string): void {
  send(ws, { type: 'error', id, payload: { error } });
}

function sendChatError(ws: WebSocket, id: string, error: string): void {
  send(ws, { type: 'chat_error', id, payload: { error } });
}

async function handleChat(
  ws: WebSocket,
  requestId: string,
  payload: ChatRequest
): Promise<void> {
  try {
    const provider = payload.provider ?? 'local';

    const options = {
      temperature: payload.temperature ?? 0.7,
      maxTokens: payload.maxTokens ?? 2048,
      topP: payload.topP ?? 0.9,
    };

    const lastMessage = payload.messages[payload.messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') {
      sendChatError(ws, requestId, 'Last message must be from user');
      return;
    }

    if (isCloudProvider(provider)) {
      // Cloud provider chat
      const cloudProvider = getProvider(provider);
      if (!cloudProvider) {
        sendChatError(ws, requestId, `Unknown provider: ${provider}`);
        return;
      }

      if (!payload.apiKey) {
        sendChatError(ws, requestId, 'API key required for cloud provider');
        return;
      }

      for await (const token of cloudProvider.streamChat(
        payload.messages,
        payload.modelId,
        payload.apiKey,
        options
      )) {
        send(ws, {
          type: 'chat_token',
          id: requestId,
          payload: { token },
        });
      }
    } else {
      // Local model chat
      if (!inferenceEngine.isModelLoaded()) {
        sendChatError(ws, requestId, 'No model loaded');
        return;
      }

      for await (const token of inferenceEngine.streamChat(
        lastMessage.content,
        options
      )) {
        send(ws, {
          type: 'chat_token',
          id: requestId,
          payload: { token },
        });
      }
    }

    send(ws, { type: 'chat_complete', id: requestId });
  } catch (error) {
    sendChatError(ws, requestId, (error as Error).message);
  }
}

async function handleLoadModel(
  ws: WebSocket,
  requestId: string,
  payload: LoadModelRequest
): Promise<void> {
  try {
    const modelInfo = await getModelInfo(payload.modelId);
    if (!modelInfo) {
      sendError(ws, requestId, `Model not found: ${payload.modelId}`);
      return;
    }

    const resourceCheck = await checkResourcesForModelLoad(modelInfo);
    if (!resourceCheck.success) {
      sendError(ws, requestId, resourceCheck.error!);
      return;
    }

    await inferenceEngine.loadModel(modelInfo.path, payload.gpuLayers);
    loadedModelId = payload.modelId;

    const models = await getModelsWithStatus();
    broadcast({ type: 'model_loaded', id: requestId, payload: { modelId: payload.modelId, models } });
  } catch (error) {
    sendError(ws, requestId, (error as Error).message);
  }
}

async function handleUnloadModel(ws: WebSocket, requestId: string): Promise<void> {
  try {
    await inferenceEngine.unloadModel();
    loadedModelId = null;
    const models = await getModelsWithStatus();
    broadcast({ type: 'model_unloaded', id: requestId, payload: { models } });
  } catch (error) {
    sendError(ws, requestId, (error as Error).message);
  }
}

async function handleListModels(ws: WebSocket, requestId: string): Promise<void> {
  const models = await getModelsWithStatus();
  send(ws, { type: 'models_list', id: requestId, payload: { models } });
}

async function getModelsWithStatus(): Promise<ModelInfo[]> {
  const models = await listLocalModels();
  return models.map((m) => ({
    ...m,
    loaded: m.id === loadedModelId,
  }));
}

async function handleSearchModels(ws: WebSocket, requestId: string, payload: SearchModelsRequest): Promise<void> {
  try {
    const results = await searchModels(payload.query, payload.limit);
    send(ws, { type: 'search_results', id: requestId, payload: { results } });
  } catch (error) {
    sendError(ws, requestId, (error as Error).message);
  }
}

async function handleListCloudModels(ws: WebSocket, requestId: string, payload: ListCloudModelsRequest): Promise<void> {
  const provider = getProvider(payload.provider);
  if (!provider) {
    sendError(ws, requestId, `Unknown provider: ${payload.provider}`);
    return;
  }
  const models = provider.listModels();
  send(ws, { type: 'cloud_models_list', id: requestId, payload: { provider: payload.provider, models } });
}

async function handleValidateApiKey(ws: WebSocket, requestId: string, payload: ValidateApiKeyRequest): Promise<void> {
  const provider = getProvider(payload.provider);
  if (!provider) {
    sendError(ws, requestId, `Unknown provider: ${payload.provider}`);
    return;
  }
  try {
    const valid = await provider.validateApiKey(payload.apiKey);
    send(ws, { type: 'api_key_valid', id: requestId, payload: { provider: payload.provider, valid } });
  } catch (error) {
    send(ws, { type: 'api_key_valid', id: requestId, payload: { provider: payload.provider, valid: false, error: (error as Error).message } });
  }
}

async function handleDownloadModel(ws: WebSocket, requestId: string, payload: DownloadModelRequest): Promise<void> {
  const downloadId = `${payload.repoId}/${payload.fileName}`;

  if (activeDownloads.has(downloadId)) {
    sendError(ws, requestId, 'Download already in progress');
    return;
  }

  const abortController = new AbortController();
  activeDownloads.set(downloadId, abortController);

  try {
    await downloadModel(payload.repoId, payload.fileName, (progress) => {
      broadcast({ type: 'download_progress', id: requestId, payload: progress });
    }, abortController.signal);

    activeDownloads.delete(downloadId);
    const models = await getModelsWithStatus();
    broadcast({ type: 'download_complete', id: requestId, payload: { downloadId, models } });
  } catch (error) {
    activeDownloads.delete(downloadId);
    send(ws, { type: 'download_error', id: requestId, payload: { error: (error as Error).message, downloadId } });
  }
}

function handleMessage(ws: WebSocket, data: string): void {
  let message: WebSocketMessage;

  try {
    message = JSON.parse(data) as WebSocketMessage;
  } catch {
    send(ws, { type: 'error', payload: { error: 'Invalid JSON' } });
    return;
  }

  const requestId = message.id ?? randomUUID();

  switch (message.type) {
    case 'chat':
      handleChat(ws, requestId, message.payload as ChatRequest);
      break;
    case 'load_model':
      handleLoadModel(ws, requestId, message.payload as LoadModelRequest);
      break;
    case 'unload_model':
      handleUnloadModel(ws, requestId);
      break;
    case 'list_models':
      handleListModels(ws, requestId);
      break;
    case 'search_models':
    case 'get_popular_models':
      handleSearchModels(ws, requestId, (message.payload as SearchModelsRequest) ?? { limit: 10 });
      break;
    case 'download_model':
      handleDownloadModel(
        ws,
        requestId,
        message.payload as DownloadModelRequest
      );
      break;
    case 'list_cloud_models':
      handleListCloudModels(ws, requestId, message.payload as ListCloudModelsRequest);
      break;
    case 'validate_api_key':
      handleValidateApiKey(ws, requestId, message.payload as ValidateApiKeyRequest);
      break;
    default:
      sendError(ws, requestId, `Unknown message type: ${message.type}`);
  }
}

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (data) => {
    handleMessage(ws, data.toString());
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  handleListModels(ws, 'initial');
});

wss.on('listening', () => {
  console.log(`WebSocket server listening on port ${PORT}`);
});

process.on('SIGINT', async () => {
  console.log('Shutting down...');

  for (const [, controller] of activeDownloads) {
    controller.abort();
  }

  await inferenceEngine.unloadModel();

  wss.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  console.log('Terminating...');
  await inferenceEngine.unloadModel();
  wss.close(() => {
    process.exit(0);
  });
});
