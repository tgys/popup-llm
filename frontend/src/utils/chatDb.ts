import type { ChatMessage } from '@/types';

const STORAGE_KEY = 'llm-chat-state';

interface ChatState {
  messages: ChatMessage[];
  isGenerating: boolean;
  replyToMessageId: string | null;
}

export function saveChatState(state: ChatState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadChatState(): ChatState | null {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as ChatState;
  } catch {
    return null;
  }
}
