<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  nodes: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  selectedKey: {
    type: String,
    default: '',
  },
  includeSystemSchemas: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['select-node', 'refresh', 'toggle-system', 'new-query', 'open-history'])

const treeRef = ref(null)
const filterText = ref('')

watch(filterText, (value) => {
  treeRef.value?.filter(value)
})

function filterNode(value, node) {
  if (!value) return true
  return String(node.label || '').toLowerCase().includes(value.toLowerCase())
}

function handleNodeClick(node) {
  emit('select-node', node)
}
</script>

<template>
  <aside class="object-tree-panel glass-panel">
    <div class="object-tree-panel__header">
      <div class="object-tree-panel__title">
        <span class="object-tree-panel__label">MYSQL BROWSER</span>
        <h2>固定连接实例</h2>
        <p>当前模块只操作后端 datasource 指向的单实例多库环境。</p>
      </div>

      <div class="object-tree-panel__actions">
        <el-button size="small" type="primary" @click="$emit('new-query')">新建查询</el-button>
        <el-button size="small" @click="$emit('open-history')">历史</el-button>
        <el-button size="small" @click="$emit('refresh')">刷新</el-button>
      </div>
    </div>

    <div class="object-tree-panel__meta">
      <span>单实例多库</span>
      <span>管理员模式</span>
      <span>{{ includeSystemSchemas ? '显示系统库' : '隐藏系统库' }}</span>
    </div>

    <div class="object-tree-panel__filters">
      <el-input v-model="filterText" placeholder="搜索 schema / table / query" clearable />
      <el-switch
        :model-value="includeSystemSchemas"
        inline-prompt
        active-text="系统库"
        inactive-text="业务库"
        @change="$emit('toggle-system')"
      />
    </div>

    <div class="object-tree-panel__body">
      <el-tree
        ref="treeRef"
        node-key="key"
        :data="nodes"
        :current-node-key="selectedKey"
        :expand-on-click-node="false"
        :default-expand-all="true"
        :filter-node-method="filterNode"
        :props="{ label: 'label', children: 'children' }"
        highlight-current
        @node-click="handleNodeClick"
      >
        <template #default="{ data }">
          <div class="object-tree-node">
            <span class="object-tree-node__kind">{{ data.type }}</span>
            <span class="object-tree-node__label">{{ data.label }}</span>
          </div>
        </template>
      </el-tree>
    </div>

    <el-skeleton v-if="loading" animated :rows="6" />
  </aside>
</template>

<style scoped>
.object-tree-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  padding: 16px;
  background: rgba(247, 241, 231, 0.92);
}

.object-tree-panel__header {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.object-tree-panel__title h2 {
  margin: 6px 0 0;
  font-size: 20px;
  letter-spacing: 0.05em;
}

.object-tree-panel__title p {
  margin: 8px 0 0;
  color: var(--text-subtle);
  font-size: 12px;
  line-height: 1.6;
}

.object-tree-panel__label {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(23, 36, 55, 0.08);
  color: var(--text-subtle);
  font-size: 11px;
  letter-spacing: 0.12em;
}

.object-tree-panel__actions,
.object-tree-panel__meta,
.object-tree-panel__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.object-tree-panel__meta span {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(23, 36, 55, 0.06);
  color: var(--text-subtle);
  font-size: 12px;
}

.object-tree-panel__filters :deep(.el-input) {
  flex: 1;
  min-width: 0;
}

.object-tree-panel__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-right: 6px;
}

.object-tree-node {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.object-tree-node__kind {
  color: var(--text-subtle);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.object-tree-node__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.el-tree) {
  background: transparent;
}

:deep(.el-tree-node__content) {
  min-height: 34px;
  border-radius: 10px;
}

:deep(.el-tree-node.is-current > .el-tree-node__content) {
  background: rgba(195, 95, 55, 0.14);
  color: var(--brand-strong);
}
</style>
