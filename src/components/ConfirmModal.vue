<template>
  <div v-if="isOpen" class="modal-overlay">
    <div class="modal-card">
      <h3 class="modal-title">Потвърждение</h3>
      <p class="modal-message">{{ message }}</p>
      
      <div class="modal-actions">
        <button class="btn-cancel" @click="cancel">Отказ</button>
        <button class="btn-confirm" @click="accept">Изтрий</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useConfirm } from '../composables/useConfirm';

const { isOpen, message, accept, cancel } = useConfirm();
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0; 
  left: 0; 
  width: 100vw; 
  height: 100vh;
  background: rgba(0, 0, 0, 0.4); 
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex; 
  align-items: center; 
  justify-content: center;
  z-index: 9999;
}

.modal-card {
  background: var(--bg-soft); 
  padding: 24px; 
  border-radius: 12px;
  width: 350px; 
  max-width: 90vw; 
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  border: 1px solid var(--border, #ccc); 
  text-align: center;
}

.modal-title { 
  margin-top: 0; 
  font-size: 1.2rem; 
  color: var(--text); 
}

.modal-message { 
  margin: 16px 0 24px; 
  color: var(--text); 
  font-size: 0.95rem;
  line-height: 1.4;
}

.modal-actions { 
  display: flex; 
  gap: 12px; 
}

.modal-actions button { 
  flex: 1; 
  padding: 10px; 
  border-radius: 8px; 
  cursor: pointer; 
  border: none; 
  font-weight: 600; 
  font-size: 0.95rem;
  transition: opacity 0.2s, transform 0.1s;
}

.modal-actions button:active {
  transform: scale(0.98);
}

.btn-cancel { 
  background: transparent; 
  border: 1px solid var(--border) !important; 
  color: var(--text); 
}

.btn-confirm { 
  background: var(--danger, #ff4757); 
  color: white; 
}

/* =========================================
   MOBILE RESPONSIVENESS
========================================= */
@media screen and (max-width: 480px) {
  .modal-card {
    padding: 20px 16px;
    width: 90vw; /* Гарантираме, че не опира в краищата на екрана */
  }

  .modal-actions {
    flex-direction: column; /* Подреждаме ги един над друг */
    gap: 10px;
  }

  .modal-actions button {
    width: 100%;
    padding: 12px; /* Правим ги по-високи, за по-лесно натискане с пръст */
  }

  /* Разместваме визуално бутоните: Важното действие (Изтрий) отива отгоре */
  .btn-confirm {
    order: 1;
  }

  /* Отказът минава отдолу като вторична опция */
  .btn-cancel {
    order: 2;
  }
}
</style>