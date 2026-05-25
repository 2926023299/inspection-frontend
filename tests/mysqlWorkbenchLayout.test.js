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

test('query sql editor has a draggable height splitter above results', () => {
  const queryTabSource = readSource('src/components/mysql-workbench/SqlQueryTab.vue')
  const editorSource = readSource('src/components/mysql-workbench/SqlEditor.vue')
  const editorBlock = cssBlock(queryTabSource, '.mysql-query-editor')
  const splitterBlock = cssBlock(queryTabSource, '.mysql-query-resize')

  assert.match(queryTabSource, /editorHeightStyle/)
  assert.match(queryTabSource, /function startEditorResize\(/)
  assert.match(queryTabSource, /@pointerdown="startEditorResize"/)
  assert.match(queryTabSource, /@dblclick="resetEditorHeight"/)
  assert.match(queryTabSource, /--mysql-query-editor-height/)
  assert.match(editorBlock, /height:\s*var\(--mysql-query-editor-height\);/)
  assert.match(splitterBlock, /cursor:\s*row-resize;/)
  assert.match(editorSource, /height:\s*100%;/)
  assert.doesNotMatch(editorSource, /minHeight:\s*'320px'/)
})

test('mysql workbench keeps scrolling inside the work area instead of the whole app shell', () => {
  const routerSource = readSource('src/router/index.js')
  const layoutSource = readSource('src/components/Layout.vue')
  const mysqlPageSource = readSource('src/pages/MysqlWorkbenchPage.vue')

  assert.match(routerSource, /name:\s*'MysqlWorkbenchPage'[\s\S]*?fixedViewport:\s*true/)
  assert.match(layoutSource, /'is-fixed-viewport':\s*fixedViewport/)
  assert.match(layoutSource, /document\.documentElement\.classList\.toggle\('is-fixed-viewport-route',\s*enabled\)/)
  assert.match(layoutSource, /document\.body\.classList\.toggle\('is-fixed-viewport-route',\s*enabled\)/)
  assert.match(layoutSource, /\.layout-shell\.is-fixed-viewport\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?inset:\s*0;/)
  assert.match(layoutSource, /\.layout-shell\.is-fixed-viewport\s*\{[\s\S]*?height:\s*100vh;[\s\S]*?overflow:\s*hidden;/)
  assert.match(readSource('src/style.css'), /html\.is-fixed-viewport-route,\s*body\.is-fixed-viewport-route\s*\{[\s\S]*?overflow:\s*hidden;/)
  assert.match(mysqlPageSource, /\.mysql-workbench-page\s*\{[\s\S]*?height:\s*100%;[\s\S]*?overflow:\s*hidden;/)
  assert.match(mysqlPageSource, /@media\s*\(max-width:\s*760px\)[\s\S]*?grid-template-rows:\s*minmax\(0,\s*280px\)\s*minmax\(0,\s*1fr\);/)
  assert.doesNotMatch(mysqlPageSource, /@media\s*\(max-width:\s*1180px\)[\s\S]*?grid-template-columns:\s*1fr;/)
})
