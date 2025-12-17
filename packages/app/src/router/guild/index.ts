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
      // ギルド編集 (追加)
      {
        name: 'RMGuildEdit',
        path: '/RMGuildEdit/:guildId',
        component: () => import('src/pages/RMGuildEdit/RMGuildEdit.vue'),
      },
      // スキル投稿 (追加)
      {
        name: 'RMSkillPost',
        path: '/guild/:guildId/user/:userId/post-skill',
        component: () => import('src/pages/RMSkillPost/RMSkillPost.vue'),
      },
    ],
  },
]

export default routes
