<template>
  <v-container class="fill-height d-flex align-center justify-center">
    <v-card elevation="12" class="pa-6" max-width="400">
      <v-card-subtitle class="text-center text-h5 mb-4">Sign up</v-card-subtitle>

      <form @submit.prevent="onSubmit">
        <v-text-field
          v-model="form.email"
          label="Email"
          :error-messages="errors.email"
          outlined
          dense
          required
        />
        <v-text-field
          v-model="form.password"
          label="Password"
          type="password"
          :error-messages="errors.password"
          outlined
          dense
          required
        />

        <v-btn
          type="submit"
          block
          class="mt-4"
          color="primary"
        >
          Sign up
        </v-btn>
      </form>

      <v-row class="mt-2" justify="space-between">
        <v-btn text @click="goTo('/help-form')">Need help?</v-btn>
        <v-btn text @click="goTo('/forgot-password')">Forgotten password?</v-btn>
      </v-row>
    </v-card>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="1500">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useMutation } from 'vue-query'
import { registerUser } from '../services/authService'

const router = useRouter()

// Form data & errors
const form = reactive({ email: '', password: '' })
const errors = reactive({ email: '', password: '' })

// Snackbar
const snackbar = reactive({ show: false, message: '', color: 'success' })

// Navigate helper
const goTo = (path) => router.push(path)

// Form validation
const validate = () => {
  errors.email = !form.email
    ? 'Email is required'
    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
    ? 'Please enter a valid email'
    : ''

  errors.password = !form.password ? 'Password is required' : ''

  return !errors.email && !errors.password
}

// Mutation (register)
const mutation = useMutation(registerUser, {
  onSuccess: (data) => {
    localStorage.setItem('token', data.user.token)
    snackbar.message = 'Successfully registered'
    snackbar.color = 'success'
    snackbar.show = true
    setTimeout(() => router.push('/projects'), 1600)
  },
  onError: (err) => {
    snackbar.message = err.message || 'Invalid email or password'
    snackbar.color = 'error'
    snackbar.show = true
  },
})

const onSubmit = () => {
  if (!validate()) return
  mutation.mutate({ email: form.email, password: form.password })
}
</script>

<style scoped>
.logo {
  width: 120px;
}
</style>
