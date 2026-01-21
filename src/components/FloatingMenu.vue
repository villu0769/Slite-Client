<template>
  <div
    v-if="isOpen"
    class="floating-menu"
    :style="menuStyle"
    ref="menuEl"
    role="dialog"
    aria-label="Floating menu"
  >
    <!-- Header (drag handle) -->
    <div class="menu-header" @pointerdown.prevent="startDrag">
      <div class="menu-title">
        <button v-if="selectedCategory" class="back-btn" @click="goBack" title="Back">←</button>
        {{ selectedCategory ? currentCategoryLabel : 'Furniture Categories' }}
      </div>
      <div class="header-actions">
        <button class="close-btn" @click="emit('close')" aria-label="Close">✕</button>
      </div>
    </div>

    <!-- Body with animated swap -->
    <div class="menu-body">
      <transition :name="transitionName" mode="out-in">
        <!-- Categories -->
        <div v-if="!selectedCategory" key="categories" class="panel">
          <button
            v-for="cat in categories"
            :key="cat.id"
            class="category-btn"
            @click="openCategory(cat.id)"
          >
            {{ cat.name }}
          </button>
        </div>

        <!-- Items -->
        <div v-else key="items" class="panel">
          <div class="items-title">Items in {{ currentCategoryLabel }}</div>
          <div class="item-buttons">
            <button
              v-for="item in visibleItems"
              :key="item.filename"
              class="item-btn"
              @pointerdown.prevent="$emit('start-drag', item)"
            >
              {{ item.name }}
            </button>
          </div>
        </div>
      </transition>
    </div>

    <!-- Resize handles -->
    <div class="resize-handle resize-right" @pointerdown.prevent="startResize($event,'right')" aria-hidden="true"></div>
    <div class="resize-handle resize-bottom" @pointerdown.prevent="startResize($event,'bottom')" aria-hidden="true"></div>
    <div class="resize-handle resize-corner" @pointerdown.prevent="startResize($event,'corner')" aria-hidden="true">
      <span class="grip-line"></span>
      <span class="grip-line"></span>
      <span class="grip-line"></span>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount,watch } from 'vue';

/* -------------------------
   OPEN STATE & REF
------------------------- */
const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
});

const emit = defineEmits(['close', 'start-drag']);

const menuEl = ref(null);

/* -------------------------
   POSITION & SIZE
------------------------- */
const menu = reactive({
  x: 120,
  y: 80,
  width: 360,
  height: 340,
  minWidth: 260,
  minHeight: 160,
});

const menuStyle = computed(() => ({
  left: `${menu.x}px`,
  top: `${menu.y}px`,
  width: `${menu.width}px`,
  height: `${menu.height}px`,
}));

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

/* -------------------------
   DRAGGING
------------------------- */
let dragging = false;
let dragStart = { px: 0, py: 0, sx: 0, sy: 0 };

function startDrag(e) {
  dragging = true;
  dragStart.px = e.clientX;
  dragStart.py = e.clientY;
  dragStart.sx = menu.x;
  dragStart.sy = menu.y;
  try { e.target.setPointerCapture?.(e.pointerId); } catch {}
  window.addEventListener('pointermove', onDragMove);
  window.addEventListener('pointerup', stopDrag);
}

function onDragMove(e) {
  if (!dragging || !menuEl.value) return;
  const rect = menuEl.value.getBoundingClientRect();
  menu.x = clamp(dragStart.sx + (e.clientX - dragStart.px), 0, window.innerWidth - rect.width);
  menu.y = clamp(dragStart.sy + (e.clientY - dragStart.py), 0, window.innerHeight - rect.height);
}

function stopDrag() {
  dragging = false;
  window.removeEventListener('pointermove', onDragMove);
  window.removeEventListener('pointerup', stopDrag);
}

/* -------------------------
   RESIZING
------------------------- */
let resizing = false;
let resizeType = null;
let resizeStart = { px: 0, py: 0, sw: 0, sh: 0 };

function startResize(e, type) {
  resizing = true;
  resizeType = type;
  resizeStart.px = e.clientX;
  resizeStart.py = e.clientY;
  resizeStart.sw = menu.width;
  resizeStart.sh = menu.height;
  try { e.target.setPointerCapture?.(e.pointerId); } catch {}
  window.addEventListener('pointermove', onResizeMove);
  window.addEventListener('pointerup', stopResize);
}

function onResizeMove(e) {
  if (!resizing || !menuEl.value) return;
  const dx = e.clientX - resizeStart.px;
  const dy = e.clientY - resizeStart.py;

  const maxWidth = Math.max(menu.minWidth, window.innerWidth - menu.x);
  const maxHeight = Math.max(menu.minHeight, window.innerHeight - menu.y);

  if (resizeType === 'right' || resizeType === 'corner') {
    menu.width = clamp(resizeStart.sw + dx, menu.minWidth, maxWidth);
  }
  if (resizeType === 'bottom' || resizeType === 'corner') {
    menu.height = clamp(resizeStart.sh + dy, menu.minHeight, maxHeight);
  }
}

function stopResize() {
  resizing = false;
  resizeType = null;
  window.removeEventListener('pointermove', onResizeMove);
  window.removeEventListener('pointerup', stopResize);
}

/* Keep inside viewport on window resize */
function keepInViewport() {
  if (!menuEl.value) return;
  const rect = menuEl.value.getBoundingClientRect();
  menu.x = clamp(menu.x, 0, window.innerWidth - rect.width);
  menu.y = clamp(menu.y, 0, window.innerHeight - rect.height);
  menu.width = Math.min(menu.width, Math.max(menu.minWidth, window.innerWidth - menu.x));
  menu.height = Math.min(menu.height, Math.max(menu.minHeight, window.innerHeight - menu.y));
}

onMounted(() => {
  window.addEventListener('resize', keepInViewport);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', keepInViewport);
  window.removeEventListener('pointermove', onDragMove);
  window.removeEventListener('pointerup', stopDrag);
  window.removeEventListener('pointermove', onResizeMove);
  window.removeEventListener('pointerup', stopResize);
});

/* -------------------------
   CONTENT: categories -> items
------------------------- */
const categories = [
  { id: 'living', name: 'Living Room' },
  { id: 'bedroom', name: 'Bedroom' },
];

const furnitureByCategory = {
  living: [
    { filename: 'sofa', name: 'Sofa' },
    { filename: 'table', name: 'Table' },
  ],
  bedroom: [
    { filename: 'bed', name: 'Bed' },
    { filename: 'wardrobe', name: 'Wardrobe' },
  ],
};

const selectedCategory = ref(null);
const transitionName = ref('slide-left');

const currentCategoryLabel = computed(() => {
  const c = categories.find(x => x.id === selectedCategory.value);
  return c ? c.name : '';
});

const visibleItems = computed(() => furnitureByCategory[selectedCategory.value] || []);

function openCategory(catId) {
  transitionName.value = 'slide-left';
  selectedCategory.value = catId;
}

function goBack() {
  transitionName.value = 'slide-right';
  selectedCategory.value = null;
}

</script>

<style scoped>
.floating-menu {
  position: fixed;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  z-index: 50;
  color:var(--text);
}

.menu-header {
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
  height: 36px;
  display: flex;
  align-items: center;
  padding: 0 8px;
  cursor: grab;
}
.menu-header:active {
  cursor: grabbing;
}
.menu-title { flex: 1; font-weight: 600; display: flex; gap: 6px; }
.back-btn { background: transparent; border: none; cursor: pointer; }

.resize-handle {
  position: absolute;
  z-index: 10;
}

/* Right edge */
.resize-handle.resize-right {
  top: 36px; /* below header */
  right: 0;
  width: 8px;
  bottom: 8px;
  cursor: ew-resize;
}

.resize-handle.resize-right:hover {
  background: rgba(0, 0, 0, 0.15);
}

/* Bottom edge */
.resize-handle.resize-bottom {
  bottom: 0;
  left: 0;
  width: 100%;
  height: 10px;
  cursor: ns-resize;
  background: var(--bg-soft);
  transition: background 0.2s;
}

.resize-handle.resize-bottom:hover {
  background: rgba(0, 0, 0, 0.15);
}
.floating-menu {
  background: var(--bg);
  box-shadow: var(--menu-shadow);
  border: 1px solid var(--border);
}

.menu-header {
  background: var(--bg-soft);
}
.item-buttons{
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
  width: 100%;
}
.category-btn,
.item-btn {
  background: var(--bg-soft);
  border: 1px solid var(--border);
  padding:5px;
  width:100%;
  &:hover {
    color: black;
    background: var(--bg);
  }
}
.item-btn {
  max-width:180px;
  width:calc(50% - 5px);
}

/* Corner grip */
.resize-handle.resize-corner {
  width: 16px;
  height: 16px;
  bottom: 0;
  right: 0;
  cursor: nwse-resize;
  display: flex;
  justify-content: center;
  align-items: center;
}

.resize-handle.resize-corner .grip-line {
  width: 2px;
  height: 12px;
  background: var(--bg-soft);
  transform: rotate(45deg);
  margin: 1px;
  border-radius: 1px;
  opacity: 0.8;
}

.resize-handle.resize-corner .grip-line:nth-child(1) { transform: rotate(45deg); }
.resize-handle.resize-corner .grip-line:nth-child(2) { transform: rotate(45deg)  }
.resize-handle.resize-corner .grip-line:nth-child(3) { transform: rotate(45deg) translateX(-5.5px); }

.menu-body {
  flex: 1;
  padding: 12px;
  overflow-x: hidden;
    overflow-y: scroll;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.menu-body::-webkit-scrollbar {
  display: none; /* Chrome / Safari */
}

/* Panels */
.panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ------------------------------
   Slide transitions
------------------------------ */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

/* Slide left: categories -> items */
.slide-left-enter-from {
  transform: translateX(100%);
  opacity: 0;
}
.slide-left-leave-to {
  transform: translateX(-30%);
  opacity: 0;
}

/* Slide right: items -> categories */
.slide-right-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}
.slide-right-leave-to {
  transform: translateX(30%);
  opacity: 0;
}

</style>
