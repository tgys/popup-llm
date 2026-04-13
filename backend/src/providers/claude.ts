import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider } from './provider.js';
import type { ChatMessage, CloudModelInfo, InferenceOptions } from '../types.js';

const CLAUDE_MODELS: CloudModelInfo[] = [
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'claude',
    contextLength: 200000,
    description: 'Most intelligent model, best for complex tasks',
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'claude',
    contextLength: 200000,
    description: 'Fastest model, great for simple tasks',
  },
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'claude',
    contextLength: 200000,
    description: 'Powerful model for complex reasoning',
  },
];

export class ClaudeProvider implements LLMProvider {
  readonly name = 'Claude';

  async *streamChat(
    messages: ChatMessage[],
    modelId: string,
    apiKey: string,
    options: InferenceOptions,
    abortSignal?: AbortSignal
  ): AsyncGenerator<string, void, unknown> {
    const client = new Anthropic({ apiKey });

    const anthropicMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const systemMessage = messages.find((m) => m.role === 'system');

    const stream = client.messages.stream({
      model: modelId,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      top_p: options.topP,
      system: systemMessage?.content,
      messages: anthropicMessages,
    });

    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        stream.abort();
      });
    }

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const delta = event.delta;
        if ('text' in delta) {
          yield delta.text;
        }
      }
    }
  }

  listModels(): CloudModelInfo[] {
    return CLAUDE_MODELS;
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const client = new Anthropic({ apiKey });
      await client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }],
      });
      return true;
    } catch {
      return false;
    }
  }
}

export const claudeProvider = new ClaudeProvider();
