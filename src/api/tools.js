import http from './http'

// ---- 时间戳工具 ----

export function convertTimestamp(params) {
  return http.post('/tools/timestamp/convert', params)
}

export function fetchCurrentTimestamp() {
  return http.get('/tools/timestamp/current')
}

// ---- OTS 查询工具 ----

export function fetchOtsTables() {
  return http.get('/tools/ots/tables')
}

export function fetchOtsTableSchema(tableName) {
  return http.get(`/tools/ots/tables/${tableName}/schema`)
}

export function queryOtsRange(params) {
  return http.post('/tools/ots/query', params)
}
