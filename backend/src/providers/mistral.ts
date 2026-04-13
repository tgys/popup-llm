import { Mistral } from '@mistralai/mistralai';
import type { LLMProvider } from './provider.js';
import type { ChatMessage, CloudModelInfo, InferenceOptions } from '../types.js';

const MISTRAL_MODELS: CloudModelInfo[] = [
  {
    id: 'mistral-large-latest',
    name: 'Mistral Large',
    provider: 'mistral',
    contextLength: 128000,
    description: 'Most capable Mistral model',
  },
  {
    id: 'mistral-medium-latest',
    name: 'Mistral Medium',
    provider: 'mistral',
    contextLength: 32000,
    description: 'Balanced performance and cost',
  },
  {
    id: 'mistral-small-latest',
    name: 'Mistral Small',
    provider: 'mistral',
    contextLength: 32000,
    description: 'Fast and affordable model',
  },
  {
    id: 'open-mistral-nemo',
    name: 'Mistral Nemo',
    provider: 'mistral',
    contextLength: 128000,
    description: 'Open-source 12B model',
  },
  {
    id: 'codestral-latest',
    name: 'Codestral',
    provider: 'mistral',
    contextLength: 32000,
    description: 'Specialized for code generation',
  },
];

export class MistralProvider implements LLMProvider {
  readonly name = 'Mistral';

  async *streamChat(
    messages: ChatMessage[],
    modelId: string,
    apiKey: string,
    options: InferenceOptions,
    abortSignal?: AbortSignal
  ): AsyncGenerator<string, void, unknown> {
    const client = new Mistral({ apiKey });

    const mistralMessages = messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    const stream = await client.chat.stream({
      model: modelId,
      messages: mistralMessages,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
      topP: options.topP,
    });

    for await (const event of stream) {
      if (abortSignal?.aborted) {
        break;
      }
      const content = event.data.choices[0]?.delta?.content;
      if (content && typeof content === 'string') {
        yield content;
      }
    }
  }

  listModels(): CloudModelInfo[] {
    return MISTRAL_MODELS;
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const client = new Mistral({ apiKey });
      await client.models.list();
      return true;
    } catch {
      return false;
    }
  }
}

export const mistralProvider = new MistralProvider();
