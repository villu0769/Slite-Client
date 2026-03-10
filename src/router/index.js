import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from '../pages/LoginPage.vue'
import RegisterPage from '../pages/RegisterPage.vue'
import ProjectsPage from '../pages/ProjectsPage.vue'
import EditProjectPage from '../pages/EditProjectPage.vue'
import UnauthorizedPage from '../pages/UnauthorizedPage.vue'
import HomePage from '../pages/HomePage.vue'
import AdminPage from '../pages/AdminPage.vue'
import { verifyToken } from '../services/authService'
async function requireAuth(to, from, next) {
  try {
    await verifyToken();
    if (!localStorage.getItem('token')) {
      return next('/login'); 
    }
    next(); 
  } catch (error) {
    console.error('Грешка при проверка на токена в роутера:', error);
  }
}

async function requireAdmin(to, from, next) {
  try {
    await verifyToken();
    if (!localStorage.getItem('token')) {
      return next('/login'); 
    }
    if(localStorage.getItem('role') !== 'admin') return next('/unauthorized');
    next(); 
  } catch (error) {
    console.error('Грешка при проверка на токена в роутера:', error);
  }
}


const routes = [
  { path: '/', component: HomePage },
  { path: '/login', component: LoginPage },
  { path: '/register', component: RegisterPage },
  { path: '/unauthorized', component: UnauthorizedPage },
  { path: '/admin', component: AdminPage, beforeEnter: requireAdmin },
  { path: '/projects', component: ProjectsPage, beforeEnter: requireAuth },
  { path: '/project/:id', component: EditProjectPage, beforeEnter: requireAuth },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
