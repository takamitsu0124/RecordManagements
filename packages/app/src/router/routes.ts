import { RouteRecordRaw } from 'vue-router';
import login from './login'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      ...login,
      {
        name:'RMComponent',
        path:'/RMComponent',
        component:()=>import('pages/RMComponent/RMComponent.vue')
      }
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
