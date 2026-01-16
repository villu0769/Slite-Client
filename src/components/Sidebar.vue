<template>
  <aside class="sidebar">
    <button @click="menuOpen = !menuOpen">☰</button>
    <button>B2</button>
    <button>B3</button>
    <button>B4</button>
    <button>B5</button>
    <button @click="useTheme().toggleTheme">
      Switch theme ({{ theme }})
    </button>
    
    <FloatingMenu :isOpen="menuOpen" @close="menuOpen = false" @start-drag="onSelectItem" />
  </aside>
</template>

<script setup>
import { ref } from 'vue';
import FloatingMenu from './FloatingMenu.vue';
import { useTheme } from '../composables/useTheme';

const menuOpen = ref(false);

const emit = defineEmits(['start-drag']);

function onSelectItem(item) {
  emit('start-drag', item);
}

</script>

<style scoped>
.sidebar {
  position: fixed;
  left: 0;
  top: 56px;
  bottom: 0;
  width: 56px;
  background: var(--bg);
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
}

button {
  height: 40px;
  background: var(--bg-soft);
  color: var(--text);
  border: none;
  border-radius: 6px;
}
</style>
