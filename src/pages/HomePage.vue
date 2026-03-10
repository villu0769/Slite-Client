<template>
  <div class="home-container">
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
        <h1 class="brand-title">Slite<span class="dot">.</span></h1>
        <p class="brand-subtitle">Пространство за твоите идеи</p>
      </div>

      <div class="info-section">
        <p>
          Проектирай мечтания дом с лекота. Създавай стаи, добавяй мебели
          и визуализирай интериора в реално време, директно в браузъра си.
        </p>
      </div>

      <div class="actions-section">
        <div v-if="hasToken" class="logged-in-view">
          <p class="welcome-back">Здравей отново!</p>
          <button class="btn btn-primary" @click="goToApp">
            Продължи към редактора
            <svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div class="footer">
      <span>&copy; 2026 Slite Project. All rights reserved.</span>
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
  localStorage.removeItem('token'); // Премахване на токена
  hasToken.value = false; // Обновяване на състоянието
  router.push('/login'); // Връщане към началната страница
};
</script>

<style scoped>
/* --- 1. Fonts & Reset --- */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;500;700;900&display=swap');

.home-container {
  font-family: 'Inter', sans-serif;
  width: 100vw;
  height: 100vh;

  /* ПРОМЯНА: Разрешаваме скролването вертикално */
  overflow-y: auto;

  /* ПРОМЯНА: Скриване на скролбара за Firefox */
  scrollbar-width: none;
  /* ПРОМЯНА: Скриване на скролбара за IE и Edge */
  -ms-overflow-style: none;

  background-color: #0f1115;
  background-image:
    radial-gradient(at 10% 10%, rgba(74, 144, 226, 0.15) 0px, transparent 50%),
    radial-gradient(at 90% 90%, rgba(140, 82, 255, 0.15) 0px, transparent 50%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  color: #ffffff;
}

/* ПРОМЯНА: Скриване на скролбара за Chrome, Safari и Opera */
.home-container::-webkit-scrollbar {
  display: none;
}

/* --- 2. Background Decor (Orbs) --- */
.glow-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.6;
  z-index: 1;
  animation: float 10s infinite ease-in-out;
}

.orb-1 {
  width: 400px;
  height: 400px;
  background: #4a90e2;
  /* Slite Blue */
  top: -100px;
  left: -100px;
}

.orb-2 {
  width: 300px;
  height: 300px;
  background: #8c52ff;
  /* Creative Purple */
  bottom: -50px;
  right: -50px;
  animation-delay: -5s;
}

@keyframes float {

  0%,
  100% {
    transform: translate(0, 0);
  }

  50% {
    transform: translate(20px, 30px);
  }
}

/* --- 3. The Glass Card --- */
.glass-card {
  position: relative;
  z-index: 10;
  width: 90%;
  max-width: 480px;
  padding: 3rem 2.5rem;

  /* Glassmorphism magic */
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);

  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 2rem;

  animation: fadeUp 0.8s ease-out;
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* --- 4. Typography --- */
.brand-title {
  font-size: 4rem;
  font-weight: 900;
  margin: 0;
  letter-spacing: -2px;
  background: linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1;
}

.dot {
  color: #4a90e2;
  -webkit-text-fill-color: #4a90e2;
  /* Override gradient for dot */
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

/* --- 5. Buttons --- */
.auth-buttons {
  display: flex;
  position: absolute;
  top: 20px;
  right: 20px;
  gap: 1rem;
  justify-content: center;
}

.btn {
  padding: 0.8rem 1.5rem;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  outline: none;
}

.btn-primary {
  background: #ffffff;
  color: #000000;
}

.btn-primary:hover {
  background: #e0e0e0;
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(255, 255, 255, 0.15);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.05);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: #ffffff;
}

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

/* --- 6. Footer --- */
.footer {
  position: absolute;
  bottom: 20px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.2);
}

/* Mobile Responsive */
@media (max-width: 600px) {
  .brand-title {
    font-size: 3rem;
  }

  .auth-buttons {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>