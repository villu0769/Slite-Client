<template>
  <AppHeader />
  <div class="admin-page">
    <aside class="drawer">
      <nav class="menu">
        <button 
          v-for="item in menuItems" 
          :key="item.id"
          :class="['menu-item', { active: activeMenu === item.id }]" 
          @click="activeMenu = item.id"
        >
          {{ item.label }}
        </button>
      </nav>
    </aside>
    <main class="content">
      <KeepAlive>
        <component :is="currentComponent" />
      </KeepAlive>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import AppHeader from '../components/AppHeader.vue';
import Users from '../components/admin/Users.vue';
import FurnitureModelsManager from '../components/admin/FurnitureModelsManager.vue';

const activeMenu = ref('users');
const menuItems = [
  { id: 'users', label: 'Потребители' },
  { id: 'models', label: 'Модели' }
];
const currentComponent = computed(() => {
  const componentMap = {
    users: Users,
    models: FurnitureModelsManager
  };
  return componentMap[activeMenu.value] || null;
});
</script>

<style scoped>
.admin-page {
  display: flex;
  /* Изваждаме височината на хедъра (примерно 70px), за да нямаме глобален скрол */
  height: calc(100vh - 70px);
  background: var(--bg);
  color: var(--text);
  overflow: hidden;
}

/* --- СТРАНИЧНО МЕНЮ (DESKTOP) --- */
.drawer {
  width: 260px;
  background: color-mix(in srgb, var(--bg-soft, #fff), transparent 30%);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
}

.menu {
  display: flex;
  flex-direction: column;
  padding: 16px 0;
  gap: 4px;
}

.menu-item {
  padding: 14px 24px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  border-left: 4px solid transparent;
  transition: all 0.2s ease;
  color: var(--text);
  font-size: 0.95rem;
  font-weight: 500;
  opacity: 0.7;
}

.menu-item:hover {
  background: color-mix(in srgb, var(--text), transparent 95%);
  opacity: 1;
}

.menu-item.active {
  /* Използваме акцентния цвят на темата за по-добра консистентност */
  background: color-mix(in srgb, var(--accent), transparent 90%);
  border-left-color: var(--accent);
  color: var(--accent);
  opacity: 1;
  font-weight: 600;
}

/* --- ОСНОВНО СЪДЪРЖАНИЕ --- */
.content {
  flex: 1;
  overflow-y: auto;
  background: var(--bg);
  padding: 24px;
}

/* ==========================================
   MOBILE RESPONSIVENESS
========================================== */
@media screen and (max-width: 768px) {
  .admin-page {
    flex-direction: column;
  }

  /* Чекмеджето става навигационна лента отгоре */
  .drawer {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--border);
    background: var(--bg);
  }

  .menu {
    flex-direction: row;
    padding: 0;
    overflow-x: auto;
    /* Скриване на скролбара на мобилни за по-чист вид */
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .menu::-webkit-scrollbar {
    display: none;
  }

  .menu-item {
    white-space: nowrap; /* Не позволява на текста да пада на нов ред */
    border-left: none;
    border-bottom: 3px solid transparent;
    padding: 16px 20px;
  }

  .menu-item.active {
    border-left-color: transparent;
    border-bottom-color: var(--accent);
  }
  
  .content {
    padding: 16px; /* По-малко разстояние на телефон */
  }
}
</style>