/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

declare module 'vue-virtual-scroller' {
  import type { DefineComponent } from 'vue';
  export const RecycleScroller: DefineComponent<{
    items: unknown[];
    itemSize?: number | null;
    keyField?: string;
    minItemSize?: number;
  }>;
  export const DynamicScroller: DefineComponent;
  export const DynamicScrollerItem: DefineComponent;
}
