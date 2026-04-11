const routes = [
  {
    path: '/',
    component: () => import('src/layouts/layoutAfterLoginNavigator.vue'),
    children: [
      // ユーザー登録
      {
        name: 'RMUserRegister',
        path: '/RMUserRegister',
        component: () => import('src/pages/RMUserRegister/RMUserRegister.vue'),
        meta: { roles: ['admin'] },
      },
      // ユーザー登録
      {
        name: 'RMUserRegisterConfirm',
        path: '/RMUserRegisterConfirm',
        component: () =>
          import('src/pages/RMUserRegister/RMUserRegisterConfirm.vue'),
        meta: { roles: ['admin'] },
      },
      // ギルド登録
      {
        name: 'RMGuildRegister',
        path: '/RMGuildRegister',
        component: () =>
          import('src/pages/RMGuildRegister/RMGuildRegister.vue'),
      },
    ],
  },
]

export default routes
