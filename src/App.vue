<script setup>
import ConfirmModal from './components/ConfirmModal.vue';
</script>

<template>
  <div id="app">
    <router-view />
    <ConfirmModal />
  </div>
</template>

<style>
@import './style.css';
</style>
