<template>
  <div class="main-layout-shell">
    <router-view />
  </div>
</template>

<script setup lang="ts">
// Main layout intentionally stays minimal.
</script>

<style scoped>
.main-layout-shell {
  min-height: var(--rm-viewport-height);
}
</style>
