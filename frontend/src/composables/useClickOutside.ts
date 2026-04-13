import { onMounted, onUnmounted, type Ref } from 'vue';

export function useClickOutside(
  elementRef: Ref<HTMLElement | null>,
  callback: () => void
): void {
  const handleClickOutside = (event: MouseEvent): void => {
    if (elementRef.value && !elementRef.value.contains(event.target as Node)) {
      callback();
    }
  };

  onMounted(() => document.addEventListener('click', handleClickOutside));
  onUnmounted(() => document.removeEventListener('click', handleClickOutside));
}
