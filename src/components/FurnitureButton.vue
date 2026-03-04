<template>
    <button
        class="item-btn"
        @pointerdown.prevent="$emit('start-drag', item)"
    >
        <img :src="item.pic" :alt="item.name" class="item-image" />
        <span class="item-name">{{ item.name }}</span>
    </button>
</template>

<script>
export default {
    name: 'FurnitureButton',
    props: {
        item: {
            type: Object,
            required: true
        }
    },
    emits: ['start-drag']
}
</script>

<style scoped>
.item-btn {
  /* Layout */
  display: flex;
  flex-direction: column; /* Подрежда картинката и текста вертикално */
  align-items: center;
  justify-content: center;
  gap: 8px; /* Равно разстояние между картинка и текст */
  padding-bottom: 12px;
  /* Визия и Цветове */
  background: var(--bg); /* Плътен фон, за да изпъкне над glass менюто */
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--text);
  
  /* Интеракция */
  cursor: grab;
  user-select: none;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  
  /* Начална лека сянка */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.item-btn:hover {
  transform: translateY(-4px);
  /* Границата става акцентна */
  border-color: var(--accent);
  /* Сянката леко се оцветява в акцентния цвят */
  box-shadow: 0 8px 20px -4px color-mix(in srgb, var(--accent), transparent 85%);
}

.item-btn:active {
  cursor: grabbing;
  transform: translateY(-2px);
  /* Лек оттенък на фона при натискане */
  background: color-mix(in srgb, var(--bg), var(--accent) 5%);
  box-shadow: 0 4px 10px -2px color-mix(in srgb, var(--accent), transparent 90%);
}

.item-image {
  width: 100%;
  height: 80px;
  object-fit: cover; /* Промених на contain, за да се вижда цялата мебел */
  border-top-left-radius: 8px;border-top-right-radius: 8px;
  pointer-events: none; /* Важно: предотвратява влаченето на самата картинка вместо бутона */
  /* Опционално: лека сянка само за картинката */
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
}

.item-name {
  font-size: 0.8rem; /* Малко по-компактен шрифт */
  font-weight: 500;
  text-align: center;
  color: var(--text);
  line-height: 1.2;
  word-break: break-word; /* Предотвратява излизане на дълги имена */
}

/* Адаптивност */
@media (max-width: 768px) {
  .item-btn {
    min-width: auto;
    width: 100%; /* На мобилни може да е по-добре да заемат повече място или да останат в грид */
    padding: 8px;
    gap: 6px;
  }

  .item-image {
    height: 60px;
  }

  .item-name {
    font-size: 0.75rem;
  }
}
</style>