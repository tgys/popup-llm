import { ref } from 'vue';
import { useChatStore } from '@/stores/chat';
import type { ChatMessage, WebSocketMessage } from '@/types';

export function useChat(
  send: (message: WebSocketMessage) => void,
  on: (type: string, handler: (payload: unknown) => void) => () => void
) {
  const store = useChatStore();
  const currentRequestId = ref<string | null>(null);
  const currentAssistantMessageId = ref<string | null>(null);

  function setupHandlers(): () => void {
    const cleanups: (() => void)[] = [];

    cleanups.push(
      on('chat_token', (payload) => {
        const { token } = payload as { token: string };
        if (currentAssistantMessageId.value) {
          store.appendToMessage(currentAssistantMessageId.value, token);
        }
      })
    );

    cleanups.push(
      on('chat_complete', () => {
        if (currentAssistantMessageId.value) {
          store.setMessageStreaming(currentAssistantMessageId.value, false);
        }
        store.setGenerating(false);
        currentRequestId.value = null;
        currentAssistantMessageId.value = null;
      })
    );

    cleanups.push(
      on('chat_error', (payload) => {
        const { error } = payload as { error: string };
        store.setError(error);
        store.setGenerating(false);

        if (currentAssistantMessageId.value) {
          store.updateMessage(
            currentAssistantMessageId.value,
            `Error: ${error}`
          );
          store.setMessageStreaming(currentAssistantMessageId.value, false);
        }

        currentRequestId.value = null;
        currentAssistantMessageId.value = null;
      })
    );

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }

  function sendMessage(content: string): void {
    if (!content.trim() || store.isGenerating) {
      return;
    }

    const isCloud = store.isCloudProvider;

    // Validate model is available
    if (isCloud) {
      if (!store.settings.currentCloudModel) {
        store.setError('No model selected. Please select a model first.');
        return;
      }
      if (!store.currentApiKey) {
        store.setError('API key required. Please enter your API key in settings.');
        return;
      }
    } else {
      if (!store.loadedModel) {
        store.setError('No model loaded. Please load a model first.');
        return;
      }
    }

    // Get messages for LLM context (up to reply point if set, otherwise all)
    const contextMessages = store.getMessagesForReply();

    // Clear reply selection
    if (store.replyToMessageId) {
      store.setReplyToMessage(null);
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };

    store.addMessage(userMessage);

    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      streaming: true,
    };

    store.addMessage(assistantMessage);
    currentAssistantMessageId.value = assistantMessage.id;

    const requestId = crypto.randomUUID();
    currentRequestId.value = requestId;
    store.setGenerating(true);
    store.setError(null);

    const modelId = isCloud
      ? store.settings.currentCloudModel!
      : store.loadedModel!.id;

    send({
      type: 'chat',
      id: requestId,
      payload: {
        messages: [...contextMessages, userMessage].filter((m) => !m.streaming),
        modelId,
        temperature: store.settings.temperature,
        maxTokens: store.settings.maxTokens,
        topP: store.settings.topP,
        provider: store.settings.currentProvider,
        apiKey: isCloud ? store.currentApiKey : undefined,
      },
    });
  }

  function stopGeneration(): void {
    if (currentAssistantMessageId.value) {
      store.setMessageStreaming(currentAssistantMessageId.value, false);
    }
    store.setGenerating(false);
    currentRequestId.value = null;
    currentAssistantMessageId.value = null;
  }

  function clearChat(): void {
    store.clearMessages();
    store.setError(null);
  }

  return {
    sendMessage,
    stopGeneration,
    clearChat,
    setupHandlers,
    isGenerating: store.isGenerating,
  };
}
