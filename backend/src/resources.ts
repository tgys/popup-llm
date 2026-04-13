import { freemem, totalmem } from 'os';
import { statfs } from 'fs/promises';
import { dirname } from 'path';
import type { ModelInfo } from './types.js';

// Configurable via environment variables
const MEMORY_MULTIPLIER = parseFloat(process.env.MEMORY_MULTIPLIER ?? '1.8');
const MIN_FREE_MEMORY_BUFFER = parseInt(
  process.env.MIN_FREE_MEMORY_BUFFER ?? String(512 * 1024 * 1024),
  10
);
const MIN_TEMP_DISK_SPACE = parseInt(
  process.env.MIN_TEMP_DISK_SPACE ?? String(100 * 1024 * 1024),
  10
);

export interface ResourceCheckResult {
  success: boolean;
  error?: string;
}

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) {
    return `${gb.toFixed(2)}GB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)}MB`;
}

export function estimateRequiredMemory(modelInfo: ModelInfo): number {
  // GGUF models typically need ~1.5-2x file size in RAM
  // We use 1.8x as a conservative estimate plus some overhead for context
  const baseMemory = modelInfo.size * MEMORY_MULTIPLIER;
  // Add ~50MB overhead for context buffers and misc allocations
  const overhead = 50 * 1024 * 1024;
  return baseMemory + overhead;
}

export function checkMemoryAvailability(modelInfo: ModelInfo): ResourceCheckResult {
  const requiredMemory = estimateRequiredMemory(modelInfo);
  const availableMemory = freemem();
  const totalMemory = totalmem();

  // Need required memory plus a buffer for system stability
  const totalRequired = requiredMemory + MIN_FREE_MEMORY_BUFFER;

  if (availableMemory < totalRequired) {
    return {
      success: false,
      error: `Insufficient memory to load model. Required: ~${formatBytes(requiredMemory)}, Available: ${formatBytes(availableMemory)} (Total: ${formatBytes(totalMemory)}). Try closing other applications or using a smaller quantization.`,
    };
  }

  return { success: true };
}

export async function checkDiskSpace(modelPath: string): Promise<ResourceCheckResult> {
  try {
    const modelDir = dirname(modelPath);
    const stats = await statfs(modelDir);
    const availableSpace = stats.bavail * stats.bsize;

    if (availableSpace < MIN_TEMP_DISK_SPACE) {
      return {
        success: false,
        error: `Insufficient disk space. Available: ${formatBytes(availableSpace)}, Required: ${formatBytes(MIN_TEMP_DISK_SPACE)} minimum for temporary files.`,
      };
    }

    return { success: true };
  } catch (error) {
    // If we can't check disk space, allow the load to proceed
    console.warn('Could not check disk space:', error);
    return { success: true };
  }
}

export async function checkResourcesForModelLoad(
  modelInfo: ModelInfo
): Promise<ResourceCheckResult> {
  // Check memory first as it's the most common issue
  const memoryCheck = checkMemoryAvailability(modelInfo);
  if (!memoryCheck.success) {
    return memoryCheck;
  }

  // Check disk space for temp files
  const diskCheck = await checkDiskSpace(modelInfo.path);
  if (!diskCheck.success) {
    return diskCheck;
  }

  return { success: true };
}
