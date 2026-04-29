export function getMysqlTableTabKey(schema, table, type) {
  return `${schema}.${table}:${type}`
}

export function getMysqlTableTabTitle(table, type) {
  if (type === 'design') return `${table} / Design`
  if (type === 'ddl') return `${table} / DDL`
  return `${table} / Data`
}

export function detectDangerousSql(sql) {
  const normalized = String(sql || '').trim()
  if (!normalized) {
    return false
  }

  if (/^\s*(drop|truncate|alter|create|rename)\b/i.test(normalized)) {
    return true
  }

  if (/^\s*update\b/i.test(normalized) && !/\bwhere\b/i.test(normalized)) {
    return true
  }

  return /^\s*delete\b/i.test(normalized) && !/\bwhere\b/i.test(normalized)
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
