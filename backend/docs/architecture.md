# LLM Chat Application - Complete UI Documentation

This document provides a comprehensive explanation of how the entire LLM Chat application works, from the frontend UI to the backend server communication.

---

## Table of Contents

1. [Application Overview](#application-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Diagram](#architecture-diagram)
4. [Frontend Structure](#frontend-structure)
5. [State Management](#state-management)
6. [WebSocket Communication](#websocket-communication)
7. [Composables (Business Logic)](#composables-business-logic)
8. [Vue Components](#vue-components)
9. [Backend Server](#backend-server)
10. [Data Flow Examples](#data-flow-examples)
11. [Resource Pre-checks](#resource-pre-checks)
12. [Theming System](#theming-system)
13. [Cross-Window Synchronization](#cross-window-synchronization)

---

## Application Overview

LLM Chat is a desktop-style chat application that supports:
- **Local models**: Load and run GGUF models locally via llama.cpp
- **Cloud providers**: Connect to Claude, OpenAI, and Mistral APIs
- **Model management**: Search, download, and manage models from HuggingFace
- **Theming**: 10 built-in themes (5 dark, 5 light)
- **Popup mode**: Detach chat window for picture-in-picture style usage
- **Cross-window sync**: Chat state synchronizes across multiple browser tabs

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend Framework | Vue 3 with Composition API |
| State Management | Pinia |
| Build Tool | Vite |
| Backend Runtime | Node.js |
| Backend Framework | Native WebSocket (ws package) |
| Local Inference | llama.cpp (via node-llama-cpp) |
| Styling | Scoped CSS with CSS variables |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Vue 3)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────────────┐  │
│  │   App.vue   │───▶│ ChatWindow   │───▶│ Child Components      │  │
│  └─────────────┘    └──────────────┘    │ - MessageList         │  │
│                            │            │ - MessageItem         │  │
│                            │            │ - InputArea           │  │
│                            ▼            │ - ModelSelector       │  │
│                     ┌──────────────┐    │ - ProviderSelector    │  │
│                     │  Composables │    │ - DownloadManager     │  │
│                     │ - useChat    │    │ - ApiKeyInput         │  │
│                     │ - useModels  │    └───────────────────────┘  │
│                     │ - useProviders│                              │
│                     │ - useWebSocket│                              │
│                     └──────┬───────┘                               │
│                            │                                       │
│                     ┌──────▼───────┐                               │
│                     │  Pinia Store │                               │
│                     │  (chat.ts)   │                               │
│                     └──────┬───────┘                               │
│                            │                                       │
└────────────────────────────┼───────────────────────────────────────┘
                             │ WebSocket
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        BACKEND (Node.js)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────────────┐  │
│  │  server.ts  │───▶│  handlers    │───▶│ Modules               │  │
│  │ (WebSocket) │    │ - chat       │    │ - inference.ts        │  │
│  └─────────────┘    │ - models     │    │ - models.ts           │  │
│                     │ - download   │    │ - download.ts         │  │
│                     │ - providers  │    │ - resources.ts        │  │
│                     └──────────────┘    │ - providers/          │  │
│                                         └───────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Frontend Structure

### File Organization

```
frontend/src/
├── main.ts              # App entry point, creates Vue app + Pinia
├── App.vue              # Root component, renders ChatWindow
├── components/          # Vue components
│   ├── ChatWindow.vue   # Main layout, tabs, settings modal
│   ├── MessageList.vue  # Scrollable message container
│   ├── MessageItem.vue  # Individual message rendering
│   ├── InputArea.vue    # Text input + send button
│   ├── ModelSelector.vue # Dropdown for model selection
│   ├── ProviderSelector.vue # Dropdown for provider selection
│   ├── DownloadManager.vue  # HuggingFace search + downloads
│   └── ApiKeyInput.vue  # API key input with validation
├── composables/         # Reusable logic (Vue Composition API)
│   ├── useWebSocket.ts  # WebSocket connection management
│   ├── useChat.ts       # Chat message handling
│   ├── useModels.ts     # Model loading/downloading
│   └── useProviders.ts  # Cloud provider management
├── stores/
│   └── chat.ts          # Pinia store (central state)
└── types/
    └── index.ts         # TypeScript interfaces
```

### Entry Point: `main.ts`

```typescript
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.mount('#app');
```

Simple bootstrap that:
1. Creates Vue app instance
2. Creates Pinia store instance
3. Mounts to `#app` DOM element

---

## State Management

### Pinia Store (`stores/chat.ts`)

The store is the single source of truth for all application state. It uses Vue 3's Composition API style (setup function).

#### State Variables

| Variable | Type | Description |
|----------|------|-------------|
| `messages` | `ChatMessage[]` | All chat messages |
| `models` | `ModelInfo[]` | Available local models |
| `currentModelId` | `string \| null` | Currently selected model ID |
| `isConnected` | `boolean` | WebSocket connection status |
| `isLoading` | `boolean` | Model loading in progress |
| `isGenerating` | `boolean` | Chat response being generated |
| `error` | `string \| null` | Current error message |
| `replyToMessageId` | `string \| null` | Message to reply from (context truncation) |
| `activeDownloads` | `Map<string, DownloadProgress>` | Active HuggingFace downloads |
| `searchResults` | `HuggingFaceModel[]` | Model search results |
| `isSearching` | `boolean` | Search in progress |
| `cloudModels` | `Record<ProviderType, CloudModelInfo[]>` | Available cloud models per provider |
| `apiKeyValidation` | `Record<ProviderType, boolean \| null>` | API key validity status |
| `settings` | `Settings` | User preferences (theme, fonts, API keys, etc.) |

#### Computed Properties

```typescript
// Currently loaded local model
const loadedModel = computed(() =>
  models.value.find((m) => m.loaded) ?? null
);

// Whether using a cloud provider
const isCloudProvider = computed(() =>
  settings.value.currentProvider !== 'local'
);

// Current API key for selected provider
const currentApiKey = computed(() =>
  settings.value.apiKeys[settings.value.currentProvider] ?? ''
);

// Active model (local or cloud)
const activeModel = computed(() => {
  if (isCloudProvider.value) {
    return cloudModels.value[settings.value.currentProvider]
      ?.find((m) => m.id === settings.value.currentCloudModel) ?? null;
  }
  return loadedModel.value;
});
```

#### Key Actions

| Action | Description |
|--------|-------------|
| `addMessage(message)` | Add new message, broadcast to other windows |
| `appendToMessage(id, token)` | Append streaming token to message |
| `setMessageStreaming(id, streaming)` | Toggle streaming indicator |
| `clearMessages()` | Clear all messages |
| `setReplyToMessage(id)` | Set context truncation point |
| `setModels(models)` | Update available models list |
| `loadSettings()` | Load settings from localStorage |
| `updateSettings(partial)` | Update and persist settings |
| `requestSync()` | Request state from other browser tabs |

---

## WebSocket Communication

### Connection Management (`composables/useWebSocket.ts`)

The WebSocket composable manages the connection lifecycle:

```typescript
export function useWebSocket(url: string = 'ws://localhost:8080') {
  const socket = ref<WebSocket | null>(null);
  const isConnected = ref(false);
  const error = ref<string | null>(null);

  // Handler registry for message types
  const messageHandlers = new Map<string, Set<(payload: unknown) => void>>();

  // Queue for messages sent before connection ready
  const pendingMessages: WebSocketMessage[] = [];

  // Reconnection with exponential backoff
  let reconnectDelay = 1000; // starts at 1s, max 30s
```

#### Key Features

1. **Auto-reconnection**: Exponential backoff (1s → 2s → 4s → ... → 30s max)
2. **Message queuing**: Messages sent before connection are queued
3. **Handler registry**: Components register handlers for specific message types
4. **Request/response**: Promise-based requests with timeout support

#### Message Handler Registration

```typescript
// Register handler for message type
function on(type: string, handler: (payload: unknown) => void): () => void {
  if (!messageHandlers.has(type)) {
    messageHandlers.set(type, new Set());
  }
  messageHandlers.get(type)!.add(handler);

  // Return cleanup function
  return () => messageHandlers.get(type)?.delete(handler);
}
```

#### Message Routing

```typescript
function handleMessage(message: WebSocketMessage): void {
  // Route by message type
  const handlers = messageHandlers.get(message.type);
  if (handlers) {
    handlers.forEach((handler) => handler(message.payload));
  }

  // Also route by message ID (for request/response pattern)
  if (message.id) {
    const idHandlers = messageHandlers.get(`id:${message.id}`);
    if (idHandlers) {
      idHandlers.forEach((handler) =>
        handler({ type: message.type, payload: message.payload })
      );
    }
  }
}
```

### Message Types

| Type | Direction | Description |
|------|-----------|-------------|
| `chat` | Client → Server | Send chat message |
| `chat_token` | Server → Client | Streaming token |
| `chat_complete` | Server → Client | Generation finished |
| `chat_error` | Server → Client | Chat error |
| `load_model` | Client → Server | Request model load |
| `model_loaded` | Server → Client | Model load complete |
| `unload_model` | Client → Server | Request model unload |
| `model_unloaded` | Server → Client | Model unload complete |
| `list_models` | Client → Server | Request model list |
| `models_list` | Server → Client | Model list response |
| `search_models` | Client → Server | Search HuggingFace |
| `search_results` | Server → Client | Search results |
| `download_model` | Client → Server | Start download |
| `download_progress` | Server → Client | Download progress update |
| `download_complete` | Server → Client | Download finished |
| `list_cloud_models` | Client → Server | Get cloud provider models |
| `cloud_models_list` | Server → Client | Cloud models response |
| `validate_api_key` | Client → Server | Validate API key |
| `api_key_valid` | Server → Client | Validation result |
| `error` | Server → Client | Generic error |

---

## Composables (Business Logic)

### useChat (`composables/useChat.ts`)

Handles chat message flow:

```typescript
export function useChat(
  send: (message: WebSocketMessage) => void,
  on: (type: string, handler: (payload: unknown) => void) => () => void
) {
  const store = useChatStore();
  const currentAssistantMessageId = ref<string | null>(null);
```

#### sendMessage Flow

```
1. Validate (model loaded? not generating?)
2. Get context messages (respecting replyToMessageId)
3. Add user message to store
4. Add empty assistant message (streaming placeholder)
5. Send WebSocket message with context
6. Set isGenerating = true
```

#### Token Streaming

```typescript
on('chat_token', (payload) => {
  const { token } = payload as { token: string };
  if (currentAssistantMessageId.value) {
    store.appendToMessage(currentAssistantMessageId.value, token);
  }
});
```

Tokens arrive one at a time and are appended to the assistant message, creating the typing effect.

### useModels (`composables/useModels.ts`)

Handles model operations:

| Function | Description |
|----------|-------------|
| `listModels()` | Request available models |
| `loadModel(modelId, gpuLayers?)` | Load a model into memory |
| `unloadModel()` | Unload current model |
| `searchModels(query?, limit)` | Search HuggingFace |
| `downloadModel(repoId, fileName)` | Start model download |

#### Download Progress Handling

```typescript
on('download_progress', (payload) => {
  const progress = payload as DownloadProgress;
  const downloadId = `${progress.modelId}/${progress.fileName}`;
  store.setDownloadProgress(downloadId, progress);
});
```

Progress updates are broadcast to all clients and stored in `activeDownloads` Map.

### useProviders (`composables/useProviders.ts`)

Handles cloud provider operations:

```typescript
function setProvider(provider: ProviderType): void {
  store.setProvider(provider);
  if (provider !== 'local') {
    listCloudModels(provider);  // Fetch available models
  }
}

function setApiKey(provider: ProviderType, apiKey: string): void {
  store.setApiKey(provider, apiKey);
  if (apiKey) {
    validateApiKey(provider, apiKey);  // Validate with server
  }
}
```

---

## Vue Components

### ChatWindow.vue (Main Layout)

The main container component that:

1. **Sets up composables**:
```typescript
const { isConnected, send, on } = useWebSocket();
const { sendMessage, stopGeneration, clearChat, setupHandlers } = useChat(send, on);
const { loadModel, unloadModel, searchModels, downloadModel } = useModels(send, on);
const { setProvider, setCloudModel, setApiKey } = useProviders(send, on);
```

2. **Manages UI state**:
   - Active tab (chat vs models)
   - Settings modal visibility
   - Popup mode detection

3. **Defines theme system** (10 themes with CSS variables)

4. **Renders layout**:
```
┌────────────────────────────────────────┐
│ Header (title, tabs, controls)         │
├────────────────────────────────────────┤
│ API Key Warning (if needed)            │
├────────────────────────────────────────┤
│ Error Banner (if any)                  │
├────────────────────────────────────────┤
│                                        │
│  Chat Tab:        OR    Models Tab:    │
│  - MessageList          - DownloadMgr  │
│  - InputArea                           │
│                                        │
├────────────────────────────────────────┤
│ Shortcut Hint (Alt+D)                  │
└────────────────────────────────────────┘
```

### MessageList.vue

Renders chat messages with:
- **Virtual scrolling** for large conversations (>50 messages)
- **Auto-scroll** to bottom on new messages
- **Reply selection** UI (click to set context point)

```vue
<RecycleScroller
  v-if="messages.length > 50"
  :items="messages"
  :item-size="null"
  key-field="id"
  :min-item-size="80"
>
  <template #default="{ item }">
    <MessageItem
      :message="item"
      :is-reply-target="store.replyToMessageId === item.id"
      :is-ignored="isMessageIgnored(item.id)"
    />
  </template>
</RecycleScroller>
```

### MessageItem.vue

Renders individual messages:
- **Role-based styling** (user blue, assistant purple, system gray)
- **Markdown rendering** for assistant messages (via `marked` library)
- **Streaming cursor** animation during generation
- **Reply button** to set context truncation point

```vue
<div class="message" :class="{
  'message--user': isUser,
  'message--assistant': !isUser && !isSystem,
  'message--streaming': message.streaming,
  'message--reply-target': isReplyTarget,
  'message--ignored': isIgnored,
}">
```

### InputArea.vue

Text input with:
- **Auto-resizing textarea** (up to 200px)
- **Enter to send**, Shift+Enter for newline
- **Send/Stop button** toggle based on generation state
- **Disabled state** when no model loaded

### ModelSelector.vue

Dropdown component for:
- **Local models**: Shows name, quantization, size, loaded status
- **Cloud models**: Shows name, context length, selected status
- **Loading spinner** during model load

### ProviderSelector.vue

Dropdown for switching between:
- Local (GGUF models)
- Claude (Anthropic API)
- OpenAI (OpenAI API)
- Mistral (Mistral API)

Shows validation indicator (green dot = valid key, red = invalid).

### DownloadManager.vue

HuggingFace model browser:
1. **Search bar** - searches for GGUF models
2. **Popular models** - shown on initial load
3. **Model list** - expandable cards with:
   - Model name and author
   - Download/like counts
   - Available GGUF files with sizes and quantization
4. **Active downloads** - progress bars with speed and ETA

---

## Backend Server

### server.ts Structure

```typescript
const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
  // Handle incoming messages
  ws.on('message', (data) => handleMessage(ws, data.toString()));

  // Send initial model list
  handleListModels(ws, 'initial');
});

function handleMessage(ws: WebSocket, data: string): void {
  const message = JSON.parse(data) as WebSocketMessage;

  switch (message.type) {
    case 'chat':
      handleChat(ws, requestId, message.payload);
      break;
    case 'load_model':
      handleLoadModel(ws, requestId, message.payload);
      break;
    // ... other handlers
  }
}
```

### Message Handlers

| Handler | Function |
|---------|----------|
| `handleChat` | Stream chat completion from local or cloud model |
| `handleLoadModel` | Load GGUF model (with resource checks) |
| `handleUnloadModel` | Unload current model |
| `handleListModels` | Return available local models |
| `handleSearchModels` | Search HuggingFace API |
| `handleDownloadModel` | Download model with progress updates |
| `handleListCloudModels` | Return cloud provider models |
| `handleValidateApiKey` | Test API key validity |

### Broadcast vs Send

```typescript
// Send to single client
function send(ws: WebSocket, message: WebSocketMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

// Send to all connected clients
function broadcast(message: WebSocketMessage): void {
  wss.clients.forEach((client) => send(client, message));
}
```

Model load/unload events are **broadcast** so all clients see the updated state.

---

## Data Flow Examples

### Example 1: Sending a Chat Message

```
┌─────────────────────────────────────────────────────────────────┐
│                          FRONTEND                                │
└─────────────────────────────────────────────────────────────────┘

1. User types message and presses Enter
   InputArea.vue → emits 'send' event

2. ChatWindow catches event, calls sendMessage()
   useChat.ts → sendMessage(content)

3. useChat validates and prepares:
   - Checks model loaded
   - Gets context messages
   - Adds user message to store
   - Creates empty assistant message
   - Sets isGenerating = true

4. Sends WebSocket message:
   {
     type: 'chat',
     id: 'uuid',
     payload: {
       messages: [...context, userMessage],
       modelId: 'model.gguf',
       temperature: 0.7,
       provider: 'local'
     }
   }

┌─────────────────────────────────────────────────────────────────┐
│                          BACKEND                                 │
└─────────────────────────────────────────────────────────────────┘

5. server.ts receives message
   handleMessage() → handleChat()

6. handleChat streams response:
   for await (const token of inferenceEngine.streamChat(...)) {
     send(ws, { type: 'chat_token', id, payload: { token } });
   }
   send(ws, { type: 'chat_complete', id });

┌────────���────────────────────────────────────────────────────────┐
│                          FRONTEND                                │
└─────────────────────────────────────────────────────────────────┘

7. useChat receives tokens:
   on('chat_token') → store.appendToMessage(id, token)

8. Vue reactivity updates MessageItem

9. on('chat_complete'):
   - store.setMessageStreaming(id, false)
   - store.setGenerating(false)
```

### Example 2: Loading a Model

```
User clicks model in ModelSelector
           │
           ▼
handleSelect(model) → emit('load', model.id)
           │
           ▼
ChatWindow.handleLoadModel(modelId)
           │
           ▼
useModels.loadModel(modelId)
  - store.setLoading(true)
  - send({ type: 'load_model', payload: { modelId } })
           │
           ▼
server.ts → handleLoadModel()
  - getModelInfo(modelId)
  - checkResourcesForModelLoad(modelInfo)  ← NEW!
  - inferenceEngine.loadModel(path)
  - broadcast({ type: 'model_loaded', payload: { models } })
           │
           ▼
useModels receives 'model_loaded'
  - store.setModels(models)
  - store.setCurrentModel(modelId)
  - store.setLoading(false)
           │
           ▼
ModelSelector shows "Loaded" badge
```

---

## Resource Pre-checks

### Module: `resources.ts`

Before loading a GGUF model, the server validates system resources:

```typescript
export async function checkResourcesForModelLoad(
  modelInfo: ModelInfo
): Promise<ResourceCheckResult> {
  // Check memory first (most common failure)
  const memoryCheck = checkMemoryAvailability(modelInfo);
  if (!memoryCheck.success) {
    return memoryCheck;
  }

  // Check disk space for temp files
  const diskCheck = await checkDiskSpace(modelInfo.path);
  if (!diskCheck.success) {
    return diskCheck;
  }

  return { success: true };
}
```

### Memory Estimation

```typescript
export function estimateRequiredMemory(modelInfo: ModelInfo): number {
  // GGUF models need ~1.5-2x file size in RAM
  const baseMemory = modelInfo.size * 1.8;
  const overhead = 50 * 1024 * 1024; // 50MB for context buffers
  return baseMemory + overhead;
}
```

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `MEMORY_MULTIPLIER` | 1.8 | RAM multiplier for file size |
| `MIN_FREE_MEMORY_BUFFER` | 512MB | Reserved system memory |
| `MIN_TEMP_DISK_SPACE` | 100MB | Minimum disk for temp files |

### Error Messages

**Memory error:**
```
Insufficient memory to load model. Required: ~4.50GB, Available: 2.10GB (Total: 8.00GB). Try closing other applications or using a smaller quantization.
```

**Disk error:**
```
Insufficient disk space. Available: 50MB, Required: 100MB minimum for temporary files.
```

---

## Theming System

### Theme Definition

Each theme defines CSS variables:

```typescript
const THEMES: ThemeDefinition[] = [
  {
    id: 'midnight-blue',
    label: 'Midnight Blue',
    mode: 'dark',
    vars: {
      '--theme-bg': 'rgba(13, 13, 26, 0.85)',
      '--theme-header': 'rgba(26, 26, 46, 0.6)',
      '--theme-panel': 'rgba(30, 30, 58, 0.78)',
      '--theme-text': '#e0e0e0',
      '--theme-accent': '#4a9eff',
      // ... 25+ variables
    },
  },
  // ... 9 more themes
];
```

### Available Themes

**Dark themes:**
- Midnight Blue (default)
- Forest Night
- Ember Dark
- Graphite
- Aurora Dark

**Light themes:**
- Paper Sky
- Sand Light
- Mint Light
- Rose Light
- Slate Light

### Application

Themes are applied via inline styles on ChatWindow:

```vue
<div class="chat-window" :style="themeVars">
```

Components use CSS variables:

```css
.message--user {
  background-color: var(--theme-panel);
}

.message__role {
  color: var(--theme-text);
}
```

---

## Cross-Window Synchronization

### BroadcastChannel API

The app uses `BroadcastChannel` to sync state across browser tabs:

```typescript
const broadcastChannel = new BroadcastChannel('llm-chat-sync');

function broadcast(message: SyncMessage): void {
  if (!isSyncing) {  // Prevent echo
    broadcastChannel.postMessage(message);
  }
}
```

### Synchronized State

| Event | Data Synced |
|-------|-------------|
| `addMessage` | New message added |
| `updateMessage` | Message content changed |
| `appendToMessage` | Streaming token |
| `setMessageStreaming` | Streaming status |
| `clearMessages` | All messages cleared |
| `setGenerating` | Generation status |
| `setReplyToMessage` | Reply context |
| `truncateMessages` | Messages after index removed |
| `requestSync` | Request full state |
| `fullSync` | Send all messages |

### New Window Sync

When a popup opens:

1. Main window sends `fullSync` after 200ms and 500ms delays
2. Popup sends `requestSync` multiple times
3. First window with messages responds with `fullSync`

```typescript
// Popup requests sync
if (isPopupMode.value) {
  const trySync = (attempts: number) => {
    if (attempts > 0 && store.messages.length === 0) {
      store.requestSync();
      setTimeout(() => trySync(attempts - 1), 100);
    }
  };
  trySync(5);
}
```

---

## Popup Mode

### Detection

```typescript
function checkIfPopup(): void {
  isPopupMode.value = window.opener !== null && !window.opener.closed;
}
```

### Opening Popup

```typescript
function openPopupWindow(): void {
  const features = [
    'width=420',
    'height=600',
    'popup=yes',
    'toolbar=no',
    'menubar=no',
    'scrollbars=no',
  ].join(',');

  popupWindow.value = window.open(url, 'llm-chat-popup', features);
}
```

### Keyboard Shortcut

`Alt+D` toggles popup mode:
- From main window: Opens popup
- From popup: Restores to main window

---

## Settings Persistence

Settings are stored in `localStorage`:

```typescript
function saveSettings(): void {
  localStorage.setItem('llm-chat-settings', JSON.stringify(settings.value));
}

function loadSettings(): void {
  const saved = localStorage.getItem('llm-chat-settings');
  if (saved) {
    settings.value = { ...settings.value, ...JSON.parse(saved) };
  }
}
```

### Persisted Settings

| Setting | Description |
|---------|-------------|
| `temperature` | LLM temperature (0-1) |
| `maxTokens` | Max response tokens |
| `topP` | Top-p sampling |
| `theme` | Current theme ID |
| `currentProvider` | Selected provider |
| `currentCloudModel` | Selected cloud model |
| `apiKeys` | API keys by provider |
| `fontFamily` | UI font family |
| `fontSize` | UI font size |

---

## Error Handling

### Frontend Errors

Errors are displayed in a dismissible banner:

```vue
<div v-if="store.error" class="chat-window__error">
  <span>{{ store.error }}</span>
  <button @click="store.setError(null)">Dismiss</button>
</div>
```

### Backend Error Responses

```typescript
send(ws, {
  type: 'error',  // or 'chat_error', 'download_error'
  id: requestId,
  payload: { error: (error as Error).message },
});
```

### Handled Error Scenarios

| Scenario | Handling |
|----------|----------|
| WebSocket disconnect | Auto-reconnect with backoff |
| Model not found | Error message to client |
| Insufficient memory | Clear error before load attempt |
| API key invalid | Show validation status |
| Download failure | Remove from active, show error |
| Chat error | Display in assistant message |
