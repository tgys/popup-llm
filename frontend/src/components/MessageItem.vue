<script setup lang="ts">
import { computed } from 'vue';
import { marked } from 'marked';
import type { ChatMessage } from '@/types';

const props = defineProps<{
  message: ChatMessage;
  isReplyTarget?: boolean;
  isIgnored?: boolean;
}>();

const emit = defineEmits<{
  (e: 'select-reply', messageId: string): void;
}>();

const isUser = computed(() => props.message.role === 'user');
const isSystem = computed(() => props.message.role === 'system');

function handleReplyClick(): void {
  emit('select-reply', props.message.id);
}

const renderedContent = computed(() => {
  if (isUser.value) {
    return props.message.content;
  }

  try {
    return marked.parse(props.message.content, {
      breaks: true,
      gfm: true,
    });
  } catch {
    return props.message.content;
  }
});

const timestamp = computed(() => {
  const date = new Date(props.message.timestamp);
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
});
</script>

<template>
  <div
    class="message"
    :class="{
      'message--user': isUser,
      'message--assistant': !isUser && !isSystem,
      'message--system': isSystem,
      'message--streaming': message.streaming,
      'message--reply-target': isReplyTarget,
      'message--ignored': isIgnored,
    }"
  >
    <div class="message__avatar">
      <span v-if="isUser">U</span>
      <span v-else-if="isSystem">S</span>
      <span v-else>A</span>
    </div>
    <div class="message__content">
      <div class="message__header">
        <span class="message__role">
          {{ isUser ? 'You' : isSystem ? 'System' : 'Assistant' }}
        </span>
        <span class="message__time">{{ timestamp }}</span>
        <button
          v-if="!message.streaming"
          class="message__reply-btn"
          :class="{ 'message__reply-btn--active': isReplyTarget }"
          @click="handleReplyClick"
          :title="isReplyTarget ? 'Clear reply selection' : 'Reply from this message'"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 10h10a5 5 0 0 1 5 5v6" />
            <path d="M7 6l-4 4 4 4" />
          </svg>
          <span v-if="isReplyTarget">Replying from here</span>
        </button>
      </div>
      <div
        v-if="isUser"
        class="message__text"
      >
        {{ renderedContent }}
      </div>
      <div
        v-else
        class="message__text message__text--markdown"
        v-html="renderedContent"
      />
      <span
        v-if="message.streaming"
        class="message__cursor"
      />
    </div>
    <div v-if="isIgnored" class="message__ignored-badge">ignored</div>
  </div>
</template>

<style scoped>
.message {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--theme-border);
}

.message--user {
  background-color: var(--theme-panel);
}

.message--assistant {
  background-color: var(--theme-header-soft);
}

.message--system {
  background-color: var(--theme-hover);
  font-style: italic;
}

.message__avatar {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.message--user .message__avatar {
  background-color: var(--theme-accent);
  color: var(--theme-contrast);
}

.message--assistant .message__avatar {
  background-color: #8b5cf6;
  color: var(--theme-contrast);
}

.message--system .message__avatar {
  background-color: var(--theme-text-muted);
  color: var(--theme-contrast);
}

.message__content {
  flex: 1;
  min-width: 0;
}

.message__header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.message__role {
  font-weight: 600;
  font-size: 14px;
  color: var(--theme-text);
}

.message__time {
  font-size: 12px;
  color: var(--theme-text-muted);
}

.message__text {
  font-size: 10px;
  line-height: 1.1;
  color: var(--theme-text-strong);
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: inherit;
}

.message__text--markdown :deep(p) {
  margin: 0 0 0.15em;
}

.message__text--markdown :deep(p:last-child) {
  margin-bottom: 0;
}

.message__text--markdown :deep(code) {
  background-color: var(--theme-hover);
  padding: 1px 4px;
  border-radius: 3px;
  font-family: inherit;
  font-size: 10px;
}

.message__text--markdown :deep(pre) {
  background-color: var(--theme-panel-soft);
  padding: 0.15em 0.5em;
  border-radius: 4px;
  overflow-x: auto;
  margin: 0.15em 0;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.message__text--markdown :deep(pre code) {
  background: none;
  padding: 0;
}

.message__text--markdown :deep(ul),
.message__text--markdown :deep(ol) {
  margin: 0.15em 0;
  padding-left: 1.5em;
}

.message__text--markdown :deep(li) {
  margin: 0;
}

.message__text--markdown :deep(li p) {
  margin: 0;
}

.message__text--markdown :deep(blockquote) {
  border-left: 2px solid var(--theme-accent);
  padding-left: 0.5em;
  margin: 0.15em 0;
  color: var(--theme-text-soft);
}

.message__text--markdown :deep(a) {
  color: var(--theme-accent);
  text-decoration: none;
}

.message__text--markdown :deep(a:hover) {
  text-decoration: underline;
}

.message__cursor {
  display: inline-block;
  width: 8px;
  height: 18px;
  background-color: var(--theme-accent);
  margin-left: 2px;
  animation: blink 1s infinite;
  vertical-align: text-bottom;
}

@keyframes blink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0;
  }
}

.message--streaming .message__text {
  min-height: 24px;
}

.message--reply-target {
  background-color: var(--theme-selected) !important;
  border-left: 3px solid var(--theme-accent);
}

.message--ignored {
  opacity: 0.4;
  position: relative;
}

.message__ignored-badge {
  position: absolute;
  top: 8px;
  right: 12px;
  font-size: 9px;
  color: var(--theme-text-muted);
  background-color: var(--theme-hover);
  padding: 2px 6px;
  border-radius: 3px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.message__reply-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 3px;
  color: var(--theme-text-muted);
  font-size: 10px;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s;
  margin-left: auto;
}

.message:hover .message__reply-btn {
  opacity: 1;
}

.message__reply-btn:hover {
  color: var(--theme-accent);
  border-color: var(--theme-border-strong);
  background-color: var(--theme-accent-soft);
}

.message__reply-btn--active {
  opacity: 1 !important;
  color: var(--theme-accent);
  border-color: var(--theme-accent);
  background-color: var(--theme-accent-soft);
}

.message__reply-btn svg {
  width: 12px;
  height: 12px;
}
</style>
