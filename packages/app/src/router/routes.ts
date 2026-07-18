import type { RouteRecordRaw } from 'vue-router'
import login from './login'
import home from './home'
import guild from './guild'
import calendar from './calendar'
import register from './register'
import user from './user'
import attendance from './attendance'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        name: 'RMRoot',
        path: '',
        redirect: { name: 'RMPreLogin' }
      },
      ...login,
      ...home,
      ...guild,
      ...calendar,
      ...register,
      ...user,
      {
        name: 'RMComponent',
        path: '/RMComponent',
        component: () => import('pages/RMComponent/RMComponent.vue')
      }
    ]
  },
  ...attendance,

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }
]

export default routes
