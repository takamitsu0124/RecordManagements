import { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('src/layouts/layoutAfterLoginNavigator.vue'),
    children: [
      {
        name: 'RMAttendance',
        path: '/RMAttendance',
        component: () =>
          import('src/pages/RMAttendancePage/RMAttendanceListPage.vue'),
        meta: { pageTitle: '出欠確認' },
      },
      {
        name: 'RMAttendanceNew',
        path: '/RMAttendance/new',
        component: () =>
          import('src/pages/RMAttendancePage/RMAttendanceCreatePage.vue'),
        meta: { pageTitle: '出欠確認を作成' },
      },
      {
        name: 'RMAttendanceManage',
        path: '/RMAttendance/manage/:eventId',
        component: () =>
          import('src/pages/RMAttendancePage/RMAttendanceManagePage.vue'),
        meta: { pageTitle: '出欠確認の管理' },
      },
    ],
  },
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        name: 'RMAttendancePublic',
        path: '/a/:publicToken',
        component: () =>
          import('src/pages/RMAttendancePublicPage/RMAttendancePublicPage.vue'),
        meta: { pageTitle: '出欠回答' },
      },
    ],
  },
]

export default routes
