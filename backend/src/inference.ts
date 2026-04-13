import {
  getLlama,
  LlamaModel,
  LlamaContext,
  LlamaChatSession,
  type Llama,
} from 'node-llama-cpp';
import type { ChatMessage, InferenceOptions } from './types.js';

export class InferenceEngine {
  private llama: Llama | null = null;
  private model: LlamaModel | null = null;
  private context: LlamaContext | null = null;
  private session: LlamaChatSession | null = null;
  private modelPath: string | null = null;

  async initialize(): Promise<void> {
    if (!this.llama) {
      this.llama = await getLlama();
    }
  }

  async loadModel(
    modelPath: string,
    gpuLayers?: number
  ): Promise<void> {
    await this.initialize();

    if (this.model) {
      await this.unloadModel();
    }

    this.model = await this.llama!.loadModel({
      modelPath,
      gpuLayers: gpuLayers ?? 'auto',
    });

    this.context = await this.model.createContext({
      contextSize: 4096,
    });

    this.session = new LlamaChatSession({
      contextSequence: this.context.getSequence(),
    });

    this.modelPath = modelPath;
  }

  async unloadModel(): Promise<void> {
    if (this.session) {
      this.session = null;
    }

    if (this.context) {
      await this.context.dispose();
      this.context = null;
    }

    if (this.model) {
      await this.model.dispose();
      this.model = null;
    }

    this.modelPath = null;
  }

  async *streamChat(
    prompt: string,
    options: InferenceOptions,
    abortSignal?: AbortSignal
  ): AsyncGenerator<string, void, unknown> {
    if (!this.session) {
      throw new Error('No session available');
    }

    let resolve: ((value: string | null) => void) | null = null;
    const queue: string[] = [];
    let done = false;

    const promptPromise = this.session.prompt(prompt, {
      maxTokens: options.maxTokens,
      temperature: options.temperature,
      topP: options.topP,
      signal: abortSignal,
      onTextChunk: (chunk) => {
        if (resolve) {
          resolve(chunk);
          resolve = null;
        } else {
          queue.push(chunk);
        }
      },
    });

    promptPromise.then(() => {
      done = true;
      if (resolve) {
        resolve(null);
      }
    }).catch(() => {
      done = true;
      if (resolve) {
        resolve(null);
      }
    });

    while (!done || queue.length > 0) {
      if (queue.length > 0) {
        yield queue.shift()!;
      } else if (!done) {
        const chunk = await new Promise<string | null>((r) => {
          resolve = r;
        });
        if (chunk !== null) {
          yield chunk;
        }
      }
    }
  }

  resetSession(): void {
    if (this.context && this.model) {
      this.session = new LlamaChatSession({
        contextSequence: this.context.getSequence(),
      });
    }
  }

  isModelLoaded(): boolean {
    return this.model !== null;
  }

  getLoadedModelPath(): string | null {
    return this.modelPath;
  }
}

export const inferenceEngine = new InferenceEngine();
