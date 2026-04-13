import OpenAI from 'openai';
import type { LLMProvider } from './provider.js';
import type { ChatMessage, CloudModelInfo, InferenceOptions } from '../types.js';

const OPENAI_MODELS: CloudModelInfo[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    contextLength: 128000,
    description: 'Most capable GPT-4 model',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    contextLength: 128000,
    description: 'Affordable and fast GPT-4 model',
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    contextLength: 128000,
    description: 'GPT-4 Turbo with vision capabilities',
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    contextLength: 16385,
    description: 'Fast and affordable model',
  },
];

export class OpenAIProvider implements LLMProvider {
  readonly name = 'OpenAI';

  async *streamChat(
    messages: ChatMessage[],
    modelId: string,
    apiKey: string,
    options: InferenceOptions,
    abortSignal?: AbortSignal
  ): AsyncGenerator<string, void, unknown> {
    const client = new OpenAI({ apiKey });

    const openaiMessages = messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    const stream = await client.chat.completions.create({
      model: modelId,
      messages: openaiMessages,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      top_p: options.topP,
      stream: true,
    });

    for await (const chunk of stream) {
      if (abortSignal?.aborted) {
        break;
      }
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  listModels(): CloudModelInfo[] {
    return OPENAI_MODELS;
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const client = new OpenAI({ apiKey });
      await client.models.list();
      return true;
    } catch {
      return false;
    }
  }
}

export const openaiProvider = new OpenAIProvider();
