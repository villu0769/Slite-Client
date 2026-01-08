<template>
  <v-container>
    <v-row class="mb-4">
      <v-col cols="12">
        <v-btn color="primary" @click="handleAddNewProject">+ New</v-btn>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" class="text-center" v-if="isLoading || isFetching">
        <v-progress-circular indeterminate color="primary" />
      </v-col>

      <v-col
        v-for="project in projects"
        :key="project._id"
        cols="12"
        sm="6"
        md="4"
      >
        <ProjectPreview :projectData="project" />
      </v-col>
    </v-row>
  </v-container>
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
