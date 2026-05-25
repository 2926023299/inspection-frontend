<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Compartment, EditorState, Facet } from '@codemirror/state'
import { EditorView, basicSetup } from 'codemirror'
import { MySQL, keywordCompletionSource, schemaCompletionSource, sql } from '@codemirror/lang-sql'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { autocompletion } from '@codemirror/autocomplete'
import { tooltips } from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { createDebouncedSqlSync } from '@/utils/mysqlWorkbench'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  schema: {
    type: Object,
    default: () => ({}),
  },
  defaultSchema: {
    type: String,
    default: '',
  },
  loadTableColumns: {
    type: Function,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'selection-change'])

const editorHost = ref(null)
let editorView = null
let selectedSql = ''
const sqlExtensionCompartment = new Compartment()

const sync = createDebouncedSqlSync(props.modelValue, (value) => {
  emit('update:modelValue', value)
})

const mysqlEditorTheme = EditorView.theme({
  '&': {
    height: '100%',
    borderRadius: '18px',
    backgroundColor: '#101a29',
    color: '#f1e8dd',
    overflow: 'hidden',
    fontSize: '13px',
  },
  '.cm-scroller': {
    fontFamily: 'Consolas, "Cascadia Code", monospace',
    lineHeight: '1.65',
  },
  '.cm-content': {
    minHeight: '100%',
    padding: '16px',
  },
  '.cm-gutters': {
    backgroundColor: '#101a29',
    color: 'rgba(241, 232, 221, 0.46)',
    border: 'none',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  '.cm-cursor': {
    borderLeftColor: '#f1e8dd',
  },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: 'rgba(195, 95, 55, 0.32)',
  },
  // 自动补全弹出框样式
  '.cm-tooltip': {
    backgroundColor: '#1a2736',
    border: '1px solid rgba(92, 207, 230, 0.3)',
    borderRadius: '8px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
  },
  '.cm-tooltip-autocomplete': {
    '& > ul': {
      fontFamily: 'Consolas, "Cascadia Code", monospace',
      fontSize: '13px',
      maxHeight: '240px',
    },
    '& > ul > li': {
      padding: '4px 10px',
      color: '#f1e8dd',
    },
    '& > ul > li[aria-selected]': {
      backgroundColor: 'rgba(92, 207, 230, 0.2)',
      color: '#5ccfe6',
    },
  },
  '.cm-completionLabel': {
    color: '#f1e8dd',
  },
  '.cm-completionDetail': {
    color: '#8a9bae',
    fontStyle: 'normal',
    marginLeft: '8px',
  },
  '.cm-completionIcon': {
    color: '#5ccfe6',
  },
})

// 使用 Facet 传递 schema
const schemaFacet = Facet.define({
  combine: (values) => values[0] || {},
})

const aliasStopWords = ['ON', 'WHERE', 'SET', 'GROUP', 'ORDER', 'LIMIT', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'JOIN']

function normalizeSqlIdentifier(identifier) {
  return String(identifier || '').replace(/^`|`$/g, '')
}

function hasTable(schema, schemaName, tableName) {
  return Boolean(schema?.[schemaName] && Object.prototype.hasOwnProperty.call(schema[schemaName], tableName))
}

function resolveTableTarget(schema, schemaName, tableName, defaultSchema) {
  const normalizedSchema = normalizeSqlIdentifier(schemaName)
  const normalizedTable = normalizeSqlIdentifier(tableName)
  const preferredSchema = normalizedSchema || normalizeSqlIdentifier(defaultSchema)

  if (preferredSchema) {
    return { schema: preferredSchema, table: normalizedTable }
  }

  for (const candidateSchema of Object.keys(schema || {})) {
    if (hasTable(schema, candidateSchema, normalizedTable)) {
      return { schema: candidateSchema, table: normalizedTable }
    }
  }
  return null
}

// 解析 SQL 中的别名映射
function parseAliases(sqlText, schema, defaultSchema) {
  const aliases = {}
  // 匹配 FROM/JOIN 后面的表名和别名
  const regex = /(?:FROM|JOIN)\s+(?:(`[^`]+`|\w+)\.)?(`[^`]+`|\w+)(?:\s+(?:AS\s+)?(`[^`]+`|\w+))?/gi
  let match

  while ((match = regex.exec(sqlText)) !== null) {
    const alias = normalizeSqlIdentifier(match[3])
    if (!alias || aliasStopWords.includes(alias.toUpperCase())) {
      continue
    }
    const target = resolveTableTarget(schema, match[1], match[2], defaultSchema)
    if (target) {
      aliases[alias] = target
    }
  }

  return aliases
}

function findTableTarget(schema, tableName, defaultSchema) {
  const normalizedTable = normalizeSqlIdentifier(tableName)
  const normalizedDefaultSchema = normalizeSqlIdentifier(defaultSchema)

  if (schema?.[normalizedTable]) {
    return null
  }
  if (normalizedDefaultSchema) {
    return { schema: normalizedDefaultSchema, table: normalizedTable }
  }
  for (const schemaName of Object.keys(schema || {})) {
    if (hasTable(schema, schemaName, normalizedTable)) {
      return { schema: schemaName, table: normalizedTable }
    }
  }
  return null
}

function columnsToCompletionResult(columns, from) {
  if (!columns?.length) {
    return null
  }
  return {
    from,
    options: columns.map(col => ({
      label: col,
      type: 'property',
    })),
  }
}

async function loadColumnsForTarget(schema, target) {
  if (!target?.schema || !target?.table) {
    return []
  }
  const cachedColumns = schema?.[target.schema]?.[target.table]
  if (Array.isArray(cachedColumns) && cachedColumns.length > 0) {
    return cachedColumns
  }
  if (typeof props.loadTableColumns !== 'function') {
    return []
  }
  return props.loadTableColumns(target.schema, target.table)
}

// 表名和别名补全源
async function tableAndAliasCompletionSource(context) {
  const word = context.matchBefore(/(?:`[^`]+`|\w+)\./)
  if (!word) return null

  const text = context.state.doc.toString()
  const prefix = normalizeSqlIdentifier(word.text.slice(0, -1))

  // 获取 schema（从编辑器状态中获取）
  const schema = context.state.facet(schemaFacet)
  if (!schema) return null

  // 1. 先检查别名
  const defaultSchema = props.defaultSchema
  const aliases = parseAliases(text, schema, defaultSchema)
  const target = aliases[prefix] || findTableTarget(schema, prefix, defaultSchema)
  if (!target) {
    return null
  }

  const columns = await loadColumnsForTarget(schema, target)
  return columnsToCompletionResult(columns, word.from + word.text.length)
}

function schemaAndTableCompletionSource(config) {
  const source = schemaCompletionSource(config)
  return (context) => {
    if (context.matchBefore(/(?:`[^`]+`|\w+)\./)) {
      return null
    }
    return source(context)
  }
}

// 创建 SQL 语言扩展（包含自定义补全）
function createSqlExtension(schema = {}, defaultSchemaValue = '') {
  const schemaNames = Object.keys(schema)
  const defaultSchema = defaultSchemaValue || schemaNames[0] || undefined
  const sqlConfig = {
    dialect: MySQL,
    schema: schema,
    defaultSchema: defaultSchema,
    upperCaseKeywords: true,
  }

  // 获取 SQL 扩展的默认补全源
  const sqlLang = sql(sqlConfig)

  return [
    sqlLang,
    schemaFacet.of(schema),
    autocompletion({
      override: [
        tableAndAliasCompletionSource,
        schemaAndTableCompletionSource(sqlConfig),
        keywordCompletionSource(MySQL, true),
      ],
    }),
  ]
}

// SQL 语法高亮样式
const sqlHighlightStyle = HighlightStyle.define([
  // SQL 关键字 - 明亮的青色
  { tag: tags.keyword, color: '#5ccfe6', fontWeight: 'bold' },
  // 函数名 - 紫色
  { tag: tags.function(tags.variableName), color: '#d4bfff' },
  // 字符串 - 橙色
  { tag: tags.string, color: '#ffab70' },
  // 数字 - 浅绿色
  { tag: tags.number, color: '#a5d6a7' },
  // 注释 - 灰色斜体
  { tag: tags.comment, color: '#6b7d8e', fontStyle: 'italic' },
  // 操作符 - 白色
  { tag: tags.operator, color: '#f1e8dd' },
  // 表名/变量名 - 浅蓝色
  { tag: tags.variableName, color: '#80cbc4' },
  // 列名/属性 - 浅黄色
  { tag: tags.propertyName, color: '#ffd580' },
  // 类型名 - 粉色
  { tag: tags.typeName, color: '#f48fb1' },
  // 布尔值 - 绿色
  { tag: tags.bool, color: '#a5d6a7' },
  // NULL - 灰色
  { tag: tags.null, color: '#6b7d8e' },
  // 括号 - 白色
  { tag: tags.bracket, color: '#f1e8dd' },
  // 分号等标点 - 灰色
  { tag: tags.punctuation, color: '#8a9bae' },
])

function readSelectedSql() {
  if (!editorView) {
    return ''
  }
  return editorView.state.selection.ranges
    .map((range) => (range.empty ? '' : editorView.state.doc.sliceString(range.from, range.to)))
    .filter((value) => value.trim())
    .join('\n')
}

function updateSelectedSql() {
  const nextSelectedSql = readSelectedSql()
  if (nextSelectedSql === selectedSql) {
    return
  }
  selectedSql = nextSelectedSql
  emit('selection-change', selectedSql)
}

onMounted(() => {
  const sqlExts = createSqlExtension(props.schema, props.defaultSchema)
  const tooltipParent = editorHost.value?.ownerDocument?.body || document.body
  editorView = new EditorView({
    parent: editorHost.value,
    state: EditorState.create({
      doc: props.modelValue || '',
      extensions: [
        basicSetup,
        sqlExtensionCompartment.of(sqlExts),
        tooltips({ parent: tooltipParent, position: 'fixed' }),
        EditorView.lineWrapping,
        mysqlEditorTheme,
        syntaxHighlighting(sqlHighlightStyle),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            sync.setValue(update.state.doc.toString())
          }
          if (update.docChanged || update.selectionSet) {
            updateSelectedSql()
          }
        }),
      ],
    }),
  })
  selectedSql = readSelectedSql()
  emit('selection-change', selectedSql)
})

watch(
  () => props.modelValue,
  (value) => {
    if (!editorView) {
      sync.reset(value || '')
      return
    }
    const currentValue = editorView.state.doc.toString()
    const nextValue = value || ''
    if (currentValue !== nextValue) {
      sync.reset(nextValue)
      editorView.dispatch({
        changes: {
          from: 0,
          to: editorView.state.doc.length,
          insert: nextValue,
        },
      })
    }
  },
)

watch(
  () => [props.schema, props.defaultSchema],
  ([schema, defaultSchema]) => {
    if (!editorView) {
      return
    }
    editorView.dispatch({
      effects: sqlExtensionCompartment.reconfigure(createSqlExtension(schema, defaultSchema)),
    })
  },
)

function flush() {
  sync.flush()
}

function getSelectedSql() {
  selectedSql = readSelectedSql()
  return selectedSql
}

function refresh() {
  editorView?.requestMeasure?.()
}

onBeforeUnmount(() => {
  flush()
  sync.dispose()
  editorView?.destroy()
  editorView = null
})

defineExpose({ flush, getSelectedSql, refresh })
</script>

<template>
  <div ref="editorHost" class="mysql-sql-editor" />
</template>

<style scoped>
.mysql-sql-editor {
  min-height: 100%;
  height: 100%;
}
</style>
