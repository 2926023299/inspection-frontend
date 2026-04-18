import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { exportJavaInspection, getJavaInspectionDetail, getJavaInspectionList, getJavaInspectionSummary } from '@/api/inspection'
import { summarizeJavaList } from '@/utils/inspection'

export function useJavaInspection() {
  const filters = reactive({
    ip: '',
    programName: '',
    stability: '',
    status: null,
  })

  const loading = ref(false)
  const actionLoading = ref(false)
  const error = ref('')
  const rows = ref([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(8)
  const overview = ref(null)
  const detailVisible = ref(false)
  const detailLoading = ref(false)
  const selectedDetail = ref(null)

  const summary = computed(() => overview.value || summarizeJavaList(rows.value))

  async function loadOverview() {
    try {
      overview.value = await getJavaInspectionSummary()
    } catch (_requestError) {
      overview.value = null
    }
  }

  async function loadList() {
    loading.value = true
    error.value = ''

    try {
      const response = await getJavaInspectionList({
        ip: filters.ip || null,
        programName: filters.programName || null,
        stability: filters.stability || null,
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

  function applyFilters() {
    page.value = 1
    loadList()
  }

  function resetFilters() {
    filters.ip = ''
    filters.programName = ''
    filters.stability = ''
    filters.status = null
    page.value = 1
    loadList()
  }

  async function openDetail(ip) {
    detailVisible.value = true
    detailLoading.value = true

    try {
      selectedDetail.value = await getJavaInspectionDetail({ ip })
    } catch (requestError) {
      selectedDetail.value = null
      ElMessage.error(requestError.message)
    } finally {
      detailLoading.value = false
    }
  }

  function closeDetail() {
    detailVisible.value = false
  }

  async function exportReport() {
    actionLoading.value = true
    try {
      await exportJavaInspection()
      ElMessage.success('Java巡检结果已导出')
    } catch (requestError) {
      ElMessage.error(requestError.message)
    } finally {
      actionLoading.value = false
    }
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
    selectedDetail,
    loadList,
    applyFilters,
    resetFilters,
    openDetail,
    closeDetail,
    exportReport,
    handlePageChange,
    handleSizeChange,
  }
}
