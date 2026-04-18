<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TabView from '@/components/TabView.vue'

const route = useRoute()
const router = useRouter()

const menuItems = [
  { path: '/dashboard', title: '巡检工作台', caption: '总览与入口' },
  { path: '/server', title: '服务器巡检', caption: '资源与异常' },
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

function navigate(path) {
  if (path !== route.path) {
    router.push(path)
  }
}
</script>

<template>
  <div class="layout-shell">
    <aside class="layout-sidebar glass-panel">
      <div class="brand-block">
        <div class="brand-row">
          <div class="brand-emblem">IO</div>
          <div>
            <span class="brand-chip">OPS INSPECTION</span>
            <h1>设备巡检系统</h1>
          </div>
        </div>
        <p>把资源、Java 进程和图模统计收敛到一套工作台里。</p>
      </div>

      <div class="rail-meta">
        <div class="rail-meta-card">
          <span>值班日期</span>
          <strong>{{ currentDateLabel }}</strong>
        </div>
        <div class="rail-meta-card">
          <span>联调后端</span>
          <strong>localhost:8090</strong>
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
          <div class="menu-copy">
            <strong>{{ item.title }}</strong>
            <span>{{ item.caption }}</span>
          </div>
        </button>
      </nav>

      <footer class="sidebar-footer">
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
  grid-template-columns: 316px minmax(0, 1fr);
  min-height: 100vh;
  gap: 20px;
  padding: 20px;
}

.layout-sidebar {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 28px 24px 22px;
  background: var(--rail-bg);
  color: #f5efe7;
}

.brand-row {
  display: grid;
  grid-template-columns: 68px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
}

.brand-emblem {
  display: grid;
  place-items: center;
  width: 68px;
  height: 68px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background:
    linear-gradient(135deg, rgba(195, 95, 55, 0.34), rgba(255, 255, 255, 0.06));
  font-size: 24px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.brand-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(245, 239, 231, 0.88);
  font-size: 11px;
  letter-spacing: 0.18em;
}

.brand-block h1 {
  margin: 12px 0 0;
  font-size: 30px;
  line-height: 0.98;
  letter-spacing: 0.08em;
}

.brand-block p {
  margin: 18px 0 0;
  color: rgba(245, 239, 231, 0.68);
  font-size: 13px;
}

.rail-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
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
  gap: 6px;
  padding: 14px;
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
  gap: 10px;
}

.menu-item {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
  padding: 16px 18px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.02);
  color: #f5efe7;
  text-align: left;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.menu-index {
  color: rgba(245, 239, 231, 0.36);
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
}

.menu-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.menu-copy strong {
  letter-spacing: 0.06em;
}

.menu-copy span {
  color: rgba(245, 239, 231, 0.56);
  font-size: 12px;
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

.sidebar-footer {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
}

.layout-main {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.layout-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 26px;
}

.header-kicker {
  margin: 0 0 10px;
  color: var(--brand);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
}

.header-title {
  margin: 12px 0 0;
  font-size: 28px;
  letter-spacing: 0.08em;
}

.header-status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  color: var(--text-subtle);
  font-size: 12px;
  padding: 10px 14px;
  border-radius: 16px;
  background: rgba(195, 95, 55, 0.08);
}

.header-status strong {
  color: var(--text-main);
  font-size: 15px;
  letter-spacing: 0.08em;
}

.layout-content {
  min-height: 0;
}

@media (max-width: 1100px) {
  .layout-shell {
    grid-template-columns: 1fr;
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
