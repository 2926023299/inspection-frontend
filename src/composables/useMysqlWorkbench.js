import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { executeMysqlSqlBatch, listMysqlWorkbenchTree } from '@/api/mysqlWorkbench'
import { detectDangerousSql, getMysqlTableTabKey, getMysqlTableTabTitle } from '@/utils/mysqlWorkbench'

function cloneTreeNodes(nodes = []) {
  return nodes.map((node) => ({
    ...node,
    children: cloneTreeNodes(node.children || []),
  }))
}

function findFirstTableNode(nodes = []) {
  for (const node of nodes) {
    if (node.type === 'table') {
      return node
    }
    const childMatch = findFirstTableNode(node.children || [])
    if (childMatch) {
      return childMatch
    }
  }
  return null
}

function buildQueryNode(tab) {
  return {
    key: tab.key,
    label: tab.title,
    type: 'query',
    children: [],
  }
}

export function useMysqlWorkbench() {
  const treeLoading = ref(false)
  const error = ref('')
  const includeSystemSchemas = ref(false)
  const treeNodes = ref([])
  const activeTreeKey = ref('')
  const tabs = ref([])
  const activeTabKey = ref('')
  const querySeed = ref(1)

  const queryTabs = computed(() => tabs.value.filter((tab) => tab.type === 'query'))
  const schemaOptions = computed(() =>
    treeNodes.value
      .filter((node) => node.type === 'schema')
      .map((node) => ({ label: node.label, value: node.label })),
  )

  const displayTreeNodes = computed(() => {
    const nodes = cloneTreeNodes(treeNodes.value)
    nodes.push({
      key: 'queries-root',
      label: 'Queries',
      type: 'queries-root',
      children: queryTabs.value.map(buildQueryNode),
    })
    nodes.push({
      key: 'history-root',
      label: 'History',
      type: 'history-root',
      children: [],
    })
    return nodes
  })

  const activeTab = computed(() => tabs.value.find((tab) => tab.key === activeTabKey.value) || null)

  async function loadTree({ preserveSelection = true, openFirstTable = false } = {}) {
    treeLoading.value = true
    error.value = ''
    try {
      const nodes = await listMysqlWorkbenchTree(includeSystemSchemas.value)
      treeNodes.value = nodes

      if (!preserveSelection || !activeTreeKey.value) {
        const firstTableNode = findFirstTableNode(nodes)
        if (firstTableNode) {
          activeTreeKey.value = firstTableNode.key
          if (openFirstTable && !tabs.value.length) {
            const [schema, table] = firstTableNode.key.replace(/^table:/, '').split('.')
            openTableTab(schema, table, 'data')
          }
        }
      }
    } catch (requestError) {
      error.value = requestError.message || '加载对象树失败'
      treeNodes.value = []
    } finally {
      treeLoading.value = false
    }
  }

  function toggleSystemSchemas() {
    includeSystemSchemas.value = !includeSystemSchemas.value
    loadTree({ preserveSelection: false })
  }

  function activateTab(key) {
    activeTabKey.value = key
    const tab = tabs.value.find((item) => item.key === key)
    if (!tab) {
      return
    }

    if (tab.type === 'query') {
      activeTreeKey.value = tab.key
      return
    }

    if (tab.type === 'history') {
      activeTreeKey.value = 'history-root'
      return
    }

    activeTreeKey.value = `table:${tab.schema}.${tab.table}`
  }

  function closeTab(key) {
    const index = tabs.value.findIndex((tab) => tab.key === key)
    if (index === -1) {
      return
    }

    const wasActive = activeTabKey.value === key
    tabs.value.splice(index, 1)
    if (!wasActive) {
      return
    }

    const fallback = tabs.value[index] || tabs.value[index - 1] || null
    if (fallback) {
      activateTab(fallback.key)
      return
    }

    activeTabKey.value = ''
  }

  function openTableTab(schema, table, type = 'data') {
    const key = getMysqlTableTabKey(schema, table, type)
    const existing = tabs.value.find((tab) => tab.key === key)
    if (existing) {
      activateTab(existing.key)
      return existing
    }

    const tab = {
      key,
      type,
      schema,
      table,
      title: getMysqlTableTabTitle(table, type),
      reloadToken: 0,
      previewStatements: [],
    }
    tabs.value.push(tab)
    activateTab(key)
    return tab
  }

  function openQueryTab(initial = {}) {
    const seed = querySeed.value
    querySeed.value += 1
    const key = `query:${Date.now()}:${seed}`
    const tab = {
      key,
      type: 'query',
      title: initial.title || `query_${seed}.sql`,
      schema: initial.schema || schemaOptions.value[0]?.value || '',
      sql: initial.sql || '',
      results: [],
      executing: false,
      batchId: null,
      dangerous: false,
      reloadToken: 0,
    }
    tabs.value.push(tab)
    activateTab(key)
    return tab
  }

  function openHistoryTab() {
    const existing = tabs.value.find((tab) => tab.type === 'history')
    if (existing) {
      activateTab(existing.key)
      return existing
    }

    const tab = {
      key: 'history',
      type: 'history',
      title: 'History',
      reloadToken: 0,
    }
    tabs.value.push(tab)
    activateTab(tab.key)
    return tab
  }

  function handleTreeNodeSelect(node) {
    if (!node) {
      return
    }

    activeTreeKey.value = node.key
    if (node.type === 'table') {
      const [schema, table] = node.key.replace(/^table:/, '').split('.')
      openTableTab(schema, table, 'data')
      return
    }

    if (node.type === 'query') {
      activateTab(node.key)
      return
    }

    if (node.type === 'history-root') {
      openHistoryTab()
    }
  }

  function updateQueryTab(key, patch) {
    const tab = tabs.value.find((item) => item.key === key)
    if (!tab) {
      return
    }
    Object.assign(tab, patch)
  }

  function markTableTabsStale(schema, table) {
    tabs.value.forEach((tab) => {
      if (tab.schema === schema && tab.table === table) {
        tab.reloadToken += 1
      }
    })
  }

  function updateTablePreview(schema, table, statements) {
    tabs.value.forEach((tab) => {
      if (tab.schema === schema && tab.table === table) {
        tab.previewStatements = [...(statements || [])]
      }
    })
  }

  async function executeQueryTab(key, { forceConfirmed = false } = {}) {
    const tab = tabs.value.find((item) => item.key === key)
    if (!tab || tab.executing) {
      return
    }

    if (!String(tab.sql || '').trim()) {
      ElMessage.warning('请输入要执行的 SQL')
      return
    }

    if (detectDangerousSql(tab.sql) && !forceConfirmed) {
      await ElMessageBox.confirm(
        '检测到可能的高风险 SQL，确认后才会继续执行。',
        '危险 SQL 确认',
        {
          type: 'warning',
          confirmButtonText: '继续执行',
          cancelButtonText: '取消',
        },
      )
      return executeQueryTab(key, { forceConfirmed: true })
    }

    tab.executing = true
    try {
      const result = await executeMysqlSqlBatch({
        schema: tab.schema || '',
        sql: tab.sql,
        confirmed: forceConfirmed,
      })
      tab.results = result.results || []
      tab.batchId = result.batchId || null
      tab.dangerous = Boolean(result.dangerous)
      ElMessage.success('SQL 执行完成')
    } catch (requestError) {
      ElMessage.error(requestError.message || 'SQL 执行失败')
      throw requestError
    } finally {
      tab.executing = false
    }
  }

  return {
    treeLoading,
    error,
    includeSystemSchemas,
    displayTreeNodes,
    activeTreeKey,
    tabs,
    activeTabKey,
    activeTab,
    schemaOptions,
    loadTree,
    toggleSystemSchemas,
    activateTab,
    closeTab,
    openTableTab,
    openQueryTab,
    openHistoryTab,
    handleTreeNodeSelect,
    updateQueryTab,
    markTableTabsStale,
    updateTablePreview,
    executeQueryTab,
  }
}
