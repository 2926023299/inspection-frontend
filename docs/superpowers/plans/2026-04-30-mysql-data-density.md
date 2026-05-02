# MySQL Data Density Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the MySQL table data tab into a single compact card so filters, actions, warning state, table, and pagination use substantially less vertical space.

**Architecture:** Keep all behavior in the existing `TableDataTab.vue` component and only change template structure plus local styles. Reuse the current data-loading and table actions as-is, but merge the current stacked cards into one dense primary panel with an inline warning strip and smaller controls.

**Tech Stack:** Vue 3 SFCs, Element Plus, Vite

---

## File Map

- Modify: `C:/Users/GXL/IdeaProjects/inspection-frontend/src/components/mysql-workbench/TableDataTab.vue`
- Verify: `C:/Users/GXL/IdeaProjects/inspection-frontend/package.json`

No API or composable changes are required for this task.

### Task 1: Merge The Data View Into One Primary Panel

**Files:**
- Modify: `C:/Users/GXL/IdeaProjects/inspection-frontend/src/components/mysql-workbench/TableDataTab.vue`
- Verify: `C:/Users/GXL/IdeaProjects/inspection-frontend/src/components/mysql-workbench/TableDataTab.vue`

- [ ] **Step 1: Write the failing verification target**

Document the expected compact structure before editing:

```text
Expected after change:
1. No standalone "Data Grid" header block.
2. No separate read-only warning card.
3. One `content-panel compact-main-panel mysql-data-panel` wraps:
   - compact title/actions header
   - compact filters row
   - optional inline warning strip
   - table shell
   - compact footer
```

- [ ] **Step 2: Verify the current component still has the old stacked structure**

Run:

```powershell
Get-Content -Raw C:\Users\GXL\IdeaProjects\inspection-frontend\src\components\mysql-workbench\TableDataTab.vue
```

Expected: the file contains separate `mysql-data-toolbar`, `mysql-data-alert`, and a second `section-heading` with `Data Grid`.

- [ ] **Step 3: Replace the stacked template with a single-card compact structure**

Update the template section to this shape:

```vue
<template>
  <div class="tab-surface">
    <section v-if="error" class="mysql-data-alert">
      <el-alert type="error" :closable="false" show-icon :title="error" />
    </section>

    <section class="content-panel compact-main-panel mysql-data-panel">
      <div class="mysql-data-panel__top">
        <div class="mysql-data-panel__headline">
          <div class="mysql-data-panel__title-block">
            <h2 class="mysql-data-panel__title">{{ schema }}.{{ table }}</h2>
            <div class="mysql-data-panel__meta">
              <span>总行数：{{ total }}</span>
              <span>主定位键：{{ keyColumns.join(', ') || '无' }}</span>
              <span>{{ readOnly ? '只读表' : '可编辑表' }}</span>
            </div>
          </div>

          <div class="mysql-data-panel__actions">
            <el-button size="small" @click="$emit('open-query', { schema, sql: `SELECT * FROM ${schema}.${table} LIMIT 200;` })">打开查询标签</el-button>
            <el-button size="small" @click="$emit('open-ddl', { schema, table })">查看 DDL</el-button>
            <el-button size="small" @click="$emit('open-design', { schema, table })">表设计</el-button>
            <el-button size="small" type="primary" :disabled="readOnly" @click="openInsertDialog">新增行</el-button>
          </div>
        </div>

        <div class="mysql-data-panel__filters">
          <el-select v-model="filterColumn" class="mysql-data-toolbar__filter" placeholder="筛选字段" size="small">
            <el-option v-for="option in filterOptions" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
          <el-select v-model="filterOperator" class="mysql-data-toolbar__operator" size="small">
            <el-option label="包含" value="like" />
            <el-option label="等于" value="eq" />
            <el-option label="大于" value="gt" />
            <el-option label="小于" value="lt" />
          </el-select>
          <el-input v-model="filterKeyword" class="mysql-data-toolbar__keyword" placeholder="输入筛选值" clearable size="small" @keyup.enter="loadRows" />
          <el-button size="small" type="primary" @click="loadRows">查询</el-button>
          <el-button size="small" @click="handleResetFilters">重置</el-button>
        </div>

        <div v-if="readOnly" class="mysql-data-panel__inline-warning">
          <el-alert type="warning" :closable="false" show-icon :title="metadata?.readOnlyReason || '当前表只读'" />
        </div>
      </div>

      <div class="compact-table-shell">
        <!-- keep existing el-table markup here -->
      </div>

      <div class="mysql-data-status">
        <div class="mysql-data-status__meta">
          <span>每页 {{ pageSize }} 行</span>
          <span>当前选中：{{ currentRow ? '1 行' : '未选中' }}</span>
          <span>{{ readOnly ? '当前表不支持表格写操作' : '当前表支持新增 / 更新 / 删除' }}</span>
        </div>

        <el-pagination
          :current-page="page"
          :page-size="pageSize"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </section>

    <el-dialog v-model="dialogVisible" :title="dialogMode === 'insert' ? '新增数据行' : '编辑数据行'" width="720px">
      <!-- keep existing dialog content -->
    </el-dialog>
  </div>
</template>
```

- [ ] **Step 4: Verify the new structure is present**

Run:

```powershell
Get-Content -Raw C:\Users\GXL\IdeaProjects\inspection-frontend\src\components\mysql-workbench\TableDataTab.vue
```

Expected:
- `Data Grid` heading block is gone
- inline warning container `mysql-data-panel__inline-warning` exists
- the action buttons use `size="small"`

- [ ] **Step 5: Commit the structural change**

```bash
git add C:/Users/GXL/IdeaProjects/inspection-frontend/src/components/mysql-workbench/TableDataTab.vue
git commit -m "refactor: merge mysql data tab into single compact panel"
```

### Task 2: Tighten Local Styles For Density

**Files:**
- Modify: `C:/Users/GXL/IdeaProjects/inspection-frontend/src/components/mysql-workbench/TableDataTab.vue`
- Verify: `C:/Users/GXL/IdeaProjects/inspection-frontend/src/components/mysql-workbench/TableDataTab.vue`

- [ ] **Step 1: Write the style targets**

Document the target density changes:

```text
Target density:
- panel padding drops from broad card spacing to compact spacing
- action buttons fit on the same top area
- chips and filter controls become shorter
- warning stays visible but no longer consumes card-level height
- footer gap and padding shrink
```

- [ ] **Step 2: Replace the old card-spacing styles with compact local styles**

Update the style block to add and adjust these rules:

```css
.tab-surface {
  gap: 10px;
}

.mysql-data-alert {
  flex: none;
}

.mysql-data-panel {
  gap: 12px;
  padding: 14px;
}

.mysql-data-panel__top {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mysql-data-panel__headline {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}

.mysql-data-panel__title {
  margin: 0;
  font-size: 15px;
  letter-spacing: 0.04em;
}

.mysql-data-panel__meta,
.mysql-data-status__meta,
.mysql-data-panel__actions,
.mysql-data-panel__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.mysql-data-panel__meta span,
.mysql-data-status__meta span {
  min-height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(23, 36, 55, 0.06);
  color: var(--text-subtle);
  font-size: 11px;
}

.mysql-data-panel__inline-warning :deep(.el-alert) {
  border-radius: 12px;
}

.mysql-data-toolbar__filter {
  width: 140px;
}

.mysql-data-toolbar__operator {
  width: 102px;
}

.mysql-data-toolbar__keyword {
  width: 180px;
}

.mysql-data-status {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding-top: 6px;
}

@media (max-width: 920px) {
  .mysql-data-panel {
    padding: 12px;
  }

  .mysql-data-panel__headline {
    flex-direction: column;
    align-items: stretch;
  }

  .mysql-data-toolbar__filter,
  .mysql-data-toolbar__operator,
  .mysql-data-toolbar__keyword {
    width: 100%;
  }
}
```

- [ ] **Step 3: Remove obsolete style blocks**

Delete style rules that only supported the old multi-card layout:

```css
.mysql-data-toolbar {
  gap: 12px;
}

.mysql-data-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
```

and the old large section-heading-dependent spacing for the data card.

- [ ] **Step 4: Run the build to verify the compact UI compiles**

Run:

```bash
npm run build
```

Expected: Vite build succeeds with no Vue template/style errors.

- [ ] **Step 5: Commit the density styling**

```bash
git add C:/Users/GXL/IdeaProjects/inspection-frontend/src/components/mysql-workbench/TableDataTab.vue
git commit -m "style: compact mysql data tab controls"
```

### Task 3: Final Visual And Behavior Verification

**Files:**
- Verify: `C:/Users/GXL/IdeaProjects/inspection-frontend/src/components/mysql-workbench/TableDataTab.vue`
- Verify: `C:/Users/GXL/IdeaProjects/inspection-frontend/package.json`

- [ ] **Step 1: Verify required behaviors stayed intact**

Check that these bindings remain unchanged in the file:

```text
- loadRows on query/reset flow
- openInsertDialog on "新增行"
- emit open-query / open-ddl / open-design
- existing el-table columns and row actions
- existing el-pagination handlers
```

- [ ] **Step 2: Run one final production build**

Run:

```bash
npm run build
```

Expected: PASS

- [ ] **Step 3: Inspect the final diff**

Run:

```bash
git diff -- C:/Users/GXL/IdeaProjects/inspection-frontend/src/components/mysql-workbench/TableDataTab.vue
```

Expected:
- one primary panel instead of multiple stacked cards
- denser controls and smaller buttons
- inline read-only alert inside the main card

- [ ] **Step 4: Commit the finished compact data-page pass**

```bash
git add C:/Users/GXL/IdeaProjects/inspection-frontend/src/components/mysql-workbench/TableDataTab.vue
git commit -m "feat: compact mysql data page layout"
```
