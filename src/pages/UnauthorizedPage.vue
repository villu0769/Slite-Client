<template>
  <v-container class="fill-height d-flex align-center justify-center">
    <v-row class="mx-auto" style="max-width: 900px;">
      <v-col cols="12">
        <v-card
          elevation="12"
          class="pa-6 text-center"
          :style="{ padding: cardPadding }"
        >
          <v-card-text>
            <div
              class="title-desc"
              :style="{ fontSize: fontSize, marginBottom: marginBottom }"
            >
              You don't have the rights to visit this page.
            </div>
          </v-card-text>

          <v-btn
            color="primary"
            class="mt-4"
            @click="onBack"
            style="width: fit-content;"
          >
            Back to Login
          </v-btn>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  onBack: {
    type: Function,
    required: true,
  },
})

// Responsive styles
const cardPadding = computed(() => '36px') // adjust as needed
const fontSize = computed(() => '30px') // adjust responsive logic if desired
const marginBottom = computed(() => '40px')
</script>
