import { ref } from 'vue';
const isOpen = ref(false);
const message = ref('');
let resolveCallback = null;

export function useConfirm() {
  const showConfirm = (msg) => {
    message.value = msg;
    isOpen.value = true;
    return new Promise((resolve) => {
      resolveCallback = resolve;
    });
  };
  const accept = () => {
    isOpen.value = false;
    if (resolveCallback) resolveCallback(true);
  };
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