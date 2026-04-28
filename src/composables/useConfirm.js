// src/composables/useConfirm.js
import { ref } from 'vue';

// 1. Създаваме променливите ИЗВЪН функцията, за да бъдат глобални (споделени)
const isOpen = ref(false);
const message = ref('');
let resolveCallback = null;

export function useConfirm() {
  
  // Функция за показване на модала (Връща Promise)
  const showConfirm = (msg) => {
    message.value = msg;
    isOpen.value = true;
    
    return new Promise((resolve) => {
      resolveCallback = resolve;
    });
  };

  // Функция, когато потребителят цъкне "Изтрий" (Да)
  const accept = () => {
    isOpen.value = false;
    if (resolveCallback) resolveCallback(true);
  };

  // Функция, когато потребителят цъкне "Отказ" (Не)
  const cancel = () => {
    isOpen.value = false;
    if (resolveCallback) resolveCallback(false);
  };

  return {
    isOpen,
    message,
    showConfirm,
    accept,
    cancel
  };
}