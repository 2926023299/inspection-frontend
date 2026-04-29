<script setup>
import { computed } from 'vue'
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

const emit = defineEmits(['change-sql', 'change-schema', 'execute', 'open-history'])

const summaryText = computed(() => {
  if (!props.tab.results?.length) {
    return '当前还没有执行结果'
  }
  return `最近一次返回 ${props.tab.results.length} 段结果`
})
</script>

<template>
  <div class="tab-surface">
    <section class="content-panel page-toolbar mysql-query-toolbar">
      <div class="page-toolbar__left">
        <span class="page-toolbar__title">{{ tab.title }}</span>
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
          <el-button :disabled="!tab.batchId" @click="$emit('open-history')">查看历史</el-button>
        </div>
      </div>

      <div class="page-toolbar__meta">
        <span>{{ summaryText }}</span>
        <span>{{ tab.dangerous ? '包含高风险语句' : '普通批次' }}</span>
        <span>{{ tab.batchId ? `批次 #${tab.batchId}` : '未执行' }}</span>
      </div>
    </section>

    <section class="content-panel compact-main-panel mysql-query-panel">
      <div class="mysql-query-editor">
        <el-input
          :model-value="tab.sql"
          type="textarea"
          :autosize="{ minRows: 16, maxRows: 22 }"
          placeholder="在这里输入 SQL，支持多语句批量执行。"
          @update:model-value="$emit('change-sql', $event)"
        />
      </div>

      <div class="mysql-query-results compact-scroll-body">
        <div v-if="!tab.results?.length" class="mysql-query-empty">
          <el-empty description="执行后会在这里展示每条语句的结果、影响行数或报错信息。" />
        </div>

        <div v-for="result in tab.results || []" :key="`${tab.key}-${result.index}`" class="mysql-query-result">
          <div class="mysql-query-result__header">
            <div>
              <strong>语句 {{ result.index }} · {{ result.type || 'UNKNOWN' }}</strong>
              <p>{{ result.message || '已完成执行' }}</p>
            </div>
            <div class="mysql-query-result__meta">
              <span>{{ result.success ? '成功' : '失败' }}</span>
              <span>{{ result.durationMs || 0 }} ms</span>
            </div>
          </div>

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

.mysql-query-panel {
  flex: 1;
  gap: 14px;
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

.mysql-query-result {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border-radius: 18px;
  border: 1px solid rgba(30, 42, 51, 0.08);
  background: rgba(255, 252, 247, 0.82);
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
</style>
