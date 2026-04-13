import { ref, onMounted, onUnmounted } from 'vue';
import type { WebSocketMessage } from '@/types';

const RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

export function useWebSocket(url: string = 'ws://localhost:8080') {
  const socket = ref<WebSocket | null>(null);
  const isConnected = ref(false);
  const error = ref<string | null>(null);

  const messageHandlers = new Map<string, Set<(payload: unknown) => void>>();
  const pendingMessages: WebSocketMessage[] = [];

  let reconnectDelay = RECONNECT_DELAY;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let shouldReconnect = true;

  function connect(): void {
    if (socket.value?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      socket.value = new WebSocket(url);

      socket.value.onopen = () => {
        isConnected.value = true;
        error.value = null;
        reconnectDelay = RECONNECT_DELAY;

        while (pendingMessages.length > 0) {
          const msg = pendingMessages.shift();
          if (msg) {
            send(msg);
          }
        }
      };

      socket.value.onclose = () => {
        isConnected.value = false;

        if (shouldReconnect) {
          scheduleReconnect();
        }
      };

      socket.value.onerror = (event) => {
        error.value = 'WebSocket connection error';
        console.error('WebSocket error:', event);
      };

      socket.value.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          handleMessage(message);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };
    } catch (e) {
      error.value = `Failed to connect: ${(e as Error).message}`;
      scheduleReconnect();
    }
  }

  function scheduleReconnect(): void {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }

    reconnectTimeout = setTimeout(() => {
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
      connect();
    }, reconnectDelay);
  }

  function disconnect(): void {
    shouldReconnect = false;

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    if (socket.value) {
      socket.value.close();
      socket.value = null;
    }

    isConnected.value = false;
  }

  function send(message: WebSocketMessage): void {
    if (socket.value?.readyState === WebSocket.OPEN) {
      socket.value.send(JSON.stringify(message));
    } else {
      pendingMessages.push(message);
    }
  }

  function handleMessage(message: WebSocketMessage): void {
    const handlers = messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => handler(message.payload));
    }

    if (message.id) {
      const idHandlers = messageHandlers.get(`id:${message.id}`);
      if (idHandlers) {
        idHandlers.forEach((handler) =>
          handler({ type: message.type, payload: message.payload })
        );
      }
    }
  }

  function on(
    type: string,
    handler: (payload: unknown) => void
  ): () => void {
    if (!messageHandlers.has(type)) {
      messageHandlers.set(type, new Set());
    }
    messageHandlers.get(type)!.add(handler);

    return () => {
      messageHandlers.get(type)?.delete(handler);
    };
  }

  function once(
    type: string,
    handler: (payload: unknown) => void
  ): () => void {
    const wrappedHandler = (payload: unknown) => {
      handler(payload);
      off(type, wrappedHandler);
    };
    return on(type, wrappedHandler);
  }

  function off(type: string, handler: (payload: unknown) => void): void {
    messageHandlers.get(type)?.delete(handler);
  }

  function request<T>(
    message: WebSocketMessage,
    _responseType: string,
    timeout = 30000
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = message.id ?? crypto.randomUUID();
      const messageWithId = { ...message, id };

      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Request timeout'));
      }, timeout);

      const cleanup = on(`id:${id}`, (response: unknown) => {
        clearTimeout(timeoutId);
        const { type, payload } = response as { type: string; payload: T };
        if (type === 'error') {
          reject(new Error((payload as { error: string }).error));
        } else {
          resolve(payload);
        }
      });

      send(messageWithId);
    });
  }

  onMounted(() => {
    connect();
  });

  onUnmounted(() => {
    disconnect();
  });

  return {
    socket,
    isConnected,
    error,
    connect,
    disconnect,
    send,
    on,
    once,
    off,
    request,
  };
}
