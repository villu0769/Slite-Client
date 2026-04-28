<template>
  <div class="auth-container home-wrapper">
    <div class="glow-orb orb-1"></div>
    <div class="glow-orb orb-2"></div>
    <div class="auth-buttons">
      <button v-if="hasToken" class="btn btn-secondary" @click="logout">
        Изход
      </button>
      <button v-if="!hasToken" class="btn btn-primary" @click="goToLogin">
        Вход
      </button>
      <button v-if="!hasToken" class="btn btn-secondary" @click="goToRegister">
        Регистрация
      </button>
    </div>
    <div class="glass-card">
      <div class="logo-section">
        <img src="/src/assets/logo.png" alt="">
        <p class="brand-subtitle">Пространство за вашите идеи</p>
      </div>

      <div class="info-section">
        <p>
          Проектирайте мечтания дом с лекота. Създавайте стаи, добавяйте мебели
          и визуализирайте интериор в реално време, директно в браузъра си.
        </p>
      </div>

      <div class="actions-section">
        <div v-if="hasToken" class="logged-in-view">
          <p class="welcome-back">Здравейте отново!</p>
          <button class="btn btn-primary" @click="goToApp">
            Продължете към редактора
            <svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div class="footer">
      <span>&copy; 2026 Slite.</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router'; // Предполагам, че ползваш router
import { verifyToken } from '../services/authService';

const router = useRouter();
const hasToken = ref(false);


const checkAuth = async () => {
    try {
      await verifyToken();
    } catch (err) {
      console.error('Token verification failed:', err);
    }
    const token = localStorage.getItem('token');
    hasToken.value = !!token;
  };

onMounted(() => {
  checkAuth();
});

// Навигационни функции
const goToApp = () => {
  if (localStorage.getItem('role') === 'admin') router.push('/admin');
  else router.push('/projects');
}
const goToLogin = () => router.push('/login');
const goToRegister = () => router.push('/register');
const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  localStorage.removeItem('role');
  hasToken.value = false; // Обновяване на състоянието
  router.push('/login'); // Връщане към началната страница
};
</script>

<style scoped>
/* --- 1. Fonts & Reset --- */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;500;700;900&display=swap');
@import './authStyles.css';
.home-wrapper {
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.home-wrapper::-webkit-scrollbar {
  display: none;
}

/* Надграждаме Glass Card, за да е малко по-голям и с анимация */
.home-wrapper .glass-card {
  max-width: 480px;
  padding: 3rem 2.5rem;
  animation: fadeUp 0.8s ease-out;
  text-align: center;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 2rem;
}
.logo-section img {
  height: 80px;
  margin-bottom: 1rem;
}
.brand-subtitle {
  margin-top: 0.5rem;
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 300;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.info-section p {
  font-size: 1rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
}

/* --- Навигационни бутони (Горе вдясно) --- */
.auth-buttons {
  display: flex;
  position: absolute;
  top: 20px;
  right: 20px;
  gap: 1rem;
  justify-content: center;
  z-index: 20; /* За да може да се цъкат над орбитите */
}

/* Вторичен бутон (уникален за Home) */
.btn-secondary {
  background: rgba(255, 255, 255, 0.05);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: #ffffff;
}

/* --- Допълнителни елементи --- */
.welcome-back {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 2rem;
}

.arrow-icon {
  width: 18px;
  height: 18px;
  vertical-align: middle;
  margin-left: 5px;
}

.footer {
  position: absolute;
  bottom: 20px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.2);
}

/* --- Мобилна адаптация --- */
@media (max-width: 600px) {
  .home-wrapper .brand-title {
    font-size: 3rem;
  }
  
  /* Бутоните горе вдясно на телефон е по-добре да са по-малки, 
     вместо да падат на нов ред и да закриват екрана */
  .auth-buttons {
    top: 16px;
    right: 16px;
    gap: 0.5rem;
  }
  
  .auth-buttons .btn {
    padding: 0.6rem 1rem;
    font-size: 0.85rem;
  }
  
  .home-wrapper .glass-card {
    padding: 2.5rem 1.5rem;
  }
}
</style>