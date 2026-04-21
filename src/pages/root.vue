<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import MetricCard from '@/components/MetricCard.vue'
import { useDashboard } from '@/composables/useDashboard'
import { formatPercent } from '@/utils/inspection'

const router = useRouter()
const {
  dashboard,
  loading,
  actionLoading,
  error,
  statCards,
  loadDashboard,
  triggerInspection,
  exportReport,
} = useDashboard()

const peakCards = computed(() => {
  const data = dashboard.value || {}
  return [
    {
      label: '最高 CPU',
      value: formatPercent(data.cpuPeak?.value),
      caption: data.cpuPeak?.ip || '暂无数据',
      tone: 'danger',
      query: data.cpuPeak?.ip ? { ip: data.cpuPeak.ip, metric: 'cpu' } : null,
    },
    {
      label: '最高内存',
      value: formatPercent(data.memoryPeak?.value),
      caption: data.memoryPeak?.ip || '暂无数据',
      tone: 'warning',
      query: data.memoryPeak?.ip ? { ip: data.memoryPeak.ip, metric: 'memory' } : null,
    },
    {
      label: '最高磁盘',
      value: formatPercent(data.diskPeak?.value),
      caption: data.diskPeak?.ip || '暂无数据',
      tone: 'brand',
      query: data.diskPeak?.ip ? { ip: data.diskPeak.ip, metric: 'disk' } : null,
    },
  ]
})

onMounted(loadDashboard)

function openServerList(query = {}) {
  router.push({ path: '/server', query })
}

function getStatCardQuery(label) {
  if (label === '正常') return { status: '0' }
  if (label === '警告') return { status: '1' }
  if (label === '异常') return { status: '2' }
  return {}
}
</script>

<template>
  <div v-loading="loading" class="page-shell compact-page">
    <section class="content-panel page-toolbar">
      <div class="page-toolbar__left">
        <span class="page-toolbar__title">值班动作</span>
        <div class="page-toolbar__actions">
        <el-button type="primary" :loading="actionLoading" @click="triggerInspection">立即巡检</el-button>
        <el-button :loading="actionLoading" @click="exportReport">导出服务器结果</el-button>
        <el-button @click="router.push('/server')">进入服务器巡检</el-button>
        <el-button @click="router.push('/java')">进入 Java 巡检</el-button>
        </div>
      </div>
      <div class="page-toolbar__meta">
        <span>最近巡检：{{ dashboard?.lastInspectionTime || '--' }}</span>
        <span>重点设备：{{ dashboard?.cpuPeak?.ip || '--' }}</span>
        <span>Java 变化服务器：{{ dashboard?.javaChangedServerCount ?? 0 }}</span>
        <span>图模日期：{{ dashboard?.topology?.date || '--' }}</span>
      </div>
    </section>

    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" />

    <section class="stats-grid">
      <MetricCard
        v-for="card in statCards"
        :key="card.label"
        :label="card.label"
        :value="card.value"
        :tone="card.tone"
        interactive
        @click="openServerList(getStatCardQuery(card.label))"
      />
    </section>

    <section class="dashboard-panel-grid">
      <section class="content-panel compact-main-panel dashboard-focus-panel">
        <div class="section-heading">
          <div>
            <h2 class="section-title">资源峰值定位</h2>
            <p class="section-caption">直接定位 CPU、内存、磁盘最高占用服务器</p>
          </div>
        </div>

        <div class="focus-list compact-scroll-body">
          <button
            v-for="card in peakCards"
            :key="card.label"
            type="button"
            class="focus-row"
            :data-tone="card.tone"
            @click="card.query && openServerList(card.query)"
          >
            <div class="focus-row__main">
              <span class="focus-row__label">{{ card.label }}</span>
              <strong class="focus-row__value">{{ card.value }}</strong>
            </div>
            <div class="focus-row__meta">
              <strong>{{ card.caption }}</strong>
              <span>点击定位到服务器巡检</span>
            </div>
          </button>
        </div>
      </section>

      <section class="content-panel compact-main-panel dashboard-topology-panel">
        <div class="section-heading">
          <div>
            <h2 class="section-title">图模摘要</h2>
            <p class="section-caption">前一天中压 / 低压统计和重点城市</p>
          </div>
          <el-button text @click="router.push('/topology')">查看明细</el-button>
        </div>

        <div class="topology-body compact-scroll-body">
          <div class="topology-quicklook">
            <article>
              <span>中压总量</span>
              <strong>{{ dashboard?.topology?.zyTotal ?? 0 }}</strong>
            </article>
            <article>
              <span>低压总量</span>
              <strong>{{ dashboard?.topology?.dyTotal ?? 0 }}</strong>
            </article>
          </div>

          <div class="city-preview">
            <div v-for="city in dashboard?.topology?.cities?.slice(0, 6) || []" :key="city.cityCode" class="city-preview-row">
              <strong>{{ city.cityName }}</strong>
              <span>中压 {{ city.zyCount }}</span>
              <span>低压 {{ city.dyCount }}</span>
            </div>
          </div>
        </div>
      </section>
    </section>
  </div>
</template>

<style scoped>
.dashboard-panel-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
  gap: 14px;
  flex: 1;
  min-height: 0;
}

.dashboard-focus-panel,
.dashboard-topology-panel {
  min-height: 0;
}

.focus-list,
.topology-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.focus-row {
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr);
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(30, 42, 51, 0.08);
  background: rgba(255, 252, 247, 0.92);
  text-align: left;
  box-shadow: 0 12px 28px rgba(52, 47, 39, 0.08);
}

.focus-row[data-tone='danger'] {
  border-left: 4px solid var(--danger);
}

.focus-row[data-tone='warning'] {
  border-left: 4px solid var(--warning);
}

.focus-row[data-tone='brand'] {
  border-left: 4px solid var(--brand);
}

.focus-row__main,
.focus-row__meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.focus-row__label,
.focus-row__meta span {
  color: var(--text-subtle);
  font-size: 12px;
}

.focus-row__value {
  font-size: 30px;
  line-height: 1;
  letter-spacing: 0.04em;
}

.focus-row__meta strong {
  font-size: 16px;
  color: var(--text-main);
}

.topology-quicklook {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.topology-quicklook article,
.city-preview-row {
  border-radius: 16px;
  background: rgba(245, 249, 252, 0.9);
  border: 1px solid rgba(22, 33, 49, 0.08);
}

.topology-quicklook article {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
}

.topology-quicklook span,
.city-preview-row span {
  color: var(--text-subtle);
}

.topology-quicklook strong {
  font-size: 24px;
}

.city-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.city-preview-row {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
}

@media (max-width: 1000px) {
  .dashboard-panel-grid {
    grid-template-columns: 1fr;
  }

  .focus-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .topology-quicklook,
  .city-preview-row {
    grid-template-columns: 1fr;
  }
}
</style>
