<template>
  <div v-if="visible" id="props-menu" class="props-menu">
    <p id="props-selected-name">{{ name }}</p>
    <p id="props-selected-coords">{{ details }}</p>

    <div id="props-rotate">
      <button type="button" @click="rotate(-15)" title="Rotate -15°">⟲</button>
      <button type="button" @click="rotate(15)" title="Rotate +15°">⟳</button>
      
      <input 
        type="number" 
        step="1" 
        min="-360" 
        max="360"
        :value="rotationValue" 
        @change="onInputChange"
        @keydown.enter="onInputChange"
        title="Rotation (degrees)" 
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  visible: { type: Boolean, default: false },
  type:{type:String,default:''},
  name: { type: String, default: '' },
  details: { type: String, default: '' }, // e.g. "w:20 h:40 d:11"
  rotation: { type: Number, default: 0 }  // In degrees
});

const emit = defineEmits(['update:rotation']);

// Create a local computed property or just use props directly. 
// Using a computed proxy allows us to easily emit changes.
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
</script>

<style scoped>
/* Move component specific styles here, or keep relying on EditProjectStyle.css 
   if you want to share styles globally. */
.props-menu {
  /* Ensure these match your existing CSS or defining them here */
  position: absolute;
  top: 60px; /* Adjust based on your header */
  right: 20px;
  background: rgba(255, 255, 255, 0.9);
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  width: 220px;
  pointer-events: auto; /* Important since canvas might block events */
  display: flex;
  flex-direction: column;
  gap: 5px;
  z-index: 100; /* Ensure it sits above canvas */
  transition: opacity 0.2s;
}

#props-rotate {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-top: 8px;
}

input[type=number] {
  width: 64px;
}
</style>