<template>
  <div v-if="isOpen" class="floating-menu" :style="menuStyle" ref="menuEl" role="dialog" aria-label="Build Menu">
    <div class="menu-header" @pointerdown.prevent="startDrag">
      <div class="menu-title">
        <button v-if="selectedCategory" class="icon-btn back-btn" @click="goBack" title="Back">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <span>{{ selectedCategory ? currentCategoryLabel : '' }}</span>
      </div>

      <div class="header-actions">
        <button class="icon-btn close-btn" @click="emit('close')" aria-label="Close">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>

    <div class="menu-body">
      <transition :name="transitionName" mode="out-in">

        <div v-if="!selectedCategory" key="categories" class="category-list">
          <button v-for="cat in categories" :key="cat.id" class="category-btn" @click="handleCategoryClick(cat)"
            :disabled="cat.disabled">
            <div class="cat-label-wrap">
              <span class="cat-icon" v-html="cat.icon"></span>
              {{ cat.name }}
            </div>

            <svg v-if="cat.hasSubItems" class="chevron" viewBox="0 0 24 24" width="14" height="14" fill="none"
              stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>

        <div v-else key="items" class="panel">

          <div class="items-header" v-if="!(selectedCategory === 'doors' && selectedDoorModel) &&
            selectedCategory !== 'room' &&
            selectedCategory !== 'walls'"> <span class="items-subtitle">
              {{ `Избери тип ${currentCategoryLabel}` }}
            </span>
          </div>

          <div v-if="selectedCategory === 'room'" class="room-form">
            <div class="input-group">
              <label>Width (m)</label>
              <div class="custom-number">
                <input type="number" v-model.number="roomSize.width" min="1" step="0.5" />
                <div class="step-controls">
                  <button class="step-btn" @click="stepValue(roomSize, 'width', 0.5, 1)"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg></button>
                  <button class="step-btn" @click="stepValue(roomSize, 'width', -0.5, 1)"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
                </div>
              </div>
            </div>
            <div class="input-group">
              <label>Дължина (м)</label>
              <div class="custom-number">
                <input type="number" v-model.number="roomSize.length" min="1" step="0.5" />
                <div class="step-controls">
                  <button class="step-btn" @click="stepValue(roomSize, 'length', 0.5, 1)"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg></button>
                  <button class="step-btn" @click="stepValue(roomSize, 'length', -0.5, 1)"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
                </div>
              </div>
            </div>
            <div class="input-group">
              <label>Височина (м)</label>
              <div class="custom-number">
                <input type="number" v-model.number="roomSize.height" min="1" step="0.5" />
                <div class="step-controls">
                  <button class="step-btn" @click="stepValue(roomSize, 'height', 0.5, 1)"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg></button>
                  <button class="step-btn" @click="stepValue(roomSize, 'height', -0.5, 1)"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
                </div>
              </div>
            </div>
            <div class="input-group">
              <label>Дебелина на стените (м)</label>
              <div class="custom-number">
                <input type="number" v-model.number="roomSize.thickness" min="0.05" step="0.05" />
                <div class="step-controls">
                  <button class="step-btn" @click="stepValue(roomSize, 'thickness', 0.05, 0.05)"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg></button>
                  <button class="step-btn" @click="stepValue(roomSize, 'thickness', -0.05, 0.05)"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
                </div>
              </div>
            </div>
            <button class="create-btn" @click="handleCreateRoom">
              Създай
            </button>
          </div>

          <div v-else-if="selectedCategory === 'walls'" class="room-form">
            <div class="input-group">
              <label>Дължина (м)</label>
              <div class="custom-number">
                <input type="number" v-model.number="wallConfig.length" min="0.5" step="0.5" />
                <div class="step-controls">
                  <button class="step-btn" @click="stepValue(wallConfig, 'length', 0.5, 0.5)"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg></button>
                  <button class="step-btn" @click="stepValue(wallConfig, 'length', -0.5, 0.5)"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
                </div>
              </div>
            </div>
            <div class="input-group">
              <label>Височина (м)</label>
              <div class="custom-number">
                <input type="number" v-model.number="wallConfig.height" min="1" step="0.1" />
                <div class="step-controls">
                  <button class="step-btn" @click="stepValue(wallConfig, 'height', 0.1, 1)"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg></button>
                  <button class="step-btn" @click="stepValue(wallConfig, 'height', -0.1, 1)"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
                </div>
              </div>
            </div>
            <div class="input-group">
              <label>Дебелина на стената (м)</label>
              <div class="custom-number">
                <input type="number" v-model.number="wallConfig.thickness" min="0.05" step="0.05" />
                <div class="step-controls">
                  <button class="step-btn" @click="stepValue(wallConfig, 'thickness', 0.05, 0.05)"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg></button>
                  <button class="step-btn" @click="stepValue(wallConfig, 'thickness', -0.05, 0.05)"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
                </div>
              </div>
            </div>
            <button class="create-btn" @click="handleCreateWall">
              Създай
            </button>
          </div>

          <div v-else-if="selectedCategory === 'doors'" class="doors-panel">
            <transition name="fade" mode="out-in">
              <div v-if="!selectedDoorModel" key="model-list" class="tools-grid">
                <button v-for="model in doorModels" :key="model.id" class="tool-btn" @click="selectDoorModel(model)">
                  <div class="tool-icon">
                    <img v-if="model.pic" :src="model.pic" alt="Door" class="preview-img" />
                    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M4 22h14M4 22V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v18M14 12h2" />
                    </svg>
                  </div>
                  <span class="tool-name">{{ model.name }}</span>
                </button>
              </div>

              <div v-else key="config-form" class="doors-form">
                <div class="config-header">
                  <button class="icon-btn small-back" @click="clearDoorSelection" title="Back to models">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="19" y1="12" x2="5" y2="12"></line>
                      <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                  </button>
                  <span class="selected-model-name">{{ selectedDoorModel.name }}</span>
                </div>
                <div class="input-group">
                  <label>Дължина (м)</label>
                  <div class="custom-number">
                    <input type="number" v-model.number="doorConfig.width" step="0.05" min="0.5" max="4.0" />
                    <div class="step-controls">
                      <button class="step-btn" @click="stepValue(doorConfig, 'width', 0.05, 0.5, 4.0)"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg></button>
                      <button class="step-btn" @click="stepValue(doorConfig, 'width', -0.05, 0.5, 4.0)"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
                    </div>
                  </div>
                </div>
                <div class="input-group">
                  <label>Височина (м)</label>
                  <div class="custom-number">
                    <input type="number" v-model.number="doorConfig.height" step="0.05" min="1.0" max="3.5" />
                    <div class="step-controls">
                      <button class="step-btn" @click="stepValue(doorConfig, 'height', 0.05, 1.0, 3.5)"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg></button>
                      <button class="step-btn" @click="stepValue(doorConfig, 'height', -0.05, 1.0, 3.5)"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
                    </div>
                  </div>
                </div>
                <button class="create-btn" @click="handleAddDoor">
                  Създай
                </button>
              </div>
            </transition>
          </div>

          <div v-else-if="selectedCategory === 'windows'" class="doors-panel">
            <transition name="fade" mode="out-in">
              <div v-if="!selectedWindowModel" key="model-list" class="tools-grid">
                <button v-for="model in windowModels" :key="model.id" class="tool-btn" @click="selectWindowModel(model)">
                  <div class="tool-icon">
                    <img v-if="model.pic" :src="model.pic" alt="Window" class="preview-img" />
                    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="12" y1="3" x2="12" y2="21"/>
                    </svg>
                  </div>
                  <span class="tool-name">{{ model.name }}</span>
                </button>
              </div>

              <div v-else key="config-form" class="doors-form">
                <div class="config-header">
                  <button class="icon-btn small-back" @click="clearWindowSelection" title="Back to models">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="19" y1="12" x2="5" y2="12"></line>
                      <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                  </button>
                  <span class="selected-model-name">{{ selectedWindowModel.name }}</span>
                </div>
                <div class="input-group">
                  <label>Дължина (м)</label>
                  <div class="custom-number">
                    <input type="number" v-model.number="windowConfig.width" step="0.05" min="0.5" max="5.0" />
                    <div class="step-controls">
                      <button class="step-btn" @click="stepValue(windowConfig, 'width', 0.05, 0.5, 5.0)"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg></button>
                      <button class="step-btn" @click="stepValue(windowConfig, 'width', -0.05, 0.5, 5.0)"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
                    </div>
                  </div>
                </div>
                <div class="input-group">
                  <label>Височина (м)</label>
                  <div class="custom-number">
                    <input type="number" v-model.number="windowConfig.height" step="0.05" min="0.5" max="3.0" />
                    <div class="step-controls">
                      <button class="step-btn" @click="stepValue(windowConfig, 'height', 0.05, 0.5, 3.0)"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg></button>
                      <button class="step-btn" @click="stepValue(windowConfig, 'height', -0.05, 0.5, 3.0)"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
                    </div>
                  </div>
                </div>
                <div class="input-group">
                  <label>Височина от пода (м)</label>
                  <div class="custom-number">
                    <input type="number" v-model.number="windowConfig.heightFromFloor" step="0.05" min="0.5" max="3.0" />
                    <div class="step-controls">
                      <button class="step-btn" @click="stepValue(windowConfig, 'heightFromFloor', 0.05, 0.5, 3.0)"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg></button>
                      <button class="step-btn" @click="stepValue(windowConfig, 'heightFromFloor', -0.05, 0.5, 3.0)"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
                    </div>
                  </div>
                </div>
                <button class="create-btn" @click="handleAddWindow">
                  Създай
                </button>
              </div>
            </transition>
          </div>

          <div v-else class="tools-grid">
            <button v-for="item in visibleItems" :key="item.id" class="tool-btn" @click="handleToolClick(item.action)">
              <div class="tool-icon" v-html="item.icon || defaultIcon"></div>
              <span class="tool-name">{{ item.name }}</span>
            </button>
          </div>

        </div>

      </transition>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue';
import {getNonFurnitureCategory} from '../services/furnitureService'

// --- PROPS & EMITS ---
const props = defineProps({
  isOpen: { type: Boolean, required: true },
  hasWalls: { type: Boolean, required: true }
});

const emit = defineEmits(['close', 'action']);
const menuEl = ref(null);

// --- DATA: Room Form State ---
const roomSize = reactive({ width: 5, length: 4, height: 2.6 ,thickness: 0.2});
const wallConfig = reactive({ length: 3.0, height: 2.6 ,thickness: 0.2});

// --- DATA: Dynamic Models (Doors & Windows) ---
const doorModels = ref([]);
const windowModels = ref([]);

const selectedDoorModel = ref(null);
const doorConfig = reactive({ width: 0.9, height: 2.1 });

const selectedWindowModel = ref(null);
const windowConfig = reactive({ width: 1.2, height: 1.5, heightFromFloor: 1.0 });

// --- Универсална функция за бутоните +/- ---
function stepValue(obj, key, step, min = -Infinity, max = Infinity) {
  let val = obj[key] || 0;
  val = Number((val + step).toFixed(3));
  if (val < min) val = min;
  if (val > max) val = max;
  obj[key] = val;
}

// Функция за изтегляне на моделите от бекенда
async function fetchModels() {
  try {
    const doorsCat = await getNonFurnitureCategory('doors');

    if (doorsCat && doorsCat.items) {
      doorModels.value = doorsCat.items.map(item => ({
        id: item.filename,
        filename: item.filename,
        name: item.name,
        pic: item.pic,
      }));
    }

    const windowsCat = await getNonFurnitureCategory('windows');
    if (windowsCat && windowsCat.items) {
      windowModels.value = windowsCat.items.map(item => ({
        id: item.filename,
        filename: item.filename,
        name: item.name,
        pic: item.pic,
      }));
    }
  } catch (error) {
    console.error('Грешка при зареждане на врати и прозорци:', error);
  }
}

onMounted(() => {
  fetchModels();
  window.addEventListener('resize', keepInViewport);
});

// --- SELECTION LOGIC ---
function selectDoorModel(model) {
  selectedDoorModel.value = model;
}

function clearDoorSelection() {
  selectedDoorModel.value = null;
}

function selectWindowModel(model) {
  selectedWindowModel.value = model;
}

function clearWindowSelection() {
  selectedWindowModel.value = null;
}

// --- DATA: Categories & Static Items ---
const defaultIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>';

const categories = computed(() => [
  {
    id: 'room',
    name: 'Помещение',
    hasSubItems: true,
    icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M3 9h18"/></svg>',
    disabled: false
  },
  {
    id: 'walls',
    name: 'Стена',
    hasSubItems: true,
    icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 22h20M4 22V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16"/></svg>',
    disabled: false
  },
  {
    id: 'doors',
    name: 'Врата',
    hasSubItems: true,
    icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22V6M6 22v-4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4M4 22h16"/></svg>',
    disabled: !props.hasWalls
  },
  {
    id: 'windows',
    name: 'Прозорец',
    hasSubItems: true,
    icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="12" y1="3" x2="12" y2="21"/></svg>',
    disabled: !props.hasWalls
  }
]);

const itemsData = {
  walls: [
    { id: 'w1', name: 'Brick Wall', action: 'add-wall-brick', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 12h20M12 4v8M8 12v8M16 12v8"/></svg>' },
    { id: 'w2', name: 'Concrete', action: 'add-wall-concrete', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2"/></svg>' },
    { id: 'w3', name: 'Glass Wall', action: 'add-wall-glass', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="1"/><path d="M16 2v20M8 2v20"/></svg>' },
  ]
};

// --- NAVIGATION LOGIC ---
const selectedCategory = ref(null);
const transitionName = ref('slide-left');
const currentCategoryLabel = computed(() => categories.value.find(x => x.id === selectedCategory.value)?.name || '');
const visibleItems = computed(() => itemsData[selectedCategory.value] || []);

function handleCategoryClick(cat) {
  if (cat.hasSubItems) {
    transitionName.value = 'slide-left';
    selectedCategory.value = cat.id;
  } else {
    emit('action', cat.action);
  }
}

function handleToolClick(action) {
  emit('action', action);
}

function handleCreateRoom() {
  emit('action', {
    type: 'create-room',
    width: roomSize.width,
    length: roomSize.length,
    height: roomSize.height,
    thickness: roomSize.thickness
  });
}

function handleCreateWall() {
  emit('action', {
    type: 'create-wall',
    length: wallConfig.length,
    height: wallConfig.height,
    thickness: wallConfig.thickness
  });
}

function handleAddWindow() {
  if (!selectedWindowModel.value) return;
  emit('action', {
    type: 'add-model-window',
    width: windowConfig.width,
    height: windowConfig.height,
    heightFromFloor: windowConfig.heightFromFloor,
    filename: selectedWindowModel.value.filename
  });
  goBack();
}

function goBack() {
  if (selectedCategory.value === 'doors' && selectedDoorModel.value) {
    clearDoorSelection();
    return;
  }
  if (selectedCategory.value === 'windows' && selectedWindowModel.value) {
    clearWindowSelection();
    return;
  }

  transitionName.value = 'slide-right';
  selectedCategory.value = null;
  selectedDoorModel.value = null;
  selectedWindowModel.value = null;
}

// --- DRAG LOGIC ---
const menu = reactive({ x: 120, y: 120 });

const menuStyle = computed(() => ({
  left: `${menu.x}px`,
  top: `${menu.y}px`,
  width: '320px',
  height: '600px'
}));

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

function handleAddDoor() {
  if (!selectedDoorModel.value) return;

  emit('action', {
    type: 'add-model-door',
    width: doorConfig.width,
    height: doorConfig.height,
    filename: selectedDoorModel.value.filename
  });
}

let dragging = false;
let dragStart = { px: 0, py: 0, sx: 0, sy: 0 };

function startDrag(e) {
  if (e.target.closest('button') || e.target.closest('input')) return;
  dragging = true;
  dragStart.px = e.clientX;
  dragStart.py = e.clientY;
  dragStart.sx = menu.x;
  dragStart.sy = menu.y;
  try { e.target.setPointerCapture?.(e.pointerId); } catch { }
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

function keepInViewport() {
  if (!menuEl.value) return;
  const rect = menuEl.value.getBoundingClientRect();
  menu.x = clamp(menu.x, 0, window.innerWidth - rect.width);
  menu.y = clamp(menu.y, 0, window.innerHeight - rect.height);
}

onMounted(() => window.addEventListener('resize', keepInViewport));
onBeforeUnmount(() => {
  window.removeEventListener('resize', keepInViewport);
  window.removeEventListener('pointermove', onDragMove);
  window.removeEventListener('pointerup', stopDrag);
});
</script>

<style scoped>
@import './WallsMenuStyle.css';
@import './EditProjectStyle.css';

/* --- Стилизация за Custom Number Input с вертикални стрелки --- */
.custom-number {
  display: flex;
  align-items: stretch; /* Разпъва вътрешните елементи по височина */
  background: color-mix(in srgb, var(--bg-soft, #333), transparent 20%);
  border: 1px solid var(--border, #555);
  color:var(--text);
  border-radius: 4px;
  overflow: hidden; 
  width: 100%;
  height: 34px; /* Малко по-високо, за да събере 2 бутона комфортно */
}

.custom-number input[type="number"] {
  flex-grow: 1;
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
  color: inherit;
  text-align: left; /* Може да го смениш на center, ако предпочиташ */
  padding: 0 10px;
  font-size: 0.95rem;
  -moz-appearance: textfield; /* Скрива стрелките във Firefox */
}

.custom-number input[type="number"]:focus {
  outline: none;
}

/* Скриваме базовите стрелки на браузърите */
.custom-number input[type="number"]::-webkit-outer-spin-button,
.custom-number input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.step-controls {
  display: flex;
  flex-direction: column;
  width: 26px; /* Широчина на стрелките */
  border-left: 1px solid var(--border, #555);
}

.step-btn {
  flex: 1; /* Взема половината височина */
  background: var(--bluey); 
  color: #fff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s ease;
  padding: 0;
}

.step-btn:first-child {
  border-bottom: 1px solid var(--border, #555); /* Разделител между двете стрелки */
}

.step-btn:hover {
  background: color-mix(in srgb, var(--bluey) 70%, #000);
}
.step-btn:active {
  background: color-mix(in srgb, var(--bluey) 50%, #000);
}
</style>