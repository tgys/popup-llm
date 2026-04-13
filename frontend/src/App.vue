<script setup lang="ts">
import ChatWindow from '@/components/ChatWindow.vue';
</script>

<template>
  <ChatWindow />
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
               Oxygen, Ubuntu, Cantarell, sans-serif;
  background-color: transparent;
  color: #eaeaea;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(58, 58, 90, 0.7);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(74, 74, 106, 0.8);
}
</style>
