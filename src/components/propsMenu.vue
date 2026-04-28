<template>
  <div v-if="visible" id="props-menu" class="props-menu">
    
    <div class="props-header">
      <div @click="startEditing" v-if="!isEditingName" class="name-display">
        <p id="props-selected-name"  :title="name">{{ name }}</p>
        <button class="icon-btn"  title="Rename">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
      </div>

      <div v-else class="name-edit">
        <input 
          ref="nameInputRef"
          type="text" 
          v-model="tempName" 
          @keydown.enter="saveName"
          @keydown.esc="cancelEditing"
          class="name-input"
        />
        <button class="icon-btn save-btn" @click="saveName" title="Save Name">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
      </div>
    </div>

    <div v-if="props.type!=='window' && props.type!=='ceiling' && props.type!=='floor' && props.type!=='wall'" class="props-dimensions-container">
      <div class="props-dimensions">
        <div class="dim-group">
          <label>W</label>
          <div class="custom-number">
            <button class="step-btn" @click="stepDim('w', -0.1)">-</button>
            <input type="number" step="0.1" :value="localW" @change="updateDim('w', $event)" @keyup.enter="updateDim('w', $event)" />
            <button class="step-btn" @click="stepDim('w', 0.1)">+</button>
          </div>
        </div>
        <div class="dim-group">
          <label>H</label>
          <div class="custom-number">
            <button class="step-btn" @click="stepDim('h', -0.1)">-</button>
            <input type="number" step="0.1" :value="localH" @change="updateDim('h', $event)" @keyup.enter="updateDim('h', $event)" />
            <button class="step-btn" @click="stepDim('h', 0.1)">+</button>
          </div>
        </div>
        <div class="dim-group" v-if="props.type!=='door'">
          <label>D</label>
          <div class="custom-number">
            <button class="step-btn" @click="stepDim('d', -0.1)">-</button>
            <input type="number" step="0.1" :value="localD" @change="updateDim('d', $event)" @keyup.enter="updateDim('d', $event)" />
            <button class="step-btn" @click="stepDim('d', 0.1)">+</button>
          </div>
        </div>
      </div>
      
      <button class="icon-btn lock-btn" :class="{ 'is-locked': isRatioLocked }" @click="isRatioLocked = !isRatioLocked" :title="isRatioLocked ? 'Отключи пропорциите' : 'Заключи пропорциите'">
        <svg v-if="isRatioLocked" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
        </svg>
      </button>
    </div>

    <v-switch hide-details v-if="type=='floor'" label="Таван" v-model="hasCeiling"></v-switch>

    <div id="props-rotate">
      <button type="button" @click="rotate(-15)" title="Rotate -15°">⟲</button>

      <div class="custom-number">
        <button class="step-btn" @click="stepRotation(-1)">-</button>
        <input type="number" step="1" min="-360" max="360" :value="rotationValue" @change="onInputChange" @keydown.enter="onInputChange" title="Rotation (degrees)" />
        <button class="step-btn" @click="stepRotation(1)">+</button>
      </div>
      
      <button type="button" @click="rotate(15)" title="Rotate +15°">⟳</button>
    </div>

    <div v-if="showTextures" class="props-textures">
      <div class="divider"></div>
      <p class="section-label">Материал</p>
      <div class="texture-grid">
        <button 
          v-for="tex in textures" 
          :key="tex.id" 
          class="texture-btn" 
          @click="$emit('update:texture', tex.filename)"
          :title="tex.name"
        >
          <div class="texture-preview" :style="{ backgroundImage: `url(/app/src/assets/textures/${tex.filename})`, backgroundColor: tex.fallbackColor }"></div>
        </button>
      </div>
    </div>
    <div v-if="props.type === 'floor'" class="props-textures">
      <div class="divider"></div>
      <p class="section-label">Подови настилки</p>
      <div class="texture-grid">
        <button 
          v-for="tex in flooring" 
          :key="tex.id" 
          class="texture-btn" 
          @click="$emit('update:texture', tex.filename)"
          :title="tex.name"
        >
          <div class="texture-preview" :style="{ backgroundImage: `url(/app/src/assets/textures/${tex.previewPic || tex.filename})`, backgroundColor: tex.fallbackColor }"></div>
        </button>
      </div>
    </div>
    <div class="props-textures">
      <div class="divider"></div>
      <p class="section-label">Цвят</p>
      <div class="texture-grid">
         <ColorPicker 
          :initialColor="(props.texture && props.texture.startsWith('#') ? props.texture : '#000000')" 
          @update:color="(newHex) => $emit('update:color', newHex)"
        />
        <button 
          v-for="col in colors" 
          :key="col.id" 
          class="texture-btn" 
          @click="$emit('update:color', col.color)"
          :title="col.name"
        >
          <div class="texture-preview" :style="{ backgroundColor: col.color }"></div>
        </button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue';
import ColorPicker from './ColorPicker.vue';

const props = defineProps({
  visible: { type: Boolean, default: false },
  type: { type: String, default: '' },
  name: { type: String, default: '' },
  width: { type: Number, default: 1 },
  height: { type: Number, default: 1 },
  depth: { type: Number, default: 1 },
  texture: { type: String, default: '' },
  rotation: { type: Number, default: 0 },
  ceiling: { type: Boolean, default: false }
});

const emit = defineEmits(['update:rotation', 'update:name', 'update:texture', 'update:color','update:ceiling', 'update:dimensions']);

/* ---------------- DIMENSIONS LOGIC ---------------- */
const localW = ref(props.width);
const localH = ref(props.height);
const localD = ref(props.depth);
const isRatioLocked = ref(true);

watch(() => props.width, (v) => localW.value = v);
watch(() => props.height, (v) => localH.value = v);
watch(() => props.depth, (v) => localD.value = v);

// НОВО: Отделена логика за калкулиране на размерите, за да се ползва и от бутоните, и от инпута
function applyDimensionChange(axis, val) {
  if (isNaN(val) || val <= 0) return false;

  if (isRatioLocked.value) {
    let factor = 1;
    if (axis === 'w' && localW.value) factor = val / localW.value;
    else if (axis === 'h' && localH.value) factor = val / localH.value;
    else if (axis === 'd' && localD.value) factor = val / localD.value;
    localW.value = Number((localW.value * factor).toFixed(3));
    localH.value = Number((localH.value * factor).toFixed(3));
    if(props.type!=='door') localD.value = Number((localD.value * factor).toFixed(3));
    if (axis === 'w') localW.value = Number(val.toFixed(3));
    if (axis === 'h') localH.value = Number(val.toFixed(3));
    if (axis === 'd') localD.value = Number(val.toFixed(3));
  } else {
    if (axis === 'w') localW.value = Number(val.toFixed(3));
    if (axis === 'h') localH.value = Number(val.toFixed(3));
    if (axis === 'd') localD.value = Number(val.toFixed(3));
  }

  emit('update:dimensions', {
    width: localW.value,
    height: localH.value,
    depth: localD.value
  });
  
  return true;
}

// За ръчно писане в инпута
function updateDim(axis, event) {
  const val = parseFloat(event.target.value);
  const success = applyDimensionChange(axis, val);
  if (!success) {
    event.target.value = axis === 'w' ? localW.value : axis === 'h' ? localH.value : localD.value;
  }
}

// За цъкане по custom +/- бутоните
function stepDim(axis, delta) {
  const current = axis === 'w' ? localW.value : axis === 'h' ? localH.value : localD.value;
  // Събираме и закръгляме, за да избегнем проблеми като 0.1 + 0.2 = 0.3000000004
  const newVal = Number((current + delta).toFixed(3));
  if(newVal <= 0.1) return; 
  applyDimensionChange(axis, newVal);
}

const hasCeiling = computed({
  get: () => props.ceiling,
  set: (value) => emit('update:ceiling', value)
});

/* ---------------- TEXTURE LOGIC ---------------- */
const textures = [
  { id: 'oak', name: 'Havos Oak', filename: 'egger-havos-oak.jpg', fallbackColor: '#8B5A2B'},
  { id: 'walnut', name: 'Walnut', filename: 'egger-walnut.jpg', fallbackColor: '#95a5a6'},
  { id: 'ash', name: 'Ash', filename: 'egger-grey-oak.png', fallbackColor: '#bdc3c7'},
  { id: 'marble', name: 'Marble Black', filename: 'egger-marble-black.jpg', fallbackColor: '#ecf0f1'},
  { id: 'marble-white', name: 'Marble White', filename: 'egger-marble-white.jpg', fallbackColor: '#ecf0f1'},
  { id: 'concrete', name: 'Concrete', filename: 'egger-concrete.jpg', fallbackColor: '#7f8c8d'},
];
const flooring=[
  { id: 'flooring-1', name: '', filename: 'flooring-1.jpg', fallbackColor: '#7f8c8d'},
  { id: 'flooring-2', name: '', filename: 'flooring-2.jpg', fallbackColor: '#c49e6c'},
  { id: 'flooring-3', name: '', filename: 'flooring-3.jpg', fallbackColor: '#bdc3c7',previewPic: 'flooring-3-preview.jpg'},
  { id: 'flooring-4', name: '', filename: 'flooring-4.jpg', fallbackColor: '#bdc3c7',previewPic: 'flooring-4-preview.jpg' },
];
const colors=[
  { id: 'white', name: 'White', color: '#ffffff' },
  { id: 'black', name: 'Black', color: '#000000' },
  {id:'red',name:'Red',color:'#ff0000'},
  {id:'green',name:'Green',color:'#00ff00' },
  {id:'blue',name:'Blue',color:'#0000ff' },
  {id:'yellow',name:'Yellow',color:'#ffff00' },
  {id:'gray',name:'Gray',color:'#808080' },
];

const showTextures = computed(() => {
  return props.type && props.type !== 'wall' && props.type !== 'floor';
});

/* ---------------- ROTATION LOGIC ---------------- */
const rotationValue = computed(() => Math.round(props.rotation));

function rotate(delta) {
  emit('update:rotation', props.rotation + delta);
}

function onInputChange(e) {
  const val = parseFloat(e.target.value);
  if (!isNaN(val)) {
    emit('update:rotation', val);
  }
}

function stepRotation(delta) {
  emit('update:rotation', props.rotation + delta);
}

/* ---------------- NAME EDITING LOGIC ---------------- */
const isEditingName = ref(false);
const tempName = ref('');
const nameInputRef = ref(null);

watch(() => props.name, (newVal) => {
  tempName.value = newVal;
  isEditingName.value = false;
});

function startEditing() {
  tempName.value = props.name;
  isEditingName.value = true;
  nextTick(() => {
    nameInputRef.value?.focus();
    nameInputRef.value?.select();
  });
}

function saveName() {
  if (tempName.value.trim() !== '') {
    emit('update:name', tempName.value);
  } else {
    tempName.value = props.name;
  }
  isEditingName.value = false;
}

function cancelEditing() {
  tempName.value = props.name;
  isEditingName.value = false;
}
</script>

<style scoped>
.props-menu {
  position: absolute;
  top: 60px;
  right: 20px;
  background: color-mix(in srgb, var(--bg), transparent 17%);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  width: 220px;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  gap: 8px; 
  z-index: 100;
  transition: opacity 0.2s;
  color: var(--text);
}

/* --- Размери --- */
.props-dimensions-container {
  display: flex;
  align-items: center;
  gap: 8px;
  background: color-mix(in srgb, var(--bg-soft, #333), transparent 60%);
  padding: 8px;
  border-radius: 6px;
  margin-bottom: 4px;
}

.props-dimensions {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  gap: 4px;
}

.dim-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dim-group label {
  font-size: 0.8rem;
  font-weight: bold;
  opacity: 0.8;
  width: 16px;
}

/* --- НОВО: Стилизация за Custom Number Input --- */
.custom-number {
  display: flex;
  align-items: center;
  background: var(--bg-soft);
  border: 1px solid var(--border, #555);
  border-radius: 4px;
  overflow: hidden; /* За да не излизат ръбовете на бутоните */
  width: 100%;
  max-width: 110px;
  height: 30px;
}

.custom-number input[type="number"] {
  flex-grow: 1;
  width: 100%;
  border: none;
  background: transparent;
  color: inherit;
  text-align: center;
  font-size: 1rem;
  padding: 0;
  -moz-appearance: textfield; /* Firefox */
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

.step-btn {
  background: var(--bluey); 
  color: #fff;
  border: none;
  width: 28px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1.3rem;
  transition: background 0.2s ease;
}

.step-btn:hover {
  background: color-mix(in srgb, var(--bluey) 70%, #000);
}
.step-btn:active {
  background: color-mix(in srgb, var(--bluey) 50%, #000);
}

.lock-btn {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--bg-soft, #444), transparent 30%);
}

.lock-btn:hover {
  background: color-mix(in srgb, var(--bg-soft, #555), transparent 10%);
}

.lock-btn.is-locked {
  color: var(--primary, #00AEEF);
}

#props-rotate>button{
  font-size: 1.5rem;
}

/* --- Други --- */
#props-rotate {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content:space-around;
  width: 100%;
}


.props-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 24px;
}

.name-display, .name-edit {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 8px;
}
.name-display:hover {
  cursor: pointer;
}
#props-selected-name {
  font-weight: 600;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-grow: 1;
}

.name-input {
  width: 100%;
  background: color-mix(in srgb, var(--bg-soft, #333), transparent 20%);
  border: 1px solid var(--border, #555);
  color: var(--text, #fff);
  padding: 2px 5px;
  border-radius: 4px;
  font-size: inherit;
  font-family: inherit;
}

.name-input:focus {
  outline: 2px solid var(--primary, #00AEEF);
  border-color: transparent;
}

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  opacity: 0.7;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.icon-btn:hover { opacity: 1; }

.divider {
  height: 1px;
  background: var(--border, rgba(255,255,255,0.1));
  margin: 4px 0;
  width: 100%;
}

.section-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.6;
  margin: 0 0 6px 0;
}

.texture-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-start;
}

.texture-btn {
  width: 42px;
  height: 42px;
  padding: 0;
  border: 2px solid transparent;
  background: none;
  border-radius: 6px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.2s ease;
}

.texture-btn:hover {
  transform: translateY(-2px);
  border-color: var(--primary, #00AEEF);
  box-shadow: 0 2px 5px rgba(0,0,0,0.3);
}

.texture-preview {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
}
</style>