<script setup lang="ts">
import { ref, computed } from 'vue';
import type { ProviderConfig } from '@/types';

const props = defineProps<{
  provider: ProviderConfig;
  apiKey: string;
  isValid: boolean | null;
}>();

const emit = defineEmits<{
  update: [apiKey: string];
}>();

const showPassword = ref(false);
const inputValue = ref(props.apiKey);

const statusClass = computed(() => {
  if (props.isValid === null) return '';
  return props.isValid ? 'api-key-input__status--valid' : 'api-key-input__status--invalid';
});

const statusText = computed(() => {
  if (props.isValid === null) return '';
  return props.isValid ? 'Valid' : 'Invalid';
});

function handleInput(event: Event): void {
  const target = event.target as HTMLInputElement;
  inputValue.value = target.value;
}

function handleSave(): void {
  if (inputValue.value !== props.apiKey) {
    emit('update', inputValue.value);
  }
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    handleSave();
  }
}

function toggleVisibility(): void {
  showPassword.value = !showPassword.value;
}
</script>

<template>
  <div class="api-key-input">
    <label class="api-key-input__label">
      <span>{{ provider.name }} API Key</span>
      <a
        v-if="provider.apiKeyHelpUrl"
        :href="provider.apiKeyHelpUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="api-key-input__help-link"
      >
        Get key
      </a>
    </label>
    <div class="api-key-input__wrapper">
      <input
        :type="showPassword ? 'text' : 'password'"
        :value="inputValue"
        :placeholder="provider.apiKeyPlaceholder || 'Enter API key'"
        class="api-key-input__input"
        @input="handleInput"
        @keydown="handleKeydown"
      />
      <button
        type="button"
        class="api-key-input__toggle"
        @click="toggleVisibility"
      >
        <svg
          v-if="showPassword"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
        <svg
          v-else
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
    </div>
    <div class="api-key-input__actions">
      <span
        v-if="isValid !== null"
        class="api-key-input__status"
        :class="statusClass"
      >
        {{ statusText }}
      </span>
      <button
        type="button"
        class="api-key-input__save"
        :disabled="inputValue === apiKey"
        @click="handleSave"
      >
        Save
      </button>
    </div>
  </div>
</template>

<style scoped>
.api-key-input {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.api-key-input__label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 500;
  color: #9ca3af;
}

.api-key-input__help-link {
  font-size: 12px;
  color: #4a9eff;
  text-decoration: none;
}

.api-key-input__help-link:hover {
  text-decoration: underline;
}

.api-key-input__wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #1e1e3a;
  border: 1px solid #2a2a4a;
  border-radius: 6px;
  padding-right: 12px;
  transition: border-color 0.2s;
}

.api-key-input__wrapper:focus-within {
  border-color: #4a9eff;
}

.api-key-input__input {
  flex: 1;
  padding: 10px 12px;
  background: none;
  border: none;
  font-size: 14px;
  font-family: monospace;
  color: #e0e0e0;
  outline: none;
}

.api-key-input__input::placeholder {
  color: #6b7280;
}

.api-key-input__toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  transition: color 0.2s;
}

.api-key-input__toggle:hover {
  color: #e0e0e0;
}

.api-key-input__toggle svg {
  width: 16px;
  height: 16px;
}

.api-key-input__status {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;
}

.api-key-input__status--valid {
  background-color: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

.api-key-input__status--invalid {
  background-color: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.api-key-input__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.api-key-input__save {
  padding: 8px 16px;
  background-color: #4a9eff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
  cursor: pointer;
  transition: background-color 0.2s, opacity 0.2s;
}

.api-key-input__save:hover:not(:disabled) {
  background-color: #3a8eef;
}

.api-key-input__save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
