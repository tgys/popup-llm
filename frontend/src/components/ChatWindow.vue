<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useChatStore } from '@/stores/chat';
import { useWebSocket } from '@/composables/useWebSocket';
import { useChat } from '@/composables/useChat';
import { useModels } from '@/composables/useModels';
import { useProviders } from '@/composables/useProviders';
import MessageList from './MessageList.vue';
import InputArea from './InputArea.vue';
import ModelSelector from './ModelSelector.vue';
import DownloadManager from './DownloadManager.vue';
import ProviderSelector from './ProviderSelector.vue';
import ApiKeyInput from './ApiKeyInput.vue';
import { PROVIDERS, type ProviderType, type ThemeId } from '@/types';
import { THEMES, darkThemes, lightThemes } from '@/config/themes';

type Tab = 'chat' | 'models';

const store = useChatStore();

// Popup window support
const popupWindow = ref<Window | null>(null);
const chatWindowRef = ref<HTMLElement | null>(null);
const isPopupMode = ref(false);

// Check if we're running inside a popup
function checkIfPopup(): void {
  const urlParams = new URLSearchParams(window.location.search);
  const hasPopupParam = urlParams.get('popup') === '1';

  // Only treat as popup if we have the param AND were opened by another window
  if (hasPopupParam && window.opener && !window.opener.closed) {
    isPopupMode.value = true;
  } else if (hasPopupParam) {
    // Main window has popup param - remove it from URL
    urlParams.delete('popup');
    const newUrl = urlParams.toString()
      ? `${window.location.pathname}?${urlParams.toString()}`
      : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
    isPopupMode.value = false;
  } else {
    isPopupMode.value = false;
  }
}

// Open detached popup window
function openPopupWindow(): void {
  console.log('openPopupWindow called');

  // If already have a popup, focus it
  if (popupWindow.value && !popupWindow.value.closed) {
    popupWindow.value.focus();
    return;
  }

  // Open popup with the same URL but with a query param to indicate popup mode
  const popupUrl = new URL(window.location.href);
  popupUrl.searchParams.set('popup', '1');

  const width = 420;
  const height = 600;
  const left = window.screenX + window.outerWidth - width - 50;
  const top = window.screenY + 50;

  // Features to minimize browser chrome - no toolbar, menubar, scrollbars, etc.
  const features = [
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    'popup=yes',
    'toolbar=no',
    'menubar=no',
    'scrollbars=no',
    'location=no',
    'status=no',
    'resizable=yes',
  ].join(',');

  // Persist current state to IndexedDB before opening popup
  // (this is already happening via persistState, but force an immediate save)

  popupWindow.value = window.open(popupUrl.toString(), 'llm-chat-popup', features);

  if (!popupWindow.value) {
    console.error('Popup blocked or failed to open');
    return;
  }

  // Monitor popup close
  const checkClosed = setInterval(() => {
    if (popupWindow.value?.closed) {
      popupWindow.value = null;
      clearInterval(checkClosed);
    }
  }, 500);
}

// Keyboard shortcut handler
function handleKeydown(event: KeyboardEvent): void {
  // Alt+D to detach/close popup window
  if (event.altKey && !event.ctrlKey && !event.shiftKey && event.code === 'KeyD') {
    event.preventDefault();
    if (isPopupMode.value) {
      window.close();
    } else {
      openPopupWindow();
    }
  }
}

const { isConnected, send, on } = useWebSocket();
const { sendMessage, stopGeneration, clearChat, setupHandlers: setupChatHandlers } = useChat(send, on);
const {
  setupHandlers: setupModelHandlers,
  listModels,
  loadModel,
  unloadModel,
  searchModels,
  downloadModel,
} = useModels(send, on);
const {
  setupHandlers: setupProviderHandlers,
  setProvider,
  setCloudModel,
  setApiKey,
  listCloudModels,
} = useProviders(send, on);

const activeTab = ref<Tab>('chat');
const messageListRef = ref<InstanceType<typeof MessageList> | null>(null);
const showSettings = ref(false);
const showShortcutsInfo = ref(false);

// Scripts for global shortcuts
const linuxScript = `#!/bin/bash
# Focus LLM Chat popup window
# Save as ~/.local/bin/focus-llm-popup.sh
# Make executable: chmod +x ~/.local/bin/focus-llm-popup.sh
# Bind to a shortcut in your desktop environment settings

wmctrl -a "LLM Chat" 2>/dev/null || xdotool search --name "LLM Chat" windowactivate
`;

const windowsScript = `; AutoHotkey script to focus LLM Chat popup
; Save as focus-llm-popup.ahk and run with AutoHotkey
; Download AutoHotkey from: https://www.autohotkey.com/

^+l::  ; Ctrl+Shift+L to focus
    if WinExist("LLM Chat")
        WinActivate
    return
`;

function downloadScript(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const connectionStatus = computed(() => {
  if (isConnected.value) return 'Connected';
  return 'Disconnected';
});

const connectionStatusClass = computed(() => ({
  'chat-window__status--connected': isConnected.value,
  'chat-window__status--disconnected': !isConnected.value,
}));

const currentProviderConfig = computed(() =>
  PROVIDERS.find((p) => p.id === store.settings.currentProvider)
);

const canSendMessage = computed(() => {
  if (store.isCloudProvider) {
    return !!store.settings.currentCloudModel && !!store.currentApiKey;
  }
  return !!store.loadedModel;
});

const needsApiKey = computed(() => {
  return store.isCloudProvider && !store.currentApiKey;
});

const activeTheme = computed(
  () => THEMES.find((theme) => theme.id === store.settings.theme) ?? THEMES[0]
);

const themeVars = computed(() => ({
  ...activeTheme.value.vars,
  '--theme-font-family': `${store.settings.fontFamily}, monospace`,
  '--theme-font-size': `${store.settings.fontSize}px`,
  'font-family': `${store.settings.fontFamily}, monospace`,
  'font-size': `${store.settings.fontSize}px`,
}));

let cleanupChat: (() => void) | null = null;
let cleanupModels: (() => void) | null = null;
let cleanupProviders: (() => void) | null = null;

onMounted(() => {
  checkIfPopup();
  store.loadSettings();
  cleanupChat = setupChatHandlers();
  cleanupModels = setupModelHandlers();
  cleanupProviders = setupProviderHandlers();

  // Register keyboard shortcut listener
  window.addEventListener('keydown', handleKeydown);

  // Always mark as synced immediately
  store.isSynced = true;

  // If we're a popup, load state from IndexedDB and poll for updates
  if (isPopupMode.value) {
    store.loadFromDb();
    // Poll for updates during streaming (every 100ms)
    const pollInterval = setInterval(() => {
      store.loadFromDb();
    }, 100);
    window.addEventListener('beforeunload', () => clearInterval(pollInterval));
  }

  setTimeout(() => {
    listModels();
    // Load cloud models for the current provider if it's a cloud provider
    if (store.isCloudProvider) {
      listCloudModels(store.settings.currentProvider);
    }
  }, 100);
});

onUnmounted(() => {
  cleanupChat?.();
  cleanupModels?.();
  cleanupProviders?.();
  window.removeEventListener('keydown', handleKeydown);
});

// Watch for tab changes to load popular models
watch(
  activeTab,
  (newTab) => {
    if (newTab === 'models' && store.searchResults.length === 0) {
      searchModels(undefined, 10);
    }
  }
);

// Watch for provider changes to load models
watch(
  () => store.settings.currentProvider,
  (newProvider) => {
    if (newProvider !== 'local') {
      listCloudModels(newProvider);
    }
  }
);

function handleSend(message: string): void {
  sendMessage(message);
}

function handleLoadModel(modelId: string): void {
  loadModel(modelId);
}

function handleUnloadModel(): void {
  unloadModel();
}

function handleSearch(query: string): void {
  searchModels(query);
}

function handleDownload(repoId: string, fileName: string): void {
  downloadModel(repoId, fileName);
}

function handleProviderSelect(provider: ProviderType): void {
  setProvider(provider);
}

function handleCloudModelSelect(modelId: string): void {
  setCloudModel(modelId);
}

function handleApiKeyUpdate(provider: ProviderType, apiKey: string): void {
  setApiKey(provider, apiKey);
}

function toggleSettings(): void {
  showSettings.value = !showSettings.value;
}

function handleFontFamilyChange(event: Event): void {
  const select = event.target as HTMLSelectElement;
  store.updateSettings({ fontFamily: select.value });
}

function handleFontSizeChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  store.updateSettings({ fontSize: parseInt(input.value, 10) });
}

function handleThemeChange(event: Event): void {
  const select = event.target as HTMLSelectElement;
  store.updateSettings({ theme: select.value as ThemeId });
}
</script>

<template>
  <div
    ref="chatWindowRef"
    class="chat-window"
    :class="{ 'chat-window--popup': isPopupMode }"
    :style="themeVars"
  >
    <header class="chat-window__header">
      <div class="chat-window__title">
        <h1>LLM Chat</h1>
        <span
          class="chat-window__status"
          :class="connectionStatusClass"
        >
          {{ connectionStatus }}
        </span>
      </div>

      <div class="chat-window__tabs">
        <button
          class="chat-window__tab"
          :class="{ 'chat-window__tab--active': activeTab === 'chat' }"
          @click="activeTab = 'chat'"
        >
          Chat
        </button>
        <button
          class="chat-window__tab"
          :class="{ 'chat-window__tab--active': activeTab === 'models' }"
          @click="activeTab = 'models'"
        >
          Models
          <span
            v-if="store.activeDownloads.size > 0"
            class="chat-window__tab-badge"
          >
            {{ store.activeDownloads.size }}
          </span>
        </button>
      </div>

      <div class="chat-window__controls">
        <ProviderSelector
          :current-provider="store.settings.currentProvider"
          :api-key-validation="store.apiKeyValidation"
          @select="handleProviderSelect"
        />
        <ModelSelector
          :models="store.models"
          :cloud-models="store.currentCloudModels"
          :current-model="store.loadedModel"
          :current-cloud-model-id="store.settings.currentCloudModel"
          :provider="store.settings.currentProvider"
          :is-loading="store.isLoading"
          @load="handleLoadModel"
          @unload="handleUnloadModel"
          @select-cloud="handleCloudModelSelect"
        />
        <button
          class="chat-window__settings-btn"
          :class="{ 'chat-window__settings-btn--active': showSettings }"
          @click="toggleSettings"
          title="Settings"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        <button
          v-if="isPopupMode"
          class="chat-window__info-btn"
          :class="{ 'chat-window__info-btn--active': showShortcutsInfo }"
          @click="showShortcutsInfo = !showShortcutsInfo"
          title="Global shortcut scripts"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
        </button>
        <button
          v-if="!isPopupMode"
          class="chat-window__pip-btn"
          @click="openPopupWindow"
          title="Detach window (Alt+D)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <rect x="12" y="10" width="8" height="6" rx="1" />
          </svg>
        </button>
        <button
          v-if="activeTab === 'chat'"
          class="chat-window__clear-btn"
          :disabled="store.messages.length === 0"
          @click="clearChat"
        >
          Clear Chat
        </button>
      </div>
    </header>

    <!-- Settings Modal -->
    <Transition name="modal">
      <div
        v-if="showSettings"
        class="chat-window__settings-overlay"
        @click.self="showSettings = false"
      >
        <div class="chat-window__settings-modal">
          <div class="chat-window__settings-header">
            <h2>Settings</h2>
            <button
              class="chat-window__settings-close"
              @click="showSettings = false"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="chat-window__settings-content">
            <!-- Font Settings -->
            <div class="chat-window__settings-section">
              <h3>Appearance</h3>
              <div class="chat-window__settings-row">
                <label for="theme-color">Theme</label>
                <select
                  id="theme-color"
                  :value="store.settings.theme"
                  @change="handleThemeChange"
                >
                  <optgroup label="Dark">
                    <option v-for="theme in darkThemes" :key="theme.id" :value="theme.id">
                      {{ theme.label }}
                    </option>
                  </optgroup>
                  <optgroup label="Light">
                    <option v-for="theme in lightThemes" :key="theme.id" :value="theme.id">
                      {{ theme.label }}
                    </option>
                  </optgroup>
                </select>
              </div>
              <div class="chat-window__settings-row">
                <label for="font-family">Font</label>
                <select
                  id="font-family"
                  :value="store.settings.fontFamily"
                  @change="handleFontFamilyChange"
                >
                  <option value="Fira Code">Fira Code</option>
                  <option value="JetBrains Mono">JetBrains Mono</option>
                  <option value="Source Code Pro">Source Code Pro</option>
                  <option value="Consolas">Consolas</option>
                  <option value="Monaco">Monaco</option>
                  <option value="Menlo">Menlo</option>
                  <option value="Ubuntu Mono">Ubuntu Mono</option>
                  <option value="IBM Plex Mono">IBM Plex Mono</option>
                  <option value="system-ui">System Default</option>
                </select>
              </div>
              <div class="chat-window__settings-row">
                <label for="font-size">Font Size</label>
                <div class="chat-window__settings-size-control">
                  <input
                    id="font-size"
                    type="range"
                    min="10"
                    max="24"
                    :value="store.settings.fontSize"
                    @input="handleFontSizeChange"
                  />
                  <span class="chat-window__settings-size-value">{{ store.settings.fontSize }}px</span>
                </div>
              </div>
            </div>

            <!-- API Key Settings (only for cloud providers) -->
            <div v-if="store.isCloudProvider && currentProviderConfig" class="chat-window__settings-section">
              <h3>{{ currentProviderConfig.name }} API Key</h3>
              <ApiKeyInput
                :provider="currentProviderConfig"
                :api-key="store.settings.apiKeys[currentProviderConfig.id] ?? ''"
                :is-valid="store.apiKeyValidation[currentProviderConfig.id]"
                @update="(key) => handleApiKeyUpdate(currentProviderConfig!.id, key)"
              />
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Shortcuts Info Modal (popup only) -->
    <Transition name="modal">
      <div
        v-if="showShortcutsInfo"
        class="chat-window__settings-overlay"
        @click.self="showShortcutsInfo = false"
      >
        <div class="chat-window__settings-modal chat-window__shortcuts-modal">
          <div class="chat-window__settings-header">
            <h2>Global Shortcut Scripts</h2>
            <button
              class="chat-window__settings-close"
              @click="showShortcutsInfo = false"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="chat-window__settings-content">
            <p class="chat-window__shortcuts-desc">
              Download and run these scripts to focus this popup window with a global keyboard shortcut.
            </p>

            <div class="chat-window__script-section">
              <div class="chat-window__script-header">
                <h3>Linux</h3>
                <button
                  class="chat-window__script-download"
                  @click="downloadScript(linuxScript, 'focus-llm-popup.sh')"
                >
                  Download .sh
                </button>
              </div>
              <pre class="chat-window__script-code">{{ linuxScript }}</pre>
              <p class="chat-window__script-hint">
                Requires <code>wmctrl</code> or <code>xdotool</code>. Bind to a shortcut in your DE settings.
              </p>
            </div>

            <div class="chat-window__script-section">
              <div class="chat-window__script-header">
                <h3>Windows</h3>
                <button
                  class="chat-window__script-download"
                  @click="downloadScript(windowsScript, 'focus-llm-popup.ahk')"
                >
                  Download .ahk
                </button>
              </div>
              <pre class="chat-window__script-code">{{ windowsScript }}</pre>
              <p class="chat-window__script-hint">
                Requires <a href="https://www.autohotkey.com/" target="_blank">AutoHotkey</a>. Run the script to enable Ctrl+Shift+L.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <main class="chat-window__main">
      <div
        v-if="needsApiKey"
        class="chat-window__api-key-warning"
        @click="showSettings = true"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
        </svg>
        <span>API key required for {{ PROVIDERS.find(p => p.id === store.settings.currentProvider)?.name }}. Click here to configure.</span>
      </div>

      <div
        v-if="store.error"
        class="chat-window__error"
      >
        <span>{{ store.error }}</span>
        <button @click="store.setError(null)">
          Dismiss
        </button>
      </div>

      <template v-if="activeTab === 'chat'">
        <MessageList
          ref="messageListRef"
          :messages="store.messages"
        />
        <InputArea
          :disabled="!isConnected"
          :is-generating="store.isGenerating"
          :model-loaded="canSendMessage"
          @send="handleSend"
          @stop="stopGeneration"
        />
      </template>

      <template v-else>
        <DownloadManager
          :search-results="store.searchResults"
          :active-downloads="store.activeDownloads"
          :is-searching="store.isSearching"
          @search="handleSearch"
          @download="handleDownload"
        />
      </template>
    </main>

    <!-- Shortcut hint -->
    <div v-if="!isPopupMode" class="shortcut-hint">
      <span>Alt+D</span> to detach window
    </div>
  </div>
</template>

<style scoped>
.chat-window {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--theme-bg);
  overflow: hidden;
  border: 1px solid var(--theme-border-strong);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.chat-window__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 10px;
  background-color: var(--theme-header);
  border-bottom: 1px solid var(--theme-border);
  gap: 10px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.chat-window__title {
  display: flex;
  align-items: center;
  gap: 6px;
}

.chat-window__title h1 {
  font-size: 10px;
  font-weight: 600;
  color: var(--theme-text);
  margin: 0;
  font-family: inherit;
}

.chat-window__status {
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: 500;
  font-family: inherit;
}

.chat-window__status--connected {
  background-color: var(--theme-success-soft);
  color: var(--theme-success);
}

.chat-window__status--disconnected {
  background-color: var(--theme-danger-soft);
  color: var(--theme-danger);
}

.chat-window__tabs {
  display: flex;
  gap: 2px;
  background-color: var(--theme-panel-soft);
  padding: 2px;
  border-radius: 4px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.chat-window__tab {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: none;
  border: none;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 500;
  color: var(--theme-text-muted);
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.chat-window__tab:hover {
  color: var(--theme-text-strong);
}

.chat-window__tab--active {
  background-color: var(--theme-hover);
  color: var(--theme-text);
}

.chat-window__tab-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 12px;
  height: 12px;
  padding: 0 3px;
  background-color: var(--theme-accent);
  border-radius: 6px;
  font-size: 8px;
  font-weight: 600;
  color: var(--theme-contrast);
}

.chat-window__controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.chat-window__pip-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  background-color: transparent;
  border: 1px solid var(--theme-border);
  border-radius: 3px;
  color: var(--theme-text-soft);
  cursor: pointer;
  transition: all 0.2s;
}

.chat-window__pip-btn:hover {
  border-color: var(--theme-accent);
  color: var(--theme-accent);
}

.chat-window__pip-btn svg {
  width: 10px;
  height: 10px;
}

.chat-window__clear-btn {
  padding: 3px 8px;
  background-color: transparent;
  border: 1px solid var(--theme-border);
  border-radius: 3px;
  font-size: 10px;
  color: var(--theme-text-soft);
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.chat-window__clear-btn:hover:not(:disabled) {
  border-color: var(--theme-danger);
  color: var(--theme-danger);
}

.chat-window__clear-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chat-window__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-window__api-key-warning {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background-color: var(--theme-warning-soft);
  border-bottom: 1px solid var(--theme-warning-border);
  color: var(--theme-warning);
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.chat-window__api-key-warning:hover {
  background-color: var(--theme-warning-soft);
  filter: brightness(1.1);
}

.chat-window__api-key-warning svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.chat-window__error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background-color: var(--theme-danger-soft);
  border-bottom: 1px solid var(--theme-danger);
  color: var(--theme-danger);
  font-size: 14px;
}

.chat-window__error button {
  padding: 4px 12px;
  background-color: transparent;
  border: 1px solid var(--theme-danger);
  border-radius: 4px;
  color: var(--theme-danger);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.chat-window__error button:hover {
  background-color: var(--theme-danger);
  color: var(--theme-contrast);
}

.chat-window__settings-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  background-color: transparent;
  border: 1px solid var(--theme-border);
  border-radius: 3px;
  color: var(--theme-text-soft);
  cursor: pointer;
  transition: all 0.2s;
}

.chat-window__settings-btn:hover {
  border-color: var(--theme-accent);
  color: var(--theme-text);
}

.chat-window__settings-btn--active {
  background-color: var(--theme-accent);
  border-color: var(--theme-accent);
  color: var(--theme-contrast);
}

.chat-window__settings-btn svg {
  width: 10px;
  height: 10px;
}

.chat-window__settings-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--theme-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.chat-window__settings-modal {
  background-color: var(--theme-bg-popup);
  border: 1px solid var(--theme-border-strong);
  border-radius: 12px;
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px var(--theme-shadow);
}

.chat-window__settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--theme-border);
  background-color: var(--theme-header-soft);
}

.chat-window__settings-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--theme-text);
  margin: 0;
}

.chat-window__settings-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: none;
  border: none;
  color: var(--theme-text-muted);
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.chat-window__settings-close:hover {
  background-color: var(--theme-hover);
  color: var(--theme-text);
}

.chat-window__settings-close svg {
  width: 18px;
  height: 18px;
}

.chat-window__settings-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
}

.chat-window__settings-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-window__settings-section h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--theme-text);
  margin: 0 0 4px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--theme-border);
}

.chat-window__settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.chat-window__settings-row label {
  font-size: 13px;
  color: var(--theme-text-soft);
}

.chat-window__settings-row select {
  padding: 6px 10px;
  background-color: var(--theme-panel-soft);
  border: 1px solid var(--theme-border);
  border-radius: 4px;
  color: var(--theme-text);
  font-size: 13px;
  cursor: pointer;
  min-width: 150px;
}

.chat-window__settings-row select:hover {
  border-color: var(--theme-border-strong);
}

.chat-window__settings-row select:focus {
  outline: none;
  border-color: var(--theme-accent);
}

.chat-window__settings-size-control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chat-window__settings-size-control input[type="range"] {
  width: 120px;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--theme-input-track);
  border-radius: 2px;
  cursor: pointer;
}

.chat-window__settings-size-control input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  background: var(--theme-accent);
  border-radius: 50%;
  cursor: pointer;
}

.chat-window__settings-size-control input[type="range"]::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: var(--theme-accent);
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

.chat-window__settings-size-value {
  font-size: 12px;
  color: var(--theme-text-soft);
  min-width: 40px;
  text-align: right;
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .chat-window__settings-modal,
.modal-leave-to .chat-window__settings-modal {
  transform: scale(0.95);
}

.shortcut-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 4px 8px;
  background-color: var(--theme-panel-soft);
  border-top: 1px solid var(--theme-border-soft);
  font-size: 10px;
  color: var(--theme-text-muted);
  font-family: inherit;
}

.shortcut-hint span {
  padding: 2px 6px;
  background-color: var(--theme-hover);
  border: 1px solid var(--theme-border);
  border-radius: 3px;
  color: var(--theme-text-soft);
  font-size: 9px;
}

.chat-window--popup {
  background-color: var(--theme-bg-popup) !important;
  overflow: hidden;
}

/* Hide scrollbars in popup mode */
.chat-window--popup,
.chat-window--popup * {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

.chat-window--popup::-webkit-scrollbar,
.chat-window--popup *::-webkit-scrollbar {
  display: none; /* Chrome/Safari/Opera */
}

.chat-window__info-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  background-color: transparent;
  border: 1px solid var(--theme-border);
  border-radius: 3px;
  color: var(--theme-text-soft);
  cursor: pointer;
  transition: all 0.2s;
}

.chat-window__info-btn:hover {
  border-color: var(--theme-accent);
  color: var(--theme-accent);
}

.chat-window__info-btn--active {
  background-color: var(--theme-accent);
  border-color: var(--theme-accent);
  color: var(--theme-contrast);
}

.chat-window__info-btn svg {
  width: 10px;
  height: 10px;
}

.chat-window__shortcuts-modal {
  max-width: 550px;
}

.chat-window__shortcuts-desc {
  font-size: 13px;
  color: var(--theme-text-soft);
  margin: 0 0 16px 0;
}

.chat-window__script-section {
  margin-bottom: 20px;
}

.chat-window__script-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.chat-window__script-header h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--theme-text);
  margin: 0;
}

.chat-window__script-download {
  padding: 4px 10px;
  background-color: var(--theme-accent);
  border: none;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  color: var(--theme-contrast);
  cursor: pointer;
  transition: all 0.2s;
}

.chat-window__script-download:hover {
  filter: brightness(1.1);
}

.chat-window__script-code {
  background-color: var(--theme-panel-soft);
  border: 1px solid var(--theme-border);
  border-radius: 6px;
  padding: 12px;
  font-size: 11px;
  font-family: inherit;
  color: var(--theme-text);
  overflow-x: auto;
  margin: 0 0 8px 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.chat-window__script-hint {
  font-size: 11px;
  color: var(--theme-text-muted);
  margin: 0;
}

.chat-window__script-hint code {
  background-color: var(--theme-panel-soft);
  padding: 1px 4px;
  border-radius: 3px;
  font-family: inherit;
}

.chat-window__script-hint a {
  color: var(--theme-accent);
  text-decoration: none;
}

.chat-window__script-hint a:hover {
  text-decoration: underline;
}
</style>
