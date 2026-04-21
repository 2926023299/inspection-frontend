<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MetricCard from '@/components/MetricCard.vue'
import StatusTag from '@/components/StatusTag.vue'
import { useServerHistory } from '@/composables/useServerHistory'
import { buildUsageText, formatDateTime, formatPercent } from '@/utils/inspection'

const route = useRoute()
const router = useRouter()
const ip = ref(route.params.ip)
const {
  loading,
  error,
  rows,
  total,
  page,
  pageSize,
  handlePageChange,
  handleSizeChange,
} = useServerHistory(ip)

watch(
  () => route.params.ip,
  (value) => {
    ip.value = value
  },
)

const latestRecord = computed(() => rows.value[0] || null)

const summaryCards = computed(() => [
  { label: '历史记录数', value: total.value, tone: 'brand' },
  { label: '最近 CPU', value: formatPercent(latestRecord.value?.cpuUsage), tone: 'danger' },
  { label: '最近内存', value: formatPercent(latestRecord.value?.memoryUsageRate), tone: 'warning' },
  {
    label: '最近磁盘',
    value: formatPercent(
      Math.max(
        Number(latestRecord.value?.diskUsageRate || 0),
        Number(latestRecord.value?.secondDiskUsageRate || 0),
        Number(latestRecord.value?.thirdDiskUsageRate || 0),
      ),
    ),
    tone: 'brand',
  },
])

const timelineItems = computed(() => rows.value.slice(0, 5))

function getRowClassName({ row }) {
  if (!row) return ''
  if (row.status === 2) return 'table-row-danger'
  if (row.status === 1) return 'table-row-warning'
  return ''
}
</script>

<template>
  <div class="page-shell compact-page">
    <section class="content-panel page-toolbar">
      <div class="page-toolbar__left">
        <span class="page-toolbar__title">历史动作</span>
        <div class="page-toolbar__actions">
        <el-button @click="router.push('/server')">返回服务器列表</el-button>
        </div>
      </div>
      <div class="page-toolbar__meta">
        <span>服务器：{{ ip }}</span>
        <span>历史条数：{{ total }}</span>
        <span>最近时间：{{ latestRecord?.updateTime ? formatDateTime(latestRecord.updateTime) : '--' }}</span>
      </div>
    </section>

    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" />

    <section class="stats-grid">
      <MetricCard
        v-for="card in summaryCards"
        :key="card.label"
        :label="card.label"
        :value="card.value"
        :tone="card.tone"
      />
    </section>

    <section class="content-panel compact-main-panel">
      <div class="history-layout">
        <div class="timeline-panel">
          <div class="section-heading">
            <div>
              <h2 class="section-title">最近动态</h2>
              <p class="section-caption">截取最近 5 次巡检结果</p>
            </div>
          </div>

          <div class="timeline-scroll compact-scroll-body">
            <el-timeline>
              <el-timeline-item
                v-for="item in timelineItems"
                :key="`${item.ip}-${item.updateTime}`"
                :timestamp="formatDateTime(item.updateTime)"
                placement="top"
              >
                <div class="timeline-card">
                  <StatusTag :status="item.status" />
                  <p>{{ item.description || '暂无描述' }}</p>
                </div>
              </el-timeline-item>
            </el-timeline>
          </div>
        </div>

        <div class="history-table-panel">
          <div class="section-heading">
            <div>
              <h2 class="section-title">历史明细</h2>
              <p class="section-caption">共 {{ total }} 条记录</p>
            </div>
          </div>

          <div class="compact-table-shell">
            <el-table v-loading="loading" height="100%" :data="rows" stripe :row-class-name="getRowClassName">
              <el-table-column label="巡检时间" min-width="180">
                <template #default="{ row }">{{ formatDateTime(row.updateTime) }}</template>
              </el-table-column>
              <el-table-column label="状态" width="110">
                <template #default="{ row }">
                  <StatusTag :status="row.status" />
                </template>
              </el-table-column>
              <el-table-column label="CPU" width="100">
                <template #default="{ row }">{{ formatPercent(row.cpuUsage) }}</template>
              </el-table-column>
              <el-table-column label="内存" min-width="160">
                <template #default="{ row }">{{ buildUsageText(row.memoryUsage, row.memoryTotal) }}</template>
              </el-table-column>
              <el-table-column label="磁盘一" min-width="160">
                <template #default="{ row }">{{ buildUsageText(row.diskUsage, row.diskTotal) }}</template>
              </el-table-column>
              <el-table-column prop="javaProcessCount" label="Java进程数" width="120" />
              <el-table-column prop="description" label="描述" min-width="220" show-overflow-tooltip />
            </el-table>
          </div>

          <div class="compact-footer">
            <el-pagination
              :current-page="page"
              :page-size="pageSize"
              :page-sizes="[10, 20, 30]"
              layout="total, sizes, prev, pager, next, jumper"
              :total="total"
              @current-change="handlePageChange"
              @size-change="handleSizeChange"
            />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.history-layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 14px;
  flex: 1;
  min-height: 0;
}

.timeline-panel,
.history-table-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.timeline-scroll {
  padding-right: 4px;
}

.timeline-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 18px;
  background: rgba(245, 249, 252, 0.92);
}

.timeline-card p {
  margin: 0;
  color: var(--text-subtle);
}

:deep(.table-row-warning td:first-child) {
  box-shadow: inset 4px 0 0 var(--warning);
}

:deep(.table-row-danger td:first-child) {
  box-shadow: inset 4px 0 0 var(--danger);
}

@media (max-width: 980px) {
  .history-layout {
    grid-template-columns: 1fr;
  }
}
</style>
