import type { ChatMessage, CloudModelInfo, InferenceOptions } from '../types.js';

export interface LLMProvider {
  readonly name: string;

  streamChat(
    messages: ChatMessage[],
    modelId: string,
    apiKey: string,
    options: InferenceOptions,
    abortSignal?: AbortSignal
  ): AsyncGenerator<string, void, unknown>;

  listModels(): CloudModelInfo[];

  validateApiKey(apiKey: string): Promise<boolean>;
}
