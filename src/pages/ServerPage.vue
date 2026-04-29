<script setup>
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MetricCard from '@/components/MetricCard.vue'
import ServerDetailDrawer from '@/components/ServerDetailDrawer.vue'
import StatusTag from '@/components/StatusTag.vue'
import { useServerInspection } from '@/composables/useServerInspection'
import { buildUsageText, formatDateTime, formatPercent, statusOptions } from '@/utils/inspection'

const route = useRoute()
const router = useRouter()
const {
  filters,
  loading,
  actionLoading,
  error,
  rows,
  total,
  page,
  pageSize,
  overview,
  summary,
  loadOverview,
  detailVisible,
  detailLoading,
  selectedRecord,
  loadList,
  openDetail,
  handlePageChange,
  handleSizeChange,
  triggerInspection,
  exportReport,
} = useServerInspection()

const cpuPeakRecord = computed(() => {
  const records = rows.value.filter((item) => item.cpuUsage !== null && item.cpuUsage !== undefined)
  if (!records.length) return null
  return [...records].sort((left, right) => Number(right.cpuUsage || 0) - Number(left.cpuUsage || 0))[0]
})

const memoryPeakRecord = computed(() => {
  const records = rows.value.filter((item) => item.memoryUsageRate !== null && item.memoryUsageRate !== undefined)
  if (!records.length) return null
  return [...records].sort((left, right) => Number(right.memoryUsageRate || 0) - Number(left.memoryUsageRate || 0))[0]
})

const diskPeakRecord = computed(() => {
  const records = rows.value.filter((item) => item)
  if (!records.length) return null
  return [...records].sort((left, right) => {
    const leftMax = Math.max(Number(left.diskUsageRate || 0), Number(left.secondDiskUsageRate || 0), Number(left.thirdDiskUsageRate || 0))
    const rightMax = Math.max(Number(right.diskUsageRate || 0), Number(right.secondDiskUsageRate || 0), Number(right.thirdDiskUsageRate || 0))
    return rightMax - leftMax
  })[0]
})

const summaryCards = computed(() => [
  { label: '巡检总服务器', value: summary.value.total, tone: 'brand', query: {} },
  { label: '警告', value: summary.value.warning, tone: 'warning', query: { status: '1' } },
  { label: '异常', value: summary.value.error, tone: 'danger', query: { status: '2' } },
  {
    label: '最高 CPU',
    value: formatPercent(summary.value.maxCpu),
    tone: 'danger',
    caption: cpuPeakRecord.value?.ip || '未定位',
    query: cpuPeakRecord.value?.ip ? { ip: cpuPeakRecord.value.ip, metric: 'cpu' } : null,
  },
  {
    label: '最高内存',
    value: formatPercent(summary.value.maxMemory),
    tone: 'warning',
    caption: memoryPeakRecord.value?.ip || '未定位',
    query: memoryPeakRecord.value?.ip ? { ip: memoryPeakRecord.value.ip, metric: 'memory' } : null,
  },
  {
    label: '最高磁盘',
    value: formatPercent(summary.value.maxDisk),
    tone: 'brand',
    caption: diskPeakRecord.value?.ip || '未定位',
    query: diskPeakRecord.value?.ip ? { ip: diskPeakRecord.value.ip, metric: 'disk' } : null,
  },
])

const focusRecord = computed(() => rows.value.find((item) => item.status === 2) || rows.value.find((item) => item.status === 1) || rows.value[0])
const focusMetricLabel = computed(() => {
  if (route.query.metric === 'cpu') return '最高 CPU 联动'
  if (route.query.metric === 'memory') return '最高内存联动'
  if (route.query.metric === 'disk') return '最高磁盘联动'
  return '筛选联动'
})

function isCardActive(cardQuery = {}) {
  if (!cardQuery) {
    return false
  }

  const routeStatus = normalizeQueryValue(route.query.status)
  const routeIp = normalizeQueryValue(route.query.ip)
  const routeMetric = normalizeQueryValue(route.query.metric)
  const routeDate = normalizeQueryValue(route.query.date)

  const cardStatus = normalizeQueryValue(cardQuery.status)
  const cardIp = normalizeQueryValue(cardQuery.ip)
  const cardMetric = normalizeQueryValue(cardQuery.metric)
  const cardDate = normalizeQueryValue(cardQuery.date)

  if (!cardStatus && !cardIp && !cardMetric && !cardDate) {
    return !routeStatus && !routeIp && !routeMetric && !routeDate
  }

  return routeStatus === cardStatus && routeIp === cardIp && routeMetric === cardMetric && routeDate === cardDate
}

function normalizeQueryValue(value) {
  if (value === undefined || value === null || value === '') return ''
  return String(value)
}

function getRowClassName({ row }) {
  if (!row) return ''
  if (row.status === 2) return 'table-row-danger'
  if (row.status === 1) return 'table-row-warning'
  return ''
}

function parseStatus(value) {
  if (value === undefined || value === null || value === '') return null
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

function syncFiltersFromRoute() {
  filters.ip = typeof route.query.ip === 'string' ? route.query.ip : ''
  filters.date = typeof route.query.date === 'string' ? route.query.date : ''
  filters.status = parseStatus(route.query.status)
  loadList()
}

function applyRouteFilters() {
  const query = {}

  if (filters.ip) query.ip = filters.ip
  if (filters.date) query.date = filters.date
  if (filters.status !== null && filters.status !== undefined) query.status = String(filters.status)

  const queryUnchanged =
    normalizeQueryValue(route.query.ip) === normalizeQueryValue(query.ip) &&
    normalizeQueryValue(route.query.date) === normalizeQueryValue(query.date) &&
    normalizeQueryValue(route.query.status) === normalizeQueryValue(query.status)

  if (queryUnchanged) {
    loadList()
    return
  }

  router.push({ path: '/server', query })
}

function applyCardQuery(cardQuery = {}) {
  if (isCardActive(cardQuery)) {
    clearRouteFilters()
    return
  }

  const query = {}

  if (cardQuery.ip) query.ip = cardQuery.ip
  if (cardQuery.date) query.date = cardQuery.date
  if (cardQuery.status) query.status = cardQuery.status
  if (cardQuery.metric) query.metric = cardQuery.metric

  const queryUnchanged =
    normalizeQueryValue(route.query.ip) === normalizeQueryValue(query.ip) &&
    normalizeQueryValue(route.query.date) === normalizeQueryValue(query.date) &&
    normalizeQueryValue(route.query.status) === normalizeQueryValue(query.status) &&
    normalizeQueryValue(route.query.metric) === normalizeQueryValue(query.metric)

  if (queryUnchanged) {
    loadList()
    return
  }

  router.push({ path: '/server', query })
}

function clearRouteFilters() {
  if (!route.query.ip && !route.query.date && !route.query.status && !route.query.metric) {
    filters.ip = ''
    filters.date = ''
    filters.status = null
    loadList()
    return
  }

  router.push({ path: '/server', query: {} })
}

watch(
  () => route.fullPath,
  () => {
    if (route.name === 'ServerPage') {
      syncFiltersFromRoute()
    }
  },
  { immediate: true },
)

watch(
  () => route.name,
  (name) => {
    if (name === 'ServerPage' && !overview.value) {
      loadOverview()
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="page-shell compact-page">
    <section class="content-panel server-toolbar">
      <div class="server-toolbar__controls">
        <el-input v-model="filters.ip" class="filter-input filter-input--compact" placeholder="按 IP 检索" clearable />
        <el-date-picker
          v-model="filters.date"
          class="filter-input filter-input--compact"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="巡检日期"
          clearable
        />
        <el-select v-model="filters.status" class="filter-input filter-input--compact" placeholder="巡检状态" clearable>
          <el-option v-for="option in statusOptions" :key="String(option.value)" :label="option.label" :value="option.value" />
        </el-select>
        <el-button type="primary" @click="applyRouteFilters">查询</el-button>
        <el-button @click="clearRouteFilters">重置</el-button>
        <el-button type="primary" :loading="actionLoading" @click="triggerInspection">立即巡检</el-button>
        <el-button :loading="actionLoading" @click="exportReport">导出结果</el-button>
      </div>

      <div class="server-toolbar__meta">
        <span>当前命中：{{ total }} 台</span>
        <span>重点设备：{{ focusRecord?.ip || '--' }}</span>
        <span>{{ focusMetricLabel }}：{{ focusRecord?.description || '--' }}</span>
      </div>
    </section>

    <section class="stats-grid">
      <MetricCard
        v-for="card in summaryCards"
        :key="card.label"
        :label="card.label"
        :value="card.value"
        :caption="card.caption"
        :tone="card.tone"
        :interactive="Boolean(card.query)"
        :active="isCardActive(card.query)"
        @click="card.query && applyCardQuery(card.query)"
      />
    </section>

    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" />

    <section class="content-panel compact-main-panel table-panel">
      <div class="section-heading">
        <div>
          <h2 class="section-title">巡检列表</h2>
          <p class="section-caption">共 {{ total }} 台服务器命中当前筛选条件</p>
        </div>
      </div>

      <div class="compact-table-shell">
        <el-table v-loading="loading" height="100%" :data="rows" stripe :row-class-name="getRowClassName">
          <el-table-column prop="ip" label="IP" min-width="150" />
          <el-table-column label="巡检时间" min-width="180">
            <template #default="{ row }">{{ formatDateTime(row.updateTime) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <StatusTag :status="row.status" />
            </template>
          </el-table-column>
          <el-table-column label="CPU" width="110">
            <template #default="{ row }">{{ formatPercent(row.cpuUsage) }}</template>
          </el-table-column>
          <el-table-column label="内存" min-width="150">
            <template #default="{ row }">{{ buildUsageText(row.memoryUsage, row.memoryTotal) }}</template>
          </el-table-column>
          <el-table-column label="磁盘最高占用" width="130">
            <template #default="{ row }">
              {{ formatPercent(Math.max(Number(row.diskUsageRate || 0), Number(row.secondDiskUsageRate || 0), Number(row.thirdDiskUsageRate || 0))) }}
            </template>
          </el-table-column>
          <el-table-column prop="javaProcessCount" label="Java进程数" width="120" />
          <el-table-column prop="description" label="巡检描述" min-width="240" show-overflow-tooltip />
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDetail(row)">详情</el-button>
              <el-button link @click="router.push(`/history/${row.ip}`)">历史</el-button>
            </template>
          </el-table-column>
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
    </section>

    <ServerDetailDrawer
      v-model="detailVisible"
      :loading="detailLoading"
      :record="selectedRecord"
    />
  </div>
</template>

<style scoped>
.server-toolbar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
}

.server-toolbar__controls {
  display: grid;
  grid-template-columns: 180px 180px 150px repeat(4, auto);
  gap: 10px;
  align-items: center;
}

.server-toolbar__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.server-toolbar__meta span {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(30, 42, 51, 0.06);
  color: var(--text-subtle);
  font-size: 12px;
}

.filter-input {
  width: 100%;
}

.table-panel {
  flex: 1;
}

:deep(.table-row-warning td:first-child) {
  box-shadow: inset 4px 0 0 var(--warning);
}

:deep(.table-row-danger td:first-child) {
  box-shadow: inset 4px 0 0 var(--danger);
}

@media (max-width: 1100px) {
  .server-toolbar__controls {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .server-toolbar__controls {
    grid-template-columns: 1fr;
  }
}
</style>
