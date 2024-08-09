const routes = [
  {
    path: '/',
    component: () => import('src/layouts/layoutBeforeLoginNavigator.vue'),
    children: [
      // プレログイン
      {
        name: 'RMPreLogin',
        path: '/RMPreLogin',
        component: () => import('src/pages/RMLogin/RMPreLogin.vue'),
      },
      // メールログイン
      {
        name: 'RMMailLogin',
        path: '/RMMailLogin',
        component: () => import('src/pages/RMLogin/RMMailLogin.vue'),
      },
      // 電話番号でログイン
      {
        name: 'RMPhoneLogin',
        path: '/RMPhoneLogin',
        component: () => import('src/pages/RMLogin/RMPhoneLogin.vue'),
      },
      // 認証コード入力画面
      {
        name: 'RMLoginSmsCode',
        path: '/RMLoginSmsCode',
        component: () => import('src/pages/RMLogin/RMLoginSmsCode.vue'),
      },
    ],
  },
]

export default routes
