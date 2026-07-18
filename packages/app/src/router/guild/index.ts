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
        meta: { pageTitle: 'ギルドダッシュボード' }
      },
      // ギルドメンバー
      {
        name: 'RMGuildMember',
        path: '/RMGuildMember',
        component: () => import('src/pages/RMGuildMember/RMGuildMember.vue'),
        meta: { pageTitle: 'ギルドメンバー' }
      },
      // ギルド登録
      {
        name: 'RMGuildRegister',
        path: '/RMGuildRegister', // RMHome.vueのregisterGuild関数で使うパス
        component: () =>
          import('src/pages/RMGuildRegister/RMGuildRegister.vue'),
        meta: { pageTitle: 'ギルド登録' }
      },
      // ギルド編集 (追加)
      {
        name: 'RMGuildEdit',
        path: '/RMGuildEdit/:guildId',
        component: () => import('src/pages/RMGuildEdit/RMGuildEdit.vue'),
        meta: { roles: ['admin', 'guild_admin'], pageTitle: 'ギルド編集' }
      },
      {
        name: 'RMGuildSchedule',
        path: '/guild/:guildId/schedule',
        component: () => import('src/pages/RMGuildSchedule/RMGuildSchedule.vue'),
        meta: { pageTitle: 'ギルド日程調整' }
      },
      // スキル投稿 (追加)
      {
        name: 'RMSkillPost',
        path: '/guild/:guildId/user/:userId/post-skill',
        component: () => import('src/pages/RMSkillPost/RMSkillPost.vue'),
        meta: { pageTitle: 'スキル・熟練度管理' }
      }
    ]
  }
]

export default routes
