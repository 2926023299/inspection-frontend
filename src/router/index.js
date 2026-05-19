import { createRouter, createWebHistory } from 'vue-router'
import { ElMessage } from 'element-plus'
import { setUnauthorizedHandler } from '@/api/http'
import { useAuth } from '@/composables/useAuth'
import Layout from '@/components/Layout.vue'
import ServerPage from '@/pages/ServerPage.vue'
import JavaPage from '@/pages/JavaPage.vue'
import ServerConnectPage from '@/pages/ServerConnectPage.vue'
import MysqlWorkbenchPage from '@/pages/MysqlWorkbenchPage.vue'
import TupoPage from '@/pages/TupoPage.vue'
import RootPage from '@/pages/root.vue'
import LoginPage from '@/pages/LoginPage.vue'

const { ensureSession, handleUnauthorized } = useAuth()

function buildLoginLocation(redirectPath) {
  if (!redirectPath || redirectPath === '/login') {
    return { name: 'Login' }
  }

  return {
    name: 'Login',
    query: {
      redirect: redirectPath,
    },
  }
}

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: LoginPage,
    meta: {
      title: '登录',
      guestOnly: true,
    },
  },
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    meta: {
      requiresAuth: true,
    },
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
        path: 'connect',
        name: 'ServerConnectPage',
        component: ServerConnectPage,
        meta: {
          title: '服务器连接',
          tabTitle: '服务器连接',
          menuKey: '/connect',
          breadcrumb: ['服务器连接'],
        },
      },
      {
        path: 'mysql',
        name: 'MysqlWorkbenchPage',
        component: MysqlWorkbenchPage,
        meta: {
          title: 'MySQL工作台',
          tabTitle: 'MySQL工作台',
          menuKey: '/mysql',
          breadcrumb: ['MySQL工作台'],
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
        path: 'tools',
        name: 'Tools',
        component: () => import('@/pages/tools/ToolsHome.vue'),
        meta: {
          title: '工具合集',
          tabTitle: '工具合集',
          menuKey: '/tools',
          keepAlive: true,
          breadcrumb: ['工具合集'],
        },
      },
      {
        path: 'tools/timestamp',
        name: 'TimestampTool',
        component: () => import('@/pages/tools/TimestampTool.vue'),
        meta: {
          title: '时间戳转换',
          tabTitle: '时间戳转换',
          menuKey: '/tools',
          keepAlive: true,
          breadcrumb: ['工具合集', '时间戳转换'],
        },
      },
      {
        path: 'tools/measure-id',
        name: 'MeasureIdTool',
        component: () => import('@/pages/tools/MeasureIdTool.vue'),
        meta: {
          title: '量测ID拼接',
          tabTitle: '量测ID拼接',
          menuKey: '/tools',
          keepAlive: true,
          breadcrumb: ['工具合集', '量测ID拼接'],
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

setUnauthorizedHandler((error) => {
  handleUnauthorized()
  const currentRoute = router.currentRoute.value
  if (currentRoute.name === 'Login') {
    return
  }

  router.replace(buildLoginLocation(currentRoute.fullPath)).catch(() => {})

  if (error?.message) {
    ElMessage.warning(error.message)
  }
})

router.beforeEach(async (to) => {
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
  const guestOnly = to.matched.some((record) => record.meta.guestOnly)

  if (!requiresAuth && !guestOnly) {
    return true
  }

  try {
    const user = await ensureSession()

    if (requiresAuth && !user) {
      return buildLoginLocation(to.fullPath)
    }

    if (guestOnly && user) {
      const redirectPath = typeof to.query.redirect === 'string' && to.query.redirect !== '/login'
        ? to.query.redirect
        : '/dashboard'
      return redirectPath
    }
  } catch (error) {
    if (error.code === 1) {
      return buildLoginLocation(to.fullPath)
    }

    ElMessage.error(error.message || '登录状态校验失败')
    if (requiresAuth) {
      return false
    }
  }

  return true
})

export default router
