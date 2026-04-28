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
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 4l16 16M4 20L20 4"></path>
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
</template>

<script>
export default {
  name: 'RealisticPictureModal',
  props: {
    imageSrc: {
      type: String,
      required: true
    },
    imageAlt: {
      type: String,
      default: '3D Render'
    }
  },
  methods: {
    closeModal() {
      this.$emit('close');
    },
    downloadImage() {
      const link = document.createElement('a');
      link.href = this.imageSrc;
      link.download = this.imageAlt || 'render.png';
      link.click();
    },
    shareOn(platform) {
      const url = window.location.href;
      const text = `Вижте моя нов 3D проект!`;
      let shareUrl = '';
      
      if (platform === 'facebook') {
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
      } else if (platform === 'twitter') {
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
      }
      
      if (shareUrl) window.open(shareUrl, '_blank', 'width=600,height=400');
    },
    copyLink() {
      navigator.clipboard.writeText(window.location.href);
      alert('Линкът е копиран!');
    }
  }
};
</script>

<style scoped>
/* ФОН НА МОДАЛА */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px); /* Добавя лек блър за по-модерен вид */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

/* СЪДЪРЖАНИЕ НА МОДАЛА */
.modal-content {
  background: color-mix(in srgb, var(--bg), transparent 15%);
  border: 1px solid var(--border);
  border-radius: 12px;
  max-width: 650px;
  width: 100%;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
}

/* ХЕДЪР (Базиран на твоя стил) */
.config-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.selected-model-name {
  font-weight: 600;
  font-size: 1rem;
  color: var(--text);
}

.small-back {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: var(--text);
  border: 1px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.small-back:hover {
  background: color-mix(in srgb, var(--bg), #000 5%);
  border-color: var(--border, #ccc);
  color: var(--accent, #007bff);
}

/* КАРТИНКА */
.image-container {
  width: 100%;
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-image {
  max-width: 100%;
  max-height: 50vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

/* БУТОНИ (Взимаме директно твоите класове) */
.action-grid {
  padding: 20px;
  padding-bottom: 24px;
  border-top: 1px solid var(--border);
  margin: 0; /* Override-ваме padding-bottom от оригиналния ти grid, за да е центриран тук */
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
  transition: all 0.2s ease;
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
  transition: color 0.2s;
}

.tool-btn:hover .tool-icon ,.tool-btn:hover .tool-name{
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
</style>