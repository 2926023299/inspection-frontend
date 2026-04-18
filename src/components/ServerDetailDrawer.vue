<script setup>
import { computed } from 'vue'
import StatusTag from '@/components/StatusTag.vue'
import { buildUsageText, formatDateTime, formatPercent } from '@/utils/inspection'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  record: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const diskBlocks = computed(() => {
  if (!props.record) return []

  return [
    {
      label: '磁盘一',
      usage: buildUsageText(props.record.diskUsage, props.record.diskTotal),
      rate: formatPercent(props.record.diskUsageRate),
    },
    {
      label: '磁盘二',
      usage: buildUsageText(props.record.secondDiskUsage, props.record.secondDiskTotal),
      rate: formatPercent(props.record.secondDiskUsageRate),
    },
    {
      label: '磁盘三',
      usage: buildUsageText(props.record.thirdDiskUsage, props.record.thirdDiskTotal),
      rate: formatPercent(props.record.thirdDiskUsageRate),
    },
  ].filter((item) => item.usage !== '--' || item.rate !== '--')
})
</script>

<template>
  <el-drawer v-model="visible" size="520px" :with-header="false" class="server-detail-drawer">
    <div v-loading="props.loading" class="drawer-shell">
      <template v-if="props.record">
        <section class="drawer-header">
          <div>
            <p class="drawer-eyebrow">服务器详情</p>
            <h2 class="drawer-title">{{ props.record.ip }}</h2>
            <p class="drawer-meta">最近巡检：{{ formatDateTime(props.record.updateTime) }}</p>
          </div>
          <StatusTag :status="props.record.status" />
        </section>

        <section class="drawer-section">
          <h3>资源占用</h3>
          <div class="resource-grid">
            <div class="resource-card">
              <span>CPU</span>
              <strong>{{ formatPercent(props.record.cpuUsage) }}</strong>
            </div>
            <div class="resource-card">
              <span>内存</span>
              <strong>{{ buildUsageText(props.record.memoryUsage, props.record.memoryTotal) }}</strong>
              <small>{{ formatPercent(props.record.memoryUsageRate) }}</small>
            </div>
            <div class="resource-card">
              <span>线程数</span>
              <strong>{{ props.record.threadCount || '--' }}</strong>
            </div>
          </div>
        </section>

        <section class="drawer-section">
          <h3>磁盘明细</h3>
          <div class="disk-stack">
            <article v-for="disk in diskBlocks" :key="disk.label" class="disk-row">
              <div>
                <strong>{{ disk.label }}</strong>
                <p>{{ disk.usage }}</p>
              </div>
              <span>{{ disk.rate }}</span>
            </article>
          </div>
        </section>

        <section class="drawer-section">
          <h3>Java 进程</h3>
          <div class="process-list">
            <el-empty v-if="!props.record.javaProcesses?.length" description="暂无 Java 进程数据" :image-size="80" />
            <el-tag v-for="process in props.record.javaProcesses" :key="process" round effect="plain">
              {{ process }}
            </el-tag>
          </div>
        </section>

        <section class="drawer-section">
          <h3>巡检结论</h3>
          <p class="drawer-description">{{ props.record.description || '未返回巡检描述' }}</p>
        </section>
      </template>
    </div>
  </el-drawer>
</template>

<style scoped>
.drawer-shell {
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 24px;
  background:
    radial-gradient(circle at top right, rgba(195, 95, 55, 0.08), transparent 24%),
    linear-gradient(180deg, #f7f1e9 0%, #f4ede3 100%);
}

.drawer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 20px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(21, 32, 48, 0.96), rgba(28, 43, 63, 0.94));
  color: #f5efe7;
}

.drawer-eyebrow {
  margin: 0;
  color: rgba(245, 239, 231, 0.66);
  font-size: 12px;
  letter-spacing: 0.12em;
}

.drawer-title {
  margin: 10px 0 8px;
  font-size: 30px;
  line-height: 1;
}

.drawer-meta {
  margin: 0;
  color: rgba(245, 239, 231, 0.72);
}

.drawer-section {
  padding: 18px;
  border-radius: 18px;
  border: 1px solid rgba(30, 42, 51, 0.08);
  background: rgba(255, 252, 247, 0.86);
}

.drawer-section h3 {
  margin: 0 0 14px;
  font-size: 17px;
  letter-spacing: 0.06em;
}

.resource-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.resource-card,
.disk-row {
  border-radius: 16px;
  border: 1px solid rgba(30, 42, 51, 0.08);
  background: linear-gradient(180deg, rgba(255, 253, 249, 0.96), rgba(247, 241, 233, 0.92));
}

.resource-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
}

.resource-card span,
.resource-card small,
.disk-row p {
  color: var(--text-subtle);
}

.disk-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.disk-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px;
}

.disk-row p {
  margin: 6px 0 0;
}

.process-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.drawer-description {
  margin: 0;
  color: var(--text-main);
  line-height: 1.7;
}

@media (max-width: 640px) {
  .resource-grid {
    grid-template-columns: 1fr;
  }
}
</style>
