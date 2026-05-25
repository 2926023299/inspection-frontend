import { ref } from 'vue'
import { getMysqlTableMetadata, listMysqlTableColumns } from '@/api/mysqlWorkbench'
import { createMysqlMetadataCache } from '@/utils/mysqlMetadataCache'

const metadataCacheVersion = ref(0)

const mysqlMetadataCache = createMysqlMetadataCache({
  getTableMetadata: getMysqlTableMetadata,
  listTableColumns: listMysqlTableColumns,
  onChange: () => {
    metadataCacheVersion.value += 1
  },
})

export function getMysqlTableMetadataCached(schema, table, options = {}) {
  return mysqlMetadataCache.getTableMetadataCached(schema, table, options)
}

export function getMysqlTableColumnsCached(schema, table, options = {}) {
  return mysqlMetadataCache.getTableColumnsCached(schema, table, options)
}

export function peekMysqlTableColumns(schema, table) {
  return mysqlMetadataCache.peekTableColumns(schema, table)
}

export function invalidateMysqlTableMetadata(schema, table) {
  mysqlMetadataCache.invalidateTable(schema, table)
}

export function clearMysqlMetadataCache() {
  mysqlMetadataCache.clear()
}

export function useMysqlMetadataCache() {
  return {
    metadataCacheVersion,
    getMysqlTableMetadataCached,
    getMysqlTableColumnsCached,
    peekMysqlTableColumns,
    invalidateMysqlTableMetadata,
    clearMysqlMetadataCache,
  }
}
