const routes = [
  {
    path: '/',
    component: () => import('src/layouts/layoutAfterLoginNavigator.vue'),
    children: [
      // ホーム
      {
        name: 'RMHome',
        path: '/RMHome',
        component: () => import('src/pages/RMHome/RMHome.vue'),
      },
    ],
  },
]

export default routes
