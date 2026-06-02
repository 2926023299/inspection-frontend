<script setup>
import { onMounted, ref } from 'vue'
import { ElEmpty, ElMessage, ElMessageBox } from 'element-plus'
import DdlPreviewTab from '@/components/mysql-workbench/DdlPreviewTab.vue'
import ExportJobsDialog from '@/components/mysql-workbench/ExportJobsDialog.vue'
import HistoryTab from '@/components/mysql-workbench/HistoryTab.vue'
import ObjectTreePanel from '@/components/mysql-workbench/ObjectTreePanel.vue'
import SqlQueryTab from '@/components/mysql-workbench/SqlQueryTab.vue'
import TableDataTab from '@/components/mysql-workbench/TableDataTab.vue'
import TableDesignTab from '@/components/mysql-workbench/TableDesignTab.vue'
import WorkbenchTabs from '@/components/mysql-workbench/WorkbenchTabs.vue'
import { createMysqlExportJob, executeMysqlSqlBatch } from '@/api/mysqlWorkbench'
import { useMysqlWorkbench } from '@/composables/useMysqlWorkbench'
import { buildMysqlQueryExportRequest, detectDangerousSql, readMysqlSqlFile } from '@/utils/mysqlWorkbench'

const {
  treeLoading,
  error,
  includeSystemSchemas,
  treeNodes,
  displayTreeNodes,
  activeTreeKey,
  tabs,
  activeTabKey,
  activeTab,
  schemaOptions,
  loadTree,
  loadSchemaTables,
  toggleSystemSchemas,
  activateTab,
  closeTab,
  closeAllTabs,
  openTableTab,
  openQueryTab,
  openHistoryTab,
  deleteSavedQuery,
  handleTreeNodeSelect,
  handleTreeNodeSelectPinned,
  updateQueryTab,
  updateTableDataState,
  markTableTabsStale,
  updateTablePreview,
  executeQueryTab,
  cancelQueryTab,
  saveQueryTab,
  showQueryEditMode,
  toggleQuerySqlPreview,
} = useMysqlWorkbench()

const treeCollapsed = ref(false)
const exportJobsVisible = ref(false)

function onTreeToggleCollapse(collapsed) {
  treeCollapsed.value = collapsed
}

onMounted(() => {
  loadTree({ preserveSelection: false, openFirstTable: false })
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

function handleOpenExports() {
  exportJobsVisible.value = true
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

async function handleExportResult({ sql, index }) {
  try {
    const job = await createMysqlExportJob(buildMysqlQueryExportRequest({
      schema: activeTab.value.schema || '',
      sql,
      format: 'XLSX',
    }))
    ElMessage.success(`已创建语句 ${index} 的导出任务 #${job.id}`)
  } catch (e) {
    ElMessage.error(e.message || '创建导出任务失败')
  }
}

async function handleContextAction({ action, node }) {
  if (action === 'open-data') {
    const [schema, table] = node.key.replace(/^table:/, '').split('.')
    openTableTab(schema, table, 'data')
  } else if (action === 'open-design') {
    const [schema, table] = node.key.replace(/^table:/, '').split('.')
    openTableTab(schema, table, 'design')
  } else if (action === 'open-ddl') {
    const [schema, table] = node.key.replace(/^table:/, '').split('.')
    openTableTab(schema, table, 'ddl')
  } else if (action === 'open-query' && node.type === 'table') {
    const [schema, table] = node.key.replace(/^table:/, '').split('.')
    openQueryTab({ schema, sql: `SELECT * FROM \`${schema}\`.\`${table}\` LIMIT 1000` })
  } else if (action === 'open-query' && node.type === 'saved-query') {
    openQueryTab({
      savedQueryId: node.savedQuery.id,
      title: node.savedQuery.title,
      schemaName: node.savedQuery.schemaName,
      sqlText: node.savedQuery.sqlText,
    })
  } else if (action === 'activate-query') {
    activateTab(node.key)
  } else if (action === 'delete-query') {
    deleteSavedQuery(node.savedQuery.id)
  } else if (action === 'new-query') {
    openQueryTab({})
  } else if (action === 'open-history') {
    handleOpenHistory()
  } else if (action === 'drop-table') {
    const [schema, table] = node.key.replace(/^table:/, '').split('.')
    try {
      await ElMessageBox.confirm(
        `确认删除表 \`${schema}\`.\`${table}\`？此操作不可恢复。`,
        '删除表确认',
        { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
      )
      await executeMysqlSqlBatch({ sql: `DROP TABLE \`${schema}\`.\`${table}\``, confirmed: true })
      ElMessage.success(`已删除表 ${schema}.${table}`)
      await loadTree({ preserveSelection: false })
    } catch (e) {
      if (e !== 'cancel' && e?.message) ElMessage.error(e.message)
    }
  }
}

async function handleImportSql({ file, schema }) {
  let sql
  try {
    sql = await readMysqlSqlFile(file)
  } catch {
    ElMessage.error('读取 SQL 文件失败')
    return
  }
  if (!sql?.trim()) {
    ElMessage.warning('SQL 文件为空')
    return
  }
  let confirmed = false
  if (detectDangerousSql(sql)) {
    try {
      await ElMessageBox.confirm(
        '检测到可能的高风险 SQL（DROP/TRUNCATE/ALTER 等），确认后才会继续执行。',
        '危险 SQL 确认',
        { type: 'warning', confirmButtonText: '继续执行', cancelButtonText: '取消' },
      )
      confirmed = true
    } catch {
      return
    }
  }
  try {
    const result = await executeMysqlSqlBatch({ schema, sql, confirmed })
    const failed = (result.results || []).filter((r) => !r.success)
    if (failed.length) {
      const detail = failed.map((r) => `语句 ${r.index}: ${r.error?.title || r.message || '执行失败'}`).join('\n')
      ElMessageBox.alert(detail, '部分语句执行失败', { type: 'warning' })
    } else {
      ElMessage.success(`已执行 ${(result.results || []).length} 条语句`)
    }
    loadTree({ preserveSelection: true })
  } catch (e) {
    ElMessage.error(e.message || 'SQL 执行失败')
  }
}
</script>

<template>
  <div class="page-shell compact-page mysql-workbench-page">
    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" />

    <section class="mysql-workbench-layout" :class="{ 'is-tree-collapsed': treeCollapsed }">
      <ObjectTreePanel
        :nodes="displayTreeNodes"
        :loading="treeLoading"
        :selected-key="activeTreeKey"
        :include-system-schemas="includeSystemSchemas"
        @select-node="handleTreeNodeSelect"
        @select-node-pinned="handleTreeNodeSelectPinned"
        @refresh="loadTree({ preserveSelection: true })"
        @toggle-system="toggleSystemSchemas"
        @new-query="handleOpenQuery({})"
        @open-history="handleOpenHistory"
        @open-exports="handleOpenExports"
        @context-action="handleContextAction"
        @import-sql="handleImportSql"
        @toggle-collapse="onTreeToggleCollapse"
        @load-schema-tables="loadSchemaTables($event.schema, { page: $event.page, keyword: $event.keyword || '' })"
      />

      <section class="mysql-workbench-main">
        <WorkbenchTabs :tabs="tabs" :active-key="activeTabKey" @change="activateTab" @close="closeTab" @close-all="closeAllTabs" />

        <section class="mysql-workbench-main__surface">
          <TableDataTab
            v-if="activeTab?.type === 'data'"
            :schema="activeTab.schema"
            :table="activeTab.table"
            :reload-token="activeTab.reloadToken"
            :state="activeTab.dataState"
            @open-design="handleOpenDesign"
            @open-ddl="handleOpenDdl"
            @open-query="handleOpenQuery"
            @update-state="updateTableDataState(activeTab.key, $event)"
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
            :tree-nodes="treeNodes"
            @change-title="updateQueryTab(activeTab.key, { title: $event })"
            @change-sql="updateQueryTab(activeTab.key, { sql: $event })"
            @change-schema="updateQueryTab(activeTab.key, { schema: $event })"
            @execute="executeQueryTab(activeTab.key, $event)"
            @cancel-execution="cancelQueryTab(activeTab.key)"
            @save="saveQueryTab(activeTab)"
            @open-history="handleOpenHistoryFromQuery"
            @show-edit-mode="showQueryEditMode(activeTab.key)"
            @toggle-sql-preview="toggleQuerySqlPreview(activeTab.key)"
            @export-result="handleExportResult"
          />

          <HistoryTab
            v-else-if="activeTab?.type === 'history'"
            :reload-token="activeTab.reloadToken"
          />

          <section v-else class="content-panel compact-main-panel mysql-workbench-empty">
            <ElEmpty description="从左侧对象树打开表对象、查询标签或历史页。" />
          </section>
        </section>
      </section>
    </section>

    <ExportJobsDialog v-model="exportJobsVisible" />
  </div>
</template>

<style scoped>
.mysql-workbench-page {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.mysql-workbench-layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  gap: 14px;
  flex: 1;
  height: 100%;
  min-height: 0;
  transition: grid-template-columns 0.25s ease;
}

.mysql-workbench-layout.is-tree-collapsed {
  grid-template-columns: 48px minmax(0, 1fr);
}

.mysql-workbench-main {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-height: 0;
  overflow: hidden;
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

@media (max-width: 760px) {
  .mysql-workbench-layout {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, 280px) minmax(0, 1fr);
  }

  .mysql-workbench-layout.is-tree-collapsed {
    grid-template-columns: 1fr;
    grid-template-rows: 48px minmax(0, 1fr);
  }
}
</style>
