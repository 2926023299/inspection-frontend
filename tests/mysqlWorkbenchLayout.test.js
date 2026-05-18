import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

function readSource(relativePath) {
  return readFileSync(resolve(projectRoot, relativePath), 'utf8')
}

function cssBlock(source, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = source.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`))
  assert.ok(match, `missing CSS block for ${selector}`)
  return match[1]
}

test('table design tab keeps overflowing fields reachable', () => {
  const source = readSource('src/components/mysql-workbench/TableDesignTab.vue')
  const panelBlock = cssBlock(source, '.mysql-design-panel')

  assert.match(panelBlock, /min-height:\s*0;/)
  assert.match(panelBlock, /overflow-y:\s*auto;/)
})

test('ddl preview tab keeps stacked ddl cards reachable on narrow work areas', () => {
  const source = readSource('src/components/mysql-workbench/DdlPreviewTab.vue')
  const panelBlock = cssBlock(source, '.mysql-ddl-panel')

  assert.match(panelBlock, /min-height:\s*0;/)
  assert.match(panelBlock, /overflow-y:\s*auto;/)
  assert.match(source, /@media\s*\(max-width:\s*1080px\)[\s\S]*?\.mysql-ddl-grid\s*\{[\s\S]*?flex:\s*none;/)
})

test('query edit toolbar uses one compact row on desktop', () => {
  const source = readSource('src/components/mysql-workbench/SqlQueryTab.vue')
  const toolbarBlock = cssBlock(source, '.mysql-query-toolbar')
  const rowBlock = cssBlock(source, '.mysql-query-toolbar__edit-row')
  const statusBlock = cssBlock(source, '.mysql-query-toolbar__status')

  assert.match(source, /mysql-query-toolbar__edit-row/)
  assert.match(toolbarBlock, /min-height:\s*60px;/)
  assert.match(rowBlock, /display:\s*flex;/)
  assert.match(rowBlock, /flex-wrap:\s*nowrap;/)
  assert.match(statusBlock, /margin-left:\s*auto;/)
  assert.match(statusBlock, /flex-wrap:\s*nowrap;/)
  assert.match(source, /@media\s*\(max-width:\s*1180px\)[\s\S]*?\.mysql-query-toolbar__edit-row\s*\{[\s\S]*?flex-wrap:\s*wrap;/)
})
