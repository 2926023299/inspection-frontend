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

test('table data tab filter state is owned by the workbench tab', () => {
  const pageSource = readSource('src/pages/MysqlWorkbenchPage.vue')
  const tableDataSource = readSource('src/components/mysql-workbench/TableDataTab.vue')

  assert.match(pageSource, /:state="activeTab\.dataState"/)
  assert.match(pageSource, /@update-state="updateTableDataState\(activeTab\.key, \$event\)"/)
  assert.match(tableDataSource, /state:\s*\{/)
  assert.match(tableDataSource, /update-state/)
})

test('object tree data is isolated from ordinary table tab changes', () => {
  const composableSource = readSource('src/composables/useMysqlWorkbench.js')
  const displayTreeMatch = composableSource.match(/const displayTreeNodes = computed\(\(\) => \{[\s\S]*?\n  \}\)/)

  assert.ok(displayTreeMatch, 'displayTreeNodes computed block should exist')
  assert.doesNotMatch(displayTreeMatch[0], /tabs\.value|queryTabs\.value/)
  assert.match(composableSource, /const runtimeQueryNodes = ref\(\[\]\)/)
})

test('object tree reapplies local filter when tree nodes change', () => {
  const treeSource = readSource('src/components/mysql-workbench/ObjectTreePanel.vue')

  assert.match(treeSource, /watch\(\s*\(\) => props\.nodes/)
  assert.match(treeSource, /treeRef\.value\?\.filter\(filterText\.value\)/)
})

test('schema selection resumes partial table loads when more pages exist', () => {
  const composableSource = readSource('src/composables/useMysqlWorkbench.js')

  assert.match(composableSource, /\(!current\.loaded \|\| current\.hasMoreTables\) && !current\.loading/)
  assert.match(composableSource, /page:\s*current\.loaded\s*\?\s*\(current\.tablePage \|\| 1\) \+ 1\s*:\s*1/)
})

test('sql editor mounts completion tooltip outside transformed workbench panels', () => {
  const editorSource = readSource('src/components/mysql-workbench/SqlEditor.vue')

  assert.match(editorSource, /import\s+\{[^}]*tooltips[^}]*\}\s+from\s+'@codemirror\/view'/)
  assert.match(editorSource, /tooltips\(\{\s*parent:\s*tooltipParent,\s*position:\s*'fixed'/)
})

test('sql editor refreshes completion schema after table metadata loads', () => {
  const editorSource = readSource('src/components/mysql-workbench/SqlEditor.vue')
  const queryTabSource = readSource('src/components/mysql-workbench/SqlQueryTab.vue')

  assert.match(editorSource, /new Compartment\(\)/)
  assert.match(editorSource, /sqlExtensionCompartment\.reconfigure\(createSqlExtension\(schema,\s*defaultSchema\)\)/)
  assert.doesNotMatch(queryTabSource, /console\.log\(/)
})

test('sql query tab does not preload every table column from tree changes', () => {
  const queryTabSource = readSource('src/components/mysql-workbench/SqlQueryTab.vue')

  assert.doesNotMatch(queryTabSource, /getMysqlTableMetadata/)
  assert.doesNotMatch(queryTabSource, /watch\(\s*\(\) => props\.treeNodes[\s\S]*loadTableColumns/)
  assert.match(queryTabSource, /:load-table-columns="loadTableColumns"/)
})

test('sql editor asks for table columns only when completing table or alias fields', () => {
  const editorSource = readSource('src/components/mysql-workbench/SqlEditor.vue')

  assert.match(editorSource, /loadTableColumns:\s*\{/)
  assert.match(editorSource, /async function tableAndAliasCompletionSource/)
  assert.match(editorSource, /props\.loadTableColumns/)
  assert.match(editorSource, /function schemaAndTableCompletionSource\(config\)/)
  assert.match(editorSource, /context\.matchBefore\(\/\(\?:`\[\^`\]\+`\|\\w\+\)\\\.\/\)/)
  assert.match(editorSource, /override:\s*\[[\s\S]*tableAndAliasCompletionSource[\s\S]*schemaAndTableCompletionSource\(sqlConfig\)/)
  assert.doesNotMatch(editorSource, /add:\s*\[tableAndAliasCompletionSource\]/)
})

test('table design execution confirms the latest preview and reports backend failures', () => {
  const designSource = readSource('src/components/mysql-workbench/TableDesignTab.vue')

  assert.match(designSource, /const previewRequestFingerprint = ref\(''\)/)
  assert.match(designSource, /previewRequestFingerprint\.value !== getDesignRequestFingerprint\(\)/)
  assert.match(designSource, /formatMysqlDesignExecutionError\(result\)/)
  assert.doesNotMatch(designSource, /ElMessage\.success\('表结构变更已执行'\)[\s\S]*executeMysqlTableDesign/)
})

test('sql execution request has a longer timeout than ordinary api calls', () => {
  const apiSource = readSource('src/api/mysqlWorkbench.js')

  assert.match(apiSource, /MYSQL_WORKBENCH_SQL_EXECUTE_TIMEOUT_MS\s*=\s*600000/)
  assert.match(apiSource, /http\.post\('\/mysql-workbench\/sql\/execute',\s*payload,\s*\{[\s\S]*timeout:\s*MYSQL_WORKBENCH_SQL_EXECUTE_TIMEOUT_MS/)
})

test('ddl design requests use a longer timeout than ordinary api calls', () => {
  const apiSource = readSource('src/api/mysqlWorkbench.js')

  assert.match(apiSource, /MYSQL_WORKBENCH_DDL_TIMEOUT_MS\s*=\s*600000/)
  assert.match(apiSource, /\/mysql-workbench\/design\/execute'[\s\S]*timeout:\s*MYSQL_WORKBENCH_DDL_TIMEOUT_MS/)
  assert.match(apiSource, /\/mysql-workbench\/design\/preview'[\s\S]*timeout:\s*MYSQL_WORKBENCH_DDL_TIMEOUT_MS/)
})

test('sql query executions are submitted asynchronously and can be canceled', () => {
  const apiSource = readSource('src/api/mysqlWorkbench.js')
  const composableSource = readSource('src/composables/useMysqlWorkbench.js')
  const queryTabSource = readSource('src/components/mysql-workbench/SqlQueryTab.vue')
  const pageSource = readSource('src/pages/MysqlWorkbenchPage.vue')

  assert.match(apiSource, /createMysqlSqlExecution/)
  assert.match(apiSource, /getMysqlSqlExecution/)
  assert.match(apiSource, /cancelMysqlSqlExecution/)
  assert.match(composableSource, /createMysqlSqlExecution/)
  assert.match(composableSource, /pollMysqlSqlExecution/)
  assert.match(composableSource, /cancelQueryTab/)
  assert.match(queryTabSource, /cancel-execution/)
  assert.match(queryTabSource, />停止</)
  assert.match(pageSource, /@cancel-execution="cancelQueryTab\(activeTab\.key\)"/)
})
