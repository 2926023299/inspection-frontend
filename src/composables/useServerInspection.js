import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  exportServerInspection,
  getDashboardSummary,
  getServerInspectionDetail,
  getServerInspectionList,
  runServerInspection,
} from '@/api/inspection'
import { summarizeServerList } from '@/utils/inspection'

export function useServerInspection() {
  const filters = reactive({
    ip: '',
    date: '',
    status: null,
  })

  const loading = ref(false)
  const actionLoading = ref(false)
  const error = ref('')
  const rows = ref([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(10)
  const overview = ref(null)
  const detailVisible = ref(false)
  const detailLoading = ref(false)
  const selectedRecord = ref(null)

  const summary = computed(() => {
    if (!overview.value) {
      return summarizeServerList(rows.value)
    }

    return {
      total: overview.value.summary?.serverCount ?? 0,
      normal: overview.value.summary?.normalCount ?? 0,
      warning: overview.value.summary?.warningCount ?? 0,
      error: overview.value.summary?.errorCount ?? 0,
      maxCpu: overview.value.cpuPeak?.value ?? 0,
      maxMemory: overview.value.memoryPeak?.value ?? 0,
      maxDisk: overview.value.diskPeak?.value ?? 0,
    }
  })

  async function loadOverview() {
    try {
      overview.value = await getDashboardSummary()
    } catch (requestError) {
      overview.value = null
    }
  }

  async function loadList() {
    loading.value = true
    error.value = ''

    try {
      const response = await getServerInspectionList({
        ip: filters.ip || null,
        date: filters.date || null,
        status: filters.status,
        page: page.value,
        pageSize: pageSize.value,
      })

      rows.value = response.records || []
      total.value = response.total || 0
    } catch (requestError) {
      rows.value = []
      total.value = 0
      error.value = requestError.message
    } finally {
      loading.value = false
    }
  }

  async function refreshAfterAction(successMessage, action) {
    actionLoading.value = true
    try {
      await action()
      ElMessage.success(successMessage)
      await Promise.all([loadOverview(), loadList()])
    } catch (requestError) {
      ElMessage.error(requestError.message)
    } finally {
      actionLoading.value = false
    }
  }

  function resetFilters() {
    filters.ip = ''
    filters.date = ''
    filters.status = null
    page.value = 1
    loadList()
  }

  function applyFilters() {
    page.value = 1
    loadList()
  }

  async function openDetail(row) {
    detailVisible.value = true
    detailLoading.value = true

    try {
      selectedRecord.value = await getServerInspectionDetail({
        ip: row.ip,
        updateTime: row.updateTime,
      })
    } catch (requestError) {
      selectedRecord.value = null
      ElMessage.error(requestError.message)
    } finally {
      detailLoading.value = false
    }
  }

  function closeDetail() {
    detailVisible.value = false
  }

  function handlePageChange(nextPage) {
    page.value = nextPage
    loadList()
  }

  function handleSizeChange(nextSize) {
    pageSize.value = nextSize
    page.value = 1
    loadList()
  }

  function triggerInspection() {
    return refreshAfterAction('巡检已执行', runServerInspection)
  }

  function exportReport() {
    return refreshAfterAction('服务器巡检结果已导出', exportServerInspection)
  }

  return {
    filters,
    loading,
    actionLoading,
    error,
    rows,
    total,
    page,
    pageSize,
    overview,
    summary,
    loadOverview,
    detailVisible,
    detailLoading,
    selectedRecord,
    loadList,
    applyFilters,
    resetFilters,
    openDetail,
    closeDetail,
    handlePageChange,
    handleSizeChange,
    triggerInspection,
    exportReport,
  }
}
