<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Odometer,
  Monitor,
  Connection,
  Coin,
  CoffeeCup,
  Share,
  Tools,
  Fold,
  Expand,
  Sunny,
  Moon,
  Menu,
} from '@element-plus/icons-vue'
import { getApiBaseLabel } from '@/api/http'
import TabView from '@/components/TabView.vue'

const route = useRoute()
const router = useRouter()
const sidebarCollapsed = ref(false)
const mobileMenuVisible = ref(false)
const isMobile = ref(false)
const backendLabel = computed(() => getApiBaseLabel())
const fixedViewport = computed(() => Boolean(route.meta.fixedViewport))

const menuItems = [
  { path: '/dashboard', title: '巡检工作台', icon: Odometer },
  { path: '/server', title: '服务器巡检', icon: Monitor },
  { path: '/connect', title: '服务器连接', icon: Connection },
  { path: '/mysql', title: 'MySQL工作台', icon: Coin },
  { path: '/java', title: 'Java巡检', icon: CoffeeCup },
  { path: '/topology', title: '图模巡检', icon: Share },
  { path: '/tools', title: '工具合集', icon: Tools },
]

const activeMenu = computed(() => route.meta.menuKey || route.path)
const routeTitle = computed(() => {
  const rawTitle = route.meta.title
  return typeof rawTitle === 'function' ? rawTitle(route) : rawTitle || '巡检系统'
})

const breadcrumbs = computed(() => {
  const raw = route.meta.breadcrumb
  if (typeof raw === 'function') return raw(route)
  return Array.isArray(raw) && raw.length > 0 ? raw : null
})

/* ---- Dark Mode ---- */
const isDark = ref(false)

function applyTheme(dark) {
  isDark.value = dark
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  localStorage.setItem('app-theme', dark ? 'dark' : 'light')
}

function toggleTheme() {
  applyTheme(!isDark.value)
}

/* ---- Responsive ---- */
function checkMobile() {
  isMobile.value = window.innerWidth <= 1100
}

/* ---- Date ---- */
const currentDateLabel = new Intl.DateTimeFormat('zh-CN', {
  month: '2-digit',
  day: '2-digit',
  weekday: 'short',
}).format(new Date())

/* ---- Lifecycle ---- */
onMounted(() => {
  sidebarCollapsed.value = localStorage.getItem('layout-sidebar-collapsed') === 'true'
  checkMobile()
  window.addEventListener('resize', checkMobile)

  // Init theme
  const savedTheme = localStorage.getItem('app-theme')
  if (savedTheme === 'dark') {
    applyTheme(true)
  } else if (savedTheme === 'light') {
    applyTheme(false)
  } else {
    applyTheme(window.matchMedia('(prefers-color-scheme: dark)').matches)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkMobile)
  setFixedViewportDocumentClass(false)
})

watch(sidebarCollapsed, (collapsed) => {
  localStorage.setItem('layout-sidebar-collapsed', String(collapsed))
})

watch(fixedViewport, (enabled) => {
  setFixedViewportDocumentClass(enabled)
}, { immediate: true })

function setFixedViewportDocumentClass(enabled) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('is-fixed-viewport-route', enabled)
  document.body.classList.toggle('is-fixed-viewport-route', enabled)
}

function handleMenuSelect(index) {
  if (index !== route.path) {
    router.push(index)
  }
  if (isMobile.value) {
    mobileMenuVisible.value = false
  }
}

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

function openMobileMenu() {
  mobileMenuVisible.value = true
}
</script>

<template>
  <div class="layout-shell" :class="{ 'is-sidebar-collapsed': sidebarCollapsed, 'is-fixed-viewport': fixedViewport }">
    <!-- 桌面端侧边栏 -->
    <aside v-if="!isMobile" class="layout-sidebar" :class="{ 'is-collapsed': sidebarCollapsed }">
      <div class="brand-block">
        <div class="brand-row">
          <div class="brand-emblem">IO</div>
          <div v-if="!sidebarCollapsed" class="brand-text">
            <span class="brand-chip">OPS INSPECTION</span>
            <h1>设备巡检系统</h1>
          </div>
        </div>
      </div>

      <div v-if="!sidebarCollapsed" class="rail-meta">
        <div class="rail-meta-card">
          <span>值班日期</span>
          <strong>{{ currentDateLabel }}</strong>
        </div>
        <div class="rail-meta-card">
          <span>联调后端</span>
          <strong>{{ backendLabel }}</strong>
        </div>
      </div>

      <el-menu
        :default-active="activeMenu"
        :collapse="sidebarCollapsed"
        :collapse-transition="false"
        class="sidebar-menu"
        @select="handleMenuSelect"
      >
        <el-menu-item v-for="item in menuItems" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <template #title>{{ item.title }}</template>
        </el-menu-item>
      </el-menu>

      <div class="sidebar-bottom-actions">
        <button type="button" class="sidebar-toggle" @click="toggleTheme">
          <el-icon :size="16"><Moon v-if="!isDark" /><Sunny v-else /></el-icon>
          <span v-if="!sidebarCollapsed">{{ isDark ? '浅色模式' : '深色模式' }}</span>
        </button>
        <button type="button" class="sidebar-toggle" @click="toggleSidebar">
          <el-icon :size="18">
            <Fold v-if="!sidebarCollapsed" />
            <Expand v-else />
          </el-icon>
        </button>
      </div>

      <footer v-if="!sidebarCollapsed" class="sidebar-footer">
        <span class="sidebar-footer__label">当前页面</span>
        <strong class="sidebar-footer__value">{{ routeTitle }}</strong>
      </footer>
    </aside>

    <!-- 移动端侧边栏抽屉 -->
    <el-drawer
      v-model="mobileMenuVisible"
      direction="ltr"
      size="280px"
      :show-close="false"
      class="mobile-sidebar-drawer"
    >
      <template #header>
        <div class="mobile-drawer-brand">
          <div class="brand-emblem">IO</div>
          <div>
            <span class="brand-chip">OPS INSPECTION</span>
            <h1 style="margin: 4px 0 0; font-size: 15px; color: #f1f5f9;">设备巡检系统</h1>
          </div>
        </div>
      </template>
      <el-menu
        :default-active="activeMenu"
        class="sidebar-menu mobile-menu"
        @select="handleMenuSelect"
      >
        <el-menu-item v-for="item in menuItems" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <template #title>{{ item.title }}</template>
        </el-menu-item>
      </el-menu>
      <div class="mobile-drawer-footer">
        <button type="button" class="sidebar-toggle" @click="toggleTheme">
          <el-icon :size="16"><Moon v-if="!isDark" /><Sunny v-else /></el-icon>
          <span>{{ isDark ? '浅色模式' : '深色模式' }}</span>
        </button>
      </div>
    </el-drawer>

    <section class="layout-main">
      <!-- 移动端顶栏 -->
      <div v-if="isMobile" class="mobile-topbar glass-panel">
        <button type="button" class="mobile-menu-btn" @click="openMobileMenu">
          <el-icon :size="20"><Menu /></el-icon>
        </button>
        <span class="mobile-topbar__title">{{ routeTitle }}</span>
      </div>

      <TabView v-if="!isMobile" />

      <!-- 面包屑 -->
      <nav v-if="breadcrumbs && !isMobile" class="layout-breadcrumb">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item v-for="(crumb, i) in breadcrumbs" :key="i">
            {{ crumb }}
          </el-breadcrumb-item>
        </el-breadcrumb>
      </nav>

      <main class="layout-content">
        <router-view v-slot="{ Component: RouteComponent, route: currentRoute }">
          <transition name="page-fade" mode="out-in">
            <keep-alive v-if="currentRoute.meta.keepAlive" :key="currentRoute.name">
              <component :is="RouteComponent" />
            </keep-alive>
            <component v-else :is="RouteComponent" :key="currentRoute.fullPath" />
          </transition>
        </router-view>
      </main>
    </section>
  </div>
</template>

<style scoped>
.layout-shell {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  height: 100vh;
  gap: 12px;
  padding: 12px;
  overflow: hidden;
}

.layout-shell.is-sidebar-collapsed {
  grid-template-columns: 64px minmax(0, 1fr);
}

.layout-shell.is-fixed-viewport {
  position: fixed;
  inset: 0;
  width: 100%;
}

.layout-sidebar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 12px 12px;
  background: var(--rail-bg);
  color: #e2e8f0;
  min-height: 0;
  overflow: hidden;
  border-radius: var(--radius-lg);
}

.layout-sidebar.is-collapsed {
  padding: 12px 8px;
  align-items: center;
}

/* ---- 品牌区域 ---- */

.brand-row {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
}

.layout-sidebar.is-collapsed .brand-row {
  grid-template-columns: 1fr;
  justify-items: center;
}

.brand-emblem {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background:
    linear-gradient(135deg, rgba(59, 130, 246, 0.4), rgba(99, 102, 241, 0.2));
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #f1f5f9;
}

.brand-chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 4px;
  background: rgba(59, 130, 246, 0.2);
  color: rgba(147, 197, 253, 0.9);
  font-size: 10px;
  letter-spacing: 0.14em;
  font-weight: 600;
}

.brand-block h1 {
  margin: 6px 0 0;
  font-size: 16px;
  line-height: 1.2;
  letter-spacing: 0.06em;
  color: #f1f5f9;
}

.layout-sidebar.is-collapsed .brand-block h1 {
  display: none;
}

/* ---- 信息卡片 ---- */

.rail-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.rail-meta-card,
.sidebar-footer {
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: var(--rail-surface);
}

.rail-meta-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
}

.rail-meta-card span,
.sidebar-footer__label {
  color: rgba(148, 163, 184, 0.7);
  font-size: 10px;
  letter-spacing: 0.08em;
}

.rail-meta-card strong,
.sidebar-footer__value {
  font-size: 13px;
  letter-spacing: 0.04em;
  color: #e2e8f0;
}

/* ---- Element Plus 菜单覆盖 ---- */

.sidebar-menu {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  border-right: none;
  background: transparent;
  --el-menu-bg-color: transparent;
  --el-menu-text-color: #94a3b8;
  --el-menu-active-color: #60a5fa;
  --el-menu-hover-bg-color: rgba(255, 255, 255, 0.06);
  --el-menu-hover-text-color: #e2e8f0;
  --el-menu-item-height: 44px;
  padding: 4px 0;
}

.sidebar-menu:not(.el-menu--collapse) {
  width: 100%;
}

.sidebar-menu::-webkit-scrollbar {
  width: 4px;
}

.sidebar-menu::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-menu::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 4px;
}

:deep(.el-menu-item) {
  border-radius: 8px;
  margin: 2px 4px;
  padding-left: 16px !important;
  height: 42px;
  line-height: 42px;
  transition: all 0.2s ease;
}

:deep(.el-menu-item .el-icon) {
  font-size: 18px;
  margin-right: 10px;
  color: inherit;
}

:deep(.el-menu-item:hover) {
  background: rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
}

:deep(.el-menu-item.is-active) {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  font-weight: 600;
  position: relative;
}

:deep(.el-menu-item.is-active::before) {
  content: "";
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  border-radius: 0 3px 3px 0;
  background: var(--brand);
}

/* 折叠状态下的菜单 */
:deep(.el-menu--collapse .el-menu-item) {
  padding: 0 !important;
  display: flex;
  justify-content: center;
  margin: 2px 4px;
}

:deep(.el-menu--collapse .el-menu-item .el-icon) {
  margin-right: 0;
  font-size: 20px;
}

:deep(.el-menu--collapse .el-menu-item.is-active::before) {
  width: 3px;
  height: 16px;
}

/* ---- 底部操作区 ---- */

.sidebar-bottom-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
}

.layout-sidebar.is-collapsed .sidebar-bottom-actions {
  align-items: center;
  width: 100%;
}

.sidebar-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  flex-shrink: 0;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  background: var(--rail-surface);
  color: rgba(148, 163, 184, 0.8);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
}

.sidebar-toggle:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
}

/* ---- 底部信息 ---- */

.sidebar-footer {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
}

/* ---- 面包屑 ---- */

.layout-breadcrumb {
  padding: 0 4px;
}

:deep(.el-breadcrumb) {
  font-size: 12px;
}

:deep(.el-breadcrumb__inner) {
  color: var(--text-subtle) !important;
  font-weight: 500;
}

:deep(.el-breadcrumb__inner.is-link:hover) {
  color: var(--brand) !important;
}

:deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
  color: var(--text-main) !important;
  font-weight: 600;
}

/* ---- 主内容区 ---- */

.layout-main {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  overflow: hidden;
}

.layout-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* ---- 移动端顶栏 ---- */

.mobile-topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
}

.mobile-menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--panel-border);
  border-radius: 8px;
  background: var(--panel-strong);
  color: var(--text-main);
  cursor: pointer;
}

.mobile-topbar__title {
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.04em;
  color: var(--text-main);
}

/* ---- 移动端抽屉 ---- */

.mobile-drawer-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mobile-menu {
  background: transparent;
  --el-menu-bg-color: transparent;
  --el-menu-text-color: #94a3b8;
  --el-menu-active-color: #60a5fa;
  --el-menu-hover-bg-color: rgba(255, 255, 255, 0.06);
  --el-menu-hover-text-color: #e2e8f0;
}

.mobile-drawer-footer {
  padding: 12px 8px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  margin-top: auto;
}

.mobile-drawer-footer .sidebar-toggle {
  color: #94a3b8;
  border-color: rgba(255, 255, 255, 0.1);
}

:deep(.mobile-sidebar-drawer .el-drawer__header) {
  background: linear-gradient(180deg, #0f172a, #1e293b);
  margin-bottom: 0;
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

:deep(.mobile-sidebar-drawer .el-drawer__body) {
  background: linear-gradient(180deg, #1e293b, #0f172a);
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
}

/* ---- 响应式 ---- */

@media (max-width: 1100px) {
  .layout-shell {
    grid-template-columns: 1fr;
    height: auto;
    overflow: visible;
  }

  .layout-shell.is-fixed-viewport {
    grid-template-columns: 220px minmax(0, 1fr);
    height: 100vh;
    overflow: hidden;
  }

  .layout-shell.is-fixed-viewport.is-sidebar-collapsed {
    grid-template-columns: 64px minmax(0, 1fr);
  }
}

@media (max-width: 720px) {
  .layout-shell {
    padding: 10px;
  }
}
</style>
