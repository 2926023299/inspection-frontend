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

const boardRows = computed(() => {
  const data = dashboard.value || {}
  return [
    { label: '重点设备', value: data.cpuPeak?.ip || '--', hint: '资源峰值来源' },
    { label: '最后巡检', value: data.lastInspectionTime || '--', hint: '当前概览基线' },
    { label: '变化服务器', value: data.javaChangedServerCount ?? 0, hint: 'Java 进程差异' },
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
  <div v-loading="loading" class="page-shell">
    <section class="page-hero dashboard-hero">
      <div class="dashboard-hero-grid">
        <div>
          <h1 class="hero-title">巡检工作台</h1>
          <p class="hero-subtitle">
            面向值班、排障和导出交付的巡检面板。把服务器资源、Java 进程变化和图模统计压缩到一条可执行工作流里。
          </p>
          <div class="hero-actions">
            <el-button type="primary" :loading="actionLoading" @click="triggerInspection">立即巡检</el-button>
            <el-button :loading="actionLoading" @click="exportReport">导出服务器结果</el-button>
            <el-button @click="router.push('/server')">进入服务器巡检</el-button>
            <el-button @click="router.push('/java')">进入 Java 巡检</el-button>
          </div>
          <div class="meta-inline">
            <span>最近巡检：{{ dashboard?.lastInspectionTime || '--' }}</span>
            <span>Java 变化服务器：{{ dashboard?.javaChangedServerCount ?? 0 }}</span>
            <span>图模日期：{{ dashboard?.topology?.date || '--' }}</span>
          </div>
        </div>

        <div class="signal-board">
          <div class="signal-board__head">
            <span>值班摘要</span>
            <strong>Live Board</strong>
          </div>
          <div class="signal-board__body">
            <article v-for="item in boardRows" :key="item.label" class="signal-row">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
              <small>{{ item.hint }}</small>
            </article>
          </div>
        </div>
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

    <section class="content-panel dashboard-grid">
      <div class="dashboard-column">
        <div class="section-heading">
          <div>
            <h2 class="section-title">资源峰值</h2>
            <p class="section-caption">用最高占用快速定位风险服务器</p>
          </div>
        </div>
        <div class="app-card-grid">
          <MetricCard
            v-for="card in peakCards"
            :key="card.label"
            :label="card.label"
            :value="card.value"
            :caption="card.caption"
            :tone="card.tone"
            :interactive="Boolean(card.query)"
            @click="card.query && openServerList(card.query)"
          />
        </div>
      </div>

      <div class="dashboard-column">
        <div class="section-heading">
          <div>
            <h2 class="section-title">图模摘要</h2>
            <p class="section-caption">前一天中压 / 低压城市统计</p>
          </div>
          <el-button text @click="router.push('/topology')">查看明细</el-button>
        </div>

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
          <div v-for="city in dashboard?.topology?.cities?.slice(0, 4) || []" :key="city.cityCode" class="city-preview-row">
            <strong>{{ city.cityName }}</strong>
            <span>中压 {{ city.zyCount }}</span>
            <span>低压 {{ city.dyCount }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.dashboard-hero {
  padding-bottom: 34px;
}

.dashboard-hero-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) 320px;
  gap: 24px;
  align-items: end;
}

.signal-board {
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(18px);
}

.signal-board__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(246, 239, 229, 0.68);
}

.signal-board__body {
  display: flex;
  flex-direction: column;
}

.signal-row {
  display: grid;
  gap: 6px;
  padding: 16px 18px;
}

.signal-row + .signal-row {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.signal-row span,
.signal-row small {
  color: rgba(246, 239, 229, 0.68);
}

.signal-row strong {
  font-size: 20px;
  letter-spacing: 0.05em;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 18px;
  padding: 22px;
}

.dashboard-column {
  min-width: 0;
}

.topology-quicklook {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.topology-quicklook article,
.city-preview-row {
  border-radius: 18px;
  background: rgba(245, 249, 252, 0.9);
  border: 1px solid rgba(22, 33, 49, 0.08);
}

.topology-quicklook article {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px;
}

.topology-quicklook span,
.city-preview-row span {
  color: var(--text-subtle);
}

.topology-quicklook strong {
  font-size: 30px;
}

.city-preview {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 18px;
}

.city-preview-row {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr;
  gap: 12px;
  align-items: center;
  padding: 14px 16px;
}

@media (max-width: 1000px) {
  .dashboard-hero-grid,
  .dashboard-grid {
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
