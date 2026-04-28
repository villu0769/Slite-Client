<template>
  <div class="project-card">
    <div class="header-info" @click="handleOnClick(props.projectData._id)">
      <div class="header-preview">
        <img :src="props.projectData.previewImage?props.projectData.previewImage:'/app/project-placeholder.jpg'" alt="Project Preview" />
      </div>
      <div class="header-details">
        <span class="header-title">{{ props.projectData.name }}</span>
        <span class="header-date">
          Последна промяна: {{ formatDate(props.projectData.lastModified) }}
        </span>
      </div>
    </div>
    <div class="header-actions">
      <button class="action-btn delete-btn" @click.stop="deleteProject" title="Delete Project" :disabled="isDeleting"
        :style="{ opacity: isDeleting ? 0.5 : 1 }">
        <svg v-if="isDeleting" class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
        </svg>
        <svg v-else viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { ref } from 'vue';
import { useConfirm } from '../composables/useConfirm';

const { showConfirm } = useConfirm();
const props = defineProps({
  projectData: {
    type: Object,
    required: true,
  },
})
const router = useRouter();
const handleOnClick = (id) => {
  router.push(`/project/${id}`);
};
const isDeleting = ref(false);
const formatDate = (dateString) => {
  if (!dateString) return 'Няма данни';

  const date = new Date(dateString);

  if (isNaN(date.getTime())) return 'Невалидна дата';

  // 3. Форматиране (Пример: 22.04.2026 г., 15:30 ч.)
  return new Intl.DateTimeFormat('bg-BG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};
const deleteProject = async (event) => {
  if (event) event.stopPropagation();
  const confirmed = await showConfirm("Сигурни ли сте, че искате да изтриете този проект?");
  if (!confirmed) return;
  const id = props.projectData._id; 
  if (!id) {
    console.error("No project ID found!");
    return;
  }
  isDeleting.value = true;
  try {
    const response = await fetch(`https://slite-api.onrender.com/api/projects/${id}/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      }
    });
    if (response.ok) {
      alert("Project deleted successfully.");
    } else {
      const errorData = await response.json();
      alert(`Error: ${errorData.error || 'Failed to delete project'}`);
    }
  } catch (error) {
    console.error("Network error:", error);
    alert("System error while deleting.");
  } finally {
    isDeleting.value = false;
  }
};
</script>

<style scoped>
@import '../pages/projectsPageStyle.css';
</style>