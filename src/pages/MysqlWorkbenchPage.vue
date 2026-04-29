<script setup>
import { computed, onMounted } from 'vue'
import { ElEmpty } from 'element-plus'
import DdlPreviewTab from '@/components/mysql-workbench/DdlPreviewTab.vue'
import HistoryTab from '@/components/mysql-workbench/HistoryTab.vue'
import ObjectTreePanel from '@/components/mysql-workbench/ObjectTreePanel.vue'
import SqlQueryTab from '@/components/mysql-workbench/SqlQueryTab.vue'
import TableDataTab from '@/components/mysql-workbench/TableDataTab.vue'
import TableDesignTab from '@/components/mysql-workbench/TableDesignTab.vue'
import WorkbenchTabs from '@/components/mysql-workbench/WorkbenchTabs.vue'
import { useMysqlWorkbench } from '@/composables/useMysqlWorkbench'

const {
  treeLoading,
  error,
  includeSystemSchemas,
  displayTreeNodes,
  activeTreeKey,
  tabs,
  activeTabKey,
  activeTab,
  schemaOptions,
  loadTree,
  toggleSystemSchemas,
  activateTab,
  closeTab,
  openTableTab,
  openQueryTab,
  openHistoryTab,
  handleTreeNodeSelect,
  updateQueryTab,
  markTableTabsStale,
  updateTablePreview,
  executeQueryTab,
} = useMysqlWorkbench()

const currentSurfaceLabel = computed(() => {
  if (!activeTab.value) {
    return '等待打开对象'
  }
  if (activeTab.value.type === 'query') {
    return activeTab.value.title
  }
  if (activeTab.value.type === 'history') {
    return '执行历史'
  }
  return `${activeTab.value.schema}.${activeTab.value.table}`
})

onMounted(() => {
  loadTree({ preserveSelection: false, openFirstTable: true })
})

function handleOpenDesign(payload) {
  openTableTab(payload.schema, payload.table, 'design')
}

function handleOpenDdl(payload) {
  openTableTab(payload.schema, payload.table, 'ddl')
}

function handleOpenQuery(payload = {}) {
  openQueryTab(payload)
}

function handleOpenHistory() {
  const historyTab = openHistoryTab()
  historyTab.reloadToken += 1
}

function handleDataChanged(payload) {
  markTableTabsStale(payload.schema, payload.table)
}

function handlePreviewGenerated(payload) {
  updateTablePreview(payload.schema, payload.table, payload.statements)
}

async function handleDesignExecuted(payload) {
  updateTablePreview(payload.schema, payload.table, [])
  markTableTabsStale(payload.schema, payload.table)
  await loadTree({ preserveSelection: true })
}

function handleOpenHistoryFromQuery() {
  handleOpenHistory()
}
</script>

<template>
  <div class="page-shell compact-page mysql-workbench-page">
    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" />

    <section class="mysql-workbench-layout">
      <ObjectTreePanel
        :nodes="displayTreeNodes"
        :loading="treeLoading"
        :selected-key="activeTreeKey"
        :include-system-schemas="includeSystemSchemas"
        @select-node="handleTreeNodeSelect"
        @refresh="loadTree({ preserveSelection: true })"
        @toggle-system="toggleSystemSchemas"
        @new-query="handleOpenQuery({})"
        @open-history="handleOpenHistory"
      />

      <section class="mysql-workbench-main">
        <section class="content-panel page-toolbar mysql-workbench-toolbar">
          <div class="page-toolbar__left">
            <span class="page-toolbar__title">MySQL Workbench</span>
            <div class="page-toolbar__actions">
              <el-button type="primary" @click="handleOpenQuery({ schema: activeTab?.schema || schemaOptions[0]?.value || '' })">新建查询</el-button>
              <el-button @click="handleOpenHistory">执行历史</el-button>
            </div>
          </div>

          <div class="page-toolbar__meta">
            <span>工作面：{{ currentSurfaceLabel }}</span>
            <span>标签数：{{ tabs.length }}</span>
            <span>{{ includeSystemSchemas ? '系统库可见' : '系统库隐藏' }}</span>
          </div>
        </section>

        <WorkbenchTabs :tabs="tabs" :active-key="activeTabKey" @change="activateTab" @close="closeTab" />

        <section class="mysql-workbench-main__surface">
          <TableDataTab
            v-if="activeTab?.type === 'data'"
            :schema="activeTab.schema"
            :table="activeTab.table"
            :reload-token="activeTab.reloadToken"
            @open-design="handleOpenDesign"
            @open-ddl="handleOpenDdl"
            @open-query="handleOpenQuery"
            @data-changed="handleDataChanged"
          />

          <TableDesignTab
            v-else-if="activeTab?.type === 'design'"
            :schema="activeTab.schema"
            :table="activeTab.table"
            :reload-token="activeTab.reloadToken"
            :preview-statements="activeTab.previewStatements"
            @preview-generated="handlePreviewGenerated"
            @design-executed="handleDesignExecuted"
            @open-ddl="handleOpenDdl"
          />

          <DdlPreviewTab
            v-else-if="activeTab?.type === 'ddl'"
            :schema="activeTab.schema"
            :table="activeTab.table"
            :reload-token="activeTab.reloadToken"
            :preview-statements="activeTab.previewStatements"
            @open-query="handleOpenQuery"
          />

          <SqlQueryTab
            v-else-if="activeTab?.type === 'query'"
            :tab="activeTab"
            :schema-options="schemaOptions"
            @change-sql="updateQueryTab(activeTab.key, { sql: $event })"
            @change-schema="updateQueryTab(activeTab.key, { schema: $event })"
            @execute="executeQueryTab(activeTab.key)"
            @open-history="handleOpenHistoryFromQuery"
          />

          <HistoryTab
            v-else-if="activeTab?.type === 'history'"
            :reload-token="activeTab.reloadToken"
          />

          <section v-else class="content-panel compact-main-panel mysql-workbench-empty">
            <ElEmpty description="从左侧对象树或上方按钮打开表对象、查询标签或历史页。" />
          </section>
        </section>
      </section>
    </section>
  </div>
</template>

<style scoped>
.mysql-workbench-page {
  min-height: 0;
}

.mysql-workbench-layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 14px;
  flex: 1;
  min-height: 0;
}

.mysql-workbench-main {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.mysql-workbench-toolbar {
  padding: 12px 16px;
}

.mysql-workbench-main__surface {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.mysql-workbench-empty {
  height: 100%;
  justify-content: center;
}

@media (max-width: 1180px) {
  .mysql-workbench-layout {
    grid-template-columns: 1fr;
  }
}
</style>
