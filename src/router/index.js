import { createRouter, createWebHistory } from 'vue-router'
import Layout from '@/components/Layout.vue'
import ServerPage from '@/pages/ServerPage.vue'
import JavaPage from '@/pages/JavaPage.vue'
import TupoPage from '@/pages/TupoPage.vue'
import RootPage from '@/pages/root.vue'

const routes = [
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        alias: '/root',
        name: 'Dashboard',
        component: RootPage,
        meta: {
          title: '巡检工作台',
          tabTitle: '工作台',
          menuKey: '/dashboard',
          keepAlive: true,
          breadcrumb: ['巡检工作台'],
        },
      },
      {
        path: 'server',
        name: 'ServerPage',
        component: ServerPage,
        meta: {
          title: '服务器巡检',
          tabTitle: '服务器巡检',
          menuKey: '/server',
          keepAlive: true,
          breadcrumb: ['服务器巡检'],
        },
      },
      {
        path: 'java',
        name: 'JavaPage',
        component: JavaPage,
        meta: {
          title: 'Java巡检',
          tabTitle: 'Java巡检',
          menuKey: '/java',
          keepAlive: true,
          breadcrumb: ['Java巡检'],
        },
      },
      {
        path: 'topology',
        alias: '/tupo',
        name: 'TopologyPage',
        component: TupoPage,
        meta: {
          title: '图模巡检',
          tabTitle: '图模巡检',
          menuKey: '/topology',
          keepAlive: true,
          breadcrumb: ['图模巡检'],
        },
      },
      {
        path: 'history/:ip',
        name: 'History',
        component: () => import('@/pages/HistoryPage.vue'),
        meta: {
          title: (route) => `${route.params.ip} 历史记录`,
          menuKey: '/server',
          breadcrumb: (route) => ['服务器巡检', `${route.params.ip} 历史记录`],
        },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory('/inspection/'),
  routes,
})

export default router
