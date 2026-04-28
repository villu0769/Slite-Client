<template>
  <div id="header">
    <button class="nav-btn" @click="goBack" title="Back to Projects">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" stroke-linejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
      </svg>
      <span>Обратно към проектите</span>
    </button>
    <v-text-field variant="underlined" label="Име на проекта" dense :loading="isSaving" :error="!!saveError"
      :error-messages="saveError" required v-model="name" id="name-field" />
    <button class="nav-btn" @click="openRealisticPictureModal" title="Създай фотореалистично изображение">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
        <circle cx="12" cy="13" r="4"></circle>
      </svg>
      <span>Снимай</span>
    </button>
  </div>
  <div id="content">
    <Sidebar v-if="!isMobileOrTablet" @start-drag="onStartDragFromMenu" @action="handleSidebarAction"
      :hasWalls="hasWalls" />

    <EditProject v-if="projectData" :projectData="projectData" :isMobileOrTablet="isMobileOrTablet" ref="editProjectRef"
      @has-walls="handleWallsUpdate" />
  </div>

  <RealisticPictureModal v-if="isModalOpen" :imageSrc="generatedImageSrc" @close="isModalOpen = false" />
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuery } from 'vue-query';
import Sidebar from '../components/Sidebar.vue';
import EditProject from '../components/EditProject.vue';
import RealisticPictureModal from '../components/RealisticPictureModal.vue';
import { getProjectById, updateProjectName } from '../services/projectsService';

const router = useRouter();
const route = useRoute();
const id = route.params.id;

function goBack() {
  router.push('/projects');
}

const editProjectRef = ref(null);
const hasWalls = ref(false);
const isModalOpen = ref(false);
const generatedImageSrc = ref('');

// --- НОВО: Засичане на мобилно устройство или таблет ---
const isMobileOrTablet = ref(false);

onMounted(() => {
  // 1. Проверка чрез User-Agent за популярни мобилни и таблет операционни системи
  const userAgentCheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // 2. Проверка за тъчскрийн поддръжка (помага за някои по-нови iPad-и, които се представят като Mac)
  const isTouchDevice = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;

  isMobileOrTablet.value = userAgentCheck || (isTouchDevice && window.innerWidth <= 900);
});

function handleWallsUpdate(value) {
  hasWalls.value = value;
}

function onStartDragFromMenu(item) {
  editProjectRef.value?.startDragFromMenu(item);
}

function handleSidebarAction(payload) {
  if (!payload) return;
  if (payload.type === 'create-room') {
    editProjectRef.value?.createRoom(payload.width, payload.length, payload.height, payload.thickness);
  } else if (payload.type === 'create-wall') {
    editProjectRef.value?.createWall(payload.length, payload.height, payload.thickness);
  } else if (payload.type === 'add-model-door') {
    editProjectRef.value?.addDoorToWallCenter(payload);
  } else if (payload.type === 'add-model-window') {
    editProjectRef.value?.addWindowToWallCenter(payload);
  } else if (typeof payload === 'string') {
    console.log('Simple action:', payload);
  }
}

const { data: projectDataRef } = useQuery(
  ['project-data', id],
  () => getProjectById(id)
);

const projectData = computed(() => projectDataRef.value || null);
const name = ref('');
const isSaving = ref(false);
const saveError = ref(null);

watch(projectData, (project) => {
  if (project?.name) {
    name.value = project.name;
  }
}, { immediate: true });

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
  }, 1000);
});

// ПРОМЕНЕНА ФУНКЦИЯ: Взима снимката и отваря модала
const openRealisticPictureModal = async () => {
  const imageDataUrl = await editProjectRef.value?.takeRealisticScreenshot();

  if (imageDataUrl) {
    generatedImageSrc.value = imageDataUrl; // Подаваме URL-а към променливата
    isModalOpen.value = true;               // Отваряме модала
  } else {
    console.error("Не успяхме да генерираме снимка.");
  }
}
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

#header * {
  z-index: 11 !important;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  border-radius: 8px;
  padding: 14px;
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
  color: var(--text);
  /* Синьо при ховър */
}

.nav-btn:hover svg {
  transform: translateX(-3px);
  /* Стрелката мърда леко наляво */
}

.nav-btn:active {
  transform: scale(0.98);
}

.v-input {
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
