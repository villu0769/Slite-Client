<!-- src/views/EditProject.vue -->
<template>
  <div>
    <h2>Edit Project: {{ id }}</h2>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const id = route.params.id || 'untitled'

</script>

<style scoped>
h2 { margin-bottom: 12px; }
</style>
