<template>
  <h2>Edit Project:</h2>

  <v-text-field
    label="Name"
    outlined
    dense
    v-model="name"
    :counter="100"
    :loading="isSaving"
    :error="!!saveError"
    :error-messages="saveError"
    required
  />

  <EditProject :projectData="projectData" />
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useQuery } from 'vue-query';

import EditProject from '../components/EditProject.vue';
import { getProjectById,updateProjectName } from '../services/projectsService';

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

let timeout = null;

// когато projectData дойде → сетваме name
watch(projectData, (project) => {
  if (project?.name) {
    name.value = project.name;
  }
}, { immediate: true });

// autosave
watch(name, (newValue, oldValue) => {
  if (!projectData.value) return;
  if (newValue === oldValue) return;
  if (!newValue?.trim()) return;

  clearTimeout(timeout);

  timeout = setTimeout(async () => {
    try {
      isSaving.value = true;
      saveError.value = null;

      await updateProjectName(id, newValue);
    } catch (e) {
      saveError.value = e.response?.data?.message || 'Save failed';
    } finally {
      isSaving.value = false;
    }
  }, 800);
});
</script>

