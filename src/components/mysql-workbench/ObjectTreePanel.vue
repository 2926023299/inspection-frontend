<script setup>
import { computed, ref, watch, onBeforeUnmount, nextTick } from 'vue'

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

const emit = defineEmits(['select-node', 'select-node-pinned', 'refresh', 'toggle-system', 'new-query', 'open-history', 'open-exports', 'context-action', 'import-sql', 'toggle-collapse', 'load-schema-tables'])

const treeRef = ref(null)
const filterText = ref('')
const contextMenu = ref({ visible: false, x: 0, y: 0, node: null })
const sqlFileInput = ref(null)
const pendingImportSchema = ref('')
const collapsed = ref(false)

function toggleCollapse() {
  collapsed.value = !collapsed.value
  emit('toggle-collapse', collapsed.value)
}

watch(filterText, (value) => {
  treeRef.value?.filter(value)
})

watch(() => props.nodes, async () => {
  await nextTick()
  treeRef.value?.filter(filterText.value)
}, { flush: 'post' })

function filterNode(value, node) {
  if (!value) return true
  return String(node.label || '').toLowerCase().includes(value.toLowerCase())
}

function handleNodeClick(node) {
  emit('select-node', node)
}

function handleNodeDblclick(node) {
  emit('select-node-pinned', node)
}

function handleNodeExpand(node) {
  if (node?.type === 'schema' && (!node.loaded || node.hasMoreTables) && !node.loading) {
    emit('load-schema-tables', {
      schema: node.label,
      page: node.loaded ? (node.tablePage || 1) + 1 : 1,
    })
  }
}

function handleLoadMoreTables(event, node) {
  event.stopPropagation()
  if (node?.type === 'schema' && node.hasMoreTables && !node.loading) {
    emit('load-schema-tables', {
      schema: node.label,
      page: (node.tablePage || 1) + 1,
      keyword: node.tableKeyword || '',
    })
  }
}

function handleNodeContextmenu(event, node) {
  event.preventDefault()
  const menuWidth = 160
  const menuHeight = 180
  const x = event.clientX + menuWidth > window.innerWidth ? event.clientX - menuWidth : event.clientX
  const y = event.clientY + menuHeight > window.innerHeight ? event.clientY - menuHeight : event.clientY
  contextMenu.value = { visible: true, x: Math.max(0, x), y: Math.max(0, y), node }
}

const contextMenuItems = computed(() => {
  const node = contextMenu.value.node
  if (!node) return []
  if (node.type === 'table') {
    return [
      { action: 'open-data', label: '查看数据' },
      { action: 'open-design', label: '查看结构' },
      { action: 'open-ddl', label: '查看 DDL' },
      { action: 'open-query', label: '在查询中打开' },
      { action: 'drop-table', label: '删除表', danger: true },
    ]
  }
  if (node.type === 'saved-query') {
    return [
      { action: 'open-query', label: '打开查询' },
      { action: 'delete-query', label: '删除查询', danger: true },
    ]
  }
  if (node.type === 'query') {
    return [
      { action: 'activate-query', label: '激活查询' },
    ]
  }
  if (node.type === 'queries-root') {
    return [
      { action: 'new-query', label: '新建查询' },
    ]
  }
  if (node.type === 'schema') {
    return [
      { action: 'import-sql', label: '导入并执行 SQL' },
    ]
  }
  if (node.type === 'history-root') {
    return [
      { action: 'open-history', label: '查看历史' },
    ]
  }
  return []
})

function handleMenuAction(item) {
  const node = contextMenu.value.node
  closeContextMenu()
  if (item.action === 'import-sql') {
    pendingImportSchema.value = node.label || ''
    sqlFileInput.value?.click()
    return
  }
  emit('context-action', { action: item.action, node })
}

function handleSqlFileChange(event) {
  const file = event.target.files?.[0]
  if (file) {
    emit('import-sql', { file, schema: pendingImportSchema.value })
    pendingImportSchema.value = ''
  }
  event.target.value = ''
}

function closeContextMenu() {
  contextMenu.value = { visible: false, x: 0, y: 0, node: null }
}

function handleDocumentClick() {
  closeContextMenu()
}

const stopListener = () => document.removeEventListener('click', handleDocumentClick)

watch(() => contextMenu.value.visible, (visible) => {
  if (visible) {
    setTimeout(() => document.addEventListener('click', handleDocumentClick), 0)
  } else {
    stopListener()
  }
})

onBeforeUnmount(stopListener)
</script>

<template>
  <aside class="object-tree-panel glass-panel" :class="{ 'is-collapsed': collapsed }">
    <div class="object-tree-panel__header">
      <div class="object-tree-panel__head">
        <span class="object-tree-panel__badge">MYSQL</span>
        <el-button class="object-tree-panel__toggle" size="small" text @click="toggleCollapse">
          <span class="object-tree-panel__toggle-icon" :class="{ 'is-flipped': collapsed }">&#x276E;</span>
        </el-button>
      </div>

      <div v-if="!collapsed" class="object-tree-panel__inner">
        <div class="object-tree-panel__title">
          <h2>固定连接实例</h2>
          <p>当前模块只操作后端 datasource 指向的单实例多库环境。</p>
        </div>

        <div class="object-tree-panel__actions">
          <el-button size="small" type="primary" @click="$emit('new-query')">新建查询</el-button>
          <el-button size="small" @click="$emit('open-history')">历史</el-button>
          <el-button size="small" @click="$emit('open-exports')">导出任务</el-button>
          <el-button size="small" @click="$emit('refresh')">刷新</el-button>
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
            :default-expanded-keys="['queries-root']"
            :filter-node-method="filterNode"
            :props="{ label: 'label', children: 'children' }"
            highlight-current
            @node-click="handleNodeClick"
            @node-expand="handleNodeExpand"
            @node-contextmenu="handleNodeContextmenu"
          >
            <template #default="{ data }">
              <div class="object-tree-node" @dblclick.stop="handleNodeDblclick(data)">
                <span class="object-tree-node__kind">{{ data.type }}</span>
                <span class="object-tree-node__label">{{ data.label }}</span>
                <span v-if="data.loading" class="object-tree-node__meta">加载中</span>
                <button
                  v-else-if="data.type === 'schema' && data.hasMoreTables"
                  class="object-tree-node__more"
                  type="button"
                  @click="handleLoadMoreTables($event, data)"
                >
                  更多
                </button>
              </div>
            </template>
          </el-tree>
        </div>
      </div>
    </div>

    <el-skeleton v-if="loading && !collapsed" animated :rows="6" />

    <input ref="sqlFileInput" type="file" accept=".sql,.txt" style="display:none" @change="handleSqlFileChange" />

    <Teleport to="body">
      <div
        v-if="contextMenu.visible"
        class="tree-context-menu"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      >
        <div
          v-for="item in contextMenuItems"
          :key="item.action"
          class="tree-context-menu__item"
          :class="{ 'tree-context-menu__item--danger': item.danger }"
          @click="handleMenuAction(item)"
        >
          {{ item.label }}
        </div>
      </div>
    </Teleport>
  </aside>
</template>

<style scoped>
.object-tree-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  padding: 14px;
  background: rgba(247, 241, 231, 0.92);
  transition: padding 0.25s ease;
}

.object-tree-panel.is-collapsed {
  padding: 14px 8px;
}

.object-tree-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.object-tree-panel__badge {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(23, 36, 55, 0.08);
  color: var(--text-subtle);
  font-size: 10px;
  letter-spacing: 0.12em;
  white-space: nowrap;
}

.object-tree-panel__toggle {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  padding: 0;
}

.object-tree-panel__toggle-icon {
  display: inline-block;
  font-size: 16px;
  transition: transform 0.25s ease;
  color: var(--text-subtle);
}

.object-tree-panel__toggle-icon.is-flipped {
  transform: rotate(180deg);
}

.object-tree-panel.is-collapsed .object-tree-panel__head {
  flex-direction: column;
  gap: 8px;
}

.object-tree-panel__inner {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.object-tree-panel__header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-height: 0;
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
  display: flex;
  flex: 1;
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
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.object-tree-node__meta {
  flex-shrink: 0;
  color: var(--text-subtle);
  font-size: 11px;
}

.object-tree-node__more {
  flex-shrink: 0;
  min-height: 22px;
  padding: 0 7px;
  border: none;
  border-radius: 6px;
  background: rgba(23, 36, 55, 0.08);
  color: var(--text-subtle);
  font-size: 11px;
  cursor: pointer;
}

.object-tree-node__more:hover {
  background: rgba(195, 95, 55, 0.14);
  color: var(--brand-strong);
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

<style>
.tree-context-menu {
  position: fixed;
  z-index: 9999;
  min-width: 140px;
  padding: 4px 0;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.14);
  font-size: 13px;
  user-select: none;
}

.tree-context-menu__item {
  padding: 8px 16px;
  cursor: pointer;
  transition: background 0.15s;
}

.tree-context-menu__item:hover {
  background: rgba(195, 95, 55, 0.1);
}

.tree-context-menu__item--danger {
  color: #e54d42;
}

.tree-context-menu__item--danger:hover {
  background: rgba(229, 77, 66, 0.1);
}
</style>
