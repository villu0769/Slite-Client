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
        <button v-if="selectedCategory" class="icon-btn back-btn" @click="goBack" title="Back">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
        <span>{{ selectedCategory ? currentCategoryLabel : 'Категории' }}</span>
      </div>
      <div class="header-actions">
        <button class="icon-btn close-btn" @click="emit('close')" aria-label="Close">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
    </div>

    <!-- Body with animated swap -->
    <div class="menu-body">
      <transition :name="transitionName" mode="out-in">
        <div v-if="!selectedCategory" key="categories" class="category-list">
          <button
            v-for="cat in categories"
            :key="cat._id"
            class="category-btn"
            @click="openCategory(cat._id)"
          >
            {{ cat.name }}
            <svg class="chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>

        <div v-else key="items" class="panel">
          <div class="items-header">
            <span class="items-subtitle">{{ currentCategoryLabel }}</span>
          </div>
          <div class="item-buttons">
            <FurnitureButton
              v-for="item in visibleItems"
              :key="item.filename"
              :item="item"
              @start-drag="$emit('start-drag', $event)"
            />
          </div>
        </div>
      </transition>
    </div>
    <!-- Дръжки за преоразмеряване на менюто -->
    <div class="resize-handle resize-right" @pointerdown.prevent="startResize($event,'right')" aria-hidden="true"></div>
    <div class="resize-handle resize-bottom" @pointerdown.prevent="startResize($event,'bottom')" aria-hidden="true"></div>
    <div class="resize-handle resize-corner" @pointerdown.prevent="startResize($event,'corner')" aria-hidden="true">
      <div class="corner-dots">
        <span></span><span></span><span></span>
      </div>
    </div>
  </div>
</template>


<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue';
import FurnitureButton from './FurnitureButton.vue'; 
import { getFurnitureCategories } from '../services/furnitureService'; // Увери се в пътя

const props = defineProps({
  isOpen: { type: Boolean, required: true },
});

const emit = defineEmits(['close', 'start-drag']);
const menuEl = ref(null);

const categories = ref([]); // Това вече идва от базата
const isLoading = ref(false);

onMounted(async () => {
  window.addEventListener('resize', keepInViewport);
  try {
    isLoading.value = true;
    categories.value = await getFurnitureCategories();
    categories.value = categories.value.filter(cat => !cat.non_furniture_type); 
  } catch (error) {
    console.error("Грешка при зареждане на категория:", error);
  } finally {
    isLoading.value = false;
  }
});

/* -------------------------
   SELECTION LOGIC
------------------------- */
const selectedCategory = ref(null);
const transitionName = ref('slide-left');

// Намираме текущия обект-категория от заредения масив
const currentCategoryObj = computed(() => 
  categories.value.find(c => c._id === selectedCategory.value)
);

const currentCategoryLabel = computed(() => 
  currentCategoryObj.value ? currentCategoryObj.value.name : ''
);

// Items вече са вложени вътре в категорията в базата
const visibleItems = computed(() => 
  currentCategoryObj.value ? currentCategoryObj.value.items : []
);

function openCategory(catId) {
  transitionName.value = 'slide-left';
  selectedCategory.value = catId;
}

function goBack() {
  transitionName.value = 'slide-right';
  selectedCategory.value = null;
}

/* -------------------------
   POSITION, SIZE, DRAG & RESIZE
   (Този код остава абсолютно същият като твоя оригинален)
------------------------- */
const menu = reactive({
  x: 120, y: 100, width: 360, height: 420, minWidth: 300, minHeight: 200,
});

const menuStyle = computed(() => ({
  left: `${menu.x}px`, top: `${menu.y}px`, width: `${menu.width}px`, height: `${menu.height}px`,
}));

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

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

function keepInViewport() {
  if (!menuEl.value) return;
  const rect = menuEl.value.getBoundingClientRect();
  menu.x = clamp(menu.x, 0, window.innerWidth - rect.width);
  menu.y = clamp(menu.y, 0, window.innerHeight - rect.height);
}

onBeforeUnmount(() => {
  window.removeEventListener('resize', keepInViewport);
  window.removeEventListener('pointermove', onDragMove);
  window.removeEventListener('pointerup', stopDrag);
  window.removeEventListener('pointermove', onResizeMove);
  window.removeEventListener('pointerup', stopResize);
});
</script>

<style scoped>
@import './EditProjectStyle.css';
</style>