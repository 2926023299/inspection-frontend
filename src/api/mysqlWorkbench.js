import http, { buildRequestUrl } from './http'

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
  })
}

export function getMysqlTableDdl(schema, table) {
  return http.get('/mysql-workbench/table/ddl', {
    params: { schema, table },
  })
}

export function queryMysqlTableData(payload) {
  return http.post('/mysql-workbench/table/data/query', payload)
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
  return http.post('/mysql-workbench/design/preview', payload)
}

export function executeMysqlTableDesign(payload) {
  return http.post('/mysql-workbench/design/execute', payload)
}

export function executeMysqlSqlBatch(payload) {
  return http.post('/mysql-workbench/sql/execute', payload)
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
