<template>
  <div 
    v-if="visible"
    class="selection-toolbar"
    :style="{ top: `${position.y}px`, left: `${position.x}px` }"
  >
    <button class="toolbar-btn" @click="$emit('duplicate')" title="Duplicate">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
    </button>

    <div class="divider"></div>

    <button v-if="objType!=='window' && objType!=='door'" class="toolbar-btn" @click="$emit('rotate', -90)" title="Rotate Left">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
        <path d="M3 3v5h5"></path>
      </svg>
    </button>

    <button v-if="objType!=='window' && objType!=='door'" class="toolbar-btn" @click="$emit('rotate', 90)" title="Rotate Right">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
        <path d="M21 3v5h-5"></path>
      </svg>
    </button>

    <div v-if="objType!=='window' && objType!=='door'" class="divider"></div>

    <button class="toolbar-btn" @click="$emit('flip', 'x')" title="Flip Horizontal">
       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.59 18.512l1.41-1.415L23.113 12l-4.113-5.097-1.41 1.415L20.285 12l-2.695 6.512zM12 2v20M6.41 18.512l-1.41-1.415L.887 12l4.113-5.097 1.41 1.415L3.715 12l2.695 6.512z"/></svg>
    </button>

    <button class="toolbar-btn" @click="$emit('flip', 'z')" title="Flip Vertical" style="transform: rotate(90deg)">
       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.59 18.512l1.41-1.415L23.113 12l-4.113-5.097-1.41 1.415L20.285 12l-2.695 6.512zM12 2v20M6.41 18.512l-1.41-1.415L.887 12l4.113-5.097 1.41 1.415L3.715 12l2.695 6.512z"/></svg>
    </button>


    <div class="divider"></div>

    <button class="toolbar-btn delete-btn" @click="$emit('delete')" title="Delete">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
      </svg>
    </button>
  </div>
</template>

<script setup>
defineProps({
  visible: Boolean,
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0,z:-1 })
  },
  objType: {
    type: String
  }

});

defineEmits(['duplicate', 'rotate', 'flip', 'ground', 'delete']);
</script>

<style scoped>
.selection-toolbar {
  position: absolute;
  z-index: 1000; /* Най-отгоре */
  /* Центрираме спрямо подадените координати и повдигаме нагоре */
  transform: translate(-50%, -110%); 
  
  display: flex;
  align-items: center;
  padding: 6px;
  gap: 4px;
  border-radius: 12px;

  /* Glassmorphism стил (същия като другите менюта) */
  background: color-mix(in srgb, var(--bg-soft), transparent 15%);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  box-shadow: var(--menu-shadow);
  
  pointer-events: auto;
  user-select: none;
  transition: opacity 0.2s ease;
}

/* Стрелката отдолу */
.selection-toolbar::after {
  content: '';
  position: absolute;
  bottom: -6px; /* Позиция под бара */
  left: 50%;
  transform: translateX(-50%);
  
  /* CSS триъгълник */
  width: 0; 
  height: 0; 
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  /* Използваме цвета на бордера за стрелката, за да се слее */
  border-top: 6px solid color-mix(in srgb, var(--bg-soft), transparent 15%); 
  /* Хак за да има и бордер на стрелката (по-сложно е с transparent backgrounds, това е опростен вариант) */
  filter: drop-shadow(0 1px 0 var(--border));
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s;
}

.toolbar-btn:hover {
  background: color-mix(in srgb, var(--text), transparent 90%);
}

.toolbar-btn svg {
  opacity: 0.8;
}
.toolbar-btn:hover svg {
  opacity: 1;
}

/* Разделителна линия */
.divider {
  width: 1px;
  height: 20px;
  background: var(--border);
  opacity: 0.5;
  margin: 0 4px;
}

/* Специфично за бутона за триене */
.delete-btn:hover {
  background: color-mix(in srgb, var(--danger), transparent 85%);
  color: var(--danger);
}
</style>