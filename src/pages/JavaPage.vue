<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import JavaDetailDialog from '@/components/JavaDetailDialog.vue'
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

const hottestServer = computed(() => rows.value.find((row) => row.hasDiff) || rows.value[0])

onMounted(() => {
  loadOverview()
  loadList()
})
</script>

<template>
  <div class="page-shell compact-page">
    <section class="content-panel page-toolbar">
      <div class="page-toolbar__left">
        <span class="page-toolbar__title">Java 巡检动作</span>
        <div class="page-toolbar__actions">
        <el-button type="primary" :loading="actionLoading" @click="exportReport">导出 Java 巡检</el-button>
        <el-button @click="router.push('/server')">返回服务器视图</el-button>
        </div>
      </div>
      <div class="page-toolbar__meta">
        <span>当前服务器：{{ summary.serverCount }}</span>
        <span>总进程数：{{ summary.processCount }}</span>
        <span>发生变化：{{ summary.changedCount }}</span>
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

    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" />

    <section class="content-panel compact-main-panel java-results-panel">
      <div class="section-heading">
        <div>
          <h2 class="section-title">服务器进程清单</h2>
          <p class="section-caption">按服务器查看当前 Java 进程、命中程序和变更情况</p>
        </div>
      </div>

      <div class="compact-table-shell">
        <el-table v-loading="loading" height="100%" :data="rows" stripe>
          <el-table-column prop="ip" label="服务器" min-width="150" />
          <el-table-column label="巡检时间" min-width="170">
            <template #default="{ row }">{{ formatDateTime(row.updateTime) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <StatusTag :status="row.status" />
            </template>
          </el-table-column>
          <el-table-column label="程序概览" min-width="430">
            <template #default="{ row }">
              <div class="java-process-cell">
                <div class="java-process-chip-list">
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
                <div class="java-process-meta">
                  <span>进程数 {{ row.javaProcessCount }}</span>
                  <span :class="row.hasDiff ? 'status-text-warning' : 'status-text-success'">
                    {{ row.hasDiff ? `新增 ${row.addedProcesses.length} / 移除 ${row.removedProcesses.length}` : '无变化' }}
                  </span>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="巡检描述" min-width="220" show-overflow-tooltip />
          <el-table-column label="操作" width="160" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click="openDetail(row.ip)">查看差异</el-button>
              <el-button link @click="router.push(`/history/${row.ip}`)">历史记录</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="compact-footer">
        <el-pagination
          :current-page="page"
          :page-size="pageSize"
          :page-sizes="[8, 12, 16]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
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
  grid-template-columns: 170px minmax(200px, 240px) 140px 140px auto auto;
  gap: 10px;
  align-items: center;
  padding: 14px 16px;
}

.java-results-panel {
  flex: 1;
}

.filter-input {
  width: 100%;
}

.java-process-cell,
.java-process-chip-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty-process {
  color: var(--text-subtle);
}

.java-process-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 12px;
}

.java-process-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  align-items: center;
}

:deep(.java-process-chip-list .el-tag) {
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
