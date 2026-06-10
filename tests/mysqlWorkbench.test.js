import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildMysqlSavedQueryNode,
  buildMysqlSchemaNode,
  buildMysqlDumpSql,
  buildMysqlDesignRequest,
  buildMysqlTableExportRequest,
  createMysqlTableDataState,
  createDebouncedSqlSync,
  createDesignDraftFromMetadata,
  createMysqlQueryPresentationState,
  formatMysqlDesignExecutionError,
  loadMysqlSchemaTablePages,
  resolveMysqlExecutableSql,
  formatMysqlResultRowCount,
  getMysqlQueryTabTreeKey,
  getMysqlSavedQueryTreeKey,
  upsertMysqlSchemaTables,
  patchMysqlTableDataState,
  setMysqlQueryEditMode,
  setMysqlQueryResultFocusMode,
} from '../src/utils/mysqlWorkbench.js'

test('saved query tabs map back to the saved-query tree key', () => {
  const savedQueryId = 42

  assert.equal(getMysqlSavedQueryTreeKey(savedQueryId), 'saved-query:42')
  assert.equal(
    getMysqlQueryTabTreeKey({
      key: 'query:1714444444444:1',
      savedQueryId,
    }),
    'saved-query:42',
  )
})

test('unsaved query tabs keep their own runtime tab key', () => {
  assert.equal(
    getMysqlQueryTabTreeKey({
      key: 'query:1714444444444:2',
      savedQueryId: null,
    }),
    'query:1714444444444:2',
  )
})

test('saved query tree nodes keep the query payload for reopen', () => {
  const query = {
    id: 7,
    title: 'ops-check.sql',
    schemaName: 'inspection',
    sqlText: 'select 1;',
  }

  assert.deepEqual(buildMysqlSavedQueryNode(query), {
    key: 'saved-query:7',
    label: 'ops-check.sql',
    type: 'saved-query',
    savedQuery: query,
    children: [],
  })
})

test('new query presentation state starts in edit mode', () => {
  assert.deepEqual(createMysqlQueryPresentationState(), {
    viewMode: 'edit',
    sqlPreviewExpanded: false,
  })
})

test('result-focus mode closes inline sql preview by default', () => {
  const tab = {
    viewMode: 'edit',
    sqlPreviewExpanded: true,
  }

  setMysqlQueryResultFocusMode(tab)

  assert.equal(tab.viewMode, 'result-focus')
  assert.equal(tab.sqlPreviewExpanded, false)
})

test('returning to edit mode preserves the tab sql and closes preview', () => {
  const tab = {
    sql: 'select 1;',
    viewMode: 'result-focus',
    sqlPreviewExpanded: true,
  }

  setMysqlQueryEditMode(tab)

  assert.equal(tab.sql, 'select 1;')
  assert.equal(tab.viewMode, 'edit')
  assert.equal(tab.sqlPreviewExpanded, false)
})

test('result-focus helper can be re-entered from edit mode repeatedly', () => {
  const tab = {
    viewMode: 'edit',
    sqlPreviewExpanded: false,
  }

  setMysqlQueryResultFocusMode(tab)
  setMysqlQueryEditMode(tab)
  setMysqlQueryResultFocusMode(tab)

  assert.equal(tab.viewMode, 'result-focus')
  assert.equal(tab.sqlPreviewExpanded, false)
})

test('schema table updates preserve unrelated tree node references', () => {
  const ies = buildMysqlSchemaNode('ies_ls')
  const audit = buildMysqlSchemaNode('audit')
  const nodes = [ies, audit]

  const next = upsertMysqlSchemaTables(nodes, 'ies_ls', ['breaker_energy_data', 'inspection_table'], {
    page: 1,
    hasNext: true,
    keyword: '',
  })

  assert.equal(next[1], audit)
  assert.notEqual(next[0], ies)
  assert.equal(next[0].loaded, true)
  assert.equal(next[0].hasMoreTables, true)
  assert.deepEqual(
    next[0].children.map((node) => node.key),
    ['table:ies_ls.breaker_energy_data', 'table:ies_ls.inspection_table'],
  )
})

test('schema table page loader fetches every page for completion table names', async () => {
  const calls = []
  const result = await loadMysqlSchemaTablePages(
    'ies_ls',
    async (schema, params) => {
      calls.push({ schema, ...params })
      if (params.page === 1) {
        return { items: ['breaker_energy_data', 'inspection_table'], page: 1, hasNext: true, keyword: '' }
      }
      if (params.page === 2) {
        return { items: ['station_config'], page: 2, hasNext: false, keyword: '' }
      }
      throw new Error(`unexpected page ${params.page}`)
    },
    { pageSize: 2 },
  )

  assert.deepEqual(calls, [
    { schema: 'ies_ls', page: 1, pageSize: 2, keyword: '' },
    { schema: 'ies_ls', page: 2, pageSize: 2, keyword: '' },
  ])
  assert.deepEqual(result, {
    items: ['breaker_energy_data', 'inspection_table', 'station_config'],
    page: 2,
    hasNext: false,
    keyword: '',
  })
})

test('sql draft sync debounces parent updates and can flush before execute', () => {
  const calls = []
  const scheduled = []
  const cleared = []
  const sync = createDebouncedSqlSync('select 1', (value) => calls.push(value), {
    delay: 250,
    setTimer(callback, delay) {
      scheduled.push({ callback, delay })
      return scheduled.length
    },
    clearTimer(id) {
      cleared.push(id)
    },
  })

  sync.setValue('select 1;')
  sync.setValue('select 2;')

  assert.deepEqual(calls, [])
  assert.deepEqual(cleared, [1])

  sync.flush()

  assert.deepEqual(calls, ['select 2;'])
})

test('selected sql is preferred when resolving the executable query text', () => {
  assert.deepEqual(
    resolveMysqlExecutableSql({
      sql: 'select 1;\nselect 2;\nselect 3;',
      selectedSql: '\n  select 2;  \n',
    }),
    {
      sql: 'select 2;',
      hasSelection: true,
    },
  )
})

test('blank selected sql falls back to the full query text', () => {
  assert.deepEqual(
    resolveMysqlExecutableSql({
      sql: '  select 1;\nselect 2;  ',
      selectedSql: '   ',
    }),
    {
      sql: 'select 1;\nselect 2;',
      hasSelection: false,
    },
  )
})

test('query result row count shows backend total when provided', () => {
  assert.equal(
    formatMysqlResultRowCount({
      rows: [{ id: 1 }, { id: 2 }],
      displayRowCount: 2,
      totalRowCount: 17,
      truncated: true,
      displayLimit: 2,
    }),
    '2 / 总数 17 行，已截断到 2',
  )
})

test('query result row count falls back to displayed rows without total', () => {
  assert.equal(
    formatMysqlResultRowCount({
      rows: [{ id: 1 }, { id: 2 }, { id: 3 }],
      displayRowCount: 3,
      truncated: false,
    }),
    '3 行',
  )
})

test('table export request sends query shape without browser-side rows', () => {
  assert.deepEqual(
    buildMysqlTableExportRequest({
      schema: 'ies_ls',
      table: 'breaker_energy_data',
      format: 'CSV',
      filters: [{ column: 'city_code', operator: 'eq', value: '35401' }],
      sorts: [{ column: 'id', direction: 'DESC' }],
    }),
    {
      sourceType: 'TABLE',
      format: 'CSV',
      schema: 'ies_ls',
      table: 'breaker_energy_data',
      sql: '',
      filters: [{ column: 'city_code', operator: 'eq', value: '35401' }],
      sorts: [{ column: 'id', direction: 'DESC' }],
    },
  )
})

test('dump sql uses current database table names', () => {
  const dumpSql = buildMysqlDumpSql(
    'ops_db',
    'alarm_log',
    ['id'],
    [{ id: 7 }, { id: 8 }],
    'CREATE TABLE `alarm_log` (\n  `id` bigint NOT NULL\n) ENGINE=InnoDB;',
  )

  assert.doesNotMatch(dumpSql, /CREATE DATABASE/)
  assert.doesNotMatch(dumpSql, /USE `ops_db`;/)
  assert.match(dumpSql, /DROP TABLE IF EXISTS `alarm_log`;/)
  assert.match(dumpSql, /CREATE TABLE `alarm_log` \(/)
  assert.match(dumpSql, /INSERT INTO `alarm_log` \(`id`\) VALUES\n\(7\),\n\(8\);/)
  assert.doesNotMatch(dumpSql, /`ops_db`\.`alarm_log`/)
})

test('dump sql splits into batched insert statements', () => {
  const rows = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }]
  const dumpSql = buildMysqlDumpSql(
    'ops_db',
    'alarm_log',
    ['id'],
    rows,
    'CREATE TABLE `alarm_log` (\n  `id` bigint NOT NULL\n) ENGINE=InnoDB;',
    3,
  )

  const insertMatches = dumpSql.match(/INSERT INTO/g)
  assert.strictEqual(insertMatches.length, 2)
  assert.match(dumpSql, /INSERT INTO `alarm_log` \(`id`\) VALUES\n\(1\),\n\(2\),\n\(3\);/)
  assert.match(dumpSql, /INSERT INTO `alarm_log` \(`id`\) VALUES\n\(4\),\n\(5\);/)
})

test('table data state preserves filter and paging values when patched', () => {
  const state = createMysqlTableDataState()
  const next = patchMysqlTableDataState(state, {
    filterColumn: 'city_code',
    filterOperator: 'eq',
    filterKeyword: '35401',
    sortColumn: 'created_at',
    sortDirection: 'DESC',
    page: 3,
    pageSize: 100,
  })

  assert.deepEqual(next, {
    filterColumn: 'city_code',
    filterOperator: 'eq',
    filterKeyword: '35401',
    sortColumn: 'created_at',
    sortDirection: 'DESC',
    page: 3,
    pageSize: 100,
  })
  assert.deepEqual(state, createMysqlTableDataState())
})

test('table design draft preserves complex mysql column types', () => {
  const draft = createDesignDraftFromMetadata({
    columns: [
      { name: 'id', columnType: 'bigint unsigned', nullable: false, defaultValue: null },
      { name: 'status', columnType: "enum('draft','DONE')", nullable: true, defaultValue: 'draft' },
    ],
  })

  assert.equal(draft.columns[0].type, 'bigint unsigned')
  assert.equal(draft.columns[0].length, null)
  assert.equal(draft.columns[1].type, "enum('draft','DONE')")
  assert.equal(draft.columns[1].length, null)
})

test('table design request distinguishes empty string default from no default', () => {
  const draft = createDesignDraftFromMetadata({
    columns: [
      { name: 'name', columnType: 'varchar(64)', nullable: true, defaultValue: '' },
      { name: 'remark', columnType: 'varchar(64)', nullable: true, defaultValue: null },
    ],
  })

  const request = buildMysqlDesignRequest('ies_ls', 'asset_boundary', draft)

  assert.deepEqual(
    request.columns.map((column) => ({
      name: column.name,
      defaultValuePresent: column.defaultValuePresent,
      defaultValue: column.defaultValue,
    })),
    [
      { name: 'name', defaultValuePresent: true, defaultValue: '' },
      { name: 'remark', defaultValuePresent: false, defaultValue: null },
    ],
  )
})

test('table design execution error summarizes failed statement detail', () => {
  assert.equal(
    formatMysqlDesignExecutionError({
      success: false,
      message: 'SQL 执行失败',
      results: [
        {
          index: 2,
          success: false,
          message: 'Duplicate column name',
          error: {
            title: '字段已存在',
            detail: 'Duplicate column name id',
          },
        },
      ],
    }),
    '语句 2 执行失败：字段已存在；Duplicate column name id',
  )
})
