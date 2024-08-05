const routes = [
  {
    path: '/',
    component: () => import('src/layouts/layoutAfterLoginNavigator.vue'),
    children: [
      // ギルド詳細
      {
        name: 'RMGuildDetail',
        path: '/RMGuildDetail',
        component: () => import('src/pages/RMGuildDetail/RMGuildDetail.vue'),
      },
      // ギルドメンバー
      {
        name: 'RMGuildMember',
        path: '/RMGuildMember',
        component: () => import('src/pages/RMGuildMember/RMGuildMember.vue'),
      },
    ],
  },
]

export default routes
