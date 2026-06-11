<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const route = useRoute()
const router = useRouter()
const loggingOut = ref(false)
const { username, signOut } = useAuth()

const fixedTabs = [
  { name: 'Dashboard', path: '/dashboard', title: '工作台', closable: false },
  { name: 'ServerPage', path: '/server', title: '服务器巡检', closable: false },
  { name: 'ServerConnectPage', path: '/connect', title: '服务器连接', closable: false },
  { name: 'MysqlWorkbenchPage', path: '/mysql', title: 'MySQL工作台', closable: false },
  { name: 'JavaPage', path: '/java', title: 'Java巡检', closable: false },
  { name: 'TopologyPage', path: '/topology', title: '图模巡检', closable: false },
]

const dynamicTabs = ref([])

const tabs = computed(() => [...fixedTabs, ...dynamicTabs.value])
const activeTab = computed(() => {
  if (route.name === 'History') {
    return route.fullPath
  }

  const fixedTab = fixedTabs.find((item) => item.name === route.name)
  return fixedTab?.path || route.fullPath
})

watch(
  () => route.fullPath,
  () => {
    if (route.name !== 'History') {
      return
    }

    const exists = dynamicTabs.value.some((item) => item.path === route.fullPath)
    if (!exists) {
      dynamicTabs.value.push({
        name: route.name,
        path: route.fullPath,
        title: `历史 ${route.params.ip}`,
        closable: true,
      })
    }
  },
  { immediate: true },
)

function handleTabClick(tabContext) {
  if (tabContext.props.name !== route.fullPath) {
    router.push(tabContext.props.name)
  }
}

function removeTab(path) {
  const index = dynamicTabs.value.findIndex((item) => item.path === path)
  if (index === -1) return

  dynamicTabs.value.splice(index, 1)
  if (route.fullPath === path) {
    router.push('/server')
  }
}

async function handleLogout() {
  if (loggingOut.value) {
    return
  }

  loggingOut.value = true
  try {
    await signOut()
    ElMessage.success('已退出登录')
  } catch (error) {
    ElMessage.warning(error.message || '会话已失效')
  } finally {
    loggingOut.value = false
    await router.replace('/login')
  }
}
</script>

<template>
  <div class="tab-view glass-panel">
    <div class="tab-view__tabs">
      <el-tabs :model-value="activeTab" type="card" @tab-click="handleTabClick" @tab-remove="removeTab">
        <el-tab-pane
          v-for="tab in tabs"
          :key="tab.path"
          :label="tab.title"
          :name="tab.path"
          :closable="tab.closable"
        />
      </el-tabs>
    </div>

    <div class="tab-view__auth">
      <div class="tab-view__auth-copy">
        <span>当前用户</span>
        <strong>{{ username || 'admin' }}</strong>
      </div>
      <el-button text type="primary" :loading="loggingOut" @click="handleLogout">退出登录</el-button>
    </div>
  </div>
</template>

<style scoped>
.tab-view {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
}

.tab-view__tabs {
  flex: 1;
  min-width: 0;
}

.tab-view__auth {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(30, 41, 59, 0.04);
}

.tab-view__auth-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  color: var(--text-subtle);
  font-size: 10px;
}

.tab-view__auth-copy strong {
  color: var(--text-main);
  font-size: 12px;
  letter-spacing: 0.04em;
}

:deep(.el-tabs__header) {
  margin: 0;
}

:deep(.el-tabs__nav-wrap::after) {
  display: none;
}

:deep(.el-tabs__nav-scroll) {
  padding: 4px;
  border-radius: 10px;
  background: rgba(241, 245, 249, 0.8);
  border: 1px solid rgba(30, 41, 59, 0.06);
}

:deep(.el-tabs__nav) {
  border: none !important;
}

:deep(.el-tabs__item) {
  height: 34px;
  border: none !important;
  border-radius: 8px;
  color: var(--text-subtle);
  font-weight: 600;
  font-size: 12px;
  letter-spacing: 0.04em;
}

:deep(.el-tabs--card > .el-tabs__header .el-tabs__item.is-active) {
  color: var(--text-main);
  background: var(--panel-strong);
  box-shadow: 0 2px 8px rgba(30, 41, 59, 0.06);
}

:deep(.el-tabs__item:hover) {
  color: var(--brand);
}

@media (max-width: 860px) {
  .tab-view {
    flex-direction: column;
    align-items: stretch;
  }

  .tab-view__auth {
    justify-content: space-between;
  }

  .tab-view__auth-copy {
    align-items: flex-start;
  }
}
</style>
