<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 128 160"
  >
    <defs>
      <!-- Маска: бялото остава, черното = дупка -->
      <mask id="windowMask">
        <rect width="100%" height="100%" fill="white" />

        <!-- 4 прозореца (дупки) -->
        <rect x="28" y="24" width="28" height="40" fill="black" />
        <rect x="72" y="24" width="28" height="40" fill="black" />
        <rect x="28" y="80" width="28" height="40" fill="black" />
        <rect x="72" y="80" width="28" height="40" fill="black" />
      </mask>
    </defs>

    <!-- всичко се рисува със stroke -->
    <g
      fill="none"
      :stroke="color"
      :stroke-width="stroke"
      stroke-linecap="round"
      stroke-linejoin="round"
      mask="url(#windowMask)"
    >
      <!-- рамка -->
      <rect x="16" y="8" width="96" height="120" rx="18" />

      <!-- разделители -->
      <line x1="64" y1="8" x2="64" y2="128" />
      <line x1="16" y1="68" x2="112" y2="68" />

    </g>
  </svg>
</template>

<script setup>
defineProps({
  size: { type: [Number, String], default: 32 },
  color: { type: String, default: 'currentColor' },
  stroke: { type: Number, default: 13 }
})
</script>
