<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { executeMysqlTableDesign, getMysqlTableMetadata, previewMysqlTableDesign } from '@/api/mysqlWorkbench'
import { buildMysqlDesignRequest, createDesignDraftFromMetadata, createEmptyDesignColumn, createEmptyDesignIndex } from '@/utils/mysqlWorkbench'

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
  previewStatements: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['preview-generated', 'design-executed', 'open-ddl'])

const loading = ref(false)
const actionLoading = ref(false)
const error = ref('')
const metadata = ref(null)
const draft = ref({
  tableComment: '',
  engine: 'InnoDB',
  charset: 'utf8mb4',
  columns: [],
  indexes: [],
})
const previewSql = ref([])

const columnOptions = computed(() => draft.value.columns.map((column) => column.name).filter(Boolean))

watch(
  () => props.previewStatements,
  (statements) => {
    previewSql.value = [...(statements || [])]
  },
  { immediate: true },
)

watch(
  () => [props.schema, props.table, props.reloadToken],
  async () => {
    await loadMetadata()
  },
  { immediate: true },
)

async function loadMetadata() {
  loading.value = true
  error.value = ''
  try {
    metadata.value = await getMysqlTableMetadata(props.schema, props.table)
    draft.value = createDesignDraftFromMetadata(metadata.value)
  } catch (requestError) {
    error.value = requestError.message || '加载表设计失败'
  } finally {
    loading.value = false
  }
}

function addColumn() {
  draft.value.columns.push(createEmptyDesignColumn())
}

function removeColumn(index) {
  draft.value.columns.splice(index, 1)
}

function addIndex() {
  draft.value.indexes.push(createEmptyDesignIndex())
}

function removeIndex(index) {
  draft.value.indexes.splice(index, 1)
}

function resetDraft() {
  draft.value = createDesignDraftFromMetadata(metadata.value)
  previewSql.value = []
}

async function previewChanges() {
  actionLoading.value = true
  try {
    const result = await previewMysqlTableDesign(buildMysqlDesignRequest(props.schema, props.table, draft.value))
    previewSql.value = result.statements || []
    emit('preview-generated', {
      schema: props.schema,
      table: props.table,
      statements: previewSql.value,
    })
    if (!previewSql.value.length) {
      ElMessage.info('当前没有结构变更')
      return
    }
    ElMessage.success(`已生成 ${previewSql.value.length} 条 SQL 预览`)
  } catch (requestError) {
    ElMessage.error(requestError.message || '生成 SQL 预览失败')
  } finally {
    actionLoading.value = false
  }
}

async function executeChanges() {
  if (!previewSql.value.length) {
    await previewChanges()
    if (!previewSql.value.length) {
      return
    }
  }

  try {
    await ElMessageBox.confirm(
      '表设计器将执行 DDL 语句，确认后继续。',
      '执行结构变更',
      {
        type: 'warning',
        confirmButtonText: '执行',
        cancelButtonText: '取消',
      },
    )
    actionLoading.value = true
    await executeMysqlTableDesign({
      ...buildMysqlDesignRequest(props.schema, props.table, draft.value),
      confirmed: true,
    })
    ElMessage.success('表结构变更已执行')
    emit('design-executed', { schema: props.schema, table: props.table })
    await loadMetadata()
  } catch (requestError) {
    if (requestError !== 'cancel') {
      ElMessage.error(requestError.message || '执行结构变更失败')
    }
  } finally {
    actionLoading.value = false
  }
}
</script>

<template>
  <div class="tab-surface">
    <section v-if="error" class="mysql-design-alert">
      <el-alert type="error" show-icon :closable="false" :title="error" />
    </section>

    <section class="content-panel compact-main-panel mysql-design-panel">
      <div class="section-heading">
        <div>
          <h2 class="section-title">Table Design</h2>
          <p class="section-caption">常用字段、主键、索引、默认值和注释都在这里编辑。</p>
        </div>

        <div class="mysql-design-panel__actions">
          <el-button @click="$emit('open-ddl', { schema, table })">查看 DDL</el-button>
          <el-button @click="resetDraft">重置</el-button>
          <el-button :loading="actionLoading" @click="previewChanges">预览 SQL</el-button>
          <el-button type="primary" :loading="actionLoading" @click="executeChanges">执行变更</el-button>
        </div>
      </div>

      <div class="mysql-design-top">
        <div class="mysql-design-top__field">
          <span>存储引擎</span>
          <el-input v-model="draft.engine" />
        </div>
        <div class="mysql-design-top__field">
          <span>字符集</span>
          <el-input v-model="draft.charset" />
        </div>
        <div class="mysql-design-top__field mysql-design-top__field--wide">
          <span>表注释</span>
          <el-input v-model="draft.tableComment" />
        </div>
      </div>

      <div class="mysql-design-table">
        <div class="mysql-design-table__header">
          <h3>字段设计</h3>
          <el-button size="small" type="primary" @click="addColumn">新增字段</el-button>
        </div>

        <div class="mysql-design-table__rows">
          <div v-for="(column, index) in draft.columns" :key="`${column.name}-${index}`" class="mysql-design-row">
            <el-input v-model="column.name" placeholder="字段名" />
            <el-input v-model="column.type" placeholder="类型" />
            <el-input v-model="column.length" placeholder="长度" />
            <el-input v-model="column.scale" placeholder="小数位" />
            <el-input v-model="column.defaultValue" placeholder="默认值" />
            <el-input v-model="column.comment" placeholder="注释" />
            <el-checkbox v-model="column.nullable">可空</el-checkbox>
            <el-checkbox v-model="column.primaryKey">主键</el-checkbox>
            <el-checkbox v-model="column.autoIncrement">自增</el-checkbox>
            <el-button link type="danger" @click="removeColumn(index)">删除</el-button>
          </div>
        </div>
      </div>

      <div class="mysql-design-table">
        <div class="mysql-design-table__header">
          <h3>索引设计</h3>
          <el-button size="small" @click="addIndex">新增索引</el-button>
        </div>

        <div class="mysql-design-indexes">
          <div v-for="(indexRow, index) in draft.indexes" :key="`${indexRow.name}-${index}`" class="mysql-design-index-row">
            <el-input v-model="indexRow.name" placeholder="索引名" />
            <el-select v-model="indexRow.columns" multiple collapse-tags collapse-tags-tooltip placeholder="选择字段">
              <el-option v-for="columnName in columnOptions" :key="columnName" :label="columnName" :value="columnName" />
            </el-select>
            <el-checkbox v-model="indexRow.unique">唯一索引</el-checkbox>
            <el-button link type="danger" @click="removeIndex(index)">删除</el-button>
          </div>
        </div>
      </div>

      <div class="mysql-design-preview">
        <div class="mysql-design-table__header">
          <h3>SQL 预览</h3>
          <span>{{ previewSql.length ? `共 ${previewSql.length} 条` : '尚未生成预览' }}</span>
        </div>

        <pre class="mysql-design-preview__code">{{ previewSql.length ? previewSql.join(';\n\n') : '-- 先点击“预览 SQL”生成结构变更语句' }}</pre>
      </div>
    </section>
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

.mysql-design-panel {
  flex: 1;
  gap: 16px;
}

.mysql-design-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mysql-design-top {
  display: grid;
  grid-template-columns: 180px 180px minmax(0, 1fr);
  gap: 12px;
}

.mysql-design-top__field,
.mysql-design-top__field--wide {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mysql-design-top__field span,
.mysql-design-table__header span {
  color: var(--text-subtle);
  font-size: 12px;
}

.mysql-design-table,
.mysql-design-preview {
  padding: 14px;
  border-radius: 18px;
  border: 1px solid rgba(30, 42, 51, 0.08);
  background: rgba(255, 252, 247, 0.82);
}

.mysql-design-table__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.mysql-design-table__header h3 {
  margin: 0;
  font-size: 15px;
}

.mysql-design-table__rows,
.mysql-design-indexes {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mysql-design-row {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr 90px 90px 0.9fr 1fr auto auto auto auto;
  gap: 10px;
  align-items: center;
}

.mysql-design-index-row {
  display: grid;
  grid-template-columns: 1fr 1.2fr auto auto;
  gap: 10px;
  align-items: center;
}

.mysql-design-preview__code {
  margin: 0;
  min-height: 160px;
  padding: 16px;
  border-radius: 16px;
  background: linear-gradient(180deg, #182535, #101a29);
  color: #f1e8dd;
  font-family: Consolas, "Cascadia Code", monospace;
  font-size: 13px;
  line-height: 1.65;
  white-space: pre-wrap;
}

@media (max-width: 1280px) {
  .mysql-design-top {
    grid-template-columns: 1fr;
  }

  .mysql-design-row,
  .mysql-design-index-row {
    grid-template-columns: 1fr;
  }
}
</style>
