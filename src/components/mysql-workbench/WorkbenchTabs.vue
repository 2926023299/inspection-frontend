<script setup>
const props = defineProps({
  tabs: {
    type: Array,
    default: () => [],
  },
  activeKey: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['change', 'close'])

function handleTabClick(tabContext) {
  emit('change', tabContext.props.name)
}
</script>

<template>
  <div class="workbench-tabs glass-panel">
    <el-tabs :model-value="activeKey" type="card" @tab-click="handleTabClick" @tab-remove="$emit('close', $event)">
      <el-tab-pane
        v-for="tab in tabs"
        :key="tab.key"
        :label="tab.title"
        :name="tab.key"
        closable
      />
    </el-tabs>
  </div>
</template>

<style scoped>
.workbench-tabs {
  padding: 8px 10px 0;
}

:deep(.el-tabs__header) {
  margin: 0;
}

:deep(.el-tabs__nav-wrap::after) {
  display: none;
}

:deep(.el-tabs__nav-scroll) {
  padding: 8px;
  border-radius: 16px;
  background: rgba(250, 246, 238, 0.72);
  border: 1px solid rgba(30, 42, 51, 0.08);
}

:deep(.el-tabs__nav) {
  border: none !important;
}

:deep(.el-tabs__item) {
  height: 38px;
  border: none !important;
  border-radius: 12px;
  color: var(--text-subtle);
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 0.05em;
}

:deep(.el-tabs--card > .el-tabs__header .el-tabs__item.is-active) {
  color: var(--text-main);
  background: var(--panel-strong);
  box-shadow: 0 10px 18px rgba(63, 55, 43, 0.08);
}
</style>
