const routes = [
  {
    path: '/',
    component: () => import('src/layouts/layoutBeforeLoginNavigator.vue'),
    children: [
      // ユーザー登録
      {
        name: 'RMUserRegister',
        path: '/RMUserRegister',
        component: () => import('src/pages/RMUserRegister/RMUserRegister.vue'),
      },
      // ユーザー登録
      {
        name: 'RMUserRegisterConfirm',
        path: '/RMUserRegisterConfirm',
        component: () =>
          import('src/pages/RMUserRegister/RMUserRegisterConfirm.vue'),
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
