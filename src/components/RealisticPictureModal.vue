<template>
  <div class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      
      <div class="config-header">
        <span class="selected-model-name">Фотореалистичен рендер</span>
        <button class="small-back" @click="closeModal" title="Затвори" style="margin-left: auto;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <div class="image-container">
        <img :src="imageSrc" :alt="imageAlt" class="modal-image" />
      </div>
      
      <div class="tools-grid action-grid">
        <button class="tool-btn" title="Изтегли" @click="downloadImage">
          <div class="tool-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </div>
          <span class="tool-name">Изтегли</span>
        </button>

        <button class="tool-btn" title="Сподели във Facebook" @click="shareOn('facebook')">
          <div class="tool-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
            </svg>
          </div>
          <span class="tool-name">Facebook</span>
        </button>

        <button class="tool-btn" title="Сподели в X (Twitter)" @click="shareOn('twitter')">
          <div class="tool-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
            </svg>
          </div>
          <span class="tool-name">X</span>
        </button>

        <button class="tool-btn" title="Копирай линк" @click="copyLink">
          <div class="tool-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
          </div>
          <span class="tool-name">Копирай връзката</span>
        </button>
      </div>

    </div>
  </div>
  
  <Notification 
    :show="notification.show" 
    :message="notification.message" 
    :type="notification.type" 
  />
</template>

<script setup>
import { reactive } from 'vue';
import Notification from '../components/Notification.vue';

// Дефиниране на Props
const props = defineProps({
  imageSrc: {
    type: String,
    required: true
  },
  imageAlt: {
    type: String,
    default: '3D Render'
  }
});

// Дефиниране на Emits (за затваряне на модала)
const emit = defineEmits(['close']);

// Реактивно състояние за известията
const notification = reactive({ 
  show: false, 
  message: '', 
  type: 'info' 
});

let notificationTimeout = null;

const showNotify = (msg, type = 'info') => {
  // Изчистваме предишен таймер, ако има такъв
  if (notificationTimeout) clearTimeout(notificationTimeout);
  
  notification.message = msg;
  notification.type = type;
  notification.show = true;

  // Автоматично скриване след 3 секунди
  notificationTimeout = setTimeout(() => {
    notification.show = false;
  }, 3000);
};

const closeModal = () => {
  emit('close');
};

const downloadImage = () => {
  const link = document.createElement('a');
  link.href = props.imageSrc;
  link.download = props.imageAlt || 'render.png';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const shareOn = (platform) => {
  const url = window.location.href;
  const text = `Вижте моя нов 3D проект!`;
  let shareUrl = '';
  
  if (platform === 'facebook') {
    shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  } else if (platform === 'twitter') {
    shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  }
  
  if (shareUrl) window.open(shareUrl, '_blank', 'width=600,height=400');
};

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(window.location.href);
    showNotify('Линкът е копиран в клипборда!', 'info');
  } catch (err) {
    showNotify('Грешка при копирането', 'error');
  }
};
</script>

<style scoped>
/* Твоите стилове остават същите, те са екстра */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: var(--bg, #fff);
  border: 1px solid var(--border, #ddd);
  border-radius: 16px;
  max-width: 650px;
  width: 100%;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
}

.config-header {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  gap: 8px;
}

.selected-model-name {
  font-weight: 600;
  color: var(--text);
  font-size: 1rem;
}

.small-back {
  background: transparent;
  border: none;
  color: var(--text);
  cursor: pointer;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  opacity: 0.6;
}

.small-back:hover {
  opacity: 1;
  transform: scale(1.1);
}

.image-container {
  background: transparent;
  padding: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  min-height: 200px;
  max-height: 60vh;
  overflow: auto;
}

.modal-image {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;
}

.action-grid {
  padding: 20px;
  padding-bottom: 24px;
  border-top: 1px solid var(--border);
  margin: 0;
  justify-content: center;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 12px;
}

.tool-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: color-mix(in srgb, var(--bg), transparent 90%);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 18px;
  cursor: pointer;
  transition: all 0.15s ease;
  color: var(--text);
  position: relative;
  overflow: hidden;
}

.tool-btn:hover {
  background: var(--bg);
  border-color: var(--accent);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.tool-icon {
  width: 30px;
  height: 30px;
  color: var(--text);
  opacity: 0.8;
  margin-bottom: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s;
}

.tool-btn:hover .tool-icon,
.tool-btn:hover .tool-name {
  color: var(--accent);
  opacity: 1;
}

.tool-name {
  font-size: 12px;
  text-align: center;
  font-weight: 500;
  line-height: 1.2;
}

/* ANIMATIONS */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ==========================================
   TABLET RESPONSIVE (768px and below)
========================================== */
@media screen and (max-width: 768px) {
  .modal-overlay {
    padding: 16px;
  }

  .modal-content {
    border-radius: 12px;
    max-width: 95vw;
  }

  .config-header {
    padding: 14px 16px;
    gap: 6px;
  }

  .selected-model-name {
    font-size: 0.95rem;
  }

  .image-container {
    padding: 0;
    min-height: 180px;
    max-height: 55vh;
  }

  .action-grid {
    padding: 16px;
    padding-bottom: 20px;
  }

  .tools-grid {
    grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
    gap: 10px;
  }

  .tool-btn {
    padding: 14px;
    gap: 6px;
    border-radius: 10px;
  }

  .tool-icon {
    width: 26px;
    height: 26px;
    margin-bottom: 3px;
  }

  .tool-name {
    font-size: 11px;
  }
}

/* ==========================================
   SMALL PHONE (520px and below)
========================================== */
@media screen and (max-width: 520px) {
  .modal-overlay {
    padding: 12px;
  }

  .modal-content {
    border-radius: 12px;
    max-height: 90vh;
    max-width: 100vw;
  }

  .config-header {
    padding: 12px 14px;
    gap: 4px;
  }

  .selected-model-name {
    font-size: 0.9rem;
  }

  .image-container {
    padding: 0;
    min-height: 160px;
    max-height: 50vh;
  }

  .action-grid {
    padding: 14px;
    padding-bottom: 16px;
  }

  .tools-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .tool-btn {
    padding: 12px;
    gap: 5px;
    border-radius: 8px;
  }

  .tool-icon {
    width: 24px;
    height: 24px;
    margin-bottom: 2px;
  }

  .tool-name {
    font-size: 10px;
  }
}

/* ==========================================
   TINY PHONE (350px and below)
========================================== */
@media screen and (max-width: 350px) {
  .modal-overlay {
    padding: 8px;
  }

  .modal-content {
    border-radius: 12px 12px 0 0;
    max-height: 95vh;
  }

  .config-header {
    padding: 10px 12px;
  }

  .selected-model-name {
    font-size: 0.85rem;
  }

  .small-back {
    padding: 4px;
  }

  .small-back svg {
    width: 18px;
    height: 18px;
  }

  .image-container {
    padding: 0;
    min-height: 140px;
    max-height: 45vh;
  }

  .action-grid {
    padding: 12px;
    padding-bottom: 14px;
  }

  .tools-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
  }

  .tool-btn {
    padding: 10px;
    gap: 4px;
    border-radius: 6px;
  }

  .tool-icon {
    width: 20px;
    height: 20px;
    margin-bottom: 0;
  }

  .tool-name {
    font-size: 9px;
  }
}
</style>