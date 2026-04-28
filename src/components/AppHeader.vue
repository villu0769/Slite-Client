<template>
  <header class="app-header">
    <div class="header-left" @click="goTo('/')" title="Към началото">
      <img src="/src/assets/logo.png" alt="Logo" class="app-logo" />
    </div>

    <nav class="header-nav">
      <button v-if="isAdmin" class="nav-link" @click="goTo('/admin')">
        <span>Панел</span>
      </button>
      <button class="nav-link" @click="goTo('/projects')">
        <span>Проекти</span>
      </button>
      <button class="nav-link" @click="goTo('/profile')">
        <span>Профил</span>
      </button>
    </nav>

    <div class="header-right">
      <button class="theme-btn" @click="toggleTheme" title="Смени темата">
        <svg v-if="theme == 'light'" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
        <svg v-else viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
      </button>
      <button class="logout-btn" @click="logout" title="Изход">
        <span class="logout-text">Изход</span>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
          <polyline points="16 17 21 12 16 7"></polyline>
          <line x1="21" y1="12" x2="9" y2="12"></line>
        </svg>
      </button>
    </div>
  </header>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { theme, useTheme } from '../composables/useTheme'

const router = useRouter()
const { toggleTheme } = useTheme()

const goTo = (path) => {
  router.push(path)
}
const isAdmin = localStorage.getItem('role') === 'admin';
const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  localStorage.removeItem('role');
  router.push('/login')
}
</script>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 40px;
  height: 70px;
  min-height: 52px;
  gap: 12px;

  background: color-mix(in srgb, var(--bg-soft), transparent 15%);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);

  border-bottom: 1px solid color-mix(in srgb, var(--border), transparent 50%);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.header-left:hover {
  opacity: 0.8;
}

.app-logo {
  height: 33px;
  width: auto;
  object-fit: contain;
}

.header-nav {
  display: flex;
  gap: 24px;
  align-items: center;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
  padding: 8px 0;
  color: var(--text);
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s ease, color 0.2s ease, transform 0.15s ease;
}

.nav-link:hover {
  opacity: 1;
  color: var(--accent);
  transform: scale(1.02);
}

.nav-link.active {
  opacity: 1;
  color: var(--accent);
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.theme-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  padding: 8px;
  color: var(--text);
  cursor: pointer;
  opacity: 0.6;
  border-radius: 50%;
  transition: opacity 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.theme-btn:hover {
  opacity: 1;
  color: var(--accent);
  transform: scale(1.08);
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
  padding: 8px 0;
  color: var(--text);
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.logout-btn:hover {
  opacity: 1;
  transform: scale(1.02);
}

@media screen and (max-width: 768px) {
  .app-header {
    padding: 0 12px;
    height: 60px;
  }

  .app-logo {
    height: 26px;
  }

  .header-nav {
    gap: 8px;
    flex-shrink: 1;
  }

  .nav-link {
    font-size: 0.85rem;
    padding: 6px 0;
    opacity: 0.7;
  }

  .nav-link span {
    white-space: nowrap;
  }

  .header-right {
    gap: 6px;
    flex-shrink: 0;
  }

  .theme-btn {
    padding: 6px;
  }

  .logout-text {
    display: none;
  }

  .logout-btn {
    padding: 6px;
  }
}

@media screen and (max-width: 520px) {
  .app-header {
    padding: 0 10px;
    height: 56px;
  }

  .header-left {
    gap: 8px;
  }

  .header-nav {
    gap: 4px;
  }

  .nav-link {
    font-size: 0.8rem;
    padding: 4px 0;
  }

  .app-logo {
    height: 24px;
  }
}

@media screen and (max-width: 350px) {
  .app-header {
    padding: 0 8px;
    height: 52px;
  }

  .header-nav {
    gap: 2px;
  }

  .nav-link {
    font-size: 0.75rem;
    padding: 0;
  }

  .app-logo {
    height: 22px;
  }

  .header-right {
    gap: 4px;
  }

  .theme-btn {
    padding: 4px;
  }

  .logout-btn {
    padding: 4px;
  }
}
</style>