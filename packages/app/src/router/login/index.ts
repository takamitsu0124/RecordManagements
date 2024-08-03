const routes=[
  {
    path:'/',
    component:()=>import('src/layouts/layoutNavigator.vue'),
    children:[
      // ログイントップ
      {
        // name: 'AFCLogin',
        // path: '/AFCLogin',
        // component: () => import('src/pages/AFCLogin/AFCLogin.vue'),
      }
    ]
  }
]

export default routes