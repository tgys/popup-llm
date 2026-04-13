<script setup lang="ts">
import { ref, computed } from 'vue';
import type { ModelInfo, CloudModelInfo, ProviderType } from '@/types';
import { useClickOutside } from '@/composables/useClickOutside';
import { formatSize, formatContextLength } from '@/utils/formatters';

const props = defineProps<{
  models: ModelInfo[];
  cloudModels: CloudModelInfo[];
  currentModel: ModelInfo | null;
  currentCloudModelId: string | null;
  provider: ProviderType;
  isLoading: boolean;
}>();

const emit = defineEmits<{
  load: [modelId: string];
  unload: [];
  selectCloud: [modelId: string];
}>();

const isOpen = ref(false);
const containerRef = ref<HTMLElement | null>(null);

useClickOutside(containerRef, () => (isOpen.value = false));

const isCloud = computed(() => props.provider !== 'local');

const sortedModels = computed(() => {
  return [...props.models].sort((a, b) => {
    if (a.loaded && !b.loaded) return -1;
    if (!a.loaded && b.loaded) return 1;
    return a.name.localeCompare(b.name);
  });
});

const currentCloudModel = computed(() =>
  props.cloudModels.find((m) => m.id === props.currentCloudModelId) ?? null
);

function handleSelect(model: ModelInfo): void {
  if (model.loaded) {
    emit('unload');
  } else {
    emit('load', model.id);
  }
  isOpen.value = false;
}

function handleSelectCloud(model: CloudModelInfo): void {
  emit('selectCloud', model.id);
  isOpen.value = false;
}

function toggleDropdown(): void {
  if (!props.isLoading) {
    isOpen.value = !isOpen.value;
  }
}
</script>

<template>
  <div
    ref="containerRef"
    class="model-selector"
  >
    <button
      class="model-selector__trigger"
      :class="{ 'model-selector__trigger--loading': isLoading }"
      :disabled="isLoading"
      @click="toggleDropdown"
    >
      <div class="model-selector__info">
        <!-- Cloud model display -->
        <template v-if="isCloud">
          <span
            v-if="currentCloudModel"
            class="model-selector__name"
          >
            {{ currentCloudModel.name }}
          </span>
          <span
            v-else
            class="model-selector__placeholder"
          >
            Select a model
          </span>
          <span
            v-if="currentCloudModel"
            class="model-selector__meta"
          >
            {{ formatContextLength(currentCloudModel.contextLength) }}
          </span>
        </template>
        <!-- Local model display -->
        <template v-else>
          <span
            v-if="currentModel"
            class="model-selector__name"
          >
            {{ currentModel.name }}
          </span>
          <span
            v-else
            class="model-selector__placeholder"
          >
            Select a model
          </span>
          <span
            v-if="currentModel"
            class="model-selector__meta"
          >
            {{ currentModel.quantization }} · {{ formatSize(currentModel.size) }}
          </span>
        </template>
      </div>
      <div class="model-selector__status">
        <span
          v-if="isLoading"
          class="model-selector__spinner"
        />
        <span
          v-else-if="!isCloud && currentModel?.loaded"
          class="model-selector__badge model-selector__badge--loaded"
        >
          Loaded
        </span>
        <span
          v-else-if="isCloud && currentCloudModel"
          class="model-selector__badge model-selector__badge--selected"
        >
          Selected
        </span>
        <svg
          v-else
          class="model-selector__chevron"
          :class="{ 'model-selector__chevron--open': isOpen }"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </button>

    <Transition name="dropdown">
      <div
        v-if="isOpen && !isLoading"
        class="model-selector__dropdown"
      >
        <!-- Cloud models dropdown -->
        <template v-if="isCloud">
          <div
            v-if="cloudModels.length === 0"
            class="model-selector__empty"
          >
            No models available for this provider.
          </div>
          <div
            v-for="model in cloudModels"
            :key="model.id"
            class="model-selector__item"
            :class="{ 'model-selector__item--selected': model.id === currentCloudModelId }"
            @click="handleSelectCloud(model)"
          >
            <div class="model-selector__item-info">
              <span class="model-selector__item-name">{{ model.name }}</span>
              <span class="model-selector__item-meta">
                {{ formatContextLength(model.contextLength) }}
                <template v-if="model.description"> · {{ model.description }}</template>
              </span>
            </div>
            <span
              v-if="model.id === currentCloudModelId"
              class="model-selector__badge model-selector__badge--selected"
            >
              Selected
            </span>
          </div>
        </template>
        <!-- Local models dropdown -->
        <template v-else>
          <div
            v-if="models.length === 0"
            class="model-selector__empty"
          >
            No models found. Download one from the Models tab.
          </div>
          <div
            v-for="model in sortedModels"
            :key="model.id"
            class="model-selector__item"
            :class="{ 'model-selector__item--loaded': model.loaded }"
            @click="handleSelect(model)"
          >
            <div class="model-selector__item-info">
              <span class="model-selector__item-name">{{ model.name }}</span>
              <span class="model-selector__item-meta">
                {{ model.quantization }} · {{ formatSize(model.size) }} · {{ model.contextLength }} ctx
              </span>
            </div>
            <span
              v-if="model.loaded"
              class="model-selector__badge model-selector__badge--loaded"
            >
              Loaded
            </span>
          </div>
        </template>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.model-selector {
  position: relative;
  min-width: 120px;
}

.model-selector__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 3px 6px;
  background-color: rgba(30, 30, 58, 0.6);
  border: 1px solid rgba(42, 42, 74, 0.5);
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  caret-color: transparent;
}

.model-selector__trigger:hover:not(:disabled) {
  border-color: #4a9eff;
}

.model-selector__trigger:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.model-selector__trigger--loading {
  background-color: rgba(37, 37, 69, 0.7);
}

.model-selector__info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  margin-right: 10px;
}

.model-selector__name {
  font-size: 10px;
  font-weight: 500;
  color: #e0e0e0;
  font-family: 'Fira Code', 'Consolas', 'Monaco', 'Menlo', monospace;
}

.model-selector__placeholder {
  font-size: 10px;
  color: #6b7280;
  font-family: 'Fira Code', 'Consolas', 'Monaco', 'Menlo', monospace;
}

.model-selector__meta {
  font-size: 8px;
  color: #6b7280;
  font-family: 'Fira Code', 'Consolas', 'Monaco', 'Menlo', monospace;
}

.model-selector__status {
  display: flex;
  align-items: center;
  gap: 4px;
}

.model-selector__spinner {
  width: 10px;
  height: 10px;
  border: 1px solid #2a2a4a;
  border-top-color: #4a9eff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.model-selector__badge {
  padding: 1px 3px;
  border-radius: 2px;
  font-size: 7px;
  font-weight: 500;
  text-transform: uppercase;
  font-family: 'Fira Code', 'Consolas', 'Monaco', 'Menlo', monospace;
}

.model-selector__badge--loaded {
  background-color: #059669;
  color: white;
}

.model-selector__badge--selected {
  background-color: #4a9eff;
  color: white;
}

.model-selector__chevron {
  width: 8px;
  height: 8px;
  color: #6b7280;
  transition: transform 0.2s;
}

.model-selector__chevron--open {
  transform: rotate(180deg);
}

.model-selector__dropdown {
  position: absolute;
  top: calc(100% + 2px);
  left: 0;
  right: 0;
  background-color: rgba(30, 30, 58, 0.85);
  border: 1px solid rgba(74, 158, 255, 0.2);
  border-radius: 3px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  max-height: 200px;
  overflow-y: auto;
  z-index: 100;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.model-selector__empty {
  padding: 8px;
  text-align: center;
  color: #6b7280;
  font-size: 10px;
  font-family: 'Fira Code', 'Consolas', 'Monaco', 'Menlo', monospace;
}

.model-selector__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.model-selector__item:hover {
  background-color: rgba(37, 37, 69, 0.7);
}

.model-selector__item--loaded {
  background-color: rgba(5, 150, 105, 0.1);
}

.model-selector__item--selected {
  background-color: rgba(74, 158, 255, 0.15);
}

.model-selector__item-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-right: 5%;
}

.model-selector__item-name {
  font-size: 10px;
  color: #e0e0e0;
  font-family: 'Fira Code', 'Consolas', 'Monaco', 'Menlo', monospace;
}

.model-selector__item-meta {
  font-size: 8px;
  color: #6b7280;
  font-family: 'Fira Code', 'Consolas', 'Monaco', 'Menlo', monospace;
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
