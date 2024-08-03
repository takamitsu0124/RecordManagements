const routes=[
  {
    path:'/',
    component:()=>import('src/layouts/layoutBeforeLoginNavigator.vue'),
    children:[
      // ログイントップ
      {
        name: 'RMLogin',
        path: '/RMLogin',
        component: () => import('src/pages/RMLogin/RMLogin.vue'),
      }
    ]
  }
]

export default routes