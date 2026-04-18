import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { exportServerInspection, getDashboardSummary, runServerInspection } from '@/api/inspection'

export function useDashboard() {
  const dashboard = ref(null)
  const loading = ref(false)
  const actionLoading = ref(false)
  const error = ref('')

  const statCards = computed(() => {
    const summary = dashboard.value?.summary || {}
    return [
      { label: '巡检服务器', value: summary.serverCount ?? 0, tone: 'brand' },
      { label: '正常', value: summary.normalCount ?? 0, tone: 'success' },
      { label: '警告', value: summary.warningCount ?? 0, tone: 'warning' },
      { label: '异常', value: summary.errorCount ?? 0, tone: 'danger' },
    ]
  })

  async function loadDashboard() {
    loading.value = true
    error.value = ''

    try {
      dashboard.value = await getDashboardSummary()
    } catch (requestError) {
      error.value = requestError.message
    } finally {
      loading.value = false
    }
  }

  async function triggerInspection() {
    actionLoading.value = true
    try {
      await runServerInspection()
      ElMessage.success('巡检已执行，正在刷新概览')
      await loadDashboard()
    } catch (requestError) {
      ElMessage.error(requestError.message)
    } finally {
      actionLoading.value = false
    }
  }

  async function exportReport() {
    actionLoading.value = true
    try {
      await exportServerInspection()
      ElMessage.success('服务器巡检结果已导出')
    } catch (requestError) {
      ElMessage.error(requestError.message)
    } finally {
      actionLoading.value = false
    }
  }

  return {
    dashboard,
    loading,
    actionLoading,
    error,
    statCards,
    loadDashboard,
    triggerInspection,
    exportReport,
  }
}
