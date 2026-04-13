<script setup lang="ts">
import { ref, computed } from 'vue';
import type { HuggingFaceModel, HuggingFaceFile, DownloadProgress } from '@/types';
import { formatSize, formatSpeed, formatEta, formatNumber } from '@/utils/formatters';

const props = defineProps<{
  searchResults: HuggingFaceModel[];
  activeDownloads: Map<string, DownloadProgress>;
  isSearching: boolean;
}>();

const emit = defineEmits<{
  search: [query: string];
  download: [repoId: string, fileName: string];
  loadPopular: [];
}>();

const searchQuery = ref('');
const expandedModels = ref<Set<string>>(new Set());
const hasSearched = ref(false);

const activeDownloadsList = computed(() =>
  Array.from(props.activeDownloads.entries()).map(([id, progress]) => ({ id, ...progress }))
);

const showingPopular = computed(() => !hasSearched.value && props.searchResults.length > 0);

function handleSearch(): void {
  if (searchQuery.value.trim()) {
    hasSearched.value = true;
    emit('search', searchQuery.value.trim());
  }
}

function toggleExpand(modelId: string): void {
  expandedModels.value.has(modelId) ? expandedModels.value.delete(modelId) : expandedModels.value.add(modelId);
}

function handleDownload(repoId: string, file: HuggingFaceFile): void {
  emit('download', repoId, file.name);
}

function isDownloading(repoId: string, fileName: string): boolean {
  return props.activeDownloads.has(`${repoId}/${fileName}`);
}

function getProgressPercent(progress: DownloadProgress): number {
  return progress.total === 0 ? 0 : Math.round((progress.downloaded / progress.total) * 100);
}
</script>

<template>
  <div class="download-manager">
    <div class="download-manager__search">
      <input
        v-model="searchQuery"
        type="text"
        class="download-manager__input"
        placeholder="Search HuggingFace for GGUF models..."
        @keydown.enter="handleSearch"
      />
      <button
        class="download-manager__search-btn"
        :disabled="isSearching || !searchQuery.trim()"
        @click="handleSearch"
      >
        <span v-if="isSearching" class="download-manager__spinner" />
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
      </button>
    </div>

    <div v-if="activeDownloadsList.length > 0" class="download-manager__active">
      <h3>Active Downloads</h3>
      <div v-for="download in activeDownloadsList" :key="download.id" class="download-manager__progress">
        <div class="download-manager__progress-info">
          <span class="download-manager__progress-name">{{ download.fileName }}</span>
          <span class="download-manager__progress-stats">
            {{ formatSize(download.downloaded) }} / {{ formatSize(download.total) }}
            · {{ formatSpeed(download.speed) }} · ETA {{ formatEta(download.eta) }}
          </span>
        </div>
        <div class="download-manager__progress-bar">
          <div class="download-manager__progress-fill" :style="{ width: `${getProgressPercent(download)}%` }" />
        </div>
        <span class="download-manager__progress-percent">{{ getProgressPercent(download) }}%</span>
      </div>
    </div>

    <div class="download-manager__results">
      <div v-if="isSearching" class="download-manager__loading">
        <span class="download-manager__spinner" /><span>Loading...</span>
      </div>

      <div v-else-if="searchResults.length === 0" class="download-manager__empty">
        Search for models on HuggingFace to download them.
      </div>

      <template v-else>
        <h3 v-if="showingPopular" class="download-manager__section-title">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
          </svg>
          Popular Models
        </h3>

        <div v-for="model in searchResults" :key="model.id" class="download-manager__model">
          <div class="download-manager__model-header" @click="toggleExpand(model.id)">
            <div class="download-manager__model-info">
              <span class="download-manager__model-name">{{ model.name }}</span>
              <span class="download-manager__model-author">by {{ model.author }}</span>
            </div>
            <div class="download-manager__model-stats">
              <span class="download-manager__stat">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                {{ formatNumber(model.downloads) }}
              </span>
              <span class="download-manager__stat">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                {{ formatNumber(model.likes) }}
              </span>
            </div>
            <svg
              class="download-manager__expand-icon"
              :class="{ 'download-manager__expand-icon--open': expandedModels.has(model.id) }"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>

          <Transition name="expand">
            <div v-if="expandedModels.has(model.id)" class="download-manager__model-files">
              <div v-for="file in model.files" :key="file.name" class="download-manager__file">
                <div class="download-manager__file-info">
                  <span class="download-manager__file-name">{{ file.name }}</span>
                  <span class="download-manager__file-meta">
                    {{ formatSize(file.size) }}
                    <span v-if="file.quantization" class="download-manager__file-quant">{{ file.quantization }}</span>
                  </span>
                </div>
                <button
                  class="download-manager__download-btn"
                  :disabled="isDownloading(model.id, file.name)"
                  @click.stop="handleDownload(model.id, file)"
                >
                  <span v-if="isDownloading(model.id, file.name)" class="download-manager__spinner download-manager__spinner--small" />
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                </button>
              </div>
              <div v-if="model.files.length === 0" class="download-manager__no-files">
                No GGUF files found in this repository.
              </div>
            </div>
          </Transition>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.download-manager { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
.download-manager__search { display: flex; gap: 8px; padding: 16px; background-color: #1a1a2e; border-bottom: 1px solid #2a2a4a; }
.download-manager__input { flex: 1; padding: 10px 14px; background-color: #0d0d1a; border: 1px solid #2a2a4a; border-radius: 8px; color: #e0e0e0; font-size: 14px; outline: none; transition: border-color 0.2s; }
.download-manager__input:focus { border-color: #4a9eff; }
.download-manager__input::placeholder { color: #6b7280; }
.download-manager__search-btn { display: flex; align-items: center; justify-content: center; width: 42px; height: 42px; background-color: #4a9eff; border: none; border-radius: 8px; color: white; cursor: pointer; transition: background-color 0.2s; }
.download-manager__search-btn:hover:not(:disabled) { background-color: #3a8eef; }
.download-manager__search-btn:disabled { background-color: #3a3a5a; cursor: not-allowed; }
.download-manager__search-btn svg { width: 20px; height: 20px; }
.download-manager__spinner { width: 20px; height: 20px; border: 2px solid rgba(255, 255, 255, 0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; }
.download-manager__spinner--small { width: 16px; height: 16px; }
@keyframes spin { to { transform: rotate(360deg); } }
.download-manager__active { padding: 16px; background-color: #1e1e3a; border-bottom: 1px solid #2a2a4a; }
.download-manager__active h3 { font-size: 14px; font-weight: 600; color: #e0e0e0; margin-bottom: 12px; }
.download-manager__progress { display: flex; align-items: center; gap: 12px; padding: 10px; background-color: #0d0d1a; border-radius: 8px; margin-bottom: 8px; }
.download-manager__progress:last-child { margin-bottom: 0; }
.download-manager__progress-info { flex: 1; min-width: 0; }
.download-manager__progress-name { display: block; font-size: 13px; color: #e0e0e0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.download-manager__progress-stats { font-size: 11px; color: #6b7280; }
.download-manager__progress-bar { width: 100px; height: 6px; background-color: #2a2a4a; border-radius: 3px; overflow: hidden; }
.download-manager__progress-fill { height: 100%; background-color: #4a9eff; transition: width 0.3s; }
.download-manager__progress-percent { font-size: 13px; font-weight: 500; color: #4a9eff; min-width: 40px; text-align: right; }
.download-manager__results { flex: 1; overflow-y: auto; padding: 16px; }
.download-manager__empty, .download-manager__loading { display: flex; align-items: center; justify-content: center; gap: 12px; text-align: center; color: #6b7280; padding: 40px; }
.download-manager__section-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: #e0e0e0; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #2a2a4a; }
.download-manager__section-title svg { width: 18px; height: 18px; color: #fbbf24; }
.download-manager__model { background-color: #1e1e3a; border: 1px solid #2a2a4a; border-radius: 8px; margin-bottom: 12px; overflow: hidden; }
.download-manager__model-header { display: flex; align-items: center; padding: 14px 16px; cursor: pointer; transition: background-color 0.2s; }
.download-manager__model-header:hover { background-color: #252545; }
.download-manager__model-info { flex: 1; }
.download-manager__model-name { display: block; font-size: 14px; font-weight: 500; color: #e0e0e0; }
.download-manager__model-author { font-size: 12px; color: #6b7280; }
.download-manager__model-stats { display: flex; gap: 16px; margin-right: 12px; }
.download-manager__stat { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #6b7280; }
.download-manager__stat svg { width: 14px; height: 14px; }
.download-manager__expand-icon { width: 20px; height: 20px; color: #6b7280; transition: transform 0.2s; }
.download-manager__expand-icon--open { transform: rotate(180deg); }
.download-manager__model-files { border-top: 1px solid #2a2a4a; background-color: #161628; }
.download-manager__file { display: flex; align-items: center; padding: 12px 16px; border-bottom: 1px solid #2a2a4a; }
.download-manager__file:last-child { border-bottom: none; }
.download-manager__file-info { flex: 1; }
.download-manager__file-name { display: block; font-size: 13px; color: #d0d0d0; word-break: break-all; }
.download-manager__file-meta { font-size: 12px; color: #6b7280; }
.download-manager__file-quant { display: inline-block; padding: 1px 6px; background-color: #2a2a4a; border-radius: 4px; margin-left: 8px; font-size: 11px; font-weight: 500; }
.download-manager__download-btn { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; background-color: #4a9eff; border: none; border-radius: 6px; color: white; cursor: pointer; transition: background-color 0.2s; }
.download-manager__download-btn:hover:not(:disabled) { background-color: #3a8eef; }
.download-manager__download-btn:disabled { background-color: #3a3a5a; cursor: not-allowed; }
.download-manager__download-btn svg { width: 18px; height: 18px; }
.download-manager__no-files { padding: 20px; text-align: center; color: #6b7280; font-size: 13px; }
.expand-enter-active, .expand-leave-active { transition: all 0.2s ease; overflow: hidden; }
.expand-enter-from, .expand-leave-to { opacity: 0; max-height: 0; }
.expand-enter-to, .expand-leave-from { max-height: 500px; }
</style>
