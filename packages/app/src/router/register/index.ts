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
        meta: { roles: ['admin'], pageTitle: 'ユーザー登録' },
      },
      // ユーザー登録
      {
        name: 'RMUserRegisterConfirm',
        path: '/RMUserRegisterConfirm',
        component: () =>
          import('src/pages/RMUserRegister/RMUserRegisterConfirm.vue'),
        meta: { roles: ['admin'], pageTitle: '登録確認' },
      },
      {
        name: 'RMSkillMasterAdmin',
        path: '/RMSkillMasterAdmin',
        component: () =>
          import('src/pages/RMSkillMasterAdmin/RMSkillMasterAdmin.vue'),
        meta: { roles: ['admin'], pageTitle: 'スキルマスター管理' },
      },
      // ギルド登録
      {
        name: 'RMGuildRegister',
        path: '/RMGuildRegister',
        component: () =>
          import('src/pages/RMGuildRegister/RMGuildRegister.vue'),
        meta: { pageTitle: 'ギルド登録' },
      },
    ],
  },
]

export default routes
