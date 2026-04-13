<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { RecycleScroller } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import MessageItem from './MessageItem.vue';
import { useChatStore } from '@/stores/chat';
import type { ChatMessage } from '@/types';

const props = defineProps<{
  messages: ChatMessage[];
}>();

const store = useChatStore();

function handleSelectReply(messageId: string): void {
  // Toggle selection - if already selected, clear it
  if (store.replyToMessageId === messageId) {
    store.setReplyToMessage(null);
  } else {
    store.setReplyToMessage(messageId);
  }
}

function isMessageIgnored(messageId: string): boolean {
  if (!store.replyToMessageId) return false;
  const replyIndex = props.messages.findIndex((m) => m.id === store.replyToMessageId);
  const messageIndex = props.messages.findIndex((m) => m.id === messageId);
  return messageIndex > replyIndex;
}

const scrollerRef = ref<InstanceType<typeof RecycleScroller> | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const autoScroll = ref(true);

function scrollToBottom(): void {
  if (!autoScroll.value) return;

  nextTick(() => {
    if (containerRef.value) {
      containerRef.value.scrollTop = containerRef.value.scrollHeight;
    }
  });
}

function handleScroll(event: Event): void {
  const target = event.target as HTMLDivElement;
  const isAtBottom =
    target.scrollHeight - target.scrollTop - target.clientHeight < 50;
  autoScroll.value = isAtBottom;
}

watch(
  () => props.messages.length,
  () => {
    scrollToBottom();
  }
);

watch(
  () => props.messages[props.messages.length - 1]?.content,
  () => {
    scrollToBottom();
  }
);

defineExpose({
  scrollToBottom,
});
</script>

<template>
  <div
    ref="containerRef"
    class="message-list"
    @scroll="handleScroll"
  >
    <div
      v-if="messages.length === 0"
      class="message-list__empty"
    >
      <div class="message-list__empty-icon">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <h3>Start a Conversation</h3>
      <p>Load a model and send a message to begin chatting.</p>
    </div>

    <template v-else>
      <RecycleScroller
        v-if="messages.length > 50"
        ref="scrollerRef"
        class="scroller"
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
            @select-reply="handleSelectReply"
          />
        </template>
      </RecycleScroller>

      <div
        v-else
        class="message-list__simple"
      >
        <MessageItem
          v-for="message in messages"
          :key="message.id"
          :message="message"
          :is-reply-target="store.replyToMessageId === message.id"
          :is-ignored="isMessageIgnored(message.id)"
          @select-reply="handleSelectReply"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.message-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.message-list__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6b7280;
  text-align: center;
  padding: 40px;
}

.message-list__empty-icon {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.message-list__empty-icon svg {
  width: 100%;
  height: 100%;
}

.message-list__empty h3 {
  font-size: 18px;
  font-weight: 600;
  color: #9ca3af;
  margin-bottom: 8px;
}

.message-list__empty p {
  font-size: 14px;
  max-width: 300px;
}

.scroller {
  height: 100%;
}

.message-list__simple {
  display: flex;
  flex-direction: column;
}
</style>
