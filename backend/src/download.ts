import { createWriteStream } from 'fs';
import { rename, unlink, stat } from 'fs/promises';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { listFiles, downloadFile } from '@huggingface/hub';
import type {
  HuggingFaceModel,
  HuggingFaceFile,
  DownloadProgress,
} from './types.js';
import { getModelsDir, ensureModelsDir } from './models.js';

const HF_API_URL = 'https://huggingface.co/api';

export async function searchModels(
  query?: string,
  limit = 20
): Promise<HuggingFaceModel[]> {
  const searchUrl = new URL(`${HF_API_URL}/models`);
  if (query) searchUrl.searchParams.set('search', query);
  searchUrl.searchParams.set('filter', 'gguf');
  searchUrl.searchParams.set('sort', 'downloads');
  searchUrl.searchParams.set('direction', '-1');
  searchUrl.searchParams.set('limit', limit.toString());

  const response = await fetch(searchUrl.toString());

  if (!response.ok) {
    throw new Error(`HuggingFace API error: ${response.statusText}`);
  }

  const data = (await response.json()) as Array<{
    id: string;
    author?: string;
    downloads?: number;
    likes?: number;
    tags?: string[];
  }>;

  const models: HuggingFaceModel[] = [];

  for (const item of data) {
    const [author, name] = item.id.includes('/')
      ? item.id.split('/')
      : ['unknown', item.id];

    const files = await getModelFiles(item.id);

    models.push({
      id: item.id,
      author: author,
      name: name,
      downloads: item.downloads ?? 0,
      likes: item.likes ?? 0,
      tags: item.tags ?? [],
      files: files.filter((f) => f.name.endsWith('.gguf')),
    });
  }

  return models;
}

async function getModelFiles(repoId: string): Promise<HuggingFaceFile[]> {
  const files: HuggingFaceFile[] = [];

  try {
    for await (const file of listFiles({ repo: repoId })) {
      if (file.type === 'file' && file.path.endsWith('.gguf')) {
        const quantMatch = file.path.match(
          /[_-](Q\d+_[KMS](?:_[KMS])?|Q\d+|F16|F32)/i
        );

        files.push({
          name: file.path,
          size: file.size,
          quantization: quantMatch ? quantMatch[1].toUpperCase() : undefined,
        });
      }
    }
  } catch (error) {
    console.error(`Error listing files for ${repoId}:`, error);
  }

  return files;
}

export async function downloadModel(
  repoId: string,
  fileName: string,
  onProgress: (progress: DownloadProgress) => void,
  abortSignal?: AbortSignal
): Promise<string> {
  await ensureModelsDir();

  const modelsDir = getModelsDir();
  const outputFileName = `${repoId.replace('/', '_')}_${fileName}`;
  const outputPath = join(modelsDir, outputFileName);
  const tempPath = `${outputPath}.download`;

  let startByte = 0;
  try {
    const tempStat = await stat(tempPath);
    startByte = tempStat.size;
  } catch {
    // No partial download exists
  }

  const response = await downloadFile({
    repo: repoId,
    path: fileName,
    range: startByte > 0 ? [startByte, Infinity] as [number, number] : undefined,
  });

  if (!response) {
    throw new Error('Failed to start download');
  }

  const totalSize = parseInt(
    response.headers.get('content-length') ?? '0',
    10
  ) + startByte;

  let downloaded = startByte;
  let lastTime = Date.now();
  let lastDownloaded = downloaded;

  const progressTracker = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      downloaded += chunk.length;

      const now = Date.now();
      const elapsed = (now - lastTime) / 1000;

      if (elapsed >= 0.5) {
        const speed = (downloaded - lastDownloaded) / elapsed;
        const remaining = totalSize - downloaded;
        const eta = speed > 0 ? remaining / speed : 0;

        onProgress({
          modelId: repoId,
          fileName,
          downloaded,
          total: totalSize,
          speed,
          eta,
        });

        lastTime = now;
        lastDownloaded = downloaded;
      }

      controller.enqueue(chunk);
    },
  });

  const writeStream = createWriteStream(tempPath, {
    flags: startByte > 0 ? 'a' : 'w',
  });

  const body = response.body;
  if (!body) {
    throw new Error('Response body is null');
  }

  const reader = body.pipeThrough(progressTracker).getReader();
  const nodeStream = new Readable({
    async read() {
      try {
        const { done, value } = await reader.read();
        if (done) {
          this.push(null);
        } else {
          this.push(Buffer.from(value));
        }
      } catch (error) {
        this.destroy(error as Error);
      }
    },
  });

  if (abortSignal) {
    abortSignal.addEventListener('abort', () => {
      nodeStream.destroy();
      writeStream.destroy();
    });
  }

  try {
    await pipeline(nodeStream, writeStream);
    await rename(tempPath, outputPath);

    onProgress({
      modelId: repoId,
      fileName,
      downloaded: totalSize,
      total: totalSize,
      speed: 0,
      eta: 0,
    });

    return outputPath;
  } catch (error) {
    if (abortSignal?.aborted) {
      throw new Error('Download cancelled');
    }
    throw error;
  }
}

export async function cancelDownload(tempPath: string): Promise<void> {
  try {
    await unlink(tempPath);
  } catch {
    // File may not exist
  }
}
