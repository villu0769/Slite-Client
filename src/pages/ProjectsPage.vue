<template>
  <div id="projects-page" class="page-container">
    
    <div class="page-header">
      <button class="btn-primary" @click="handleAddNewProject">
        + New Project
      </button>
    </div>

    <div v-if="isLoading || isFetching" class="loading-container">
      <div class="spinner"></div>
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

  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuery, useMutation, useQueryClient } from 'vue-query'
import { fetchAll, createNew } from '../services/projectsService'
import ProjectPreview from '../components/ProjectPreview.vue'

const router = useRouter()
const queryClient = useQueryClient()

const { data: projectsRef, isLoading, isFetching } = useQuery(
  'projects',
  fetchAll,
  {
    select: (res) => {
      return res?.projects || [];
    }
  }
)
const projects = computed(() => projectsRef.value || [])

const addNewProjectMutation = useMutation(() => createNew('Untitled project'), {
  onSuccess: (createdProject) => {
    router.push(`/project/${createdProject._id}`);
    queryClient.invalidateQueries('projects');
  },
  onError: (error) => {
    alert('Error creating template: ' + error.message);
  },
});

// Handler
const handleAddNewProject = () => {
  addNewProjectMutation.mutate();
}
</script>
<style>
@import '../components/projectsPageStyle.css';
</style>