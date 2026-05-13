<script lang="ts" setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AppRole, AppUser } from '@rm/types'
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
  role: fallbackRole.value,
}))

const onBack = () => {
  if (typeof route.params.guildId === 'string' && route.params.guildId) {
    router.push({
      name: 'RMGuildDetail',
      params: { guildId: route.params.guildId },
    })
    return
  }

  router.back()
}
</script>

<template>
  <RMUserWorkspace
    :user-id="userId"
    :include-profile="false"
    :compact-mode="true"
    :fallback-app-user="fallbackAppUser"
    page-title="所持スキル・画像管理"
    page-icon="pi pi-star"
    view-description="ギルド運用で必要な所持スキルと画像だけを確認できます。変更が必要なときだけ編集モードに切り替えてください。"
    edit-description="所持スキルと画像管理を切り替えながら、必要な内容だけ集中して更新できます。"
    back-label="ギルド詳細へ"
    @back="onBack"
  />
</template>
