<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { EditorState } from '@codemirror/state'
import { EditorView, basicSetup } from 'codemirror'
import { MySQL, sql } from '@codemirror/lang-sql'
import { createDebouncedSqlSync } from '@/utils/mysqlWorkbench'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue', 'selection-change'])

const editorHost = ref(null)
let editorView = null
let selectedSql = ''

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
})

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
  editorView = new EditorView({
    parent: editorHost.value,
    state: EditorState.create({
      doc: props.modelValue || '',
      extensions: [
        basicSetup,
        sql({ dialect: MySQL }),
        EditorView.lineWrapping,
        mysqlEditorTheme,
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
