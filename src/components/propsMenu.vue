<template>
  <div v-if="visible" id="props-menu" class="props-menu">
    
    <div class="props-header">
      <div v-if="!isEditingName" class="name-display">
        <p id="props-selected-name" :title="name">{{ name }}</p>
        <button class="icon-btn" @click="startEditing" title="Rename">
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

    <p id="props-selected-coords">{{ details }}</p>

    <div id="props-rotate">
      <button type="button" @click="rotate(-15)" title="Rotate -15°">⟲</button>
      <button type="button" @click="rotate(15)" title="Rotate +15°">⟳</button>

      <input type="number" step="1" min="-360" max="360" :value="rotationValue" @change="onInputChange"
        @keydown.enter="onInputChange" title="Rotation (degrees)" />
    </div>

    <div v-if="showTextures" class="props-textures">
      <div class="divider"></div>
      <p class="section-label">Material</p>
      <div class="texture-grid">
        <button 
          v-for="tex in textures" 
          :key="tex.id" 
          class="texture-btn" 
          @click="$emit('update:texture', tex.filename)"
          :title="tex.name"
        >
          <div class="texture-preview" :style="{ backgroundImage: `url(/app/pics/textures/${tex.filename})`, backgroundColor: tex.fallbackColor }"></div>
        </button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue';

const props = defineProps({
  visible: { type: Boolean, default: false },
  type: { type: String, default: '' },
  name: { type: String, default: '' },
  details: { type: String, default: '' },
  rotation: { type: Number, default: 0 }
});

const emit = defineEmits(['update:rotation', 'update:name', 'update:texture']);

/* ---------------- TEXTURE LOGIC (НОВО) ---------------- */

// Примерни текстури - смени URL-ите с реалните си файлове
const textures = [
  { id: 'oak', name: 'Havos Oak', filename: 'egger-havos-oak.jpg', fallbackColor: '#8B5A2B' },
  { id: 'walnut', name: 'Walnut', filename: 'egger-walnut.jpg', fallbackColor: '#95a5a6' },
];

// Показваме панела само ако има тип и той НЕ е стена или под
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
  gap: 8px; /* Slightly increased gap */
  z-index: 100;
  transition: opacity 0.2s;
  color: var(--text);
}

#props-rotate {
  display: flex;
  gap: 6px;
  align-items: center;
}

input[type=number] {
  width: 64px;
  background: color-mix(in srgb, var(--bg-soft, #333), transparent 20%);
  border: 1px solid var(--border, #555);
  color: inherit;
  border-radius: 4px;
  padding: 2px 4px;
}

/* --- Styles for Header/Name --- */
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

#props-selected-coords {
  font-size: 0.85em;
  opacity: 0.7;
  margin: 0;
}

/* --- NEW STYLES FOR TEXTURES --- */
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