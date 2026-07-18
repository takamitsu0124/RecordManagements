<script lang="ts" setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { AppRole, AppUser } from '@rm/types'
import RMUserWorkspace from 'src/components/RMUserWorkspace/RMUserWorkspace.vue'

const route = useRoute()
const router = useRouter()

const userId = computed(() =>
  typeof route.params.userId === 'string' ? route.params.userId : ''
)

const fallbackRole = computed<AppRole>(() => {
  const role = route.query.role
  return role === 'admin' || role === 'guild_admin' || role === 'member'
    ? role
    : 'member'
})

const fallbackAppUser = computed<Partial<AppUser>>(() => ({
  id: userId.value,
  uid: userId.value,
  displayName:
    typeof route.query.displayName === 'string' ? route.query.displayName : '',
  guildId: typeof route.params.guildId === 'string' ? route.params.guildId : '',
  role: fallbackRole.value
}))

const onBack = () => {
  if (typeof route.params.guildId === 'string' && route.params.guildId) {
    router.push({
      name: 'RMGuildDetail',
      params: { guildId: route.params.guildId }
    })
    return
  }

  router.back()
}
</script>

<template>
  <RMUserWorkspace
    :userId="userId"
    :includeProfile="false"
    :compactMode="true"
    :fallbackAppUser="fallbackAppUser"
    pageTitle="スキル・熟練度管理"
    pageIcon="pi pi-star"
    backLabel="ギルド詳細へ"
    @back="onBack"
  />
</template>
