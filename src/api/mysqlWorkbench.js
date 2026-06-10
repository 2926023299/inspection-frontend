import http, { buildRequestUrl } from './http'

export const MYSQL_WORKBENCH_SQL_EXECUTE_TIMEOUT_MS = 600000

export const MYSQL_WORKBENCH_DDL_TIMEOUT_MS = 600000

export function listMysqlWorkbenchTree(includeSystemSchemas = false) {
  return http.get('/mysql-workbench/tree', {
    params: { includeSystemSchemas },
  })
}

export function listMysqlSchemas(includeSystemSchemas = false) {
  return http.get('/mysql-workbench/schemas', {
    params: { includeSystemSchemas },
  })
}

export function listMysqlSchemaTables(schema, params = {}) {
  return http.get(`/mysql-workbench/schemas/${encodeURIComponent(schema)}/tables`, {
    params,
  })
}

export function getMysqlTableMetadata(schema, table) {
  return http.get('/mysql-workbench/table/metadata', {
    params: { schema, table },
    timeout: 60000,
  })
}

export function listMysqlTableColumns(schema, tables = []) {
  return http.get(`/mysql-workbench/schemas/${encodeURIComponent(schema)}/columns`, {
    params: { tables: [...new Set(tables)].filter(Boolean).join(',') },
  })
}

export function getMysqlTableDdl(schema, table) {
  return http.get('/mysql-workbench/table/ddl', {
    params: { schema, table },
    timeout: 60000,
  })
}

export function queryMysqlTableData(payload) {
  return http.post('/mysql-workbench/table/data/query', payload, {
    timeout: MYSQL_WORKBENCH_SQL_EXECUTE_TIMEOUT_MS,
  })
}

export function insertMysqlTableRow(payload) {
  return http.post('/mysql-workbench/table/data/insert', payload)
}

export function updateMysqlTableRow(payload) {
  return http.put('/mysql-workbench/table/data/update', payload)
}

export function deleteMysqlTableRow(payload) {
  return http.delete('/mysql-workbench/table/data/delete', {
    data: payload,
  })
}

export function previewMysqlTableDesign(payload) {
  return http.post('/mysql-workbench/design/preview', payload, {
    timeout: MYSQL_WORKBENCH_DDL_TIMEOUT_MS,
  })
}

export function executeMysqlTableDesign(payload) {
  return http.post('/mysql-workbench/design/execute', payload, {
    timeout: MYSQL_WORKBENCH_DDL_TIMEOUT_MS,
  })
}

export function executeMysqlSqlBatch(payload) {
  return http.post('/mysql-workbench/sql/execute', payload, {
    timeout: MYSQL_WORKBENCH_SQL_EXECUTE_TIMEOUT_MS,
  })
}

export function createMysqlSqlExecution(payload) {
  return http.post('/mysql-workbench/sql/executions', payload, {
    timeout: MYSQL_WORKBENCH_SQL_EXECUTE_TIMEOUT_MS,
  })
}

export function getMysqlSqlExecution(executionId) {
  return http.get(`/mysql-workbench/sql/executions/${encodeURIComponent(executionId)}`, {
    timeout: 60000,
  })
}

export function cancelMysqlSqlExecution(executionId) {
  return http.post(`/mysql-workbench/sql/executions/${encodeURIComponent(executionId)}/cancel`)
}

export function listMysqlQueryHistory(params = {}) {
  return http.get('/mysql-workbench/history', { params })
}

export function getMysqlQueryHistoryDetail(batchId) {
  return http.get(`/mysql-workbench/history/${batchId}`)
}

export function listMysqlSavedQueries() {
  return http.get('/mysql-workbench/queries')
}

export function saveMysqlQuery(payload) {
  return http.post('/mysql-workbench/queries', payload)
}

export function deleteMysqlSavedQuery(queryId) {
  return http.delete(`/mysql-workbench/queries/${queryId}`)
}

export function createMysqlExportJob(payload) {
  return http.post('/mysql-workbench/exports', payload)
}

export function listMysqlExportJobs(params = {}) {
  return http.get('/mysql-workbench/exports', { params })
}

export function getMysqlExportJob(jobId) {
  return http.get(`/mysql-workbench/exports/${jobId}`)
}

export function buildMysqlExportDownloadUrl(jobId) {
  return buildRequestUrl(`/mysql-workbench/exports/${encodeURIComponent(jobId)}/download`)
}
