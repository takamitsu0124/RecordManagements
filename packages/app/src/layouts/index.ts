import { computed, ref } from 'vue'
import { hasGuildId, lacksGuildId, hasAdmin } from 'src/boot/main'

const showState = computed(() => {
  const home = true
  const registerUser = true
  const registerGuild = false
  const guildDetail = false
  const guildMember = false
  const logout = true
  return { home, registerUser, registerGuild, guildDetail, guildMember, logout }
})

export const menu = ref<{ name: string; url: string; isShow?: boolean }[]>([
  { name: 'ホーム', url: '/RMHome', isShow: showState.value.home },
  {
    name: 'ユーザー登録',
    url: '/RMUserRegister',
    isShow: showState.value.registerUser,
  },
  {
    name: 'ギルド登録',
    url: '/RMGuildRegister',
    isShow: showState.value.registerGuild,
  },
  {
    name: 'ギルド詳細',
    url: '/RMGuildDetail',
    isShow: showState.value.guildDetail,
  },
  {
    name: 'ギルメン一覧',
    url: '/RMGuildMember',
    isShow: showState.value.guildMember,
  },
  { name: 'ログアウト', url: '', isShow: showState.value.logout },
])
