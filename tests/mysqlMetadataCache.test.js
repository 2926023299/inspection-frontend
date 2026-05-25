import test from 'node:test'
import assert from 'node:assert/strict'
import { createMysqlMetadataCache } from '../src/utils/mysqlMetadataCache.js'

test('mysql metadata cache loads table columns on demand and reuses pending requests', async () => {
  let callCount = 0
  let resolveColumns
  const cache = createMysqlMetadataCache({
    listTableColumns: (schema, tables) => {
      callCount += 1
      assert.equal(schema, 'ies_xs')
      assert.deepEqual(tables, ['breaker'])
      return new Promise((resolve) => {
        resolveColumns = resolve
      })
    },
  })

  const first = cache.getTableColumnsCached('ies_xs', 'breaker')
  const second = cache.getTableColumnsCached('ies_xs', 'breaker')

  assert.equal(callCount, 1)
  resolveColumns({ breaker: ['id', 'name'] })

  assert.deepEqual(await first, ['id', 'name'])
  assert.deepEqual(await second, ['id', 'name'])
  assert.deepEqual(await cache.getTableColumnsCached('ies_xs', 'breaker'), ['id', 'name'])
  assert.equal(callCount, 1)
})

test('mysql metadata cache invalidates table metadata and columns together', async () => {
  let callCount = 0
  const cache = createMysqlMetadataCache({
    listTableColumns: async () => {
      callCount += 1
      return { breaker: [`id_${callCount}`] }
    },
  })

  assert.deepEqual(await cache.getTableColumnsCached('ies_xs', 'breaker'), ['id_1'])
  assert.deepEqual(cache.peekTableColumns('ies_xs', 'breaker'), ['id_1'])

  cache.invalidateTable('ies_xs', 'breaker')

  assert.equal(cache.peekTableColumns('ies_xs', 'breaker'), null)
  assert.deepEqual(await cache.getTableColumnsCached('ies_xs', 'breaker'), ['id_2'])
})
