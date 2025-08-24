import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from '../pages/LoginPage.vue'
import RegisterPage from '../pages/RegisterPage.vue'
import ProjectsPage from '../pages/ProjectsPage.vue'
import EditProjectPage from '../pages/EditProjectPage.vue'
import UnauthorizedPage from '../pages/UnauthorizedPage.vue'

function isAuthenticated() {
  return !!localStorage.getItem('token')
}

function requireAuth(to, from, next) {
  if (isAuthenticated()) {
    next()
  } else {
    next('/unauthorized')
  }
}

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: LoginPage },
  { path: '/register', component: RegisterPage },
  { path: '/unauthorized', component: UnauthorizedPage },
  { path: '/projects', component: ProjectsPage, beforeEnter: requireAuth },
  { path: '/project/:id', component: EditProjectPage, beforeEnter: requireAuth },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
