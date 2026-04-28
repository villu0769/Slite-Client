<template>
  <aside class="sidebar">
    <button @click="handleOpenFurnitureMenu">
      Обзавеждане
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512">
        <path
          d="M144 272C144 224.7 109.8 185.4 64.8 177.5 72 113.6 126.2 64 192 64l256 0c65.8 0 120 49.6 127.2 113.5-45 8-79.2 47.2-79.2 94.5l0 32-352 0 0-32zM0 384L0 272c0-26.5 21.5-48 48-48s48 21.5 48 48l0 80 448 0 0-80c0-26.5 21.5-48 48-48s48 21.5 48 48l0 112c0 35.3-28.7 64-64 64L64 448c-35.3 0-64-28.7-64-64z" />
      </svg>
    </button>
    <button @click="handleOpenWallsMenu">
      Помещение
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="4 3.4 16 17.1" aria-label="Room icon">
        <path d="M20,8v7.5c0,0.3-0.2,0.6-0.4,0.8
       c-0.6,0.4-1.3-0.1-1.3-0.8v-3.8l-2.8,1.8v5.2l-2.9,1.7v-7.9L20,8z
       M4,16l7.5,4.5v-7.9L4,8V16z
       M9.6,10.5l1.9-1.2V3.5l-6.8,4L9.6,10.5z
       M19.4,7.4l-6.8-4v5.9l1.9,1.2L19.4,7.4z" />
      </svg>
    </button>
    <button @click="useTheme().toggleTheme">
      <svg v-if="theme == 'light'" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
      <svg v-else viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>
    </button>
    <WallsMenu :isOpen="wallsMenuOpen" @close="wallsMenuOpen = false" @action="onWallsAction" :hasWalls="hasWalls" />
    <FloatingFurnitureMenu :isOpen="menuOpen" @close="menuOpen = false" @start-drag="onSelectItem" />
  </aside>
</template>

<script setup>
import { ref } from 'vue';
import FloatingFurnitureMenu from './FloatingFurnitureMenu.vue';
import { theme, useTheme } from '../composables/useTheme';
import WallsMenu from './WallsMenu.vue';

const menuOpen = ref(false);
const wallsMenuOpen = ref(false);

const emit = defineEmits(['start-drag', 'action']);

function onSelectItem(item) {
  emit('start-drag', item);
}
function onWallsAction(payload) {
  emit('action', payload);
}

function handleOpenWallsMenu() {
  if (!wallsMenuOpen.value) {
    if (menuOpen.value) {
      menuOpen.value = false;
    }
  }
  wallsMenuOpen.value = !wallsMenuOpen.value;
}

function handleOpenFurnitureMenu() {
  if (!menuOpen.value) {
    if (wallsMenuOpen.value) {
      wallsMenuOpen.value = false;
    }
  }
  menuOpen.value = !menuOpen.value;
}

defineProps({
  hasWalls: {
    type: Boolean,
    required: true
  }
});
</script>

<style scoped>
.sidebar {
  position: fixed;
  left: 0;
  background: transparent;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 17px;
  z-index: 5;
  width: 110px;
}

button {
  height: 80px;
  width: 120%;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px;
  align-content: center;
  background: color-mix(in srgb, var(--bg-soft), transparent 17%);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: var(--text);
  border: none;
  border-radius: 6px;
  padding: 19px;
  font-size: 0.75rem;
  font-weight: 900;
  color: color-mix(in srgb, var(--text), transparent 35%);
}

button>svg {
  width: 80%;
  fill: var(--text);
  fill-opacity: 0.62;
}
</style>
