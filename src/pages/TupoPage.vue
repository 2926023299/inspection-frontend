<script setup>
import { computed, onMounted } from 'vue'
import MetricCard from '@/components/MetricCard.vue'
import { useTopologySummary } from '@/composables/useTopologySummary'

const { summary, loading, actionLoading, error, loadSummary, exportReport } = useTopologySummary()

const topCities = computed(() => {
  const cities = summary.value?.cities || []
  return [...cities].sort((left, right) => (right.zyCount + right.dyCount) - (left.zyCount + left.dyCount)).slice(0, 5)
})

onMounted(loadSummary)

function getCityTotal(city) {
  return (city?.zyCount || 0) + (city?.dyCount || 0)
}
</script>

<template>
  <div v-loading="loading" class="page-shell">
    <section class="page-hero">
      <h1 class="hero-title">图模巡检</h1>
      <p class="hero-subtitle">围绕前一天中压、低压文件数量做快速汇总，保留城市粒度对比和导出能力。</p>
      <div class="hero-actions">
        <el-button type="primary" :loading="actionLoading" @click="exportReport">导出图模统计</el-button>
        <el-button @click="loadSummary">刷新统计</el-button>
      </div>
      <div class="meta-inline">
        <span>统计日期：{{ summary?.date || '--' }}</span>
        <span>重点城市：{{ topCities[0]?.cityName || '--' }}</span>
        <span>总样本：{{ (summary?.zyTotal || 0) + (summary?.dyTotal || 0) }}</span>
      </div>
    </section>

    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" />

    <section class="stats-grid">
      <MetricCard label="中压总量" :value="summary?.zyTotal ?? 0" tone="brand" />
      <MetricCard label="低压总量" :value="summary?.dyTotal ?? 0" tone="warning" />
      <MetricCard label="城市数" :value="summary?.cities?.length ?? 0" tone="success" />
    </section>

    <section class="content-panel topology-layout">
      <div>
        <div class="section-heading">
          <div>
            <h2 class="section-title">城市排行</h2>
            <p class="section-caption">按中压 + 低压合计排序</p>
          </div>
        </div>

        <div class="city-rank-stack">
          <article v-for="city in topCities" :key="city.cityCode" class="rank-card">
            <div>
              <strong>{{ city.cityName }}</strong>
              <p>{{ city.cityCode }}</p>
            </div>
            <div class="rank-values">
              <span>中压 {{ city.zyCount }}</span>
              <span>低压 {{ city.dyCount }}</span>
            </div>
            <div class="rank-bar">
              <span :style="{ width: `${Math.max(getCityTotal(city) * 12, 10)}px` }" />
            </div>
          </article>
        </div>
      </div>

      <div>
        <div class="section-heading">
          <div>
            <h2 class="section-title">明细列表</h2>
            <p class="section-caption">逐城市查看中压 / 低压统计</p>
          </div>
        </div>

        <el-table :data="summary?.cities || []" stripe>
          <el-table-column prop="cityName" label="城市" min-width="120" />
          <el-table-column prop="cityCode" label="城市编码" min-width="140" />
          <el-table-column prop="zyCount" label="中压" width="110" />
          <el-table-column prop="dyCount" label="低压" width="110" />
          <el-table-column label="总量" width="120">
            <template #default="{ row }">{{ row.zyCount + row.dyCount }}</template>
          </el-table-column>
        </el-table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.topology-layout {
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: 18px;
  padding: 20px;
}

.city-rank-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rank-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px 16px;
  padding: 16px;
  border-radius: 18px;
  background: rgba(245, 249, 252, 0.9);
}

.rank-card p {
  margin: 6px 0 0;
  color: var(--text-subtle);
  font-size: 12px;
}

.rank-values {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--text-subtle);
  font-size: 13px;
  align-items: flex-end;
}

.rank-bar {
  grid-column: 1 / -1;
  height: 8px;
  border-radius: 999px;
  background: rgba(30, 42, 51, 0.08);
  overflow: hidden;
}

.rank-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--brand), var(--warning));
}

@media (max-width: 980px) {
  .topology-layout {
    grid-template-columns: 1fr;
  }
}
</style>
