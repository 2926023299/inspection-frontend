<script setup>
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { formatMysqlCell } from '@/utils/mysqlWorkbench'

const props = defineProps({
  tab: {
    type: Object,
    required: true,
  },
  schemaOptions: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits([
  'change-sql',
  'change-schema',
  'change-title',
  'execute',
  'save',
  'open-history',
  'show-edit-mode',
  'toggle-sql-preview',
  'export-result',
])

const isEditMode = computed(() => props.tab.viewMode !== 'result-focus')
const isResultFocusMode = computed(() => props.tab.viewMode === 'result-focus')
const shouldShowSqlPreview = computed(() => isResultFocusMode.value && props.tab.sqlPreviewExpanded)
const sqlPreviewToggleText = computed(() => (shouldShowSqlPreview.value ? '收起 SQL' : '展开 SQL'))

const summaryText = computed(() => {
  if (!props.tab.results?.length) {
    return '当前还没有执行结果'
  }
  const failed = props.tab.results.filter((result) => !result.success).length
  if (failed) {
    return `${failed} 条语句失败，已停止后续执行`
  }
  return `最近一次返回 ${props.tab.results.length} 段结果`
})

const saveStatusText = computed(() => {
  if (props.tab.saveStatus === 'saving') return '保存中'
  if (props.tab.saveStatus === 'failed') return props.tab.saveError || '保存失败'
  if (props.tab.savedQueryId) return `已保存 #${props.tab.savedQueryId}`
  return '未保存'
})

function handleExportResult(result) {
  if (!result.columns?.length) {
    ElMessage.warning('该结果集没有可导出的数据')
    return
  }
  emit('export-result', { sql: result.sql, index: result.index, columns: result.columns })
}
</script>

<template>
  <div class="tab-surface">
    <section class="content-panel page-toolbar mysql-query-toolbar" :class="{ 'is-focus': isResultFocusMode }">
      <template v-if="isEditMode">
        <div class="page-toolbar__left">
          <el-input
            :model-value="tab.title"
            class="mysql-query-toolbar__title"
            placeholder="查询名称"
            @update:model-value="$emit('change-title', $event)"
          />
          <div class="page-toolbar__actions">
            <el-select
              :model-value="tab.schema"
              class="mysql-query-toolbar__schema"
              placeholder="执行 schema"
              clearable
              @update:model-value="$emit('change-schema', $event)"
            >
              <el-option v-for="option in schemaOptions" :key="option.value" :label="option.label" :value="option.value" />
            </el-select>
            <el-button type="primary" :loading="tab.executing" @click="$emit('execute')">执行 SQL</el-button>
            <el-button :loading="tab.saveStatus === 'saving'" @click="$emit('save')">保存</el-button>
            <el-button :disabled="!tab.batchId" @click="$emit('open-history')">查看历史</el-button>
          </div>
        </div>

        <div class="page-toolbar__meta">
          <span>{{ summaryText }}</span>
          <span>{{ saveStatusText }}</span>
          <span>{{ tab.dangerous ? '包含高风险语句' : '普通批次' }}</span>
          <span>{{ tab.batchId ? `批次 #${tab.batchId}` : '未执行' }}</span>
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
          <el-button type="primary" size="small" :loading="tab.executing" @click="$emit('execute')">再执行</el-button>
          <el-button size="small" @click="$emit('toggle-sql-preview')">{{ sqlPreviewToggleText }}</el-button>
          <el-button size="small" :disabled="!tab.batchId" @click="$emit('open-history')">查看历史</el-button>
        </div>
      </template>
    </section>

    <section class="content-panel compact-main-panel mysql-query-panel" :class="{ 'is-focus': isResultFocusMode }">
      <div v-if="isEditMode" class="mysql-query-editor">
        <el-input
          :model-value="tab.sql"
          type="textarea"
          :autosize="{ minRows: 16, maxRows: 22 }"
          placeholder="在这里输入 SQL，支持多语句批量执行。"
          @update:model-value="$emit('change-sql', $event)"
        />
      </div>

      <div v-else-if="shouldShowSqlPreview" class="mysql-query-focus-preview">
        <pre>{{ tab.sql }}</pre>
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
                {{ result.totalRowCount && result.totalRowCount > result.rows?.length ? result.rows?.length + ' / ' + result.totalRowCount : (result.rows?.length || 0) }} 行
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
            <el-table :data="result.rows || []" border>
              <el-table-column
                v-for="column in result.columns"
                :key="column"
                :prop="column"
                :label="column"
                min-width="140"
                show-overflow-tooltip
              >
                <template #default="{ row }">
                  {{ formatMysqlCell(row[column]) }}
                </template>
              </el-table-column>
            </el-table>
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

.mysql-query-toolbar__schema {
  width: 180px;
}

.mysql-query-toolbar__title {
  width: 220px;
}

.mysql-query-panel {
  flex: 1;
  gap: 14px;
}

.mysql-query-panel.is-focus {
  gap: 12px;
}

.mysql-query-editor :deep(.el-textarea__inner) {
  min-height: 320px !important;
  padding: 16px !important;
  border-radius: 18px !important;
  background: linear-gradient(180deg, #182535, #101a29) !important;
  color: #f1e8dd !important;
  font-family: Consolas, "Cascadia Code", monospace !important;
  font-size: 13px !important;
  line-height: 1.65 !important;
}

.mysql-query-results {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(30, 42, 51, 0.08);
  background: rgba(255, 252, 247, 0.82);
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
</style>
