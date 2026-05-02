# MySQL Data Page Compact Design

## Goal

Reduce the vertical space used by the MySQL table data page so the user sees filters, actions, table content, and pagination within a tighter viewport.

The change is intentionally limited to the MySQL data tab UI in `src/components/mysql-workbench/TableDataTab.vue`.

## Approved Direction

Use a single-card compact layout.

This replaces the current stacked structure:

- top filter/status card
- standalone warning card
- standalone `Data Grid` card

with one primary panel that contains:

- a compact header row with table name, status chips, and small action buttons
- a compact filter row with smaller selects, input, and query/reset buttons
- an inline read-only warning strip inside the same panel when needed
- the table grid directly below the controls
- a tighter footer row with selection info and pagination

## Layout Changes

### Header

The header becomes a dense utility band instead of a large hero-like block.

- Keep the table title visible.
- Move `总行数` / `主定位键` / `只读表` into compact chips.
- Move `打开查询标签` / `查看 DDL` / `表设计` / `新增行` into the same panel header.
- Shrink button size and horizontal padding.

### Filters

The filter controls stay visible but become shorter and denser.

- Reduce control widths where possible.
- Reduce gap spacing between controls.
- Use smaller buttons for `查询` and `重置`.
- Keep one-row layout on wide screens, allow wrapping only when necessary.

### Warning State

The read-only warning no longer occupies its own card.

- Render it as an inline warning strip inside the primary panel.
- Keep it visually noticeable but short in height.

### Grid Section

Remove the standalone `Data Grid` title/caption block.

- The table should begin immediately after the compact control area.
- Preserve existing table behavior and actions.

### Footer

Compress the footer band.

- Reduce top padding.
- Keep selection/read-only summary as smaller chips or tighter text.
- Keep pagination unchanged functionally, only visually denser.

## Styling Rules

- Preserve the established MySQL workbench visual language.
- Do not redesign unrelated pages or global layout tokens unless required for this component.
- Prefer local component styles over broad global overrides.
- Reduce panel padding, internal gaps, chip height, button height, and border radius where helpful.
- Keep mobile wrapping behavior intact.

## Non-Goals

- No API changes.
- No table behavior changes.
- No dialog redesign beyond keeping button sizing visually consistent.
- No changes to query/history/design tabs in this pass.

## Verification

- The data tab renders as one primary card instead of multiple stacked cards.
- Read-only tables still show a warning, but inline.
- All existing actions remain available.
- Build passes after the UI update.
