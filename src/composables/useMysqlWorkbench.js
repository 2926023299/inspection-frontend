import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  deleteMysqlSavedQuery,
  executeMysqlSqlBatch,
  listMysqlSchemas,
  listMysqlSchemaTables,
  listMysqlSavedQueries,
  saveMysqlQuery,
} from '@/api/mysqlWorkbench'
import {
  buildMysqlSchemaNode,
  buildMysqlSavedQueryNode,
  createMysqlTableDataState,
  createMysqlQueryPresentationState,
  detectDangerousSql,
  resolveMysqlExecutableSql,
  getMysqlQueryTabTreeKey,
  getMysqlTableTabKey,
  getMysqlTableTabTitle,
  patchMysqlTableDataState,
  setMysqlQueryEditMode,
  setMysqlQueryResultFocusMode,
  upsertMysqlSchemaTables,
} from '@/utils/mysqlWorkbench'

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
  const savedQueries = ref([])
  const activeTreeKey = ref('')
  const tabs = ref([])
  const activeTabKey = ref('')
  const querySeed = ref(1)
  const runtimeQueryNodes = ref([])

  const schemaOptions = computed(() =>
    treeNodes.value
      .filter((node) => node.type === 'schema')
      .map((node) => ({ label: node.label, value: node.label })),
  )

  const displayTreeNodes = computed(() => {
    return [
      {
      key: 'queries-root',
      label: 'Queries',
      type: 'queries-root',
      children: [
        ...savedQueries.value.map(buildMysqlSavedQueryNode),
        ...runtimeQueryNodes.value,
      ],
      },
      ...treeNodes.value,
      {
        key: 'history-root',
        label: 'History',
        type: 'history-root',
        children: [],
      },
    ]
  })

  const activeTab = computed(() => tabs.value.find((tab) => tab.key === activeTabKey.value) || null)

  function syncRuntimeQueryNodes() {
    runtimeQueryNodes.value = tabs.value
      .filter((tab) => tab.type === 'query' && !tab.savedQueryId)
      .map(buildQueryNode)
  }

  async function loadTree({ preserveSelection = true, openFirstTable = false } = {}) {
    treeLoading.value = true
    error.value = ''
    try {
      const schemas = await listMysqlSchemas(includeSystemSchemas.value)
      const nodes = (schemas || []).map(buildMysqlSchemaNode)
      treeNodes.value = nodes
      try {
        const queries = await listMysqlSavedQueries()
        savedQueries.value = queries || []
      } catch {
        savedQueries.value = []
      }

      if (!preserveSelection || !activeTreeKey.value) {
        let firstTableNode = findFirstTableNode(nodes)
        if (!firstTableNode && openFirstTable && nodes[0]) {
          await loadSchemaTables(nodes[0].label)
          firstTableNode = findFirstTableNode(treeNodes.value)
        }
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

  async function loadSchemaTables(schema, { page = 1, pageSize = 100, keyword = '' } = {}) {
    if (!schema) return null
    treeNodes.value = treeNodes.value.map((node) => (
      node.type === 'schema' && node.label === schema ? { ...node, loading: true } : node
    ))
    try {
      const result = await listMysqlSchemaTables(schema, { page, pageSize, keyword })
      treeNodes.value = upsertMysqlSchemaTables(treeNodes.value, schema, result.items || [], {
        page: result.page || page,
        hasNext: result.hasNext,
        keyword: result.keyword ?? keyword,
      })
      return result
    } catch (requestError) {
      error.value = requestError.message || `加载 ${schema} 表列表失败`
      treeNodes.value = treeNodes.value.map((node) => (
        node.type === 'schema' && node.label === schema ? { ...node, loading: false } : node
      ))
      return null
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
      activeTreeKey.value = getMysqlQueryTabTreeKey(tab)
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
    const [closedTab] = tabs.value.splice(index, 1)
    if (closedTab?.type === 'query') {
      syncRuntimeQueryNodes()
    }
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

  function closeAllTabs() {
    tabs.value = []
    runtimeQueryNodes.value = []
    activeTabKey.value = ''
  }

  function openTableTab(schema, table, type = 'data', { pinned = false } = {}) {
    const key = getMysqlTableTabKey(schema, table, type)
    const existing = tabs.value.find((tab) => tab.key === key)
    if (existing) {
      if (pinned) existing.pinned = true
      activateTab(existing.key)
      return existing
    }

    const tab = {
      key,
      type,
      schema,
      table,
      title: getMysqlTableTabTitle(table, type),
      pinned,
      reloadToken: 0,
      previewStatements: [],
    }
    if (type === 'data') {
      tab.dataState = createMysqlTableDataState()
    }

    if (!pinned) {
      const replaceIndex = tabs.value.findIndex((t) => !t.pinned && (t.type === 'data' || t.type === 'design' || t.type === 'ddl'))
      if (replaceIndex !== -1) {
        tabs.value.splice(replaceIndex, 1, tab)
      } else {
        tabs.value.push(tab)
      }
    } else {
      tabs.value.push(tab)
    }
    activateTab(key)
    return tab
  }

  function openQueryTab(initial = {}) {
    if (initial.savedQueryId) {
      const existingSavedTab = tabs.value.find((tab) => tab.savedQueryId === initial.savedQueryId)
      if (existingSavedTab) {
        activateTab(existingSavedTab.key)
        return existingSavedTab
      }
    }

    const seed = querySeed.value
    querySeed.value += 1
    const key = `query:${Date.now()}:${seed}`
    const tab = {
      key,
      type: 'query',
      savedQueryId: initial.savedQueryId || initial.id || null,
      title: initial.title || `query_${seed}.sql`,
      schema: initial.schema || initial.schemaName || schemaOptions.value[0]?.value || '',
      sql: initial.sql || initial.sqlText || '',
      results: [],
      executing: false,
      batchId: null,
      dangerous: false,
      lastExecutedSql: '',
      lastExecutionUsedSelection: false,
      saveStatus: initial.savedQueryId || initial.id ? 'saved' : 'draft',
      saveError: '',
      reloadToken: 0,
      ...createMysqlQueryPresentationState(),
    }
    tabs.value.push(tab)
    if (!tab.savedQueryId) {
      syncRuntimeQueryNodes()
    }
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

    if (node.type === 'schema') {
      const current = treeNodes.value.find((item) => item.key === node.key)
      if (current && !current.loaded && !current.loading) {
        loadSchemaTables(current.label)
      }
      return
    }

    if (node.type === 'query') {
      activateTab(node.key)
      return
    }

    if (node.type === 'saved-query') {
      openQueryTab({
        savedQueryId: node.savedQuery.id,
        title: node.savedQuery.title,
        schemaName: node.savedQuery.schemaName,
        sqlText: node.savedQuery.sqlText,
      })
      return
    }

    if (node.type === 'history-root') {
      openHistoryTab()
    }
  }

  function handleTreeNodeSelectPinned(node) {
    if (!node) return
    activeTreeKey.value = node.key
    if (node.type === 'table') {
      const [schema, table] = node.key.replace(/^table:/, '').split('.')
      openTableTab(schema, table, 'data', { pinned: true })
    }
  }

  function updateQueryTab(key, patch) {
    const tab = tabs.value.find((item) => item.key === key)
    if (!tab) {
      return
    }
    Object.assign(tab, patch)
    if (tab.type === 'query' && Object.prototype.hasOwnProperty.call(patch, 'title')) {
      syncRuntimeQueryNodes()
    }
  }

  function updateTableDataState(key, patch) {
    const tab = tabs.value.find((item) => item.key === key)
    if (!tab || tab.type !== 'data') {
      return
    }
    tab.dataState = patchMysqlTableDataState(tab.dataState || createMysqlTableDataState(), patch)
  }

  function showQueryEditMode(key) {
    const tab = tabs.value.find((item) => item.key === key)
    if (!tab || tab.type !== 'query') {
      return
    }
    setMysqlQueryEditMode(tab)
  }

  function showQueryResultFocus(key) {
    const tab = tabs.value.find((item) => item.key === key)
    if (!tab || tab.type !== 'query') {
      return
    }
    setMysqlQueryResultFocusMode(tab)
  }

  function toggleQuerySqlPreview(key) {
    const tab = tabs.value.find((item) => item.key === key)
    if (!tab || tab.type !== 'query' || tab.viewMode !== 'result-focus') {
      return
    }
    tab.sqlPreviewExpanded = !tab.sqlPreviewExpanded
  }

  async function saveQueryTab(tab) {
    if (!tab || tab.type !== 'query') {
      return
    }
    if (!String(tab.sql || '').trim()) {
      ElMessage.warning('SQL 为空，无需保存')
      return
    }
    tab.saveStatus = 'saving'
    try {
      const savedQuery = await saveMysqlQuery({
        id: tab.savedQueryId,
        title: tab.title,
        schemaName: tab.schema || '',
        sqlText: tab.sql,
      })
      tab.savedQueryId = savedQuery.id
      tab.title = savedQuery.title || tab.title
      tab.saveStatus = 'saved'
      tab.saveError = ''
      upsertSavedQuery(savedQuery)
      syncRuntimeQueryNodes()
    } catch (requestError) {
      tab.saveStatus = 'failed'
      tab.saveError = requestError.message || '查询保存失败'
    }
  }

  function upsertSavedQuery(savedQuery) {
    const index = savedQueries.value.findIndex((query) => query.id === savedQuery.id)
    if (index === -1) {
      savedQueries.value.unshift(savedQuery)
      return
    }
    savedQueries.value.splice(index, 1, savedQuery)
  }

  async function deleteSavedQuery(queryId) {
    await deleteMysqlSavedQuery(queryId)
    const index = savedQueries.value.findIndex((query) => query.id === queryId)
    if (index !== -1) {
      savedQueries.value.splice(index, 1)
    }
    const tab = tabs.value.find((t) => t.savedQueryId === queryId)
    if (tab) {
      closeTab(tab.key)
    }
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

  async function executeQueryTab(key, { forceConfirmed = false, sqlOverride = null, usedSelection = false } = {}) {
    const tab = tabs.value.find((item) => item.key === key)
    if (!tab || tab.executing) {
      return
    }

    const resolvedSql = sqlOverride === null || sqlOverride === undefined
      ? resolveMysqlExecutableSql({ sql: tab.sql })
      : { sql: String(sqlOverride || '').trim(), hasSelection: Boolean(usedSelection) }
    const executableSql = resolvedSql.sql

    if (!executableSql) {
      ElMessage.warning('请输入要执行的 SQL')
      return
    }

    if (detectDangerousSql(executableSql) && !forceConfirmed) {
      await ElMessageBox.confirm(
        '检测到可能的高风险 SQL，确认后才会继续执行。',
        '危险 SQL 确认',
        {
          type: 'warning',
          confirmButtonText: '继续执行',
          cancelButtonText: '取消',
        },
      )
      return executeQueryTab(key, {
        forceConfirmed: true,
        sqlOverride: executableSql,
        usedSelection: resolvedSql.hasSelection,
      })
    }

    tab.executing = true
    try {
      await saveQueryTab(tab)
      const result = await executeMysqlSqlBatch({
        schema: tab.schema || '',
        sql: executableSql,
        confirmed: forceConfirmed,
      })
      tab.results = result.results || []
      tab.batchId = result.batchId || null
      tab.dangerous = Boolean(result.dangerous)
      tab.executionStatus = result.status || (result.success === false ? 'FAILED' : 'SUCCESS')
      tab.executionMessage = result.message || ''
      tab.lastExecutedSql = executableSql
      tab.lastExecutionUsedSelection = resolvedSql.hasSelection
      setMysqlQueryResultFocusMode(tab)
      if (result.success === false) {
        ElMessage.error(result.message || `第 ${result.failedStatementIndex || '?'} 条 SQL 执行失败`)
      } else {
        ElMessage.success('SQL 执行完成')
      }
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
    treeNodes,
    displayTreeNodes,
    activeTreeKey,
    tabs,
    activeTabKey,
    activeTab,
    schemaOptions,
    savedQueries,
    loadTree,
    loadSchemaTables,
    toggleSystemSchemas,
    activateTab,
    closeTab,
    closeAllTabs,
    openTableTab,
    openQueryTab,
    openHistoryTab,
    deleteSavedQuery,
    handleTreeNodeSelect,
    handleTreeNodeSelectPinned,
    updateQueryTab,
    updateTableDataState,
    saveQueryTab,
    showQueryEditMode,
    showQueryResultFocus,
    toggleQuerySqlPreview,
    markTableTabsStale,
    updateTablePreview,
    executeQueryTab,
  }
}
