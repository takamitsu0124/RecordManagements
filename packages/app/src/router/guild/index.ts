const routes = [
  {
    path: '/',
    component: () => import('src/layouts/layoutAfterLoginNavigator.vue'),
    children: [
      // ギルド詳細
      {
        name: 'RMGuildDetail',
        path: '/RMGuildDetail/:guildId', // パラメータを受け取るように修正
        component: () => import('src/pages/RMGuildDetail/RMGuildDetail.vue'),
      },
      // ギルドメンバー
      {
        name: 'RMGuildMember',
        path: '/RMGuildMember',
        component: () => import('src/pages/RMGuildMember/RMGuildMember.vue'),
      },
      // ギルド登録
      {
        name: 'RMGuildRegister',
        path: '/RMGuildRegister', // RMHome.vueのregisterGuild関数で使うパス
        component: () =>
          import('src/pages/RMGuildRegister/RMGuildRegister.vue'),
      },
    ],
  },
]

export default routes
