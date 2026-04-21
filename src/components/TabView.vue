<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const fixedTabs = [
  { name: 'Dashboard', path: '/dashboard', title: '工作台', closable: false },
  { name: 'ServerPage', path: '/server', title: '服务器巡检', closable: false },
  { name: 'ServerConnectPage', path: '/connect', title: '服务器连接', closable: false },
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
</script>

<template>
  <div class="tab-view">
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
</template>

<style scoped>
.tab-view {
  padding: 0 2px;
}

:deep(.el-tabs__header) {
  margin: 0;
}

:deep(.el-tabs__nav-wrap::after) {
  display: none;
}

:deep(.el-tabs__nav-scroll) {
  padding: 6px;
  border-radius: 16px;
  background: rgba(250, 246, 238, 0.72);
  border: 1px solid rgba(30, 42, 51, 0.08);
}

:deep(.el-tabs__nav) {
  border: none !important;
}

:deep(.el-tabs__item) {
  height: 36px;
  border: none !important;
  border-radius: 12px;
  color: var(--text-subtle);
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 0.05em;
}

:deep(.el-tabs--card > .el-tabs__header .el-tabs__item.is-active) {
  color: var(--text-main);
  background: var(--panel-strong);
  box-shadow: 0 10px 18px rgba(63, 55, 43, 0.08);
}

:deep(.el-tabs__item:hover) {
  color: var(--brand);
}
</style>
