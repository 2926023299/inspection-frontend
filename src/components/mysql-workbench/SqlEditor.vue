<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Compartment, EditorState, Facet } from '@codemirror/state'
import { EditorView, basicSetup } from 'codemirror'
import { MySQL, sql } from '@codemirror/lang-sql'
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
    minHeight: '320px',
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
    minHeight: '320px',
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

// 解析 SQL 中的别名映射
function parseAliases(sqlText, schema) {
  const aliases = {}
  // 匹配 FROM/JOIN 后面的表名和别名
  const regex = /(?:FROM|JOIN)\s+(?:(\w+)\.)?(\w+)(?:\s+(?:AS\s+)?(\w+))?/gi
  let match

  while ((match = regex.exec(sqlText)) !== null) {
    const schemaName = match[1]
    const tableName = match[2]
    const alias = match[3]

    if (alias && !['ON', 'WHERE', 'SET', 'GROUP', 'ORDER', 'LIMIT', 'LEFT', 'RIGHT', 'INNER', 'OUTER'].includes(alias.toUpperCase())) {
      let columns = []
      if (schemaName && schema[schemaName]?.[tableName]) {
        columns = schema[schemaName][tableName]
      } else {
        for (const s of Object.values(schema)) {
          if (s[tableName]) {
            columns = s[tableName]
            break
          }
        }
      }
      if (columns.length > 0) {
        aliases[alias] = columns
      }
    }
  }

  return aliases
}

// 表名和别名补全源
function tableAndAliasCompletionSource(context) {
  const word = context.matchBefore(/\w+\./)
  if (!word) return null

  const text = context.state.doc.toString()
  const prefix = word.text.slice(0, -1)

  // 获取 schema（从编辑器状态中获取）
  const schema = context.state.facet(schemaFacet)
  if (!schema) return null

  // 1. 先检查别名
  const aliases = parseAliases(text, schema)
  const aliasColumns = aliases[prefix]
  if (aliasColumns?.length > 0) {
    return {
      from: word.from + prefix.length + 1,
      options: aliasColumns.map(col => ({
        label: col,
        type: 'property',
      })),
    }
  }

  // 2. 检查表名（遍历所有 schema）
  // schema 是 Vue Proxy，直接访问属性
  const schemaNames = ['ies_ls', 'ies_ms', 'ies_xs'] // 常见 schema 名
  for (const schemaName of schemaNames) {
    const tables = schema[schemaName]
    if (tables && tables[prefix]) {
      const columns = tables[prefix]
      if (Array.isArray(columns) && columns.length > 0) {
        return {
          from: word.from + prefix.length + 1,
          options: columns.map(col => ({
            label: col,
            type: 'property',
          })),
        }
      }
    }
  }

  return null
}

// 创建 SQL 语言扩展（包含自定义补全）
function createSqlExtension(schema = {}) {
  const schemaNames = Object.keys(schema)
  const defaultSchema = schemaNames[0] || undefined

  // 获取 SQL 扩展的默认补全源
  const sqlLang = sql({
    dialect: MySQL,
    schema: schema,
    defaultSchema: defaultSchema,
    upperCaseKeywords: true,
  })

  return [
    sqlLang,
    schemaFacet.of(schema),
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
  const sqlExts = createSqlExtension(props.schema)
  const tooltipParent = editorHost.value?.ownerDocument?.body || document.body
  editorView = new EditorView({
    parent: editorHost.value,
    state: EditorState.create({
      doc: props.modelValue || '',
      extensions: [
        basicSetup,
        sqlExtensionCompartment.of(sqlExts),
        autocompletion({
          add: [tableAndAliasCompletionSource],
        }),
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
  () => props.schema,
  (schema) => {
    if (!editorView) {
      return
    }
    editorView.dispatch({
      effects: sqlExtensionCompartment.reconfigure(createSqlExtension(schema)),
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

onBeforeUnmount(() => {
  flush()
  sync.dispose()
  editorView?.destroy()
  editorView = null
})

defineExpose({ flush, getSelectedSql })
</script>

<template>
  <div ref="editorHost" class="mysql-sql-editor" />
</template>

<style scoped>
.mysql-sql-editor {
  min-height: 320px;
  height: 100%;
}
</style>
