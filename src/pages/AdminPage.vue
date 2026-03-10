<template>
  <div class="admin-page">
    <div class="drawer">
      <nav class="menu">
        <button 
          v-for="item in menuItems" 
          :key="item.id"
          :class="['menu-item', { active: activeMenu === item.id }]" 
          @click="activeMenu = item.id"
        >
          {{ item.label }}
        </button>
        
        <button class="menu-item" @click="useTheme().toggleTheme">
          Switch theme
        </button>
      </nav>
    </div>
    
    <div class="content">
      <component :is="currentComponent" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import Users from '../components/admin/Users.vue';
import FurnitureModelsManager from '../components/admin/FurnitureModelsManager.vue';
import { useTheme } from '../composables/useTheme';

// 2. State (замества data())
const activeMenu = ref('users');

const menuItems = [
  { id: 'users', label: 'Users' },
  {id: 'models', label: 'Furniture Models Manager'}
];

// 3. Computed (замества computed property)
const currentComponent = computed(() => {
  const componentMap = {
    users: Users,
    models: FurnitureModelsManager
  };
  // Връщаме компонента или null, ако няма съвпадение (за settings например)
  return componentMap[activeMenu.value] || null;
});
</script>

<style scoped>
/* Стиловете остават абсолютно същите */
.admin-page {
  display: flex;
  height: 100vh;
  color:var(--text);
  /* Добавяме преход за гладка смяна на темите */
  transition: background 0.3s ease, color 0.3s ease;
}

.drawer {
  width: 290px;
  /* Използвай CSS променливи, които се сменят от useTheme */
  background: var(--bg); 
  border-right:var(--border);
}

.menu {
  display: flex;
  flex-direction: column;
  padding: 0;
}

.menu-item {
  padding: 12px 20px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  border-left: 4px solid transparent;
  transition: all 0.3s ease;
  color: inherit;
}

.menu-item:hover {
  background: var(--bg-hover, rgba(0,0,0,0.05));
}

.menu-item.active {
  background-color: rgba(25, 118, 210, 0.1);
  font-weight: 600;
}

.content {
  flex: 1;
  overflow-y: auto;
  background-color: var(--bg, #ffffff);
  color: var(--text, #333);
}
</style>