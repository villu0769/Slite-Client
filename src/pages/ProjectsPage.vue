<template>
  <AppHeader />
  <div id="projects-page" class="page-container">
    
    <div class="page-header">
      <h1 class="page-title">Моите проекти</h1>
      <button class="btn-primary" @click="handleAddNewProject" :disabled="addNewProjectMutation.isLoading.value">
        <span v-if="addNewProjectMutation.isLoading.value">Създаване...</span>
        <span v-else>+ Нов проект</span>
      </button>
    </div>

    <div v-if="isLoading || isFetching" class="loading-container">
      <div class="spinner"></div>
    </div>

    <div v-else-if="projects.length === 0" class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="empty-icon">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="9" y1="3" x2="9" y2="21"></line>
      </svg>
      <h2>Все още нямате проекти</h2>
      <p>Създайте първия си проект, за да започнете работа.</p>
      <button class="btn-primary" @click="handleAddNewProject">Създай проект</button>
    </div>

    <div v-else class="projects-grid">
      <div 
        v-for="project in projects" 
        :key="project._id" 
        class="project-card-wrapper"
      >
        <ProjectPreview :projectData="project" />
      </div>
    </div>

    <Notification 
      :show="notification.show" 
      :message="notification.message" 
      :type="notification.type" 
    />
  </div>
</template>

<script setup>
import { computed, reactive } from 'vue' 
import { useRouter } from 'vue-router'
import { useQuery, useMutation, useQueryClient } from 'vue-query'
import { fetchAll, createNew } from '../services/projectsService'
import ProjectPreview from '../components/ProjectPreview.vue'
import AppHeader from '../components/AppHeader.vue'
import Notification from '../components/Notification.vue' 

const router = useRouter()
const queryClient = useQueryClient()

// Състояние за нотификациите
const notification = reactive({ show: false, message: '', type: 'success' })

const showNotification = (msg, type = 'success') => {
  notification.message = msg
  notification.type = type
  notification.show = true
  setTimeout(() => { notification.show = false }, 3000)
}

const { data: projectsRef, isLoading, isFetching } = useQuery(
  'projects',
  fetchAll,
  {
    select: (res) => {
      const rawProjects = res?.projects || [];
      //сортираме проектите по дата на последна промяна (най-новите първи)
      return [...rawProjects].sort((a, b) => {
        const dateA = new Date(a.updatedAt || 0); 
        const dateB = new Date(b.updatedAt || 0);
        return dateB - dateA; 
      });
    }
  }
)
const projects = computed(() => projectsRef.value || [])

const addNewProjectMutation = useMutation(() => createNew('Неозаглавен проект'), {
  onSuccess: (createdProject) => {
    router.push(`/project/${createdProject._id}`);
    queryClient.invalidateQueries('projects');
  },
  onError: (error) => {
    showNotification('Грешка при създаване на проект: ' + error.message, 'error');
  },
});

// Handlers
const handleAddNewProject = () => {
  addNewProjectMutation.mutate();
}

</script>

<style scoped>
@import './projectsPageStyle.css';
</style>