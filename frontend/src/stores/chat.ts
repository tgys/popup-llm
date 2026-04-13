import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  ChatMessage,
  ModelInfo,
  CloudModelInfo,
  DownloadProgress,
  HuggingFaceModel,
  Settings,
  ProviderType,
  ThemeId,
} from '@/types';
import { saveChatState, loadChatState } from '@/utils/chatDb';

// Cross-window sync channel
type SyncMessage =
  | { type: 'messages'; data: ChatMessage[] }
  | { type: 'addMessage'; data: ChatMessage }
  | { type: 'updateMessage'; data: { id: string; content: string } }
  | { type: 'appendToMessage'; data: { id: string; token: string } }
  | { type: 'setMessageStreaming'; data: { id: string; streaming: boolean } }
  | { type: 'clearMessages' }
  | { type: 'setGenerating'; data: boolean }
  | { type: 'setReplyToMessage'; data: string | null }
  | { type: 'truncateMessages'; data: number }
  | { type: 'requestSync' }
  | { type: 'fullSync'; data: { messages: ChatMessage[]; isGenerating: boolean; replyToMessageId: string | null } };

const broadcastChannel = typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('llm-chat-sync')
  : null;

// Flag to prevent echo when receiving our own broadcasts
let isSyncing = false;

function normalizeTheme(theme: Settings['theme'] | 'dark' | 'light' | undefined): ThemeId {
  if (!theme || theme === 'dark') return 'midnight-blue';
  if (theme === 'light') return 'paper-sky';
  return theme;
}

function broadcast(message: SyncMessage): void {
  if (broadcastChannel && !isSyncing) {
    broadcastChannel.postMessage(message);
  }
}

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>([]);
  const models = ref<ModelInfo[]>([]);
  const currentModelId = ref<string | null>(null);
  const isConnected = ref(false);
  const isLoading = ref(false);
  const isGenerating = ref(false);
  const error = ref<string | null>(null);
  const replyToMessageId = ref<string | null>(null);

  const activeDownloads = ref<Map<string, DownloadProgress>>(new Map());
  const searchResults = ref<HuggingFaceModel[]>([]);
  const isSearching = ref(false);
  const isSynced = ref(false); // For popup windows - true when initial sync received

  // Cloud provider state
  const cloudModels = ref<Record<ProviderType, CloudModelInfo[]>>({
    local: [],
    claude: [],
    openai: [],
    mistral: [],
  });
  const apiKeyValidation = ref<Record<ProviderType, boolean | null>>({
    local: null,
    claude: null,
    openai: null,
    mistral: null,
  });

  const settings = ref<Settings>({
    temperature: 0.7,
    maxTokens: 2048,
    topP: 0.9,
    theme: 'midnight-blue',
    currentProvider: 'local',
    currentCloudModel: null,
    apiKeys: {},
    fontFamily: 'Fira Code',
    fontSize: 14,
  });

  const currentModel = computed(() =>
    models.value.find((m) => m.id === currentModelId.value) ?? null
  );

  const loadedModel = computed(() =>
    models.value.find((m) => m.loaded) ?? null
  );

  const currentProvider = computed(() => settings.value.currentProvider);

  const isCloudProvider = computed(() => settings.value.currentProvider !== 'local');

  const currentApiKey = computed(() => {
    const provider = settings.value.currentProvider;
    return settings.value.apiKeys[provider] ?? '';
  });

  const activeModel = computed(() => {
    if (isCloudProvider.value) {
      const provider = settings.value.currentProvider;
      const modelId = settings.value.currentCloudModel;
      if (!modelId) return null;
      return cloudModels.value[provider]?.find((m) => m.id === modelId) ?? null;
    }
    return loadedModel.value;
  });

  const currentCloudModels = computed(() => {
    const provider = settings.value.currentProvider;
    return cloudModels.value[provider] ?? [];
  });

  // Persist state to localStorage (synchronous, immediate)
  function persistState(): void {
    saveChatState({
      messages: messages.value,
      isGenerating: isGenerating.value,
      replyToMessageId: replyToMessageId.value,
    });
  }

  // Load state from localStorage
  function loadFromDb(): boolean {
    const state = loadChatState();
    if (state) {
      messages.value = state.messages;
      isGenerating.value = state.isGenerating;
      replyToMessageId.value = state.replyToMessageId;
      return true;
    }
    return false;
  }

  function addMessage(message: ChatMessage): void {
    messages.value.push(message);
    broadcast({ type: 'addMessage', data: message });
    persistState();
  }

  function updateMessage(id: string, content: string): void {
    const message = messages.value.find((m) => m.id === id);
    if (message) {
      message.content = content;
      broadcast({ type: 'updateMessage', data: { id, content } });
      persistState();
    }
  }

  function appendToMessage(id: string, token: string): void {
    const message = messages.value.find((m) => m.id === id);
    if (message) {
      message.content += token;
      broadcast({ type: 'appendToMessage', data: { id, token } });
      persistState();
    }
  }

  function setMessageStreaming(id: string, streaming: boolean): void {
    const message = messages.value.find((m) => m.id === id);
    if (message) {
      message.streaming = streaming;
      broadcast({ type: 'setMessageStreaming', data: { id, streaming } });
      persistState();
    }
  }

  function clearMessages(): void {
    messages.value = [];
    replyToMessageId.value = null;
    broadcast({ type: 'clearMessages' });
    persistState();
  }

  function setReplyToMessage(messageId: string | null): void {
    replyToMessageId.value = messageId;
    broadcast({ type: 'setReplyToMessage', data: messageId });
    persistState();
  }

  function truncateMessagesAfter(index: number): void {
    messages.value.splice(index + 1);
    broadcast({ type: 'truncateMessages', data: index });
    persistState();
  }

  // Get messages up to and including the reply target (or all if none selected)
  function getMessagesForReply(): ChatMessage[] {
    if (!replyToMessageId.value) {
      return messages.value;
    }
    const index = messages.value.findIndex((m) => m.id === replyToMessageId.value);
    if (index === -1) {
      return messages.value;
    }
    return messages.value.slice(0, index + 1);
  }

  function setModels(newModels: ModelInfo[]): void {
    models.value = newModels;
    const loaded = newModels.find((m) => m.loaded);
    if (loaded) {
      currentModelId.value = loaded.id;
    }
  }

  function setCurrentModel(modelId: string | null): void {
    currentModelId.value = modelId;
  }

  function setConnected(connected: boolean): void {
    isConnected.value = connected;
  }

  function setLoading(loading: boolean): void {
    isLoading.value = loading;
  }

  function setGenerating(generating: boolean): void {
    isGenerating.value = generating;
    broadcast({ type: 'setGenerating', data: generating });
    persistState();
  }

  function setError(err: string | null): void {
    error.value = err;
  }

  function setDownloadProgress(
    downloadId: string,
    progress: DownloadProgress
  ): void {
    activeDownloads.value.set(downloadId, progress);
  }

  function removeDownload(downloadId: string): void {
    activeDownloads.value.delete(downloadId);
  }

  function setSearchResults(results: HuggingFaceModel[]): void {
    searchResults.value = results;
  }

  function setSearching(searching: boolean): void {
    isSearching.value = searching;
  }

  function setProvider(provider: ProviderType): void {
    settings.value.currentProvider = provider;
    saveSettings();
  }

  function setCloudModels(provider: ProviderType, models: CloudModelInfo[]): void {
    cloudModels.value[provider] = models;
  }

  function setApiKey(provider: ProviderType, apiKey: string): void {
    settings.value.apiKeys[provider] = apiKey;
    saveSettings();
  }

  function setApiKeyValidation(provider: ProviderType, valid: boolean | null): void {
    apiKeyValidation.value[provider] = valid;
  }

  function setCloudModel(modelId: string | null): void {
    settings.value.currentCloudModel = modelId;
    saveSettings();
  }

  function saveSettings(): void {
    localStorage.setItem('llm-chat-settings', JSON.stringify(settings.value));
  }

  function updateSettings(newSettings: Partial<Settings>): void {
    settings.value = { ...settings.value, ...newSettings };
    localStorage.setItem('llm-chat-settings', JSON.stringify(settings.value));
  }

  function loadSettings(): void {
    const saved = localStorage.getItem('llm-chat-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<Settings>;
        settings.value = {
          ...settings.value,
          ...parsed,
          theme: normalizeTheme(parsed.theme),
          apiKeys: { ...settings.value.apiKeys, ...(parsed.apiKeys ?? {}) },
        };
      } catch {
        // Use defaults
      }
    }
  }

  // Cross-window sync: request full state from other windows
  function requestSync(): void {
    broadcastChannel?.postMessage({ type: 'requestSync' });
  }

  // Apply sync data (used when reading directly from localStorage)
  function applySyncData(data: { messages: ChatMessage[]; isGenerating: boolean; replyToMessageId: string | null }): void {
    messages.value = JSON.parse(JSON.stringify(data.messages));
    isGenerating.value = data.isGenerating;
    replyToMessageId.value = data.replyToMessageId;
    isSynced.value = true;
  }

  // Cross-window sync: send full state to other windows
  function sendFullSync(): void {
    const syncData = {
      type: 'fullSync',
      data: {
        messages: messages.value,
        isGenerating: isGenerating.value,
        replyToMessageId: replyToMessageId.value,
      },
    };
    // Try BroadcastChannel first
    broadcastChannel?.postMessage(syncData);
    // Also use localStorage as fallback (triggers storage event in other windows)
    localStorage.setItem('llm-chat-sync', JSON.stringify({ ...syncData, timestamp: Date.now() }));
  }

  // Set up broadcast channel listener
  if (broadcastChannel) {
    broadcastChannel.onmessage = (event: MessageEvent<SyncMessage>) => {
      isSyncing = true;
      try {
        const msg = event.data;
        switch (msg.type) {
          case 'addMessage': {
            // Only add if we don't already have this message
            if (!messages.value.find((m) => m.id === msg.data.id)) {
              messages.value.push(msg.data);
            }
            break;
          }
          case 'updateMessage': {
            const message = messages.value.find((m) => m.id === msg.data.id);
            if (message) {
              message.content = msg.data.content;
            }
            break;
          }
          case 'appendToMessage': {
            const message = messages.value.find((m) => m.id === msg.data.id);
            if (message) {
              message.content += msg.data.token;
            }
            break;
          }
          case 'setMessageStreaming': {
            const message = messages.value.find((m) => m.id === msg.data.id);
            if (message) {
              message.streaming = msg.data.streaming;
            }
            break;
          }
          case 'clearMessages': {
            messages.value = [];
            break;
          }
          case 'setGenerating': {
            isGenerating.value = msg.data;
            break;
          }
          case 'setReplyToMessage': {
            replyToMessageId.value = msg.data;
            break;
          }
          case 'truncateMessages': {
            messages.value.splice(msg.data + 1);
            break;
          }
          case 'requestSync': {
            // Another window is asking for current state
            // Send directly to avoid isSyncing flag blocking broadcast()
            broadcastChannel?.postMessage({
              type: 'fullSync',
              data: {
                messages: messages.value,
                isGenerating: isGenerating.value,
                replyToMessageId: replyToMessageId.value,
              },
            });
            break;
          }
          case 'fullSync': {
            // Receive full state from another window - always accept to stay in sync
            // Deep clone to avoid reference issues with streaming messages
            messages.value = JSON.parse(JSON.stringify(msg.data.messages));
            isGenerating.value = msg.data.isGenerating;
            replyToMessageId.value = msg.data.replyToMessageId;
            isSynced.value = true;
            break;
          }
        }
      } finally {
        isSyncing = false;
      }
    };
  }

  // localStorage fallback for cross-window sync (more reliable than BroadcastChannel in some cases)
  window.addEventListener('storage', (event) => {
    if (event.key === 'llm-chat-sync' && event.newValue) {
      try {
        const msg = JSON.parse(event.newValue);
        if (msg.type === 'fullSync' && msg.data) {
          messages.value = JSON.parse(JSON.stringify(msg.data.messages));
          isGenerating.value = msg.data.isGenerating;
          replyToMessageId.value = msg.data.replyToMessageId;
          isSynced.value = true;
        }
      } catch {
        // Ignore parse errors
      }
    }
  });

  return {
    messages,
    models,
    currentModelId,
    isConnected,
    isLoading,
    isGenerating,
    error,
    replyToMessageId,
    activeDownloads,
    searchResults,
    isSearching,
    isSynced,
    settings,
    cloudModels,
    apiKeyValidation,
    currentModel,
    loadedModel,
    currentProvider,
    isCloudProvider,
    currentApiKey,
    activeModel,
    currentCloudModels,
    addMessage,
    updateMessage,
    appendToMessage,
    setMessageStreaming,
    clearMessages,
    setModels,
    setCurrentModel,
    setConnected,
    setLoading,
    setGenerating,
    setError,
    setDownloadProgress,
    removeDownload,
    setSearchResults,
    setSearching,
    setProvider,
    setCloudModels,
    setApiKey,
    setApiKeyValidation,
    setCloudModel,
    updateSettings,
    loadSettings,
    requestSync,
    applySyncData,
    sendFullSync,
    loadFromDb,
    setReplyToMessage,
    getMessagesForReply,
    truncateMessagesAfter,
  };
});
