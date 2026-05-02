import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildMysqlSavedQueryNode,
  createMysqlQueryPresentationState,
  getMysqlQueryTabTreeKey,
  getMysqlSavedQueryTreeKey,
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
