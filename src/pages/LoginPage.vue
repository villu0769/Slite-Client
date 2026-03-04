<template>
  <div class="auth-container">
    <div class="glow-orb orb-1"></div>
    <div class="glow-orb orb-2"></div>

    <div class="glass-card">
      <div class="header-section">
        <h1 class="brand-title">Slite<span class="dot">.</span></h1>
        <h2 class="form-title">Вход</h2>
      </div>

      <form @submit.prevent="onSubmit" class="auth-form">
        <div class="input-group">
          <label for="email">Имейл</label>
          <input 
            type="email" 
            id="email" 
            v-model="form.email" 
            :class="{ 'has-error': errors.email }"
            placeholder="name@example.com"
          />
          <span v-if="errors.email" class="error-text">{{ errors.email }}</span>
        </div>

        <div class="input-group">
          <label for="password">Парола</label>
          <input 
            type="password" 
            id="password" 
            v-model="form.password" 
            :class="{ 'has-error': errors.password }"
            placeholder="••••••••"
          />
          <span v-if="errors.password" class="error-text">{{ errors.password }}</span>
        </div>

        <button type="submit" class="btn btn-primary btn-block" :disabled="mutation.isLoading.value">
          <span v-if="mutation.isLoading.value">Зареждане...</span>
          <span v-else>Вход</span>
        </button>
      </form>

      <div class="secondary-actions">
        <a href="#" class="link-sm" @click.prevent="goTo('/forgot-password')">Забравена парола?</a>
        <a href="#" class="link-sm" @click.prevent="goTo('/help-form')">Помощ</a>
      </div>

      <div class="form-footer">
        <p>Нямаш акаунт? <a href="#" @click.prevent="goTo('/register')">Регистрация</a></p>
      </div>
    </div>

    <transition name="fade">
      <div v-if="notification.show" :class="['notification', notification.type]">
        {{ notification.message }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useMutation } from 'vue-query'
import { loginUser } from '../services/authService'

const router = useRouter()

// Form Data
const form = reactive({ email: '', password: '' })
const errors = reactive({ email: '', password: '' })

// Custom Notification State
const notification = reactive({ show: false, message: '', type: 'success' })

const showNotification = (msg, type = 'success') => {
  notification.message = msg
  notification.type = type
  notification.show = true
  // Скриване след 3 секунди
  setTimeout(() => { notification.show = false }, 3000)
}

const goTo = (path) => router.push(path)

// Validation
const validate = () => {
  errors.email = !form.email
    ? 'Имейлът е задължителен'
    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
    ? 'Моля въведете валиден имейл'
    : ''

  errors.password = !form.password ? 'Паролата е задължителна' : ''

  return !errors.email && !errors.password
}

// Mutation
const mutation = useMutation(loginUser, {
  onSuccess: (data) => {
    // Запазване на токена и ролята
    localStorage.setItem('token', data.token)
    localStorage.setItem('role', data.user.role)
    
    showNotification('Успешен вход! Пренасочване...', 'success')
    
    // Леко забавяне преди редирект за по-добър UX
    setTimeout(() => router.push('/projects'), 1500)
  },
  onError: (err) => {
    const msg = err.response?.data?.message || err.message || 'Грешен имейл или парола'
    showNotification(msg, 'error')
  },
})

const onSubmit = () => {
  if (!validate()) return
  mutation.mutate({ email: form.email, password: form.password })
}
</script>

<style scoped>
/* --- Global Layout & Fonts --- */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700;900&display=swap');

.auth-container {
  font-family: 'Inter', sans-serif;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
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

/* --- Orbs --- */
.glow-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.6;
  z-index: 1;
  animation: float 10s infinite ease-in-out;
}
.orb-1 { width: 400px; height: 400px; background: #4a90e2; top: -100px; left: -100px; }
.orb-2 { width: 300px; height: 300px; background: #8c52ff; bottom: -50px; right: -50px; animation-delay: -5s; }

@keyframes float {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(20px, 30px); }
}

/* --- Glass Card --- */
.glass-card {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 400px;
  padding: 2.5rem;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* --- Typography --- */
.brand-title {
  font-size: 2rem;
  font-weight: 900;
  margin: 0;
  text-align: center;
  background: linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.dot { -webkit-text-fill-color: #4a90e2; }

.form-title {
  font-size: 1.5rem;
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
  margin-top: 1.2rem;
  margin-bottom: 0;
  font-weight: 550;
}

/* --- Form Elements --- */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  text-align: left;
}

label {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
}

input {
  width: 100%;
  padding: 0.8rem 1rem;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 1rem;
  transition: all 0.3s ease;
  outline: none;
}

input:focus {
  border-color: #4a90e2;
  background: rgba(0, 0, 0, 0.3);
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
}

input.has-error {
  border-color: #ff4d4d;
}

.error-text {
  color: #ff4d4d;
  font-size: 0.75rem;
}

/* --- Buttons & Links --- */
.btn {
  padding: 0.9rem;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  width: 100%;
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

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

/* Secondary Actions (Forgot password / Help) */
.secondary-actions {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  padding: 0 0.5rem;
}

.link-sm {
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  transition: color 0.2s;
}

.link-sm:hover {
  color: #ffffff;
  text-decoration: underline;
}

/* Footer */
.form-footer {
  text-align: center;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 0.5rem;
}

.form-footer a {
  color: #4a90e2;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s;
}

.form-footer a:hover {
  color: #8c52ff;
}

/* --- Notification / Toast --- */
.notification {
  position: absolute;
  bottom: 30px;
  padding: 12px 24px;
  border-radius: 50px;
  font-size: 0.9rem;
  font-weight: 500;
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  z-index: 100;
}

.notification.success {
  background: rgba(75, 181, 67, 0.2);
  border: 1px solid rgba(75, 181, 67, 0.5);
  color: #4bb543;
}

.notification.error {
  background: rgba(255, 77, 77, 0.2);
  border: 1px solid rgba(255, 77, 77, 0.5);
  color: #ff4d4d;
}

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.5s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>