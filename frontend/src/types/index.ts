export type ProviderType = 'local' | 'claude' | 'openai' | 'mistral';
export type ThemeId =
  | 'midnight-blue'
  | 'forest-night'
  | 'ember-dark'
  | 'graphite'
  | 'aurora-dark'
  | 'paper-sky'
  | 'sand-light'
  | 'mint-light'
  | 'rose-light'
  | 'slate-light';

export interface ModelInfo {
  id: string;
  name: string;
  path: string;
  size: number;
  quantization: string;
  contextLength: number;
  loaded: boolean;
}

export interface CloudModelInfo {
  id: string;
  name: string;
  provider: ProviderType;
  contextLength: number;
  description?: string;
}

export interface ProviderConfig {
  id: ProviderType;
  name: string;
  apiKeyHelpUrl: string;
  apiKeyPlaceholder: string;
}

export const PROVIDERS: ProviderConfig[] = [
  {
    id: 'local',
    name: 'Local',
    apiKeyHelpUrl: '',
    apiKeyPlaceholder: '',
  },
  {
    id: 'claude',
    name: 'Claude',
    apiKeyHelpUrl: 'https://console.anthropic.com/settings/keys',
    apiKeyPlaceholder: 'sk-ant-...',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    apiKeyHelpUrl: 'https://platform.openai.com/api-keys',
    apiKeyPlaceholder: 'sk-...',
  },
  {
    id: 'mistral',
    name: 'Mistral',
    apiKeyHelpUrl: 'https://console.mistral.ai/api-keys/',
    apiKeyPlaceholder: '',
  },
];

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  streaming?: boolean;
}

export interface DownloadProgress {
  modelId: string;
  fileName: string;
  downloaded: number;
  total: number;
  speed: number;
  eta: number;
}

export type WebSocketMessageType =
  | 'chat'
  | 'chat_token'
  | 'chat_complete'
  | 'chat_error'
  | 'load_model'
  | 'model_loaded'
  | 'unload_model'
  | 'model_unloaded'
  | 'download_model'
  | 'download_progress'
  | 'download_complete'
  | 'download_error'
  | 'list_models'
  | 'models_list'
  | 'search_models'
  | 'search_results'
  | 'get_popular_models'
  | 'list_cloud_models'
  | 'cloud_models_list'
  | 'validate_api_key'
  | 'api_key_valid'
  | 'error';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  id?: string;
  payload?: unknown;
}

export interface ChatRequest {
  messages: ChatMessage[];
  modelId: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface LoadModelRequest {
  modelId: string;
  gpuLayers?: number;
}

export interface DownloadModelRequest {
  repoId: string;
  fileName: string;
}

export interface SearchModelsRequest {
  query: string;
  limit?: number;
}

export interface HuggingFaceModel {
  id: string;
  author: string;
  name: string;
  downloads: number;
  likes: number;
  tags: string[];
  files: HuggingFaceFile[];
}

export interface HuggingFaceFile {
  name: string;
  size: number;
  quantization?: string;
}

export interface ChatState {
  messages: ChatMessage[];
  models: ModelInfo[];
  currentModelId: string | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface DownloadState {
  activeDownloads: Map<string, DownloadProgress>;
  searchResults: HuggingFaceModel[];
  isSearching: boolean;
}

export interface Settings {
  temperature: number;
  maxTokens: number;
  topP: number;
  theme: ThemeId;
  currentProvider: ProviderType;
  currentCloudModel: string | null;
  apiKeys: Record<string, string>;
  fontFamily: string;
  fontSize: number;
}
