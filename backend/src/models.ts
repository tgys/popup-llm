import { readdir, stat, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import type { ModelInfo } from './types.js';

const MODELS_DIR = join(homedir(), '.llm-chat', 'models');

function parseQuantization(fileName: string): string {
  const quantMatch = fileName.match(/[_-](Q\d+_[KMS](?:_[KMS])?|Q\d+|F16|F32)/i);
  return quantMatch ? quantMatch[1].toUpperCase() : 'unknown';
}

function parseContextLength(fileName: string): number {
  const contextMatch = fileName.match(/(\d+)k/i);
  if (contextMatch) {
    return parseInt(contextMatch[1], 10) * 1024;
  }
  return 4096;
}

export async function ensureModelsDir(): Promise<void> {
  try {
    await mkdir(MODELS_DIR, { recursive: true });
  } catch {
    // Directory already exists
  }
}

export async function listLocalModels(): Promise<ModelInfo[]> {
  await ensureModelsDir();

  const models: ModelInfo[] = [];

  try {
    const files = await readdir(MODELS_DIR);

    for (const file of files) {
      if (!file.endsWith('.gguf')) {
        continue;
      }

      const filePath = join(MODELS_DIR, file);
      const fileStat = await stat(filePath);

      const modelName = file
        .replace('.gguf', '')
        .replace(/[_-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      models.push({
        id: file,
        name: modelName,
        path: filePath,
        size: fileStat.size,
        quantization: parseQuantization(file),
        contextLength: parseContextLength(file),
        loaded: false,
      });
    }
  } catch (error) {
    console.error('Error listing models:', error);
  }

  return models.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getModelInfo(modelId: string): Promise<ModelInfo | null> {
  const models = await listLocalModels();
  return models.find((m) => m.id === modelId) ?? null;
}

export async function modelExists(modelId: string): Promise<boolean> {
  const filePath = join(MODELS_DIR, modelId);
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export function getModelsDir(): string {
  return MODELS_DIR;
}
