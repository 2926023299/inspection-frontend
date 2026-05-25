const DEFAULT_TTL_MS = 10 * 60 * 1000

function normalizeName(value) {
  return String(value || '').trim()
}

function buildTableKey(schema, table) {
  return `${normalizeName(schema)}.${normalizeName(table)}`
}

function normalizeColumns(columns) {
  return (columns || [])
    .map((column) => {
      if (typeof column === 'string') return column
      return column?.name
    })
    .filter(Boolean)
}

function isFresh(entry, now, ttlMs) {
  return Boolean(entry) && now() - entry.loadedAt < ttlMs
}

function cloneArray(value) {
  return Array.isArray(value) ? [...value] : null
}

export function createMysqlMetadataCache({
  getTableMetadata,
  listTableColumns,
  ttlMs = DEFAULT_TTL_MS,
  now = () => Date.now(),
  onChange = () => {},
} = {}) {
  const metadataCache = new Map()
  const columnsCache = new Map()
  const metadataPending = new Map()
  const columnsPending = new Map()

  function storeMetadata(schema, table, metadata) {
    const key = buildTableKey(schema, table)
    metadataCache.set(key, { value: metadata, loadedAt: now() })
    const columns = normalizeColumns(metadata?.columns)
    if (columns.length) {
      columnsCache.set(key, { value: columns, loadedAt: now() })
    }
    onChange()
    return metadata
  }

  function storeColumns(schema, table, columns) {
    const key = buildTableKey(schema, table)
    const normalizedColumns = normalizeColumns(columns)
    columnsCache.set(key, { value: normalizedColumns, loadedAt: now() })
    onChange()
    return cloneArray(normalizedColumns) || []
  }

  async function getTableMetadataCached(schema, table, options = {}) {
    const schemaName = normalizeName(schema)
    const tableName = normalizeName(table)
    if (!schemaName || !tableName || typeof getTableMetadata !== 'function') {
      return null
    }

    const key = buildTableKey(schemaName, tableName)
    const cached = metadataCache.get(key)
    if (!options.force && isFresh(cached, now, ttlMs)) {
      return cached.value
    }
    if (!options.force && metadataPending.has(key)) {
      return metadataPending.get(key)
    }

    const request = Promise.resolve(getTableMetadata(schemaName, tableName))
      .then((metadata) => storeMetadata(schemaName, tableName, metadata))
      .finally(() => {
        metadataPending.delete(key)
      })
    metadataPending.set(key, request)
    return request
  }

  async function getTableColumnsCached(schema, table, options = {}) {
    const schemaName = normalizeName(schema)
    const tableName = normalizeName(table)
    if (!schemaName || !tableName) {
      return []
    }

    const key = buildTableKey(schemaName, tableName)
    const cachedColumns = columnsCache.get(key)
    if (!options.force && isFresh(cachedColumns, now, ttlMs)) {
      return cloneArray(cachedColumns.value) || []
    }

    const cachedMetadata = metadataCache.get(key)
    if (!options.force && isFresh(cachedMetadata, now, ttlMs)) {
      const columns = normalizeColumns(cachedMetadata.value?.columns)
      if (columns.length) {
        return storeColumns(schemaName, tableName, columns)
      }
    }

    if (!options.force && columnsPending.has(key)) {
      return columnsPending.get(key)
    }

    const request = loadColumns(schemaName, tableName, options)
      .finally(() => {
        columnsPending.delete(key)
      })
    columnsPending.set(key, request)
    return request
  }

  async function loadColumns(schema, table, options) {
    if (typeof listTableColumns === 'function') {
      const result = await listTableColumns(schema, [table])
      return storeColumns(schema, table, result?.[table] || [])
    }

    const metadata = await getTableMetadataCached(schema, table, options)
    return storeColumns(schema, table, metadata?.columns || [])
  }

  async function getManyTableColumnsCached(schema, tables = [], options = {}) {
    const schemaName = normalizeName(schema)
    const uniqueTables = [...new Set((tables || []).map(normalizeName).filter(Boolean))]
    const result = {}
    const missingTables = []

    for (const table of uniqueTables) {
      const cached = peekTableColumns(schemaName, table)
      if (!options.force && cached) {
        result[table] = cached
      } else {
        missingTables.push(table)
      }
    }

    if (missingTables.length && typeof listTableColumns === 'function') {
      const loaded = await listTableColumns(schemaName, missingTables)
      for (const table of missingTables) {
        result[table] = storeColumns(schemaName, table, loaded?.[table] || [])
      }
      return result
    }

    await Promise.all(missingTables.map(async (table) => {
      result[table] = await getTableColumnsCached(schemaName, table, options)
    }))
    return result
  }

  function peekTableColumns(schema, table) {
    const key = buildTableKey(schema, table)
    const cached = columnsCache.get(key)
    if (isFresh(cached, now, ttlMs)) {
      return cloneArray(cached.value) || []
    }
    return null
  }

  function invalidateTable(schema, table) {
    const key = buildTableKey(schema, table)
    metadataCache.delete(key)
    columnsCache.delete(key)
    metadataPending.delete(key)
    columnsPending.delete(key)
    onChange()
  }

  function clear() {
    metadataCache.clear()
    columnsCache.clear()
    metadataPending.clear()
    columnsPending.clear()
    onChange()
  }

  return {
    getTableMetadataCached,
    getTableColumnsCached,
    getManyTableColumnsCached,
    peekTableColumns,
    invalidateTable,
    clear,
  }
}
