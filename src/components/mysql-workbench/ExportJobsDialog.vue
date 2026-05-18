<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { buildMysqlExportDownloadUrl, listMysqlExportJobs } from '@/api/mysqlWorkbench'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue'])

const loading = ref(false)
const jobs = ref([])
let timerId = null

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

watch(
  () => props.modelValue,
  (value) => {
    if (value) {
      loadJobs()
      timerId = setInterval(loadJobs, 5000)
    } else {
      stopTimer()
    }
  },
)

async function loadJobs() {
  loading.value = true
  try {
    jobs.value = await listMysqlExportJobs({ page: 1, pageSize: 50 })
  } catch (error) {
    ElMessage.error(error.message || '加载导出任务失败')
  } finally {
    loading.value = false
  }
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId)
    timerId = null
  }
}

function formatRows(job) {
  if (job.status === 'SUCCESS') return job.totalRows ?? job.exportedRows ?? 0
  return job.exportedRows ?? 0
}

function formatSize(size) {
  if (!size) return '-'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function statusType(status) {
  if (status === 'SUCCESS') return 'success'
  if (status === 'FAILED') return 'danger'
  if (status === 'RUNNING') return 'warning'
  return 'info'
}

onBeforeUnmount(stopTimer)
</script>

<template>
  <el-dialog v-model="visible" title="导出任务" width="min(980px, calc(100vw - 32px))">
    <div class="mysql-export-jobs">
      <div class="mysql-export-jobs__toolbar">
        <el-button size="small" :loading="loading" @click="loadJobs">刷新</el-button>
      </div>

      <el-table v-loading="loading" :data="jobs" border height="420">
        <el-table-column prop="id" label="任务" width="84" />
        <el-table-column prop="sourceType" label="来源" width="90" />
        <el-table-column prop="format" label="格式" width="84" />
        <el-table-column label="对象" min-width="190">
          <template #default="{ row }">
            <span>{{ row.tableName ? `${row.schemaName}.${row.tableName}` : (row.schemaName || 'SQL') }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="行数" width="110">
          <template #default="{ row }">{{ formatRows(row) }}</template>
        </el-table-column>
        <el-table-column label="大小" width="110">
          <template #default="{ row }">{{ formatSize(row.fileSize) }}</template>
        </el-table-column>
        <el-table-column prop="message" label="消息" min-width="160" show-overflow-tooltip />
        <el-table-column label="操作" width="110" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'SUCCESS'"
              link
              type="primary"
              :href="buildMysqlExportDownloadUrl(row.id)"
              tag="a"
              target="_blank"
            >
              下载
            </el-button>
            <span v-else class="mysql-export-jobs__pending">-</span>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </el-dialog>
</template>

<style scoped>
.mysql-export-jobs {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mysql-export-jobs__toolbar {
  display: flex;
  justify-content: flex-end;
}

.mysql-export-jobs__pending {
  color: var(--text-subtle);
}
</style>
