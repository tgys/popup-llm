import { useChatStore } from '@/stores/chat';
import type { WebSocketMessage, ProviderType, CloudModelInfo } from '@/types';

export function useProviders(
  send: (message: WebSocketMessage) => void,
  on: (type: string, handler: (payload: unknown) => void) => () => void
) {
  const store = useChatStore();

  function setupHandlers(): () => void {
    const cleanups: (() => void)[] = [];

    cleanups.push(
      on('cloud_models_list', (payload) => {
        const { provider, models } = payload as {
          provider: ProviderType;
          models: CloudModelInfo[];
        };
        store.setCloudModels(provider, models);
      })
    );

    cleanups.push(
      on('api_key_valid', (payload) => {
        const { provider, valid } = payload as {
          provider: ProviderType;
          valid: boolean;
        };
        store.setApiKeyValidation(provider, valid);
      })
    );

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }

  function listCloudModels(provider: ProviderType): void {
    send({
      type: 'list_cloud_models',
      id: crypto.randomUUID(),
      payload: { provider },
    });
  }

  function validateApiKey(provider: ProviderType, apiKey: string): void {
    store.setApiKeyValidation(provider, null);
    send({
      type: 'validate_api_key',
      id: crypto.randomUUID(),
      payload: { provider, apiKey },
    });
  }

  function setProvider(provider: ProviderType): void {
    store.setProvider(provider);
    if (provider !== 'local') {
      listCloudModels(provider);
    }
  }

  function setCloudModel(modelId: string): void {
    store.setCloudModel(modelId);
  }

  function setApiKey(provider: ProviderType, apiKey: string): void {
    store.setApiKey(provider, apiKey);
    if (apiKey) {
      validateApiKey(provider, apiKey);
    } else {
      store.setApiKeyValidation(provider, null);
    }
  }

  return {
    setupHandlers,
    listCloudModels,
    validateApiKey,
    setProvider,
    setCloudModel,
    setApiKey,
  };
}
