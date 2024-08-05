<script lang="ts" setup>
import { PropType } from 'vue'
import RMHamburger from '../RMHamburger/RMHamburger.vue'
import { useRouter } from 'vue-router'
const props = defineProps({
  // ハンバーガーメニュー
  menu: {
    type: Object as PropType<{ name: string; url: string }[]>,
    required: true,
  },
})

const router = useRouter()

const hamOpen = defineModel<boolean>('hamOpen', { default: false })

const emit = defineEmits(['menuClick', 'logout'])

const menuClick = (menu: { name: string; url: string }) => {
  emit('menuClick', menu)
}

const logout = () => {
  emit('logout')
}
</script>

<template>
  <q-header
    style="background: #707070; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2)"
  >
    <div class="_header_container">
      <div class="_current_name">{{ router.currentRoute.value.name }}</div>
      <RMHamburger
        v-model:isOpen="hamOpen"
        :menu="props.menu"
        @logout="logout"
        @menuClick="menuClick"
        class="_rm_hamburger"
      />
    </div>
  </q-header>
</template>

<style lang="sass" scoped>
._header_container
  width: 100%
  height: 50px
  display: flex
  justify-content: center
  align-items: center
  padding: 0 10px 0 30px
._current_name
  flex: 2
  font-size: 18px
  font-weight: bold
._rm_hamburger
  flex: 3
</style>
