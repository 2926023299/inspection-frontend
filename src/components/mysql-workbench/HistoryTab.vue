<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getMysqlQueryHistoryDetail, listMysqlQueryHistory } from '@/api/mysqlWorkbench'

const props = defineProps({
  reloadToken: {
    type: Number,
    default: 0,
  },
})

const listLoading = ref(false)
const detailLoading = ref(false)
const error = ref('')
const items = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const selectedBatchId = ref(null)
const detail = ref(null)

watch(
  () => props.reloadToken,
  async () => {
    await loadHistoryList()
  },
  { immediate: true },
)

async function loadHistoryList() {
  listLoading.value = true
  error.value = ''
  try {
    const result = await listMysqlQueryHistory({
      page: page.value,
      pageSize: pageSize.value,
    })
    items.value = result.items || []
    total.value = result.total || 0

    if (items.value.length && !selectedBatchId.value) {
      await selectBatch(items.value[0])
    }
  } catch (requestError) {
    error.value = requestError.message || '加载历史记录失败'
    items.value = []
    total.value = 0
  } finally {
    listLoading.value = false
  }
}

async function selectBatch(row) {
  if (!row?.id) {
    return
  }

  selectedBatchId.value = row.id
  detailLoading.value = true
  try {
    detail.value = await getMysqlQueryHistoryDetail(row.id)
  } catch (requestError) {
    ElMessage.error(requestError.message || '加载历史详情失败')
  } finally {
    detailLoading.value = false
  }
}

function handlePageChange(value) {
  page.value = value
  loadHistoryList()
}

function handleSizeChange(value) {
  pageSize.value = value
  page.value = 1
  loadHistoryList()
}
</script>

<template>
  <div class="tab-surface">
    <section v-if="error" class="mysql-history-alert">
      <el-alert type="error" show-icon :closable="false" :title="error" />
    </section>

    <section class="content-panel compact-main-panel mysql-history-panel">
      <div class="section-heading">
        <div>
          <h2 class="section-title">Execution History</h2>
          <p class="section-caption">查看 SQL 批次、危险标记、执行结果和逐语句明细。</p>
        </div>

        <div class="mysql-history-panel__actions">
          <el-button @click="loadHistoryList">刷新</el-button>
        </div>
      </div>

      <div class="mysql-history-grid">
        <div class="mysql-history-list">
          <el-table
            v-loading="listLoading"
            height="100%"
            :data="items"
            highlight-current-row
            @current-change="selectBatch"
            @row-click="selectBatch"
          >
            <el-table-column prop="id" label="批次" width="90" />
            <el-table-column prop="schemaName" label="Schema" min-width="120" />
            <el-table-column prop="executedBy" label="执行人" width="100" />
            <el-table-column prop="status" label="状态" width="110" />
            <el-table-column label="危险" width="90">
              <template #default="{ row }">{{ row.dangerous ? '是' : '否' }}</template>
            </el-table-column>
            <el-table-column prop="statementPreview" label="预览" min-width="240" show-overflow-tooltip />
          </el-table>

          <div class="mysql-history-pagination">
            <el-pagination
              :current-page="page"
              :page-size="pageSize"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next"
              :total="total"
              @current-change="handlePageChange"
              @size-change="handleSizeChange"
            />
          </div>
        </div>

        <div class="mysql-history-detail">
          <div v-if="!detail" class="mysql-history-empty">
            <el-empty description="选择左侧批次后查看执行详情" />
          </div>

          <template v-else>
            <div class="mysql-history-detail__meta">
              <span>批次 #{{ detail.id }}</span>
              <span>{{ detail.schemaName || '未指定 schema' }}</span>
              <span>{{ detail.executedBy }}</span>
              <span>{{ detail.status }}</span>
            </div>

            <div class="mysql-history-detail__cards">
              <article class="mysql-history-card">
                <h3>批次原文</h3>
                <pre>{{ detail.batchText || '--' }}</pre>
              </article>

              <article class="mysql-history-card">
                <h3>语句明细</h3>
                <div class="mysql-history-statements">
                  <div v-for="statement in detail.statements || []" :key="statement.id" class="mysql-history-statement">
                    <strong>#{{
                      statement.statementOrder
                    }} · {{ statement.statementType || 'UNKNOWN' }}</strong>
                    <p>{{ statement.statementText }}</p>
                    <div class="mysql-history-statement__meta">
                      <span>{{ statement.success ? '成功' : '失败' }}</span>
                      <span>{{ statement.affectedRows }} 行</span>
                      <span>{{ statement.durationMs }} ms</span>
                    </div>
                    <el-alert
                      v-if="statement.errorMessage"
                      type="error"
                      show-icon
                      :closable="false"
                      :title="statement.errorMessage"
                    />
                  </div>
                </div>
              </article>
            </div>
          </template>
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

.mysql-history-panel {
  flex: 1;
}

.mysql-history-panel__actions {
  display: flex;
  gap: 8px;
}

.mysql-history-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
  gap: 14px;
  flex: 1;
  min-height: 0;
}

.mysql-history-list,
.mysql-history-detail {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  padding: 14px;
  border-radius: 18px;
  border: 1px solid rgba(30, 42, 51, 0.08);
  background: rgba(255, 252, 247, 0.82);
}

.mysql-history-pagination {
  display: flex;
  justify-content: flex-end;
}

.mysql-history-detail__meta,
.mysql-history-statement__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mysql-history-detail__meta span,
.mysql-history-statement__meta span {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(23, 36, 55, 0.06);
  color: var(--text-subtle);
  font-size: 12px;
}

.mysql-history-detail__cards,
.mysql-history-statements {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mysql-history-card,
.mysql-history-statement {
  padding: 14px;
  border-radius: 16px;
  border: 1px solid rgba(30, 42, 51, 0.08);
  background: rgba(250, 246, 238, 0.88);
}

.mysql-history-card h3,
.mysql-history-statement strong {
  margin: 0;
  font-size: 14px;
}

.mysql-history-card pre,
.mysql-history-statement p {
  margin: 10px 0 0;
  white-space: pre-wrap;
  line-height: 1.6;
  font-family: Consolas, "Cascadia Code", monospace;
  font-size: 12px;
  color: var(--text-main);
}

@media (max-width: 1100px) {
  .mysql-history-grid {
    grid-template-columns: 1fr;
  }
}
</style>
