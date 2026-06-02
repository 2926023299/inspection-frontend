<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { ElMessage } from 'element-plus'
import SqlEditor from './SqlEditor.vue'
import VirtualResultTable from './VirtualResultTable.vue'
import { useMysqlMetadataCache } from '@/composables/useMysqlMetadataCache'
import { formatMysqlResultRowCount, resolveMysqlExecutableSql } from '@/utils/mysqlWorkbench'

const props = defineProps({
  tab: {
    type: Object,
    required: true,
  },
  schemaOptions: {
    type: Array,
    default: () => [],
  },
  treeNodes: {
    type: Array,
    default: () => [],
  },
})

const {
  metadataCacheVersion,
  getMysqlTableColumnsCached,
  peekMysqlTableColumns,
} = useMysqlMetadataCache()

const emit = defineEmits([
  'change-sql',
  'change-schema',
  'change-title',
  'execute',
  'cancel-execution',
  'save',
  'open-history',
  'show-edit-mode',
  'toggle-sql-preview',
  'export-result',
])

const isEditMode = computed(() => props.tab.viewMode !== 'result-focus')
const isResultFocusMode = computed(() => props.tab.viewMode === 'result-focus')

// 构建 CodeMirror SQL 自动补全所需的 schema 格式
const sqlSchema = computed(() => {
  metadataCacheVersion.value
  const schema = {}
  for (const node of props.treeNodes) {
    if (node.type === 'schema' && node.children?.length) {
      const tables = {}
      for (const child of node.children) {
        if (child.type === 'table') {
          tables[child.label] = peekMysqlTableColumns(node.label, child.label) || []
        }
      }
      if (Object.keys(tables).length > 0) {
        schema[node.label] = tables
      }
    }
  }
  return schema
})

async function loadTableColumns(schema, table) {
  try {
    return await getMysqlTableColumnsCached(schema, table)
  } catch {
    return []
  }
}
const shouldShowSqlPreview = computed(() => isResultFocusMode.value && props.tab.sqlPreviewExpanded)
const sqlPreviewToggleText = computed(() => (shouldShowSqlPreview.value ? '收起 SQL' : '展开 SQL'))
const editorRef = ref(null)
const queryPanelRef = ref(null)
const selectedSql = ref('')
const editorHeight = ref(320)
const isResizingEditor = ref(false)
const hasSelectedSql = computed(() => Boolean(selectedSql.value.trim()))
const executeButtonText = computed(() => (hasSelectedSql.value ? '执行选中 SQL' : '执行 SQL'))
const sqlPreviewText = computed(() => props.tab.lastExecutedSql || props.tab.sql || '')
const canCancelExecution = computed(() => Boolean(props.tab.executing && props.tab.executionId))
const editorHeightStyle = computed(() => ({
  '--mysql-query-editor-height': `${editorHeight.value}px`,
}))

const DEFAULT_EDITOR_HEIGHT = 200
const MIN_EDITOR_HEIGHT = 120
const MIN_RESULTS_HEIGHT = 180
const EDITOR_RESIZE_STEP = 24

let editorResizeCleanup = null

const summaryText = computed(() => {
  if (props.tab.executing) {
    return props.tab.canceling ? '正在停止 SQL 执行' : 'SQL 执行中'
  }
  if (props.tab.executionStatus === 'CANCELED') {
    return 'SQL 执行已停止'
  }
  if (!props.tab.results?.length) {
    return '当前还没有执行结果'
  }
  const failed = props.tab.results.filter((result) => !result.success).length
  if (failed) {
    return `${failed} 条语句失败，已停止后续执行`
  }
  return `最近一次返回 ${props.tab.results.length} 段结果`
})

const summaryBadgeText = computed(() => {
  if (props.tab.executing) {
    return props.tab.canceling ? '停止中' : '执行中'
  }
  if (props.tab.executionStatus === 'CANCELED') {
    return '已停止'
  }
  if (!props.tab.results?.length) {
    return '无结果'
  }
  const failed = props.tab.results.filter((result) => !result.success).length
  if (failed) {
    return `${failed} 失败`
  }
  return `${props.tab.results.length} 段结果`
})

const saveStatusText = computed(() => {
  if (props.tab.saveStatus === 'saving') return '保存中'
  if (props.tab.saveStatus === 'failed') return props.tab.saveError || '保存失败'
  if (props.tab.savedQueryId) return `已保存 #${props.tab.savedQueryId}`
  return '未保存'
})

const riskBadgeText = computed(() => (props.tab.dangerous ? '高危' : '普通'))
const batchBadgeText = computed(() => (props.tab.batchId ? `批次 #${props.tab.batchId}` : '未执行'))

function handleExportResult(result) {
  if (!result.columns?.length) {
    ElMessage.warning('该结果集没有可导出的数据')
    return
  }
  emit('export-result', { sql: result.sql, index: result.index, columns: result.columns })
}

function flushSql() {
  editorRef.value?.flush?.()
}

function getMaxEditorHeight() {
  const panel = queryPanelRef.value
  const panelHeight = panel?.getBoundingClientRect?.().height || 0
  if (!panelHeight) {
    return DEFAULT_EDITOR_HEIGHT
  }
  const panelStyle = window.getComputedStyle(panel)
  const gap = Number.parseFloat(panelStyle.rowGap || panelStyle.gap) || 0
  const paddingY = (Number.parseFloat(panelStyle.paddingTop) || 0) + (Number.parseFloat(panelStyle.paddingBottom) || 0)
  const splitterHeight = panel.querySelector?.('.mysql-query-resize')?.getBoundingClientRect?.().height || 0
  return Math.max(MIN_EDITOR_HEIGHT, Math.floor(panelHeight - MIN_RESULTS_HEIGHT - paddingY - gap * 2 - splitterHeight))
}

function setEditorHeight(value) {
  const nextHeight = Math.min(Math.max(Math.round(value), MIN_EDITOR_HEIGHT), getMaxEditorHeight())
  if (nextHeight === editorHeight.value) {
    return
  }
  editorHeight.value = nextHeight
  editorRef.value?.refresh?.()
}

function resetEditorHeight() {
  setEditorHeight(DEFAULT_EDITOR_HEIGHT)
}

function cleanupEditorResize() {
  editorResizeCleanup?.()
  editorResizeCleanup = null
  isResizingEditor.value = false
}

function startEditorResize(event) {
  if (!isEditMode.value) {
    return
  }
  cleanupEditorResize()
  const startY = event.clientY
  const startHeight = editorHeight.value
  isResizingEditor.value = true

  const handlePointerMove = (moveEvent) => {
    moveEvent.preventDefault()
    setEditorHeight(startHeight + moveEvent.clientY - startY)
  }
  const handlePointerUp = () => {
    cleanupEditorResize()
  }

  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp, { once: true })
  editorResizeCleanup = () => {
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
  }
  event.preventDefault()
}

function nudgeEditorHeight(delta) {
  setEditorHeight(editorHeight.value + delta)
}

function handleSelectionChange(value) {
  selectedSql.value = value || ''
}

function buildExecutePayload() {
  if (!isEditMode.value) {
    return {
      sqlOverride: String(props.tab.lastExecutedSql || props.tab.sql || '').trim(),
      usedSelection: Boolean(props.tab.lastExecutionUsedSelection && props.tab.lastExecutedSql),
    }
  }
  const resolved = resolveMysqlExecutableSql({
    sql: props.tab.sql,
    selectedSql: editorRef.value?.getSelectedSql?.() || selectedSql.value,
  })
  return {
    sqlOverride: resolved.sql,
    usedSelection: resolved.hasSelection,
  }
}

function handleExecute() {
  flushSql()
  emit('execute', buildExecutePayload())
}

function handleSave() {
  flushSql()
  emit('save')
}

onBeforeUnmount(() => {
  cleanupEditorResize()
})

defineExpose({ flushSql })
</script>

<template>
  <div class="tab-surface">
    <section class="content-panel page-toolbar mysql-query-toolbar" :class="{ 'is-focus': isResultFocusMode }">
      <template v-if="isEditMode">
        <div class="mysql-query-toolbar__edit-row">
          <el-input
            :model-value="tab.title"
            class="mysql-query-toolbar__title"
            placeholder="查询名称"
            @update:model-value="$emit('change-title', $event)"
          />

          <el-select
            :model-value="tab.schema"
            class="mysql-query-toolbar__schema"
            placeholder="执行 schema"
            clearable
            @update:model-value="$emit('change-schema', $event)"
          >
            <el-option v-for="option in schemaOptions" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>

          <div class="mysql-query-toolbar__actions">
            <el-button type="primary" :loading="tab.executing" @click="handleExecute">{{ executeButtonText }}</el-button>
            <el-button v-if="canCancelExecution" type="danger" plain :loading="tab.canceling" @click="$emit('cancel-execution')">停止</el-button>
            <el-button :loading="tab.saveStatus === 'saving'" @click="handleSave">保存</el-button>
            <el-button :disabled="!tab.batchId" @click="$emit('open-history')">查看历史</el-button>
          </div>

          <div class="mysql-query-toolbar__status">
            <span>{{ summaryBadgeText }}</span>
            <span>{{ saveStatusText }}</span>
            <span>{{ riskBadgeText }}</span>
            <span>{{ batchBadgeText }}</span>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="page-toolbar__left mysql-query-toolbar__focus-left">
          <span class="page-toolbar__title mysql-query-toolbar__focus-title">{{ tab.title }}</span>
          <div class="page-toolbar__actions mysql-query-toolbar__focus-meta">
            <span>{{ tab.schema || '未指定 schema' }}</span>
            <span>{{ summaryText }}</span>
            <span>{{ tab.batchId ? `批次 #${tab.batchId}` : '未执行' }}</span>
            <span>{{ saveStatusText }}</span>
          </div>
        </div>

        <div class="page-toolbar__right mysql-query-toolbar__focus-actions">
          <el-button size="small" @click="$emit('show-edit-mode')">返回编辑</el-button>
          <el-button type="primary" size="small" :loading="tab.executing" @click="handleExecute">再执行</el-button>
          <el-button v-if="canCancelExecution" type="danger" plain size="small" :loading="tab.canceling" @click="$emit('cancel-execution')">停止</el-button>
          <el-button size="small" @click="$emit('toggle-sql-preview')">{{ sqlPreviewToggleText }}</el-button>
          <el-button size="small" :disabled="!tab.batchId" @click="$emit('open-history')">查看历史</el-button>
        </div>
      </template>
    </section>

    <section
      ref="queryPanelRef"
      class="content-panel compact-main-panel mysql-query-panel"
      :class="{ 'is-focus': isResultFocusMode, 'is-resizing-editor': isResizingEditor }"
    >
      <div v-if="isEditMode" class="mysql-query-editor" :style="editorHeightStyle">
        <SqlEditor
          ref="editorRef"
          :model-value="tab.sql"
          :schema="sqlSchema"
          :default-schema="tab.schema"
          :load-table-columns="loadTableColumns"
          @update:model-value="$emit('change-sql', $event)"
          @selection-change="handleSelectionChange"
        />
      </div>

      <button
        v-if="isEditMode"
        type="button"
        class="mysql-query-resize"
        aria-label="拖动调整 SQL 编辑区高度，双击恢复默认高度"
        @pointerdown="startEditorResize"
        @dblclick="resetEditorHeight"
        @keydown.up.prevent="nudgeEditorHeight(-EDITOR_RESIZE_STEP)"
        @keydown.down.prevent="nudgeEditorHeight(EDITOR_RESIZE_STEP)"
        @keydown.home.prevent="setEditorHeight(MIN_EDITOR_HEIGHT)"
        @keydown.end.prevent="setEditorHeight(getMaxEditorHeight())"
      >
        <span class="mysql-query-resize__grip" />
      </button>

      <div v-else-if="shouldShowSqlPreview" class="mysql-query-focus-preview">
        <pre>{{ sqlPreviewText }}</pre>
      </div>

      <div class="mysql-query-results compact-scroll-body" :class="{ 'is-focus': isResultFocusMode }">
        <div v-if="!tab.results?.length" class="mysql-query-empty">
          <el-empty description="执行后会在这里展示每条语句的结果、影响行数或报错信息。" />
        </div>

        <div
          v-for="result in tab.results || []"
          :key="`${tab.key}-${result.index}`"
          class="mysql-query-result"
          :class="{ 'is-error': !result.success }"
        >
          <div class="mysql-query-result__header">
            <div>
              <strong>语句 {{ result.index }} · {{ result.type || 'UNKNOWN' }}</strong>
              <p>{{ result.message || '已完成执行' }}</p>
            </div>
            <div class="mysql-query-result__meta">
              <span :class="{ 'is-error': !result.success }">{{ result.success ? '成功' : '失败' }}</span>
              <span v-if="result.columns?.length">
                {{ formatMysqlResultRowCount(result) }}
              </span>
              <span>{{ result.durationMs || 0 }} ms</span>
              <el-button v-if="result.columns?.length" size="small" @click="handleExportResult(result)">导出 Excel</el-button>
            </div>
          </div>

          <el-alert
            v-if="result.error"
            type="error"
            show-icon
            :closable="false"
            :title="result.error.title || result.message || 'SQL 执行失败'"
          >
            <div class="mysql-query-error-detail">
              <span v-if="result.error.category">分类：{{ result.error.category }}</span>
              <span v-if="result.error.errorCode">错误码：{{ result.error.errorCode }}</span>
              <span v-if="result.error.sqlState">SQLState：{{ result.error.sqlState }}</span>
              <pre v-if="result.error.detail">{{ result.error.detail }}</pre>
            </div>
          </el-alert>

          <pre v-if="!result.success" class="mysql-query-failed-sql">{{ result.sql }}</pre>

          <div v-if="result.columns?.length" class="mysql-query-result__table">
            <VirtualResultTable :columns="result.columns" :rows="result.rows || []" />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.tab-surface {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  height: 100%;
}

.mysql-query-toolbar {
  min-height: 60px;
  padding: 8px 14px;
  gap: 10px;
}

.mysql-query-toolbar__edit-row {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 10px;
  width: 100%;
  min-width: 0;
}

.mysql-query-toolbar__schema {
  flex: 0 0 150px;
  width: 150px;
}

.mysql-query-toolbar__title {
  flex: 0 1 200px;
  width: 200px;
  min-width: 160px;
}

.mysql-query-toolbar__actions {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 6px;
}

.mysql-query-toolbar__status {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  justify-content: flex-end;
  gap: 8px;
  min-width: 0;
  margin-left: auto;
}

.mysql-query-toolbar__status span {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  max-width: 170px;
  min-height: 30px;
  padding: 0 10px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(30, 42, 51, 0.06);
  color: var(--text-subtle);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mysql-query-toolbar :deep(.el-button) {
  min-height: 36px;
  height: 36px;
  padding-inline: 10px;
  border-radius: 12px;
}

.mysql-query-toolbar :deep(.el-input__wrapper),
.mysql-query-toolbar :deep(.el-select__wrapper) {
  min-height: 38px;
}

.mysql-query-panel {
  flex: 1;
  gap: 10px;
}

.mysql-query-panel.is-focus {
  gap: 12px;
}

.mysql-query-editor {
  flex: 0 0 auto;
  min-height: 180px;
  height: var(--mysql-query-editor-height);
}

.mysql-query-resize {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 12px;
  width: 100%;
  min-height: 12px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  cursor: row-resize;
  touch-action: none;
}

.mysql-query-resize__grip {
  width: 72px;
  height: 4px;
  border-radius: 999px;
  background: rgba(30, 42, 51, 0.2);
  transition: width 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.mysql-query-resize:hover .mysql-query-resize__grip,
.mysql-query-resize:focus-visible .mysql-query-resize__grip,
.mysql-query-panel.is-resizing-editor .mysql-query-resize__grip {
  width: 96px;
  background: rgba(195, 95, 55, 0.62);
  box-shadow: 0 0 0 4px rgba(195, 95, 55, 0.12);
}

.mysql-query-resize:focus-visible {
  outline: 0;
}

.mysql-query-results {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
  max-height: calc(100% - 30px);
}

.mysql-query-results.is-focus {
  gap: 10px;
}

.mysql-query-toolbar.is-focus {
  gap: 10px;
}

.mysql-query-toolbar__focus-left,
.mysql-query-toolbar__focus-actions,
.mysql-query-toolbar__focus-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.mysql-query-toolbar__focus-title {
  font-size: 15px;
  letter-spacing: 0.05em;
}

.mysql-query-toolbar__focus-meta span {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(23, 36, 55, 0.06);
  color: var(--text-subtle);
  font-size: 12px;
}

.mysql-query-focus-preview {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(23, 36, 55, 0.08);
}

.mysql-query-focus-preview pre {
  margin: 0;
  white-space: pre-wrap;
  font-family: Consolas, "Cascadia Code", monospace;
  font-size: 12px;
  line-height: 1.55;
  color: var(--text-main);
}

.mysql-query-result {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-height: 0;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(30, 42, 51, 0.08);
  background: rgba(255, 252, 247, 0.82);
  overflow: hidden;
}

.mysql-query-result.is-error {
  border-color: rgba(188, 75, 61, 0.32);
  background: rgba(255, 247, 244, 0.9);
}

.mysql-query-result__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.mysql-query-result__header strong {
  display: block;
  font-size: 14px;
}

.mysql-query-result__header p {
  margin: 6px 0 0;
  color: var(--text-subtle);
  font-size: 12px;
}

.mysql-query-result__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mysql-query-result__meta span {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(23, 36, 55, 0.06);
  color: var(--text-subtle);
  font-size: 12px;
}

.mysql-query-result__meta span.is-error {
  background: rgba(188, 75, 61, 0.12);
  color: var(--danger);
}

.mysql-query-result__table {
  flex: 1;
  min-height: 0;
}

.mysql-query-error-detail {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-top: 6px;
}

.mysql-query-error-detail span {
  color: var(--danger);
  font-size: 12px;
}

.mysql-query-error-detail pre,
.mysql-query-failed-sql {
  width: 100%;
  margin: 6px 0 0;
  white-space: pre-wrap;
  font-family: Consolas, "Cascadia Code", monospace;
  font-size: 12px;
  line-height: 1.55;
}

.mysql-query-failed-sql {
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(23, 36, 55, 0.06);
  color: var(--text-main);
}

@media (max-width: 1180px) {
  .mysql-query-toolbar__edit-row {
    flex-wrap: wrap;
  }

  .mysql-query-toolbar__status {
    flex: 1 1 100%;
    flex-wrap: wrap;
    justify-content: flex-start;
    margin-left: 0;
  }
}
</style>
