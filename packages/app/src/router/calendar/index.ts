import { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('src/layouts/layoutAfterLoginNavigator.vue'),
    children: [
      {
        name: 'RMCalendar',
        path: '/RMCalendar',
        component: () => import('src/pages/RMCalendarPage/RMCalendarPage.vue'),
        meta: { pageTitle: 'イベントカレンダー' },
      },
    ],
  },
]

export default routes
