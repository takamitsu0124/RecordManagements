<script lang="ts" setup>
import { menu } from '../../layouts/index';
import { ref } from 'vue';
import RMHamburger from 'src/components/RMHamburger/RMHamburger.vue';

const isOpen = ref<boolean>(false);
</script>

<template>
  <div>
    <RMHamburger v-model="isOpen" :menu="menu" />
  </div>
</template>

<style lang="sass" scoped>
// $
</style>
