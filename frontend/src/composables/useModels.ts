import { useChatStore } from '@/stores/chat';
import type {
  WebSocketMessage,
  ModelInfo,
  HuggingFaceModel,
  DownloadProgress,
} from '@/types';

export function useModels(
  send: (message: WebSocketMessage) => void,
  on: (type: string, handler: (payload: unknown) => void) => () => void
) {
  const store = useChatStore();

  function setupHandlers(): () => void {
    const cleanups: (() => void)[] = [];

    cleanups.push(
      on('models_list', (payload) => {
        const { models } = payload as { models: ModelInfo[] };
        store.setModels(models);
      })
    );

    cleanups.push(
      on('model_loaded', (payload) => {
        const { modelId, models } = payload as {
          modelId: string;
          models: ModelInfo[];
        };
        store.setModels(models);
        store.setCurrentModel(modelId);
        store.setLoading(false);
      })
    );

    cleanups.push(
      on('model_unloaded', (payload) => {
        const { models } = payload as { models: ModelInfo[] };
        store.setModels(models);
        store.setCurrentModel(null);
        store.setLoading(false);
      })
    );

    cleanups.push(
      on('search_results', (payload) => {
        const { results } = payload as { results: HuggingFaceModel[] };
        store.setSearchResults(results);
        store.setSearching(false);
      })
    );

    cleanups.push(
      on('download_progress', (payload) => {
        const progress = payload as DownloadProgress;
        const downloadId = `${progress.modelId}/${progress.fileName}`;
        store.setDownloadProgress(downloadId, progress);
      })
    );

    cleanups.push(
      on('download_complete', (payload) => {
        const { downloadId, models } = payload as {
          downloadId: string;
          models: ModelInfo[];
        };
        store.removeDownload(downloadId);
        store.setModels(models);
      })
    );

    cleanups.push(
      on('download_error', (payload) => {
        const { downloadId, error } = payload as {
          downloadId: string;
          error: string;
        };
        store.removeDownload(downloadId);
        store.setError(`Download failed: ${error}`);
      })
    );

    cleanups.push(
      on('error', (payload) => {
        const { error } = payload as { error: string };
        store.setError(error);
        store.setLoading(false);
        store.setSearching(false);
      })
    );

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }

  function listModels(): void {
    send({ type: 'list_models' });
  }

  function loadModel(modelId: string, gpuLayers?: number): void {
    store.setLoading(true);
    store.setError(null);
    send({
      type: 'load_model',
      payload: { modelId, gpuLayers },
    });
  }

  function unloadModel(): void {
    store.setLoading(true);
    send({ type: 'unload_model' });
  }

  function searchModels(query?: string, limit = 20): void {
    store.setSearching(true);
    store.setError(null);
    send({
      type: query ? 'search_models' : 'get_popular_models',
      payload: { query, limit },
    });
  }

  function downloadModel(repoId: string, fileName: string): void {
    const downloadId = `${repoId}/${fileName}`;

    if (store.activeDownloads.has(downloadId)) {
      return;
    }

    send({
      type: 'download_model',
      payload: { repoId, fileName },
    });
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  function formatSpeed(bytesPerSecond: number): string {
    return `${formatBytes(bytesPerSecond)}/s`;
  }

  function formatEta(seconds: number): string {
    if (seconds <= 0 || !isFinite(seconds)) return '--:--';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  return {
    setupHandlers,
    listModels,
    loadModel,
    unloadModel,
    searchModels,
    downloadModel,
    formatBytes,
    formatSpeed,
    formatEta,
  };
}
