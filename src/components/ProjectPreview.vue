<template>
  <Sidebar @start-drag="onStartDragFromMenu" />

 <div id="header">
    <div class="header-info">
      <div class="header-preview">
        <img :src="projectImage || 'https://via.placeholder.com/150'" alt="Project Preview" />
      </div>
      
      <span class="header-title">{{ name || 'Untitled Project' }}</span>
    </div>

    <div class="header-actions">
      <button class="action-btn delete-btn" @click="deleteProject" title="Delete Project">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    </div>
  </div>

  <EditProject v-if="projectData" :projectData="projectData" ref="editProjectRef" />
</template>
<script setup>
import { useRouter } from 'vue-router'

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
</script>

<style scoped>
@import './projectStyle.css';
</style>
