<template>
  <div class="auth-container">
    <div class="glow-orb orb-1"></div>
    <div class="glow-orb orb-2"></div>

    <div class="glass-card">
      <div class="header-section">
        <h1 class="brand-title">Slite<span class="dot">.</span></h1>
        <h2 class="form-title">Създай акаунт</h2>
      </div>

      <form @submit.prevent="onSubmit" class="auth-form">
        <div class="input-group">
          <label for="email">Имейл</label>
          <input type="email" id="email" v-model="form.email" :class="{ 'has-error': errors.email }"
            placeholder="name@example.com" />
          <span v-if="errors.email" class="error-text">{{ errors.email }}</span>
        </div>
        
        <div class="input-group">
          <label for="username">Потребителско име</label>
          <input type="text" id="username" v-model="form.username" :class="{ 'has-error': errors.username }" 
            placeholder="Твоето име" />
          <span v-if="errors.username" class="error-text">{{ errors.username }}</span>
        </div>
        
        <div class="input-group">
          <label for="password">Парола</label>
          <input type="password" id="password" v-model="form.password" :class="{ 'has-error': errors.password }"
            placeholder="••••••••" />
          <span v-if="errors.password" class="error-text">{{ errors.password }}</span>
        </div>

        <button type="submit" class="btn btn-primary btn-block" :disabled="mutation.isLoading.value">
          <span v-if="mutation.isLoading.value">Зареждане...</span>
          <span v-else>Регистрация</span>
        </button>
      </form>

      <div class="form-footer">
        <p>Вече имаш акаунт? <a href="#" @click.prevent="goTo('/login')">Вход</a></p>
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
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useMutation } from 'vue-query'
import { registerUser } from '../services/authService'
import Notification from '../components/Notification.vue' // Импортираме нотификацията!

const router = useRouter()

// ОПРАВЕНО: Добавен е 'username' в reactive обектите
const form = reactive({ email: '', username: '', password: '' })
const errors = reactive({ email: '', username: '', password: '' })

// Custom Notification State
const notification = reactive({ show: false, message: '', type: 'success' })

const showNotification = (msg, type = 'success') => {
  notification.message = msg
  notification.type = type
  notification.show = true
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

  errors.password = !form.password ? 'Паролата е задължителна' : '';
  errors.username = !form.username ? 'Потребителското име е задължително' : '';
  
  return !errors.email && !errors.password && !errors.username;
}

// Mutation
const mutation = useMutation(registerUser, {
  onSuccess: (data) => {
    localStorage.setItem('token', data.token) 
    localStorage.setItem('role', data.user.role)
    localStorage.setItem('username', data.user.username) // Добра практика е да запазиш и username-а

    showNotification('Успешна регистрация! Пренасочване...', 'success')
    setTimeout(() => router.push('/projects'), 1500)
  },
  onError: (err) => {
    const msg = err.response?.data?.message || err.message || 'Възникна грешка при регистрацията'
    showNotification(msg, 'error')
  },
})

const onSubmit = () => {
  if (!validate()) return
  
  // ОПРАВЕНО: Добавихме username към payload-а за бекенда!
  mutation.mutate({ 
    email: form.email, 
    username: form.username, 
    password: form.password 
  })
}
</script>

<style scoped>
/* --- Global Layout & Fonts --- */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700;900&display=swap');
@import './authStyles.css';
</style>