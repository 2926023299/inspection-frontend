# MySQL Query Result-Focus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically switch a MySQL query tab into a result-first view after execution, so result tables and errors get most of the available height.

**Architecture:** Keep route/page composition thin. Put query presentation state and execution transitions in `useMysqlWorkbench`, render both `edit` and `result-focus` modes inside `SqlQueryTab`, and wire the new toolbar actions through `MysqlWorkbenchPage`. Use a small tested helper layer in `utils/mysqlWorkbench.js` for deterministic query-tab state transitions because the project does not currently have a Vue SFC test harness.

**Tech Stack:** Vue 3 SFCs, Element Plus, Vite, Node test runner

---

## File Map

- Modify: `C:/Users/GXL/IdeaProjects/inspection-frontend/src/utils/mysqlWorkbench.js`
- Modify: `C:/Users/GXL/IdeaProjects/inspection-frontend/src/composables/useMysqlWorkbench.js`
- Modify: `C:/Users/GXL/IdeaProjects/inspection-frontend/src/components/mysql-workbench/SqlQueryTab.vue`
- Modify: `C:/Users/GXL/IdeaProjects/inspection-frontend/src/pages/MysqlWorkbenchPage.vue`
- Modify: `C:/Users/GXL/IdeaProjects/inspection-frontend/tests/mysqlWorkbench.test.js`

## Verification Strategy

- State-transition regressions: `node --test tests/mysqlWorkbench.test.js`
- UI compilation safety: `npm run build`
- No separate browser test harness exists in this repo today, so visual behavior is verified via deterministic state tests plus production build.

### Task 1: Add Tested Query View-State Helpers

**Files:**
- Modify: `C:/Users/GXL/IdeaProjects/inspection-frontend/src/utils/mysqlWorkbench.js`
- Modify: `C:/Users/GXL/IdeaProjects/inspection-frontend/tests/mysqlWorkbench.test.js`

- [ ] **Step 1: Write the failing state-transition tests**

Add these tests to `tests/mysqlWorkbench.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createMysqlQueryPresentationState,
  setMysqlQueryResultFocusMode,
  setMysqlQueryEditMode,
} from '../src/utils/mysqlWorkbench.js'

test('new query presentation state starts in edit mode', () => {
  assert.deepEqual(createMysqlQueryPresentationState(), {
    viewMode: 'edit',
    sqlPreviewExpanded: false,
  })
})

test('result-focus mode closes inline sql preview by default', () => {
  const tab = {
    viewMode: 'edit',
    sqlPreviewExpanded: true,
  }

  setMysqlQueryResultFocusMode(tab)

  assert.equal(tab.viewMode, 'result-focus')
  assert.equal(tab.sqlPreviewExpanded, false)
})

test('returning to edit mode preserves the tab sql and closes preview', () => {
  const tab = {
    sql: 'select 1;',
    viewMode: 'result-focus',
    sqlPreviewExpanded: true,
  }

  setMysqlQueryEditMode(tab)

  assert.equal(tab.sql, 'select 1;')
  assert.equal(tab.viewMode, 'edit')
  assert.equal(tab.sqlPreviewExpanded, false)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npm test
```

Expected: FAIL because the new helper exports do not exist yet.

- [ ] **Step 3: Implement the helper exports in `src/utils/mysqlWorkbench.js`**

Add these exports near the other query-related helpers:

```js
export function createMysqlQueryPresentationState() {
  return {
    viewMode: 'edit',
    sqlPreviewExpanded: false,
  }
}

export function setMysqlQueryResultFocusMode(tab) {
  if (!tab) return
  tab.viewMode = 'result-focus'
  tab.sqlPreviewExpanded = false
}

export function setMysqlQueryEditMode(tab) {
  if (!tab) return
  tab.viewMode = 'edit'
  tab.sqlPreviewExpanded = false
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:

```bash
npm test
```

Expected: PASS with the new query presentation-state tests green.

- [ ] **Step 5: Commit**

```bash
git add C:/Users/GXL/IdeaProjects/inspection-frontend/src/utils/mysqlWorkbench.js C:/Users/GXL/IdeaProjects/inspection-frontend/tests/mysqlWorkbench.test.js
git commit -m "test: cover mysql query result-focus state helpers"
```

### Task 2: Wire Result-Focus State Into The Query Composable

**Files:**
- Modify: `C:/Users/GXL/IdeaProjects/inspection-frontend/src/composables/useMysqlWorkbench.js`
- Modify: `C:/Users/GXL/IdeaProjects/inspection-frontend/src/utils/mysqlWorkbench.js`

- [ ] **Step 1: Add failing regression coverage for execution transition**

Extend `tests/mysqlWorkbench.test.js` with this additional expectation:

```js
test('result-focus helper can be re-entered from edit mode repeatedly', () => {
  const tab = {
    viewMode: 'edit',
    sqlPreviewExpanded: false,
  }

  setMysqlQueryResultFocusMode(tab)
  setMysqlQueryEditMode(tab)
  setMysqlQueryResultFocusMode(tab)

  assert.equal(tab.viewMode, 'result-focus')
  assert.equal(tab.sqlPreviewExpanded, false)
})
```

- [ ] **Step 2: Run the tests to verify the new case initially fails if needed**

Run:

```bash
npm test
```

Expected: If helper semantics are incomplete, this new case should expose it; otherwise it passes and protects the upcoming composable wiring.

- [ ] **Step 3: Add query presentation state defaults and actions in `useMysqlWorkbench.js`**

Update imports:

```js
import {
  buildMysqlSavedQueryNode,
  createMysqlQueryPresentationState,
  detectDangerousSql,
  getMysqlQueryTabTreeKey,
  getMysqlTableTabKey,
  getMysqlTableTabTitle,
  setMysqlQueryEditMode,
  setMysqlQueryResultFocusMode,
} from '@/utils/mysqlWorkbench'
```

Update `openQueryTab()` so the created tab includes the presentation defaults:

```js
const tab = {
  key,
  type: 'query',
  savedQueryId: initial.savedQueryId || initial.id || null,
  title: initial.title || `query_${seed}.sql`,
  schema: initial.schema || initial.schemaName || schemaOptions.value[0]?.value || '',
  sql: initial.sql || initial.sqlText || '',
  results: [],
  executing: false,
  batchId: null,
  dangerous: false,
  saveStatus: initial.savedQueryId || initial.id ? 'saved' : 'draft',
  saveError: '',
  reloadToken: 0,
  ...createMysqlQueryPresentationState(),
}
```

Add composable actions:

```js
function showQueryEditMode(key) {
  const tab = tabs.value.find((item) => item.key === key)
  if (!tab || tab.type !== 'query') return
  setMysqlQueryEditMode(tab)
}

function showQueryResultFocus(key) {
  const tab = tabs.value.find((item) => item.key === key)
  if (!tab || tab.type !== 'query') return
  setMysqlQueryResultFocusMode(tab)
}

function toggleQuerySqlPreview(key) {
  const tab = tabs.value.find((item) => item.key === key)
  if (!tab || tab.type !== 'query' || tab.viewMode !== 'result-focus') return
  tab.sqlPreviewExpanded = !tab.sqlPreviewExpanded
}
```

Inside `executeQueryTab()`, after `tab.executionMessage` is assigned in the success-path `try` block, switch mode automatically:

```js
setMysqlQueryResultFocusMode(tab)
```

This should happen whether the batch is `SUCCESS` or `FAILED`, because failed execution still goes to the result-first surface.

- [ ] **Step 4: Export the new composable actions**

Return these from `useMysqlWorkbench()`:

```js
showQueryEditMode,
showQueryResultFocus,
toggleQuerySqlPreview,
```

- [ ] **Step 5: Run automated verification**

Run:

```bash
npm test
npm run build
```

Expected: both commands pass.

- [ ] **Step 6: Commit**

```bash
git add C:/Users/GXL/IdeaProjects/inspection-frontend/src/composables/useMysqlWorkbench.js C:/Users/GXL/IdeaProjects/inspection-frontend/src/utils/mysqlWorkbench.js C:/Users/GXL/IdeaProjects/inspection-frontend/tests/mysqlWorkbench.test.js
git commit -m "feat: add mysql query result-focus state"
```

### Task 3: Render Edit And Result-Focus Modes In `SqlQueryTab`

**Files:**
- Modify: `C:/Users/GXL/IdeaProjects/inspection-frontend/src/components/mysql-workbench/SqlQueryTab.vue`

- [ ] **Step 1: Add the new emitted actions to the component contract**

Update `defineEmits()`:

```js
const emit = defineEmits([
  'change-sql',
  'change-schema',
  'change-title',
  'execute',
  'open-history',
  'show-edit-mode',
  'toggle-sql-preview',
])
```

- [ ] **Step 2: Add computed guards for the two view modes**

Add these computed values near the other query display helpers:

```js
const isEditMode = computed(() => props.tab.viewMode !== 'result-focus')
const isResultFocusMode = computed(() => props.tab.viewMode === 'result-focus')
const shouldShowSqlPreview = computed(() => isResultFocusMode.value && props.tab.sqlPreviewExpanded)
```

- [ ] **Step 3: Replace the current single-layout template with a two-mode template**

Render edit mode with the existing editor-first layout:

```vue
<section v-if="isEditMode" class="content-panel compact-main-panel mysql-query-panel">
  <div class="mysql-query-editor">
    <el-input
      :model-value="tab.sql"
      type="textarea"
      :autosize="{ minRows: 16, maxRows: 22 }"
      placeholder="在这里输入 SQL，支持多语句批量执行。"
      @update:model-value="$emit('change-sql', $event)"
    />
  </div>

  <div class="mysql-query-results compact-scroll-body">
    <!-- keep the existing result rendering block here -->
  </div>
</section>
```

Render result-focus mode as a result-first viewer:

```vue
<section v-else class="content-panel compact-main-panel mysql-query-focus-panel">
  <div class="mysql-query-focus-toolbar">
    <div class="mysql-query-focus-toolbar__meta">
      <strong>{{ tab.title }}</strong>
      <span>{{ tab.schema || '未指定 schema' }}</span>
      <span>{{ tab.batchId ? `批次 #${tab.batchId}` : '未执行' }}</span>
    </div>

    <div class="mysql-query-focus-toolbar__actions">
      <el-button size="small" @click="$emit('show-edit-mode')">返回编辑</el-button>
      <el-button type="primary" size="small" :loading="tab.executing" @click="$emit('execute')">再执行</el-button>
      <el-button size="small" @click="$emit('toggle-sql-preview')">展开 SQL</el-button>
      <el-button size="small" :disabled="!tab.batchId" @click="$emit('open-history')">查看历史</el-button>
    </div>
  </div>

  <div v-if="shouldShowSqlPreview" class="mysql-query-focus-preview">
    <pre>{{ tab.sql }}</pre>
  </div>

  <div class="mysql-query-focus-results compact-scroll-body">
    <!-- move the existing result rendering block here for this mode -->
  </div>
</section>
```

- [ ] **Step 4: Add local styles for the result-focus surface**

Add styles like:

```css
.mysql-query-focus-panel {
  flex: 1;
  gap: 12px;
}

.mysql-query-focus-toolbar,
.mysql-query-focus-toolbar__meta,
.mysql-query-focus-toolbar__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.mysql-query-focus-toolbar {
  justify-content: space-between;
}

.mysql-query-focus-toolbar__meta span {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(23, 36, 55, 0.06);
  color: var(--text-subtle);
  font-size: 12px;
}

.mysql-query-focus-preview {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(23, 36, 55, 0.08);
}

.mysql-query-focus-preview pre {
  margin: 0;
  white-space: pre-wrap;
  font-family: Consolas, "Cascadia Code", monospace;
  font-size: 12px;
  line-height: 1.55;
}

.mysql-query-focus-results {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
```

- [ ] **Step 5: Run build verification**

Run:

```bash
npm run build
```

Expected: PASS with no Vue template or style errors.

- [ ] **Step 6: Commit**

```bash
git add C:/Users/GXL/IdeaProjects/inspection-frontend/src/components/mysql-workbench/SqlQueryTab.vue
git commit -m "feat: add mysql query result-focus view"
```

### Task 4: Wire The New Query-Tab Actions Through The Page

**Files:**
- Modify: `C:/Users/GXL/IdeaProjects/inspection-frontend/src/pages/MysqlWorkbenchPage.vue`
- Modify: `C:/Users/GXL/IdeaProjects/inspection-frontend/src/composables/useMysqlWorkbench.js`

- [ ] **Step 1: Pull the new composable actions into `MysqlWorkbenchPage.vue`**

Update the destructuring from `useMysqlWorkbench()`:

```js
const {
  treeLoading,
  error,
  includeSystemSchemas,
  displayTreeNodes,
  activeTreeKey,
  tabs,
  activeTabKey,
  activeTab,
  schemaOptions,
  loadTree,
  toggleSystemSchemas,
  activateTab,
  closeTab,
  openTableTab,
  openQueryTab,
  openHistoryTab,
  handleTreeNodeSelect,
  updateQueryTab,
  markTableTabsStale,
  updateTablePreview,
  executeQueryTab,
  showQueryEditMode,
  toggleQuerySqlPreview,
} = useMysqlWorkbench()
```

- [ ] **Step 2: Wire the new emits on `SqlQueryTab`**

Update the component usage:

```vue
<SqlQueryTab
  v-else-if="activeTab?.type === 'query'"
  :tab="activeTab"
  :schema-options="schemaOptions"
  @change-title="updateQueryTab(activeTab.key, { title: $event })"
  @change-sql="updateQueryTab(activeTab.key, { sql: $event })"
  @change-schema="updateQueryTab(activeTab.key, { schema: $event })"
  @execute="executeQueryTab(activeTab.key)"
  @open-history="handleOpenHistoryFromQuery"
  @show-edit-mode="showQueryEditMode(activeTab.key)"
  @toggle-sql-preview="toggleQuerySqlPreview(activeTab.key)"
/>
```

- [ ] **Step 3: Run final verification**

Run:

```bash
npm test
npm run build
```

Expected: both commands pass, with `npm test` covering the result-focus helper behavior and `npm run build` confirming the integrated UI compiles.

- [ ] **Step 4: Inspect final diff**

Run:

```bash
git diff -- C:/Users/GXL/IdeaProjects/inspection-frontend/src/utils/mysqlWorkbench.js C:/Users/GXL/IdeaProjects/inspection-frontend/src/composables/useMysqlWorkbench.js C:/Users/GXL/IdeaProjects/inspection-frontend/src/components/mysql-workbench/SqlQueryTab.vue C:/Users/GXL/IdeaProjects/inspection-frontend/src/pages/MysqlWorkbenchPage.vue C:/Users/GXL/IdeaProjects/inspection-frontend/tests/mysqlWorkbench.test.js
```

Expected:
- query tabs gain `edit` and `result-focus` state
- execution transitions automatically into result-focus mode
- result-focus toolbar exposes only the approved actions
- SQL preview is read-only and secondary

- [ ] **Step 5: Commit**

```bash
git add C:/Users/GXL/IdeaProjects/inspection-frontend/src/utils/mysqlWorkbench.js C:/Users/GXL/IdeaProjects/inspection-frontend/src/composables/useMysqlWorkbench.js C:/Users/GXL/IdeaProjects/inspection-frontend/src/components/mysql-workbench/SqlQueryTab.vue C:/Users/GXL/IdeaProjects/inspection-frontend/src/pages/MysqlWorkbenchPage.vue C:/Users/GXL/IdeaProjects/inspection-frontend/tests/mysqlWorkbench.test.js
git commit -m "feat: focus mysql query tabs on results after execution"
```
