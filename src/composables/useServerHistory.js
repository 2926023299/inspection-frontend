import { ref, watch } from 'vue'
import { getServerInspectionHistory } from '@/api/inspection'

export function useServerHistory(ipRef) {
  const loading = ref(false)
  const error = ref('')
  const rows = ref([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(10)

  async function loadHistory() {
    if (!ipRef.value) {
      rows.value = []
      total.value = 0
      return
    }

    loading.value = true
    error.value = ''

    try {
      const response = await getServerInspectionHistory({
        ip: ipRef.value,
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

  function handlePageChange(nextPage) {
    page.value = nextPage
    loadHistory()
  }

  function handleSizeChange(nextSize) {
    pageSize.value = nextSize
    page.value = 1
    loadHistory()
  }

  watch(
    ipRef,
    () => {
      page.value = 1
      loadHistory()
    },
    { immediate: true },
  )

  return {
    loading,
    error,
    rows,
    total,
    page,
    pageSize,
    loadHistory,
    handlePageChange,
    handleSizeChange,
  }
}
