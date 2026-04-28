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
          <input type="email" id="email" v-model="form.email" :class="{ 'has-error': errors.email }"
            placeholder="name@example.com" />
          <span v-if="errors.email" class="error-text">{{ errors.email }}</span>
        </div>

        <div class="input-group">
          <label for="password">Парола</label>
          <div class="password-wrapper">
            <input 
              :type="showPassword ? 'text' : 'password'" 
              id="password" 
              v-model="form.password" 
              :class="{ 'has-error': errors.password }"
              placeholder="••••••••" 
            />
            <button 
              type="button" 
              class="toggle-password-btn" 
              @click="showPassword = !showPassword"
              title="Покажи/Скрий паролата"
            >
              <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
                <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
                <line x1="2" y1="2" x2="22" y2="22"/>
              </svg>
            </button>
          </div>
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

    <Notification 
      :show="notification.show" 
      :message="notification.message" 
      :type="notification.type" 
    />

  </div>
</template>

<script setup>
import { reactive ,ref} from 'vue'
import { useRouter } from 'vue-router'
import { useMutation } from 'vue-query'
import { loginUser } from '../services/authService'

import Notification from '../components/Notification.vue'

const router = useRouter()

// Form Data
const form = reactive({ email: '', password: '' })
const errors = reactive({ email: '', password: '' })

const showPassword = ref(false)

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
    localStorage.setItem('token', data.token);
    localStorage.setItem('role', data.user.role);
    localStorage.setItem('username', data.user.username);
    
    showNotification('Успешен вход!', 'success');

    setTimeout(() => {
      if (localStorage.getItem('role') === 'admin') router.push('/admin'); else router.push('/projects');
    }, 1500);
  },
  onError: (err) => {
    const msg = err.response?.data?.message || err.message || 'Грешен имейл или парола'
    // Пример за червена нотификация
    showNotification(msg, 'error')
  },
})

const onSubmit = () => {
  if (!validate()) return
  mutation.mutate({ email: form.email, password: form.password })
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700;900&display=swap');
@import './authStyles.css';
</style>