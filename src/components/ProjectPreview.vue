<template>

  <div class="project-card">
    <div class="header-info"  @click="handleOnClick(props.projectData._id)">
      <div class="header-preview">
        <img :src="projectImage || 'https://via.placeholder.com/150'" alt="Project Preview" />
      </div>

      <span class="header-title">{{ props.projectData.name }}</span>
    </div>

    <div class="header-actions">
      <button class="action-btn delete-btn" @click="deleteProject" title="Delete Project" :disabled="isDeleting"
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
import { useRouter } from 'vue-router'
import { ref } from 'vue';

const props = defineProps({
  projectData: {
    type: Object,
    required: true,
  },
})

const router = useRouter()

const handleOnClick = (id) => {
  router.push(`/project/${id}`);
}

const isDeleting = ref(false); // За лоудинг състояние на бутона

// Функция за изтриване
const deleteProject = async () => {
  // 1. Потвърждение от потребителя
  const confirmed = window.confirm("Are you sure you want to delete this project? This action cannot be undone.");
  
  if (!confirmed) return;
  // Взимаме ID-то (от пропс или от обекта data)
  const id = props.projectData._id; 

  if (!id) {
    console.error("No project ID found!");
    return;
  }

  isDeleting.value = true;

  try {
    // 2. Изпращаме заявка към Backend-a
    const response = await fetch(`http://localhost:5000/api/projects/${id}/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      }
    });

    if (response.ok) {
      // 3. Ако е успешно, пренасочваме или обновяваме списъка
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
@import './projectsPageStyle.css';
</style>
