import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { exportTopologySummary, getTopologySummary } from '@/api/inspection'

export function useTopologySummary() {
  const summary = ref(null)
  const loading = ref(false)
  const actionLoading = ref(false)
  const error = ref('')

  async function loadSummary() {
    loading.value = true
    error.value = ''

    try {
      summary.value = await getTopologySummary()
    } catch (requestError) {
      summary.value = null
      error.value = requestError.message
    } finally {
      loading.value = false
    }
  }

  async function exportReport() {
    actionLoading.value = true
    try {
      await exportTopologySummary()
      ElMessage.success('图模统计结果已导出')
    } catch (requestError) {
      ElMessage.error(requestError.message)
    } finally {
      actionLoading.value = false
    }
  }

  return {
    summary,
    loading,
    actionLoading,
    error,
    loadSummary,
    exportReport,
  }
}
