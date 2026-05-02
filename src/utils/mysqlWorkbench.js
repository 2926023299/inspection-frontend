import * as XLSX from 'xlsx'

export function getMysqlTableTabKey(schema, table, type) {
  return `${schema}.${table}:${type}`
}

export function getMysqlTableTabTitle(table, type) {
  if (type === 'design') return `${table} / Design`
  if (type === 'ddl') return `${table} / DDL`
  return `${table} / Data`
}

export function getMysqlSavedQueryTreeKey(queryId) {
  return `saved-query:${queryId}`
}

export function getMysqlQueryTabTreeKey(tab) {
  if (tab?.savedQueryId) {
    return getMysqlSavedQueryTreeKey(tab.savedQueryId)
  }
  return tab?.key || ''
}

export function buildMysqlSavedQueryNode(query) {
  return {
    key: getMysqlSavedQueryTreeKey(query.id),
    label: query.title || `query_${query.id}.sql`,
    type: 'saved-query',
    savedQuery: query,
    children: [],
  }
}

export function createMysqlQueryPresentationState() {
  return {
    viewMode: 'edit',
    sqlPreviewExpanded: false,
  }
}

export function setMysqlQueryResultFocusMode(tab) {
  if (!tab) {
    return
  }
  tab.viewMode = 'result-focus'
  tab.sqlPreviewExpanded = false
}

export function setMysqlQueryEditMode(tab) {
  if (!tab) {
    return
  }
  tab.viewMode = 'edit'
  tab.sqlPreviewExpanded = false
}

export function detectDangerousSql(sql) {
  const normalized = String(sql || '').trim()
  if (!normalized) {
    return false
  }
  const statements = normalized
    .split(';')
    .map((s) => s.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim())
    .filter(Boolean)
  return statements.some((s) => {
    if (/^\s*(drop|truncate|alter|rename)\b/i.test(s)) return true
    if (/^\s*update\b/i.test(s) && !/\bwhere\b/i.test(s)) return true
    if (/^\s*delete\b/i.test(s) && !/\bwhere\b/i.test(s)) return true
    return false
  })
}

export function formatMysqlCell(value) {
  if (value === null || value === undefined) {
    return 'NULL'
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

export function parseMysqlColumnType(columnType = '') {
  const normalized = String(columnType || '').trim()
  const match = normalized.match(/^([a-zA-Z0-9_]+)(?:\((\d+)(?:,(\d+))?\))?/i)
  if (!match) {
    return {
      type: normalized.toUpperCase() || 'VARCHAR',
      length: null,
      scale: null,
    }
  }

  return {
    type: match[1].toUpperCase(),
    length: match[2] ? Number(match[2]) : null,
    scale: match[3] ? Number(match[3]) : null,
  }
}

export function createDesignDraftFromMetadata(metadata) {
  const columns = (metadata?.columns || []).map((column) => {
    const parsedType = parseMysqlColumnType(column.columnType)
    return {
      name: column.name,
      type: parsedType.type,
      length: parsedType.length,
      scale: parsedType.scale,
      nullable: Boolean(column.nullable),
      defaultValue: column.defaultValue ?? '',
      comment: column.comment ?? '',
      autoIncrement: Boolean(column.autoIncrement),
      primaryKey: Boolean(column.primaryKey),
    }
  })

  const indexes = (metadata?.indexes || [])
    .filter((index) => !index.primaryKey)
    .map((index) => ({
      name: index.name,
      unique: Boolean(index.unique),
      columns: [...(index.columns || [])],
    }))

  return {
    tableComment: metadata?.tableComment || '',
    engine: metadata?.engine || 'InnoDB',
    charset: metadata?.charset || 'utf8mb4',
    columns,
    indexes,
  }
}

export function createEmptyDesignColumn() {
  return {
    name: '',
    type: 'VARCHAR',
    length: 64,
    scale: null,
    nullable: true,
    defaultValue: '',
    comment: '',
    autoIncrement: false,
    primaryKey: false,
  }
}

export function createEmptyDesignIndex() {
  return {
    name: '',
    unique: false,
    columns: [],
  }
}

export function buildMysqlDesignRequest(schema, table, draft) {
  return {
    schema,
    table,
    createMode: false,
    tableComment: draft.tableComment || '',
    engine: draft.engine || 'InnoDB',
    charset: draft.charset || 'utf8mb4',
    columns: (draft.columns || []).map((column) => ({
      name: column.name,
      type: column.type,
      length: column.length === '' || column.length === null ? null : Number(column.length),
      scale: column.scale === '' || column.scale === null ? null : Number(column.scale),
      nullable: Boolean(column.nullable),
      defaultValue: column.defaultValue === '' ? null : column.defaultValue,
      comment: column.comment || '',
      autoIncrement: Boolean(column.autoIncrement),
      primaryKey: Boolean(column.primaryKey),
    })),
    indexes: (draft.indexes || [])
      .filter((index) => index.name && Array.isArray(index.columns) && index.columns.length)
      .map((index) => ({
        name: index.name,
        unique: Boolean(index.unique),
        columns: [...index.columns],
      })),
  }
}

export function buildRowKeyValues(row, keyColumns = []) {
  return keyColumns.reduce((result, columnName) => {
    result[columnName] = row?.[columnName]
    return result
  }, {})
}

export function buildMysqlDumpSql(schema, table, columns, rows, ddl) {
  const tbl = `\`${table}\``
  const parts = [
    `-- ----------------------------`,
    `-- Table structure for ${table}`,
    `-- ----------------------------`,
    `DROP TABLE IF EXISTS ${tbl};`,
  ]
  if (ddl) {
    parts.push(ddl.trim().replace(/;?\s*$/, ';'))
  }
  parts.push('')
  if (columns?.length && rows?.length) {
    parts.push(`-- ----------------------------`)
    parts.push(`-- Records of ${table}`)
    parts.push(`-- ----------------------------`)
    const colList = columns.map((c) => `\`${c}\``).join(', ')
    for (const row of rows) {
      const values = columns.map((col) => {
        const v = row[col]
        if (v === null || v === undefined) return 'NULL'
        if (typeof v === 'number') return String(v)
        return `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
      })
      parts.push(`INSERT INTO ${tbl} (${colList}) VALUES (${values.join(', ')});`)
    }
  }
  return parts.join('\n')
}

export function exportMysqlExcel(filename, columns, rows) {
  const data = (rows || []).map((row) => {
    const obj = {}
    columns.forEach((col) => {
      const v = row[col]
      obj[col] = v === null || v === undefined ? '' : String(v)
    })
    return obj
  })
  const ws = XLSX.utils.json_to_sheet(data)
  for (const key of Object.keys(ws)) {
    if (key[0] === '!') continue
    if (ws[key]) ws[key].t = 's'
  }
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  XLSX.writeFile(wb, filename)
}

export function readMysqlSqlFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}
