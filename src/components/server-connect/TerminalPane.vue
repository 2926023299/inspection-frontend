<script setup>
import { computed, defineExpose, onMounted, ref, toRef, watch } from 'vue'
import { listBookmarks, saveBookmark as apiSaveBookmark, deleteBookmark as apiDeleteBookmark } from '@/api/serverConnections'
import { useTerminalSession } from '@/composables/useTerminalSession'

const props = defineProps({
  session: {
    type: Object,
    required: true,
  },
  active: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['status-change', 'cwd-change', 'reconnect'])
const sessionRef = toRef(props, 'session')
const activeRef = computed(() => props.active)

const { terminalRef, clearTerminal, copyTerminal, sendInput } = useTerminalSession(
  sessionRef,
  activeRef,
  (sessionId, status, message) => emit('status-change', { sessionId, status, message }),
  (sessionId, cwd) => emit('cwd-change', { sessionId, cwd }),
)

defineExpose({
  clearTerminal,
  copyTerminal,
  sendInput,
})

/* ---- 路径书签 ---- */
const bookmarks = ref([])

async function loadBookmarks() {
  try {
    const res = await listBookmarks(props.session?.serverKey)
    bookmarks.value = Array.isArray(res) ? res : []
  } catch {
    bookmarks.value = []
  }
}

onMounted(loadBookmarks)

watch(() => props.session?.serverKey, loadBookmarks)

function cdToBookmark(bookmark) {
  sendInput(`cd ${bookmark.path}\n`)
}

/* ---- 添加书签 ---- */
const bookmarkDialogVisible = ref(false)
const bookmarkForm = ref({ label: '', path: '', scope: 'server' })

function openAddBookmark() {
  bookmarkForm.value = {
    label: '',
    path: props.session?.cwd || '/',
    scope: 'server',
  }
  bookmarkDialogVisible.value = true
}

async function handleBookmarkConfirm() {
  const label = bookmarkForm.value.label.trim()
  const path = bookmarkForm.value.path.trim()
  if (!label || !path) return

  try {
    const serverKey = bookmarkForm.value.scope === 'global' ? null : props.session?.serverKey
    await apiSaveBookmark({ label, path, serverKey })
    await loadBookmarks()
  } catch {
    // handled by interceptor
  }
  bookmarkDialogVisible.value = false
}

async function removeBookmark(bookmark) {
  try {
    await apiDeleteBookmark(bookmark.id)
    await loadBookmarks()
  } catch {
    // handled by interceptor
  }
}
</script>

<template>
  <div class="terminal-pane" :class="{ 'is-hidden': !props.active }">
    <div class="terminal-pane__meta">
      <span class="terminal-pane__name">{{ props.session.displayName }}</span>
      <span class="terminal-pane__cwd">{{ props.session.cwd || '--' }}</span>
    </div>
    <div class="terminal-pane__bookmarks">
      <div class="terminal-pane__bm-list">
        <el-tag
          v-for="bm in bookmarks"
          :key="bm.id"
          :type="bm.serverKey ? '' : 'info'"
          size="small"
          class="terminal-pane__bm-tag"
          closable
          @click="cdToBookmark(bm)"
          @close.stop="removeBookmark(bm)"
        >
          {{ bm.serverKey ? '' : '🌐 ' }}{{ bm.label }}
        </el-tag>
        <button type="button" class="terminal-pane__bm-add" @click="openAddBookmark">+ 路径</button>
      </div>
      <div class="terminal-pane__actions">
        <button type="button" class="terminal-pane__act-btn" @click="clearTerminal">清屏</button>
        <button type="button" class="terminal-pane__act-btn" @click="copyTerminal">复制</button>
        <button type="button" class="terminal-pane__act-btn" @click="emit('reconnect', props.session?.sessionId)">重连</button>
      </div>
    </div>
    <div ref="terminalRef" class="terminal-pane__screen" />

    <el-dialog
      v-model="bookmarkDialogVisible"
      title="添加终端路径书签"
      width="420px"
      :append-to-body="true"
      destroy-on-close
    >
      <el-form label-width="60px">
        <el-form-item v-if="props.session?.serverKey" label="范围">
          <el-radio-group v-model="bookmarkForm.scope">
            <el-radio value="server">当前服务器</el-radio>
            <el-radio value="global">全局共享</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="名称">
          <el-input v-model="bookmarkForm.label" placeholder="例如：应用目录" maxlength="30" />
        </el-form-item>
        <el-form-item label="路径">
          <el-input v-model="bookmarkForm.path" placeholder="例如：/home/ies/webserver" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="bookmarkDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleBookmarkConfirm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.terminal-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.terminal-pane.is-hidden {
  display: none;
}

.terminal-pane__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(240, 237, 231, 0.74);
  font-size: 12px;
}

.terminal-pane__name {
  font-weight: 700;
  letter-spacing: 0.06em;
}

/* ---- 终端路径书签 + 操作栏 ---- */
.terminal-pane__bookmarks {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 14px;
  min-height: 32px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.terminal-pane__bm-list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.terminal-pane__bm-tag {
  cursor: pointer;
  transition: transform 0.15s;
}

.terminal-pane__bm-tag:hover {
  transform: translateY(-1px);
}

.terminal-pane__bm-add {
  border: 1px dashed rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  background: transparent;
  color: rgba(240, 237, 231, 0.5);
  font-size: 11px;
  padding: 2px 8px;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}

.terminal-pane__bm-add:hover {
  border-color: rgba(59, 130, 246, 0.5);
  color: rgba(240, 237, 231, 0.8);
}

.terminal-pane__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.terminal-pane__act-btn {
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(240, 237, 231, 0.6);
  font-size: 11px;
  padding: 3px 10px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.terminal-pane__act-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(240, 237, 231, 0.9);
}

.terminal-pane__screen {
  flex: 1;
  min-height: 0;
  height: 100%;
  margin: 8px 10px 10px;
  overflow: hidden;
}

:deep(.xterm) {
  height: 100%;
}

:deep(.xterm-screen),
:deep(.xterm-viewport) {
  height: 100% !important;
}
</style>
