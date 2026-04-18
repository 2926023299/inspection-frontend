<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import JavaDetailDialog from '@/components/JavaDetailDialog.vue'
import MetricCard from '@/components/MetricCard.vue'
import StatusTag from '@/components/StatusTag.vue'
import { useJavaInspection } from '@/composables/useJavaInspection'
import { formatDateTime, statusOptions } from '@/utils/inspection'

const router = useRouter()
const {
  filters,
  actionLoading,
  error,
  rows,
  total,
  page,
  pageSize,
  loadOverview,
  summary,
  detailVisible,
  detailLoading,
  selectedDetail,
  loadList,
  applyFilters,
  resetFilters,
  openDetail,
  exportReport,
  handlePageChange,
  handleSizeChange,
} = useJavaInspection()

const stabilityOptions = [
  { label: '全部程序', value: '' },
  { label: '稳定程序', value: 'stable' },
  { label: '变更程序', value: 'changed' },
]

const summaryCards = computed(() => [
  { label: '服务器数', value: summary.value.serverCount, tone: 'brand' },
  { label: 'Java进程总数', value: summary.value.processCount, tone: 'success' },
  { label: '发生变化', value: summary.value.changedCount, tone: 'warning' },
])

const hottestServer = computed(() => rows.value.find((row) => row.hasDiff) || rows.value[0])

onMounted(() => {
  loadOverview()
  loadList()
})
</script>

<template>
  <div class="page-shell">
    <section class="page-hero">
      <h1 class="hero-title">Java 进程巡检</h1>
      <p class="hero-subtitle">按服务器聚合当前 Java 进程，并自动对比上一条历史记录，快速识别进程增减。</p>
      <div class="hero-actions">
        <el-button type="primary" :loading="actionLoading" @click="exportReport">导出 Java 巡检</el-button>
        <el-button @click="router.push('/server')">返回服务器视图</el-button>
      </div>
      <div class="meta-inline">
        <span>当前服务器：{{ summary.serverCount }}</span>
        <span>总进程数：{{ summary.processCount }}</span>
        <span>重点关注：{{ hottestServer?.ip || '--' }}</span>
      </div>
    </section>

    <section class="content-panel filter-panel">
      <el-input v-model="filters.ip" class="filter-input filter-input--compact" placeholder="按 IP 检索" clearable />
      <el-input v-model="filters.programName" class="filter-input filter-input--program" placeholder="按程序名检索" clearable />
      <el-select v-model="filters.status" class="filter-input filter-input--compact" placeholder="巡检状态" clearable>
        <el-option v-for="option in statusOptions" :key="String(option.value)" :label="option.label" :value="option.value" />
      </el-select>
      <el-select v-model="filters.stability" class="filter-input filter-input--compact" placeholder="程序稳定性" clearable>
        <el-option v-for="option in stabilityOptions" :key="option.label" :label="option.label" :value="option.value" />
      </el-select>
      <el-button type="primary" @click="applyFilters">查询</el-button>
      <el-button @click="resetFilters">重置</el-button>
    </section>

    <section class="stats-grid">
      <MetricCard
        v-for="card in summaryCards"
        :key="card.label"
        :label="card.label"
        :value="card.value"
        :tone="card.tone"
      />
    </section>

    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" />

    <section class="app-card-grid">
      <article v-for="row in rows" :key="row.ip" class="glass-panel java-card" :data-state="row.status">
        <div class="java-card-head">
          <div>
            <p class="java-card-time">{{ formatDateTime(row.updateTime) }}</p>
            <h3>{{ row.ip }}</h3>
          </div>
          <StatusTag :status="row.status" />
        </div>

        <p class="java-card-desc">{{ row.description || '暂无巡检描述' }}</p>

        <div class="java-card-metrics">
          <span>进程数 {{ row.javaProcessCount }}</span>
          <span :class="row.hasDiff ? 'status-text-warning' : 'status-text-success'">
            {{ row.hasDiff ? '存在差异' : '无变化' }}
          </span>
        </div>

        <div class="process-chip-list">
          <el-tag
            v-for="process in row.javaProcesses"
            :key="process"
            :type="row.matchedProcesses?.includes(process) ? 'danger' : 'info'"
            round
            effect="plain"
          >
            {{ process }}
          </el-tag>
          <span v-if="!row.javaProcesses.length" class="empty-process">暂无 Java 进程数据</span>
        </div>

        <div v-if="row.hasDiff" class="diff-strip">
          <span>新增 {{ row.addedProcesses.length }}</span>
          <span>移除 {{ row.removedProcesses.length }}</span>
        </div>

        <div class="java-card-actions">
          <el-button type="primary" link @click="openDetail(row.ip)">查看差异</el-button>
          <el-button link @click="router.push(`/history/${row.ip}`)">历史记录</el-button>
        </div>
      </article>
    </section>

    <section class="content-panel pagination-panel">
      <el-pagination
        :current-page="page"
        :page-size="pageSize"
        :page-sizes="[8, 12, 16]"
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </section>

    <JavaDetailDialog
      v-model="detailVisible"
      :loading="detailLoading"
      :detail="selectedDetail"
    />
  </div>
</template>

<style scoped>
.filter-panel {
  display: grid;
  grid-template-columns: 200px minmax(220px, 280px) 160px 160px auto auto;
  gap: 12px;
  align-items: center;
  padding: 18px;
}

.pagination-panel {
  display: flex;
  justify-content: flex-end;
  padding: 18px;
}

.filter-input {
  width: 100%;
}

.java-card {
  padding: 20px;
}

.java-card[data-state="1"] {
  box-shadow: 0 18px 38px rgba(185, 134, 44, 0.14);
}

.java-card[data-state="2"] {
  box-shadow: 0 18px 38px rgba(188, 75, 61, 0.16);
}

.java-card-head,
.java-card-actions,
.diff-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.java-card-time,
.java-card-desc,
.empty-process {
  color: var(--text-subtle);
}

.java-card h3 {
  margin: 8px 0 0;
  font-size: 24px;
}

.java-card-desc {
  min-height: 42px;
  line-height: 1.7;
}

.java-card-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 14px;
  font-size: 13px;
}

.process-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 70px;
  padding: 14px 0;
}

.diff-strip {
  margin-bottom: 12px;
  color: var(--text-subtle);
  font-size: 13px;
}

:deep(.process-chip-list .el-tag) {
  border-radius: 999px;
  padding-inline: 10px;
}

@media (max-width: 1200px) {
  .filter-panel {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .filter-panel {
    grid-template-columns: 1fr;
  }
}
</style>
