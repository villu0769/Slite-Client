import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from '../pages/LoginPage.vue'
import RegisterPage from '../pages/RegisterPage.vue'
import ProjectsPage from '../pages/ProjectsPage.vue'
import EditProjectPage from '../pages/EditProjectPage.vue'
import UnauthorizedPage from '../pages/UnauthorizedPage.vue'
import HomePage from '../pages/HomePage.vue'
import AdminPage from '../pages/AdminPage.vue'
import EditProfilePage from '../pages/EditProfilePage.vue'
import { verifyToken } from '../services/authService'

async function requireAuth(to, from, next) {
  const isTokenValid = await verifyToken();

  if (!isTokenValid) {
    return next('/login');
  }

  next();
}

async function requireAdmin(to, from, next) {
  const isTokenValid = await verifyToken();

  if (!isTokenValid) {
    return next('/login');
  }

  if (localStorage.getItem('role') !== 'admin') return next('/unauthorized');
  next();
}

const routes = [
  { path: '/', component: HomePage },
  { path: '/login', component: LoginPage },
  { path: '/register', component: RegisterPage },
  { path: '/unauthorized', component: UnauthorizedPage },
  { path: '/admin', component: AdminPage, beforeEnter: requireAdmin },
  { path: '/profile', component: EditProfilePage, beforeEnter: requireAuth },
  { path: '/projects', component: ProjectsPage, beforeEnter: requireAuth },
  { path: '/project/:id', component: EditProjectPage, beforeEnter: requireAuth },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
