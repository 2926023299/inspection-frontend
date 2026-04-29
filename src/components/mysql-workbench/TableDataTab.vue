<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { deleteMysqlTableRow, getMysqlTableMetadata, insertMysqlTableRow, queryMysqlTableData, updateMysqlTableRow } from '@/api/mysqlWorkbench'
import { buildRowKeyValues, formatMysqlCell } from '@/utils/mysqlWorkbench'

const props = defineProps({
  schema: {
    type: String,
    required: true,
  },
  table: {
    type: String,
    required: true,
  },
  reloadToken: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits(['open-design', 'open-ddl', 'open-query', 'data-changed'])

const loading = ref(false)
const actionLoading = ref(false)
const error = ref('')
const metadata = ref(null)
const rows = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(50)
const filterColumn = ref('')
const filterOperator = ref('like')
const filterKeyword = ref('')
const sortColumn = ref('')
const sortDirection = ref('')
const currentRow = ref(null)
const dialogVisible = ref(false)
const dialogMode = ref('insert')
const editingRow = ref(null)
const formModel = ref({})

const columns = computed(() => metadata.value?.columns || [])
const keyColumns = computed(() => metadata.value?.keyColumns || [])
const readOnly = computed(() => Boolean(metadata.value?.readOnly))
const editableColumns = computed(() => columns.value.filter((column) => !(column.autoIncrement && column.primaryKey)))
const filterOptions = computed(() => columns.value.map((column) => ({ label: column.name, value: column.name })))

watch(
  () => [props.schema, props.table, props.reloadToken],
  async () => {
    page.value = 1
    currentRow.value = null
    await loadMetadata()
    await loadRows()
  },
  { immediate: true },
)

async function loadMetadata() {
  try {
    metadata.value = await getMysqlTableMetadata(props.schema, props.table)
    if (!filterColumn.value) {
      filterColumn.value = metadata.value?.columns?.[0]?.name || ''
    }
  } catch (requestError) {
    error.value = requestError.message || '加载表结构失败'
  }
}

async function loadRows() {
  loading.value = true
  error.value = ''
  try {
    const filters = []
    if (filterColumn.value && String(filterKeyword.value || '').trim()) {
      filters.push({
        column: filterColumn.value,
        operator: filterOperator.value,
        value: filterKeyword.value,
      })
    }
    const sorts = sortColumn.value
      ? [{ column: sortColumn.value, direction: sortDirection.value || 'ASC' }]
      : []

    const result = await queryMysqlTableData({
      schema: props.schema,
      table: props.table,
      page: page.value,
      pageSize: pageSize.value,
      filters,
      sorts,
    })
    rows.value = result.rows || []
    total.value = result.total || 0
  } catch (requestError) {
    error.value = requestError.message || '加载表数据失败'
    rows.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handleSortChange({ prop, order }) {
  sortColumn.value = prop || ''
  sortDirection.value = order === 'descending' ? 'DESC' : 'ASC'
  page.value = 1
  loadRows()
}

function handleResetFilters() {
  filterKeyword.value = ''
  filterOperator.value = 'like'
  page.value = 1
  loadRows()
}

function handleCurrentChange(row) {
  currentRow.value = row
}

function handlePageChange(value) {
  page.value = value
  loadRows()
}

function handleSizeChange(value) {
  pageSize.value = value
  page.value = 1
  loadRows()
}

function openInsertDialog() {
  const nextModel = {}
  editableColumns.value.forEach((column) => {
    nextModel[column.name] = column.defaultValue ?? ''
  })
  formModel.value = nextModel
  dialogMode.value = 'insert'
  editingRow.value = null
  dialogVisible.value = true
}

function openEditDialog(row) {
  const nextModel = {}
  editableColumns.value.forEach((column) => {
    nextModel[column.name] = row?.[column.name] ?? ''
  })
  formModel.value = nextModel
  dialogMode.value = 'update'
  editingRow.value = row
  dialogVisible.value = true
}

async function saveRow() {
  actionLoading.value = true
  try {
    if (dialogMode.value === 'insert') {
      await insertMysqlTableRow({
        schema: props.schema,
        table: props.table,
        values: { ...formModel.value },
      })
      ElMessage.success('已新增 1 行数据')
    } else {
      await updateMysqlTableRow({
        schema: props.schema,
        table: props.table,
        keyValues: buildRowKeyValues(editingRow.value, keyColumns.value),
        values: { ...formModel.value },
      })
      ElMessage.success('行数据已更新')
    }
    dialogVisible.value = false
    emit('data-changed', { schema: props.schema, table: props.table })
    await loadRows()
  } catch (requestError) {
    ElMessage.error(requestError.message || '保存失败')
  } finally {
    actionLoading.value = false
  }
}

async function deleteRow(row) {
  try {
    await ElMessageBox.confirm(
      `确认删除 ${props.table} 中的当前行数据？`,
      '删除确认',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      },
    )
    actionLoading.value = true
    await deleteMysqlTableRow({
      schema: props.schema,
      table: props.table,
      keyValues: buildRowKeyValues(row, keyColumns.value),
    })
    ElMessage.success('已删除 1 行数据')
    emit('data-changed', { schema: props.schema, table: props.table })
    await loadRows()
  } catch (requestError) {
    if (requestError !== 'cancel') {
      ElMessage.error(requestError.message || '删除失败')
    }
  } finally {
    actionLoading.value = false
  }
}
</script>

<template>
  <div class="tab-surface">
    <section class="content-panel page-toolbar mysql-data-toolbar">
      <div class="page-toolbar__left">
        <span class="page-toolbar__title">{{ schema }}.{{ table }}</span>
        <div class="page-toolbar__actions">
          <el-select v-model="filterColumn" class="mysql-data-toolbar__filter" placeholder="筛选字段">
            <el-option v-for="option in filterOptions" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
          <el-select v-model="filterOperator" class="mysql-data-toolbar__operator">
            <el-option label="包含" value="like" />
            <el-option label="等于" value="eq" />
            <el-option label="大于" value="gt" />
            <el-option label="小于" value="lt" />
          </el-select>
          <el-input v-model="filterKeyword" class="mysql-data-toolbar__keyword" placeholder="输入筛选值" clearable @keyup.enter="loadRows" />
          <el-button type="primary" @click="loadRows">查询</el-button>
          <el-button @click="handleResetFilters">重置</el-button>
        </div>
      </div>

      <div class="page-toolbar__meta">
        <span>总行数：{{ total }}</span>
        <span>主定位键：{{ keyColumns.join(', ') || '无' }}</span>
        <span>{{ readOnly ? '只读表' : '可编辑表' }}</span>
      </div>
    </section>

    <section v-if="readOnly" class="mysql-data-alert">
      <el-alert type="warning" :closable="false" show-icon :title="metadata?.readOnlyReason || '当前表只读'" />
    </section>

    <section v-if="error" class="mysql-data-alert">
      <el-alert type="error" :closable="false" show-icon :title="error" />
    </section>

    <section class="content-panel compact-main-panel mysql-data-panel">
      <div class="section-heading">
        <div>
          <h2 class="section-title">Data Grid</h2>
          <p class="section-caption">完整数据页只保留数据网格、状态条和轻量工具栏。</p>
        </div>

        <div class="mysql-data-panel__actions">
          <el-button @click="$emit('open-query', { schema, sql: `SELECT * FROM ${schema}.${table} LIMIT 200;` })">打开查询标签</el-button>
          <el-button @click="$emit('open-ddl', { schema, table })">查看 DDL</el-button>
          <el-button @click="$emit('open-design', { schema, table })">表设计</el-button>
          <el-button type="primary" :disabled="readOnly" @click="openInsertDialog">新增行</el-button>
        </div>
      </div>

      <div class="compact-table-shell">
        <el-table
          v-loading="loading"
          height="100%"
          :data="rows"
          border
          highlight-current-row
          @current-change="handleCurrentChange"
          @sort-change="handleSortChange"
        >
          <el-table-column
            v-for="column in columns"
            :key="column.name"
            :prop="column.name"
            :label="column.name"
            :min-width="column.comment ? 160 : 130"
            sortable="custom"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              {{ formatMysqlCell(row[column.name]) }}
            </template>
          </el-table-column>

          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" :disabled="readOnly" @click="openEditDialog(row)">编辑</el-button>
              <el-button link type="danger" :disabled="readOnly" @click="deleteRow(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="mysql-data-status">
        <div class="mysql-data-status__meta">
          <span>每页 {{ pageSize }} 行</span>
          <span>当前选中：{{ currentRow ? '1 行' : '未选中' }}</span>
          <span>{{ readOnly ? '当前表不支持表格写操作' : '当前表支持新增 / 更新 / 删除' }}</span>
        </div>

        <el-pagination
          :current-page="page"
          :page-size="pageSize"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </section>

    <el-dialog v-model="dialogVisible" :title="dialogMode === 'insert' ? '新增数据行' : '编辑数据行'" width="720px">
      <div class="mysql-row-editor">
        <div v-for="column in editableColumns" :key="column.name" class="mysql-row-editor__field">
          <span>{{ column.name }}</span>
          <el-input v-model="formModel[column.name]" :placeholder="column.comment || column.name" />
        </div>
      </div>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="actionLoading" @click="saveRow">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.tab-surface {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  height: 100%;
}

.mysql-data-toolbar {
  gap: 12px;
}

.mysql-data-toolbar__filter {
  width: 180px;
}

.mysql-data-toolbar__operator {
  width: 120px;
}

.mysql-data-toolbar__keyword {
  width: 220px;
}

.mysql-data-alert {
  flex: none;
}

.mysql-data-panel {
  flex: 1;
}

.mysql-data-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mysql-data-status {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
  padding-top: 12px;
}

.mysql-data-status__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mysql-data-status__meta span {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(23, 36, 55, 0.06);
  color: var(--text-subtle);
  font-size: 12px;
}

.mysql-row-editor {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.mysql-row-editor__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mysql-row-editor__field span {
  color: var(--text-subtle);
  font-size: 12px;
}

@media (max-width: 920px) {
  .mysql-row-editor {
    grid-template-columns: 1fr;
  }
}
</style>
