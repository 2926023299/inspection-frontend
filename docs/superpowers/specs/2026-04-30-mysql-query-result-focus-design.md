# MySQL Query Result-Focus Design

## Goal

Make SQL query results much easier to read by automatically switching the MySQL query tab into a result-first view after execution.

This change is intentionally limited to the MySQL query tab UI and query-tab state management.

Primary files expected to be involved later:

- `src/components/mysql-workbench/SqlQueryTab.vue`
- `src/composables/useMysqlWorkbench.js`

## Approved Direction

Use an in-place `result-focus` mode inside the existing query tab.

The query tab will have two view states:

- `edit`
- `result-focus`

Default state is `edit`.

After the user executes SQL and the request completes, the tab switches automatically to `result-focus`.

## Interaction Model

### Edit Mode

`edit` mode remains the authoring view.

- The SQL editor stays fully visible.
- Existing query title, schema selection, execute button, save state, and history entry points remain available.
- This mode continues to be where the user writes and modifies SQL.

### Result-Focus Mode

`result-focus` is a result-first reading view.

- It is entered automatically after SQL execution completes.
- It hides the large editable SQL area.
- It prioritizes result display, error display, and execution feedback.
- It keeps the user in the same query tab instead of opening a separate result tab.

### Toolbar Actions In Result-Focus

The compact result-focus toolbar contains only lightweight actions:

- `返回编辑`
- `再执行`
- `展开 SQL`
- `查看历史`

Behavior:

- `返回编辑` switches the tab back to full editor mode.
- `再执行` runs the current SQL again from result-focus mode.
- `展开 SQL` opens a small read-only SQL preview inside result-focus mode without fully returning to edit mode.
- `查看历史` keeps existing history behavior.

## Layout

### Edit Mode Layout

Edit mode keeps the current structure, with only minimal follow-up tightening if needed later.

This design does not require a large edit-mode redesign.

### Result-Focus Layout

Result-focus becomes a single result viewer surface:

- top compact toolbar
- optional compact execution summary
- optional inline SQL preview when `展开 SQL` is active
- main result area taking the majority of available height

The large SQL editor is not shown in this mode.

## Result Presentation

### Success Case

When execution succeeds:

- the result area becomes the dominant surface
- a single result set should visually expand as much as possible
- multiple statement results remain ordered by execution sequence
- each result block should be tighter than the current stacked result cards

### Error Case

When execution fails:

- the tab still switches to `result-focus`
- the failed statement and error details should occupy the main viewing area
- the user should not need to manually scroll past the full editor just to see the failure

### Empty Or Non-Table Results

For statements that do not return table rows:

- result-focus still activates
- affected rows / success / failure / execution message remain visible
- the result surface should still be treated as the primary content area

## SQL Preview In Result-Focus

`展开 SQL` does not mean returning to edit mode.

Instead it reveals a compact, read-only SQL preview inside result-focus mode.

Requirements:

- preview is clearly secondary to results
- preview can be collapsed again
- preview uses the current SQL text from the tab state
- preview does not allow editing in this mode

## State And Data Flow

The query tab state needs additional UI state only.

Expected additions later:

- current query view mode: `edit | result-focus`
- whether inline SQL preview is expanded in result-focus

Rules:

- SQL text remains owned by the existing query tab state
- execution results remain owned by the existing query tab state
- entering/leaving result-focus must not destroy SQL content or results
- switching back to edit must preserve the exact SQL the user had

## Error Handling

- Failed executions still transition into result-focus.
- Query tabs without executable SQL should keep existing validation and should not switch modes.
- Dangerous SQL confirmation flow should keep existing behavior; only successful confirmation + execution path should transition afterward.

## Non-Goals

- No separate result tab implementation in this pass.
- No draggable split-pane implementation in this pass.
- No backend API changes.
- No redesign of table data tabs, history tabs, or design tabs in this pass.

## Verification

- Executing SQL automatically switches the current query tab into result-focus mode.
- Result-focus gives more vertical space to results than the current layout.
- `返回编辑` returns to the full SQL editor with SQL preserved.
- `展开 SQL` shows a compact read-only SQL preview without leaving result-focus.
- Failed SQL execution is easier to read because the result/error surface becomes primary.
- Existing build passes after the change.
