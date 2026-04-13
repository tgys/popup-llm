<script setup lang="ts">
import { ref, computed } from 'vue';
import type { ProviderType } from '@/types';
import { PROVIDERS } from '@/types';
import { useClickOutside } from '@/composables/useClickOutside';

const props = defineProps<{
  currentProvider: ProviderType;
  apiKeyValidation: Record<ProviderType, boolean | null>;
}>();

const emit = defineEmits<{
  select: [provider: ProviderType];
}>();

const isOpen = ref(false);
const containerRef = ref<HTMLElement | null>(null);

useClickOutside(containerRef, () => (isOpen.value = false));

const currentProviderConfig = computed(() =>
  PROVIDERS.find((p) => p.id === props.currentProvider) ?? PROVIDERS[0]
);

function getValidationStatus(provider: ProviderType): 'valid' | 'invalid' | 'none' {
  if (provider === 'local') return 'none';
  const validation = props.apiKeyValidation[provider];
  if (validation === null) return 'none';
  return validation ? 'valid' : 'invalid';
}

function handleSelect(provider: ProviderType): void {
  emit('select', provider);
  isOpen.value = false;
}

function toggleDropdown(): void {
  isOpen.value = !isOpen.value;
}
</script>

<template>
  <div
    ref="containerRef"
    class="provider-selector"
  >
    <button
      class="provider-selector__trigger"
      @click="toggleDropdown"
    >
      <span class="provider-selector__name">
        {{ currentProviderConfig.name }}
      </span>
      <span
        v-if="getValidationStatus(currentProvider) === 'valid'"
        class="provider-selector__indicator provider-selector__indicator--valid"
      />
      <span
        v-else-if="getValidationStatus(currentProvider) === 'invalid'"
        class="provider-selector__indicator provider-selector__indicator--invalid"
      />
      <svg
        class="provider-selector__chevron"
        :class="{ 'provider-selector__chevron--open': isOpen }"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>

    <Transition name="dropdown">
      <div
        v-if="isOpen"
        class="provider-selector__dropdown"
      >
        <div
          v-for="provider in PROVIDERS"
          :key="provider.id"
          class="provider-selector__item"
          :class="{
            'provider-selector__item--active': provider.id === currentProvider,
          }"
          @click="handleSelect(provider.id)"
        >
          <span class="provider-selector__item-name">{{ provider.name }}</span>
          <span
            v-if="getValidationStatus(provider.id) === 'valid'"
            class="provider-selector__indicator provider-selector__indicator--valid"
          />
          <span
            v-else-if="getValidationStatus(provider.id) === 'invalid'"
            class="provider-selector__indicator provider-selector__indicator--invalid"
          />
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.provider-selector {
  position: relative;
}

.provider-selector__trigger {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 6px;
  background-color: rgba(30, 30, 58, 0.6);
  border: 1px solid rgba(42, 42, 74, 0.5);
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.provider-selector__trigger:hover {
  border-color: #4a9eff;
}

.provider-selector__name {
  font-size: 10px;
  font-weight: 500;
  color: #e0e0e0;
  font-family: 'Fira Code', 'Consolas', 'Monaco', 'Menlo', monospace;
}

.provider-selector__indicator {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.provider-selector__indicator--valid {
  background-color: #10b981;
}

.provider-selector__indicator--invalid {
  background-color: #ef4444;
}

.provider-selector__chevron {
  width: 8px;
  height: 8px;
  color: #6b7280;
  transition: transform 0.2s;
}

.provider-selector__chevron--open {
  transform: rotate(180deg);
}

.provider-selector__dropdown {
  position: absolute;
  top: calc(100% + 2px);
  left: 0;
  min-width: 80px;
  background-color: rgba(30, 30, 58, 0.85);
  border: 1px solid rgba(74, 158, 255, 0.2);
  border-radius: 3px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  z-index: 100;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.provider-selector__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.provider-selector__item:hover {
  background-color: rgba(37, 37, 69, 0.7);
}

.provider-selector__item--active {
  background-color: rgba(74, 158, 255, 0.15);
}

.provider-selector__item-name {
  font-size: 10px;
  color: #e0e0e0;
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
