<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiBaseLabel } from '@/api/http'
import TabView from '@/components/TabView.vue'

const route = useRoute()
const router = useRouter()
const sidebarCollapsed = ref(false)
const backendLabel = computed(() => getApiBaseLabel())

const menuItems = [
  { path: '/dashboard', title: '巡检工作台', caption: '总览与入口' },
  { path: '/server', title: '服务器巡检', caption: '资源与异常' },
  { path: '/connect', title: '服务器连接', caption: '终端与文件' },
  { path: '/java', title: 'Java巡检', caption: '进程与差异' },
  { path: '/topology', title: '图模巡检', caption: '中压/低压统计' },
]

const activeMenu = computed(() => route.meta.menuKey || route.path)
const routeTitle = computed(() => {
  const rawTitle = route.meta.title
  return typeof rawTitle === 'function' ? rawTitle(route) : rawTitle || '巡检系统'
})

const breadcrumbList = computed(() => {
  const rawBreadcrumb = route.meta.breadcrumb
  if (typeof rawBreadcrumb === 'function') return rawBreadcrumb(route)
  if (Array.isArray(rawBreadcrumb)) return rawBreadcrumb
  return [routeTitle.value]
})

const currentDateLabel = new Intl.DateTimeFormat('zh-CN', {
  month: '2-digit',
  day: '2-digit',
  weekday: 'short',
}).format(new Date())

onMounted(() => {
  sidebarCollapsed.value = window.localStorage.getItem('layout-sidebar-collapsed') === 'true'
})

watch(sidebarCollapsed, (collapsed) => {
  window.localStorage.setItem('layout-sidebar-collapsed', String(collapsed))
})

function navigate(path) {
  if (path !== route.path) {
    router.push(path)
  }
}

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}
</script>

<template>
  <div class="layout-shell" :class="{ 'is-sidebar-collapsed': sidebarCollapsed }">
    <aside class="layout-sidebar glass-panel" :class="{ 'is-collapsed': sidebarCollapsed }">
      <div class="brand-block">
        <div class="brand-row">
          <div class="brand-emblem">IO</div>
          <div>
            <span v-if="!sidebarCollapsed" class="brand-chip">OPS INSPECTION</span>
            <h1>{{ sidebarCollapsed ? '巡检' : '设备巡检系统' }}</h1>
          </div>
        </div>
        <p v-if="!sidebarCollapsed">把资源、Java 进程和图模统计收敛到一套工作台里。</p>
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

      <nav class="menu-stack">
        <button
          v-for="(item, index) in menuItems"
          :key="item.path"
          class="menu-item"
          :class="{ 'is-active': activeMenu === item.path }"
          type="button"
          @click="navigate(item.path)"
        >
          <span class="menu-index">{{ String(index + 1).padStart(2, '0') }}</span>
          <div v-if="!sidebarCollapsed" class="menu-copy">
            <strong>{{ item.title }}</strong>
            <span>{{ item.caption }}</span>
          </div>
        </button>
      </nav>

      <button type="button" class="sidebar-toggle" @click="toggleSidebar">
        {{ sidebarCollapsed ? '展开' : '收起' }}
      </button>

      <footer v-if="!sidebarCollapsed" class="sidebar-footer">
        <span class="sidebar-footer__label">Current Surface</span>
        <strong class="sidebar-footer__value">{{ routeTitle }}</strong>
      </footer>
    </aside>

    <section class="layout-main">
      <header class="layout-header glass-panel">
        <div>
          <p class="header-kicker">OPS CONSOLE</p>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item v-for="item in breadcrumbList" :key="item">{{ item }}</el-breadcrumb-item>
          </el-breadcrumb>
          <h2 class="header-title">{{ routeTitle }}</h2>
        </div>
        <div class="header-status">
          <span>运行模式</span>
          <strong>巡检控制台</strong>
        </div>
      </header>

      <TabView />

      <main class="layout-content">
        <router-view v-slot="{ Component, route: currentRoute }">
          <keep-alive>
            <component :is="Component" v-if="currentRoute.meta.keepAlive" :key="currentRoute.name" />
          </keep-alive>
          <component :is="Component" v-if="!currentRoute.meta.keepAlive" :key="currentRoute.fullPath" />
        </router-view>
      </main>
    </section>
  </div>
</template>

<style scoped>
.layout-shell {
  display: grid;
  grid-template-columns: 284px minmax(0, 1fr);
  height: 100vh;
  gap: 14px;
  padding: 14px;
  overflow: hidden;
}

.layout-shell.is-sidebar-collapsed {
  grid-template-columns: 88px minmax(0, 1fr);
}

.layout-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px 16px 16px;
  background: var(--rail-bg);
  color: #f5efe7;
  min-height: 0;
}

.layout-sidebar.is-collapsed {
  padding: 16px 10px 14px;
  align-items: center;
}

.brand-row {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
}

.layout-sidebar.is-collapsed .brand-row {
  grid-template-columns: 1fr;
  justify-items: center;
}

.brand-emblem {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background:
    linear-gradient(135deg, rgba(195, 95, 55, 0.34), rgba(255, 255, 255, 0.06));
  font-size: 19px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.brand-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(245, 239, 231, 0.88);
  font-size: 11px;
  letter-spacing: 0.18em;
}

.brand-block h1 {
  margin: 10px 0 0;
  font-size: 24px;
  line-height: 0.98;
  letter-spacing: 0.08em;
}

.layout-sidebar.is-collapsed .brand-block h1 {
  margin-top: 8px;
  font-size: 14px;
  text-align: center;
}

.brand-block p {
  margin: 12px 0 0;
  color: rgba(245, 239, 231, 0.68);
  font-size: 12px;
}

.rail-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.rail-meta-card,
.sidebar-footer {
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: var(--rail-surface);
  backdrop-filter: blur(14px);
}

.rail-meta-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
}

.rail-meta-card span,
.sidebar-footer__label {
  color: rgba(245, 239, 231, 0.56);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.rail-meta-card strong,
.sidebar-footer__value {
  font-size: 15px;
  letter-spacing: 0.06em;
}

.menu-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.menu-item {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  padding: 12px 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.02);
  color: #f5efe7;
  text-align: left;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.layout-sidebar.is-collapsed .menu-item {
  grid-template-columns: 1fr;
  justify-items: center;
  padding: 12px 8px;
}

.menu-index {
  color: rgba(245, 239, 231, 0.36);
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
}

.menu-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.menu-copy strong {
  letter-spacing: 0.06em;
  font-size: 13px;
}

.menu-copy span {
  color: rgba(245, 239, 231, 0.56);
  font-size: 11px;
}

.menu-item:hover,
.menu-item.is-active {
  transform: translateX(4px);
  border-color: rgba(195, 95, 55, 0.42);
  background: linear-gradient(90deg, rgba(195, 95, 55, 0.2), rgba(255, 255, 255, 0.04));
  box-shadow: inset 0 0 0 1px rgba(195, 95, 55, 0.12);
}

.menu-item.is-active .menu-index {
  color: #f5efe7;
}

.sidebar-toggle {
  width: 100%;
  margin-top: auto;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  background: var(--rail-surface);
  color: rgba(245, 239, 231, 0.88);
}

.sidebar-footer {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
}

.layout-main {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  overflow: hidden;
}

.layout-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 14px;
}

.header-kicker {
  margin: 0 0 2px;
  color: var(--brand);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.header-title {
  margin: 4px 0 0;
  font-size: 16px;
  letter-spacing: 0.04em;
}

.header-status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  color: var(--text-subtle);
  font-size: 10px;
  padding: 6px 10px;
  border-radius: 12px;
  background: rgba(195, 95, 55, 0.08);
}

.header-status strong {
  color: var(--text-main);
  font-size: 11px;
  letter-spacing: 0.04em;
}

.layout-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

@media (max-width: 1100px) {
  .layout-shell {
    grid-template-columns: 1fr;
    height: auto;
    overflow: visible;
  }

  .layout-sidebar {
    padding: 18px;
  }

  .rail-meta {
    grid-template-columns: 1fr;
  }

  .menu-stack {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }
}

@media (max-width: 720px) {
  .layout-shell {
    padding: 12px;
  }

  .layout-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-status {
    align-items: flex-start;
  }
}
</style>
