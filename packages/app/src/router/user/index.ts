import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/user',
    component: () => import('src/layouts/layoutAfterLoginNavigator.vue'),
    children: [
		{
			name: 'RMUserEdit',
			path: ':userId/edit',
			component: () => import('src/pages/RMUserEdit/RMUserEdit.vue'),
			meta: { pageTitle: 'マイページ' },
		},
    ],
  },
];

export default routes;
