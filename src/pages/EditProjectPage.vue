<template>
  <Sidebar @start-drag="onStartDragFromMenu" />
  <div id="header">
    <v-text-field label="Name" outlined dense :counter="100" :loading="isSaving" :error="!!saveError"
      :error-messages="saveError" required v-model="name" />
  </div>
  <EditProject v-if="projectData" :projectData="projectData" ref="editProjectRef" />

</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useQuery } from 'vue-query';
import Sidebar from '../components/Sidebar.vue';
import EditProject from '../components/EditProject.vue';
import { getProjectById, updateProjectName } from '../services/projectsService';

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
    height: 56px;
    background: var(--bg-soft);
    display: flex;
    align-items: center;
    padding: 0 16px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    z-index: 10;
  }
</style>
