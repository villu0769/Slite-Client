<template>
  <transition name="fade">
    <div v-if="visible" class="props-menu" @click.stop>
      
      <div class="props-header">
        <h3 class="props-name">{{ name || 'Unknown Object' }}</h3>
        <span class="props-coords">{{ details }}</span>
      </div>

      <hr class="props-divider" />

      <div class="props-rotate">
        <label class="rotate-label">Rotation Y</label>
        <div class="rotate-controls">
          <button class="icon-btn" type="button" @click="$emit('rotate-delta', -15)" title="Rotate -15°">
            ⟲
          </button>
          
          <div class="input-wrapper">
            <input 
              type="number" 
              class="rotate-input"
              step="1" 
              min="-360" 
              max="360" 
              :value="Math.round(rotation)" 
              @input="onInputChange"
              @keydown.enter="$event.target.blur()"
            />
            <span class="unit">°</span>
          </div>

          <button class="icon-btn" type="button" @click="$emit('rotate-delta', 15)" title="Rotate +15°">
            ⟳
          </button>
        </div>
      </div>

      </div>
  </transition>
</template>

<script setup>
defineProps({
  visible: Boolean,
  name: String,
  details: String,
  rotation: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits(['rotate-delta', 'update-rotation', 'delete']);

function onInputChange(e) {
  const val = parseFloat(e.target.value);
  if (!isNaN(val)) {
    emit('update-rotation', val);
  }
}
</script>

<style scoped>
/* 1. ОСНОВЕН СТИЛ (ВИДИМО СЪСТОЯНИЕ) 
  Тук описваме как изглежда менюто, когато е на екрана.
*/
.props-menu {
  position: fixed;
  top: 120px; /* Малко под хедъра, ако имаш такъв */
  right: 20px;
  width: 260px; /* Трябва фиксирана ширина, за да не е 0 */
  z-index: 70;
  
  /* Glassmorphism */
  background: color-mix(in srgb, var(--bg-soft), transparent 18%);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  
  border: 1px solid var(--border, rgba(255,255,255,0.1));
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  border-radius: 16px;
  
  padding: 16px;
  box-sizing: border-box;
  
  display: flex;
  flex-direction: column;
  gap: 12px;
  
  color: var(--text, #fff);
  font-family: 'Inter', sans-serif;
}

/* 2. ВЪТРЕШНИ ЕЛЕМЕНТИ 
*/
.props-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.props-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-highlight, #fff);
}

.props-coords {
  font-size: 12px;
  color: var(--text-dim, #aaa);
  font-family: monospace;
}

.props-divider {
  border: none;
  border-top: 1px solid var(--border, rgba(255,255,255,0.1));
  margin: 4px 0;
  width: 100%;
}

.props-rotate {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rotate-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-dim, #aaa);
}

.rotate-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(0,0,0,0.2);
  border-radius: 8px;
  padding: 4px;
}

/* Бутони за въртене */
.icon-btn {
  background: transparent;
  border: none;
  color: var(--text, #fff);
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: background 0.2s;
}

.icon-btn:hover {
  background: rgba(255,255,255,0.1);
}

/* Инпут поле */
.input-wrapper {
  position: relative;
  flex: 1;
  margin: 0 8px;
}

.rotate-input {
  width: 100%;
  background: transparent;
  border: none;
  color: var(--text, #fff);
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  padding: 4px 14px 4px 4px; /* Място за знака градус */
}

.rotate-input:focus {
  outline: none;
  background: rgba(255,255,255,0.05);
  border-radius: 4px;
}

/* Премахване на стрелките на input type number */
.rotate-input::-webkit-outer-spin-button,
.rotate-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.unit {
  position: absolute;
  right: 5px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-dim, #aaa);
  pointer-events: none;
}

/* 3. VUE TRANSITION (АНИМАЦИЯТА)
  Тук използваме класовете на Vue.
*/

/* Когато елементът влиза или излиза, анимираме тези пропъртита */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s cubic-bezier(0.25, 0.8, 0.25, 1),
              transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

/* Начално състояние (преди поява) и крайно състояние (след изчезване) */
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95); /* Леко отместване и смаляване */
  pointer-events: none;
}
</style>