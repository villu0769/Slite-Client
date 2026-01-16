<template>
  <div class="project-box" @click="handleOnClick(projectData._id)">
    <p>{{ projectData.name }}</p>
  </div>
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
