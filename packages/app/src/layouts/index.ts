import { ref } from 'vue'

export const menu = ref<{ name: string; url: string }[]>([
  { name: 'ホーム', url: '/RMHome' },
  { name: 'ユーザー登録', url: '/RMUserRegister' },
  { name: 'ギルド登録', url: '/RMGuildRegister' },
  { name: 'ギルド詳細', url: '/RMGuildDetail' },
  { name: 'ギルメン一覧', url: '/RMGuildMember' },
  { name: 'ログアウト', url: '' },
])
