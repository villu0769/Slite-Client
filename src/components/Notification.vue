<template>
  <transition name="fade">
    <div v-if="show" :class="['notification', type]">
      {{ message }}
    </div>
  </transition>
</template>

<script setup>
defineProps({
  show: {
    type: Boolean,
    default: false
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'info' // Приема: 'success' (зелен), 'error' (червен), 'info' (син)
  }
})
</script>

<style scoped>
.notification {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%); /* Центрираме го винаги в средата */
  padding: 12px 24px;
  border-radius: 50px;
  font-size: 0.9rem;
  font-weight: 500;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  z-index: 9999;
  white-space: nowrap;
}

/* --- 1. ЗЕЛЕН (Success) --- */
.notification.success {
  background: rgba(75, 181, 67, 0.2);
  border: 1px solid rgba(75, 181, 67, 0.5);
  color: #4bb543;
}

/* --- 2. ЧЕРВЕН (Error) --- */
.notification.error {
  background: rgba(255, 77, 77, 0.2);
  border: 1px solid rgba(255, 77, 77, 0.5);
  color: #ff4d4d;
}

/* --- 3. СИН (Info) --- */
.notification.info {
  background: rgba(74, 144, 226, 0.2);
  border: 1px solid rgba(74, 144, 226, 0.5);
  color: #4a90e2;
}

/* Transitions (С лек слайд ефект) */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px); 
}

/* =========================================
   MOBILE RESPONSIVENESS
========================================= */
@media screen and (max-width: 480px) {
  .notification {
    max-width: 90vw; 
    overflow: hidden; 
    text-overflow: ellipsis;
    
       
    padding: 12px 20px;
    bottom: 20px;
  }
}

</style>