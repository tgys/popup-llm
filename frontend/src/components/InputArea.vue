<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  disabled?: boolean;
  isGenerating?: boolean;
  modelLoaded?: boolean;
}>();

const emit = defineEmits<{
  send: [message: string];
  stop: [];
}>();

const input = ref('');
const textareaRef = ref<HTMLTextAreaElement | null>(null);

const canSend = computed(
  () => input.value.trim().length > 0 && props.modelLoaded && !props.isGenerating
);

const placeholder = computed(() => {
  if (!props.modelLoaded) {
    return 'Load a model to start chatting...';
  }
  if (props.isGenerating) {
    return 'Generating response...';
  }
  return 'Type a message... (Shift+Enter for new line)';
});

function handleSubmit(): void {
  if (!canSend.value) return;

  emit('send', input.value);
  input.value = '';
  adjustHeight();
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    handleSubmit();
  }
}

function handleStop(): void {
  emit('stop');
}

function adjustHeight(): void {
  const textarea = textareaRef.value;
  if (!textarea) return;

  textarea.style.height = 'auto';
  const newHeight = Math.min(textarea.scrollHeight, 200);
  textarea.style.height = `${newHeight}px`;
}

function handleInput(): void {
  adjustHeight();
}
</script>

<template>
  <div class="input-area">
    <div class="input-area__container">
      <textarea
        ref="textareaRef"
        v-model="input"
        class="input-area__textarea"
        :placeholder="placeholder"
        :disabled="disabled || !modelLoaded"
        rows="1"
        @keydown="handleKeydown"
        @input="handleInput"
      />
      <div class="input-area__actions">
        <button
          v-if="isGenerating"
          class="input-area__button input-area__button--stop"
          @click="handleStop"
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <rect
              x="6"
              y="6"
              width="12"
              height="12"
              rx="2"
            />
          </svg>
          Stop
        </button>
        <button
          v-else
          class="input-area__button input-area__button--send"
          :disabled="!canSend"
          @click="handleSubmit"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
          Send
        </button>
      </div>
    </div>
    <div class="input-area__hint">
      Press Enter to send, Shift+Enter for new line
    </div>
  </div>
</template>

<style scoped>
.input-area {
  padding: 4px 10px;
  background-color: var(--theme-header);
  border-top: 1px solid var(--theme-border);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.input-area__container {
  display: flex;
  gap: 6px;
  align-items: flex-end;
  background-color: var(--theme-panel-soft);
  border: 1px solid var(--theme-border);
  border-radius: 4px;
  padding: 4px 8px;
  transition: border-color 0.2s;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.input-area__container:focus-within {
  border-color: var(--theme-accent);
}

.input-area__textarea {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: var(--theme-text);
  font-size: 10px;
  line-height: 1.2;
  resize: none;
  font-family: inherit;
  min-height: 14px;
  max-height: 100px;
}

.input-area__textarea::placeholder {
  color: var(--theme-text-muted);
}

.input-area__textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.input-area__actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.input-area__button {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  border: none;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.input-area__button svg {
  width: 10px;
  height: 10px;
}

.input-area__button--send {
  background-color: var(--theme-accent);
  color: var(--theme-contrast);
}

.input-area__button--send:hover:not(:disabled) {
  background-color: var(--theme-accent-hover);
}

.input-area__button--send:disabled {
  background-color: var(--theme-hover);
  color: var(--theme-text-muted);
  cursor: not-allowed;
}

.input-area__button--stop {
  background-color: var(--theme-danger);
  color: var(--theme-contrast);
}

.input-area__button--stop:hover {
  background-color: var(--theme-danger-hover);
}

.input-area__hint {
  margin-top: 2px;
  font-size: 8px;
  color: var(--theme-text-muted);
  text-align: center;
  font-family: inherit;
}
</style>
