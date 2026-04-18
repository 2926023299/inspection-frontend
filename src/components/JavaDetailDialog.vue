<script setup>
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  detail: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <el-dialog
    :model-value="props.modelValue"
    width="760px"
    class="java-detail-dialog"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #header>
      <div class="dialog-header">
        <span class="dialog-eyebrow">Java 进程差异</span>
        <h3>{{ props.detail?.ip || '服务器' }}</h3>
      </div>
    </template>

    <div v-loading="props.loading" class="dialog-shell">
      <template v-if="props.detail">
        <section class="dialog-meta">
          <div>
            <span>当前巡检</span>
            <strong>{{ props.detail.currentUpdateTime || '--' }}</strong>
          </div>
          <div>
            <span>对比基线</span>
            <strong>{{ props.detail.previousUpdateTime || '无历史数据' }}</strong>
          </div>
        </section>

        <section class="diff-grid">
          <article class="diff-card">
            <h4>新增进程</h4>
            <el-empty v-if="!props.detail.diff?.addedProcesses?.length" description="无新增" :image-size="60" />
            <el-tag v-for="item in props.detail.diff?.addedProcesses" :key="item" type="success" round>{{ item }}</el-tag>
          </article>
          <article class="diff-card">
            <h4>移除进程</h4>
            <el-empty v-if="!props.detail.diff?.removedProcesses?.length" description="无移除" :image-size="60" />
            <el-tag v-for="item in props.detail.diff?.removedProcesses" :key="item" type="danger" round>{{ item }}</el-tag>
          </article>
          <article class="diff-card">
            <h4>稳定进程</h4>
            <el-empty v-if="!props.detail.diff?.unchangedProcesses?.length" description="无重合项" :image-size="60" />
            <el-tag v-for="item in props.detail.diff?.unchangedProcesses" :key="item" type="info" round>{{ item }}</el-tag>
          </article>
        </section>
      </template>
    </div>
  </el-dialog>
</template>

<style scoped>
.dialog-header h3 {
  margin: 10px 0 0;
  font-size: 24px;
}

.dialog-eyebrow {
  color: var(--text-subtle);
  font-size: 12px;
  letter-spacing: 0.12em;
}

.dialog-shell {
  min-height: 240px;
}

.dialog-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.dialog-meta div,
.diff-card {
  padding: 16px;
  border-radius: 18px;
  background: rgba(245, 249, 252, 0.9);
}

.dialog-meta span {
  display: block;
  color: var(--text-subtle);
  font-size: 12px;
  margin-bottom: 6px;
}

.diff-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.diff-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.diff-card h4 {
  margin: 0;
}

@media (max-width: 760px) {
  .dialog-meta,
  .diff-grid {
    grid-template-columns: 1fr;
  }
}
</style>
