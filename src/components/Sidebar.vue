<template>
  <aside class="sidebar">
    <button @click="handleOpenFurnitureMenu">
      Furniture
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512">
        <path
          d="M144 272C144 224.7 109.8 185.4 64.8 177.5 72 113.6 126.2 64 192 64l256 0c65.8 0 120 49.6 127.2 113.5-45 8-79.2 47.2-79.2 94.5l0 32-352 0 0-32zM0 384L0 272c0-26.5 21.5-48 48-48s48 21.5 48 48l0 80 448 0 0-80c0-26.5 21.5-48 48-48s48 21.5 48 48l0 112c0 35.3-28.7 64-64 64L64 448c-35.3 0-64-28.7-64-64z" />
      </svg>
    </button>
    <button @click="handleOpenWallsMenu">
      Build
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="4 3.4 16 17.1" aria-label="Room icon">
        <path d="M20,8v7.5c0,0.3-0.2,0.6-0.4,0.8
       c-0.6,0.4-1.3-0.1-1.3-0.8v-3.8l-2.8,1.8v5.2l-2.9,1.7v-7.9L20,8z
       M4,16l7.5,4.5v-7.9L4,8V16z
       M9.6,10.5l1.9-1.2V3.5l-6.8,4L9.6,10.5z
       M19.4,7.4l-6.8-4v5.9l1.9,1.2L19.4,7.4z" />
      </svg>
    </button>
    <button>B3</button>
    <button>B4</button>
    <button>B5</button>
    <button @click="useTheme().toggleTheme">
      Switch theme
    </button>
    <WallsMenu :isOpen="wallsMenuOpen" @close="wallsMenuOpen = false" @action="onWallsAction" :hasWalls="hasWalls" />
    <FloatingMenu :isOpen="menuOpen" @close="menuOpen = false" @start-drag="onSelectItem" />
  </aside>
</template>

<script setup>
import { ref } from 'vue';
import FloatingMenu from './FloatingMenu.vue';
import { useTheme } from '../composables/useTheme';
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
  if(!wallsMenuOpen.value) {
    if(menuOpen.value) {
      menuOpen.value = false;
    }
  }
  wallsMenuOpen.value = !wallsMenuOpen.value;
}

function handleOpenFurnitureMenu() {
  if(!menuOpen.value) {
    if(wallsMenuOpen.value) {
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
  height: 70px;
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap:4px;
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
  width: 100%;
  fill: var(--text);
  fill-opacity: 0.62;
}
</style>
