<template>

  <div id="header">
    <button class="nav-btn" @click="goBack" title="Back to Projects">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
      </svg>
      <span>Back to Projects</span>
    </button>
    <v-text-field variant="underlined" label="Project name" dense :loading="isSaving" :error="!!saveError"
      :error-messages="saveError" required v-model="name" id="name-field"/>
    <button class="nav-btn">
      <span>Buton napred</span>
    </button>
    </div>
  <div id="content">
    <Sidebar @start-drag="onStartDragFromMenu" />
    <EditProject v-if="projectData" :projectData="projectData" ref="editProjectRef" />
  </div>

</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useQuery } from 'vue-query';
import Sidebar from '../components/Sidebar.vue';
import EditProject from '../components/EditProject.vue';
import { getProjectById, updateProjectName } from '../services/projectsService';
import { useRouter } from 'vue-router';

const router = useRouter();

function goBack() {
  router.push('/projects');
}
const editProjectRef = ref(null);

function onStartDragFromMenu(item) {
  // forward to EditProject's method
  editProjectRef.value?.startDragFromMenu(item);
}

// route
const route = useRoute();
const id = route.params.id;

// project fetch
const { data: projectDataRef } = useQuery(
  ['project-data', id],
  () => getProjectById(id)
);

const projectData = computed(() => projectDataRef.value || null);

// local state
const name = ref('');
const isSaving = ref(false);
const saveError = ref(null);
// когато projectData дойде → сетваме name
watch(projectData, (project) => {
  if (project?.name) {
    name.value = project.name;
  }
}, { immediate: true });

// debounce и ъпдейт на име
let debounceTimer = null;
watch(name, (newValue, oldValue) => {
  if (newValue === oldValue) return;
  if (!newValue?.trim()) return;
  if (newValue?.trim() == projectData.value?.name) return;

  clearTimeout(debounceTimer);

  debounceTimer = setTimeout(async () => {
    try {
      isSaving.value = true;
      saveError.value = null;

      await updateProjectName(id, newValue);
    } catch (e) {
      saveError.value = 'Error saving project name.';
    } finally {
      isSaving.value = false;
    }
  }, 800);
});

</script>
<style scoped>
#header {
  position: fixed;
  top: 0;
  left: 0;
  height: 90px;
  width: 100%;
  color: var(--text);
  display: flex;
  justify-content: space-between;
  align-content: center;
  align-items: center;
  padding: 7px 30px;
  padding-bottom: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 10;
  background: var(--bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border)
}
#header *{
  z-index: 11 !important;
}
.nav-btn {
  display: flex;
  align-items: center;
  gap: 8px; /* Разстояние между стрелката и текста */
  
  border: none;
  border-radius: 8px;
  padding: 10px;
  color: color-mix(in srgb, var(--text), transparent 40%);
  height: fit-content;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
  background: color-mix(in srgb, var(--bg-soft), transparent 50%);
}

.nav-btn svg {
  transition: transform 0.2s ease;
}

/* Hover Effects */
.nav-btn:hover {
  background: color-mix(in srgb, var(--bg-soft), transparent 20%);
  color: var(--text); /* Синьо при ховър */
}

.nav-btn:hover svg {
  transform: translateX(-3px); /* Стрелката мърда леко наляво */
}

.nav-btn:active {
  transform: scale(0.98);
}
.v-input{
  max-width: 400px;
}
#content {
  position: absolute;
  top: 90px;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
}
</style>
