import { RouteRecordRaw } from 'vue-router'
import login from './login'
import home from './home'
import guild from './guild'
import register from './register'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      ...login,
      ...home,
      ...guild,
      ...register,
      {
        name: 'RMComponent',
        path: '/RMComponent',
        component: () => import('pages/RMComponent/RMComponent.vue'),
      },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
