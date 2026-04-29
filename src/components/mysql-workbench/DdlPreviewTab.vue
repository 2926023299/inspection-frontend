<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getMysqlTableDdl } from '@/api/mysqlWorkbench'

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

const emit = defineEmits(['open-query'])

const loading = ref(false)
const error = ref('')
const ddl = ref('')

const previewText = computed(() => (props.previewStatements || []).join(';\n\n'))

watch(
  () => [props.schema, props.table, props.reloadToken],
  async () => {
    await loadDdl()
  },
  { immediate: true },
)

async function loadDdl() {
  loading.value = true
  error.value = ''
  try {
    ddl.value = await getMysqlTableDdl(props.schema, props.table)
  } catch (requestError) {
    error.value = requestError.message || '加载 DDL 失败'
  } finally {
    loading.value = false
  }
}

function openCurrentDdlQuery() {
  if (!ddl.value) {
    ElMessage.warning('当前没有可打开的 DDL')
    return
  }

  emit('open-query', {
    schema: props.schema,
    sql: ddl.value,
  })
}
</script>

<template>
  <div class="tab-surface">
    <section v-if="error" class="mysql-ddl-alert">
      <el-alert type="error" show-icon :closable="false" :title="error" />
    </section>

    <section class="content-panel compact-main-panel mysql-ddl-panel">
      <div class="section-heading">
        <div>
          <h2 class="section-title">DDL Preview</h2>
          <p class="section-caption">同时查看当前建表语句和最近一次设计器生成的预览 SQL。</p>
        </div>

        <div class="mysql-ddl-panel__actions">
          <el-button @click="loadDdl">刷新</el-button>
          <el-button type="primary" @click="openCurrentDdlQuery">在查询标签打开</el-button>
        </div>
      </div>

      <div class="mysql-ddl-grid">
        <div class="mysql-ddl-card">
          <h3>当前建表语句</h3>
          <pre class="mysql-ddl-code">{{ loading ? '加载中...' : (ddl || '-- 暂无建表语句') }}</pre>
        </div>

        <div class="mysql-ddl-card">
          <h3>最近设计器预览</h3>
          <pre class="mysql-ddl-code">{{ previewText || '-- 设计器尚未生成新的 SQL 预览' }}</pre>
        </div>
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

.mysql-ddl-panel {
  flex: 1;
  gap: 16px;
}

.mysql-ddl-panel__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mysql-ddl-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  flex: 1;
  min-height: 0;
}

.mysql-ddl-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-radius: 18px;
  border: 1px solid rgba(30, 42, 51, 0.08);
  background: rgba(255, 252, 247, 0.82);
  min-height: 0;
}

.mysql-ddl-card h3 {
  margin: 0;
  font-size: 15px;
}

.mysql-ddl-code {
  margin: 0;
  flex: 1;
  min-height: 0;
  padding: 16px;
  border-radius: 16px;
  background: linear-gradient(180deg, #182535, #101a29);
  color: #f1e8dd;
  font-family: Consolas, "Cascadia Code", monospace;
  font-size: 13px;
  line-height: 1.65;
  white-space: pre-wrap;
  overflow: auto;
}

@media (max-width: 1080px) {
  .mysql-ddl-grid {
    grid-template-columns: 1fr;
  }
}
</style>
