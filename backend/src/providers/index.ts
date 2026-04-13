import type { ProviderType } from '../types.js';
import type { LLMProvider } from './provider.js';
import { claudeProvider } from './claude.js';
import { openaiProvider } from './openai.js';
import { mistralProvider } from './mistral.js';

export type { LLMProvider } from './provider.js';

const providers: Record<Exclude<ProviderType, 'local'>, LLMProvider> = {
  claude: claudeProvider,
  openai: openaiProvider,
  mistral: mistralProvider,
};

export function getProvider(providerType: ProviderType): LLMProvider | null {
  if (providerType === 'local') {
    return null;
  }
  return providers[providerType] ?? null;
}

export function isCloudProvider(providerType: ProviderType): boolean {
  return providerType !== 'local';
}

export { claudeProvider, openaiProvider, mistralProvider };
