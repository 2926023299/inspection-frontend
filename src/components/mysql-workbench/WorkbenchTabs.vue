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

const emit = defineEmits(['change', 'close', 'close-all'])

function handleTabClick(tabContext) {
  emit('change', tabContext.props.name)
}
</script>

<template>
  <div class="workbench-tabs__bar">
    <el-tabs
      :model-value="activeKey"
      type="card"
      class="workbench-tabs__tabs"
      @tab-click="handleTabClick"
      @tab-remove="$emit('close', $event)"
    >
      <el-tab-pane
        v-for="tab in tabs"
        :key="tab.key"
        :name="tab.key"
        closable
      >
        <template #label>
          <span class="workbench-tabs__label" :class="{ 'is-pinned': tab.pinned }">{{ tab.title }}</span>
        </template>
      </el-tab-pane>
    </el-tabs>

    <div v-if="tabs.length > 1" class="workbench-tabs__trailing">
      <span class="workbench-tabs__count">{{ tabs.length }}</span>
      <el-button class="workbench-tabs__close-all" size="small" text @click="$emit('close-all')">关闭全部</el-button>
    </div>
  </div>
</template>

<style scoped>
.workbench-tabs__bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 16px;
  border-bottom: 1px solid rgba(30, 41, 59, 0.08);
}

.workbench-tabs__tabs {
  flex: 1;
  min-width: 0;
}

.workbench-tabs__trailing {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  padding-right: 6px;
}

.workbench-tabs__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  border-radius: 11px;
  background: rgba(23, 36, 55, 0.07);
  color: var(--text-subtle);
  font-size: 11px;
  font-weight: 700;
}

.workbench-tabs__close-all {
  color: var(--text-subtle) !important;
  font-size: 12px !important;
  padding: 2px 8px !important;
  height: auto !important;
}

.workbench-tabs__close-all:hover {
  color: var(--danger) !important;
}

.workbench-tabs__label {
  font-size: 12px;
  letter-spacing: 0.03em;
}

.workbench-tabs__label.is-pinned {
  font-weight: 700;
}

.workbench-tabs__label.is-pinned::before {
  content: '';
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 5px;
  border-radius: 50%;
  background: var(--brand-strong);
  vertical-align: middle;
  margin-top: -1px;
}

/* Deep styles */
:deep(.el-tabs__header) {
  margin: 0;
}

:deep(.el-tabs__nav-wrap::after) {
  display: none;
}

:deep(.el-tabs__nav-scroll) {
  padding: 2px 0;
  background: transparent;
}

:deep(.el-tabs__nav) {
  border: none !important;
}

:deep(.el-tabs__item) {
  height: 34px;
  line-height: 34px;
  border: none !important;
  border-radius: 8px;
  color: var(--text-subtle);
  font-weight: 500;
  font-size: 12px;
  padding: 0 14px !important;
  margin-right: 2px;
}

:deep(.el-tabs__item:hover) {
  color: var(--text-main);
  background: rgba(23, 36, 55, 0.05);
}

:deep(.el-tabs--card > .el-tabs__header .el-tabs__item.is-active) {
  color: var(--text-main);
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

:deep(.el-tabs__item .el-icon) {
  font-size: 11px;
  color: var(--text-subtle);
}

:deep(.el-tabs__item .el-icon:hover) {
  color: var(--text-main);
}
</style>
