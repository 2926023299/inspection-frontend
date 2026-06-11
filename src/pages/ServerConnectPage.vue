<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import FileActionDialog from '@/components/server-connect/FileActionDialog.vue'
import RemoteFilePanel from '@/components/server-connect/RemoteFilePanel.vue'
import ServerCatalog from '@/components/server-connect/ServerCatalog.vue'
import TerminalTabs from '@/components/server-connect/TerminalTabs.vue'
import { useRemoteFiles } from '@/composables/useRemoteFiles'
import { useServerConnections } from '@/composables/useServerConnections'

const {
  loading,
  connecting,
  error,
  searchKeyword,
  sessions,
  activeSessionId,
  filteredServers,
  activeSession,
  loadServers,
  connectServer,
  reconnectSession,
  closeSession,
  activateSession,
  updateSessionStatus,
  updateSessionCwd,
} = useServerConnections()

const {
  loading: fileLoading,
  uploading,
  error: fileError,
  activeFileState,
  refreshFiles,
  openPath,
  goToParent,
  createDirectoryAt,
  renamePath,
  deletePath,
  uploadFilesTo,
  downloadPath,
} = useRemoteFiles(activeSession, updateSessionCwd)

const dialogVisible = ref(false)
const dialogMode = ref('mkdir')
const dialogTitle = ref('')
const dialogInitialValue = ref('')
const dialogTarget = ref(null)
const leftPanelCollapsed = ref(false)
const terminalCollapsed = ref(false)
const rightPanelCollapsed = ref(false)

const connectedServerKeys = computed(() => sessions.value.map((session) => session.serverKey))

/* ---- 面板宽度 ---- */
const COLLAPSED_WIDTH = 56
const MIN_LEFT = 220
const MAX_LEFT = 600
const MIN_RIGHT = 280
const MAX_RIGHT = 900
const leftWidth = ref(280)
const rightWidth = ref(340)

function restorePanelPreference() {
  leftPanelCollapsed.value = window.localStorage.getItem('server-connect-left-panel-collapsed') === 'true'
  terminalCollapsed.value = window.localStorage.getItem('server-connect-terminal-collapsed') === 'true'
  rightPanelCollapsed.value = window.localStorage.getItem('server-connect-right-panel-collapsed') === 'true'

  const savedLeft = Number(window.localStorage.getItem('server-connect-left-width'))
  const savedRight = Number(window.localStorage.getItem('server-connect-right-width'))
  if (savedLeft >= MIN_LEFT && savedLeft <= MAX_LEFT) leftWidth.value = savedLeft
  if (savedRight >= MIN_RIGHT && savedRight <= MAX_RIGHT) rightWidth.value = savedRight
}

onMounted(() => {
  restorePanelPreference()
  loadServers()
})

watch(leftPanelCollapsed, (collapsed) => {
  window.localStorage.setItem('server-connect-left-panel-collapsed', String(collapsed))
})

watch(terminalCollapsed, (collapsed) => {
  window.localStorage.setItem('server-connect-terminal-collapsed', String(collapsed))
})

watch(rightPanelCollapsed, (collapsed) => {
  window.localStorage.setItem('server-connect-right-panel-collapsed', String(collapsed))
})

watch(leftWidth, (w) => {
  window.localStorage.setItem('server-connect-left-width', String(w))
})

watch(rightWidth, (w) => {
  window.localStorage.setItem('server-connect-right-width', String(w))
})

/* ---- 拖拽分割线 ---- */
const dragging = ref(null) // 'left' | 'right' | null

function startDrag(panel, event) {
  event.preventDefault()
  dragging.value = panel
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function onDrag(event) {
  if (!dragging.value) return
  const layoutEl = document.querySelector('.connect-layout')
  if (!layoutEl) return
  const rect = layoutEl.getBoundingClientRect()
  const TERMINAL_MIN = 300

  if (dragging.value === 'left') {
    const maxAllowed = Math.min(MAX_LEFT, rect.width - rightWidth.value - TERMINAL_MIN - 12)
    const newWidth = Math.min(maxAllowed, Math.max(MIN_LEFT, event.clientX - rect.left))
    leftWidth.value = newWidth
  } else if (dragging.value === 'right') {
    const maxAllowed = Math.min(MAX_RIGHT, rect.width - leftWidth.value - TERMINAL_MIN - 12)
    const newWidth = Math.min(maxAllowed, Math.max(MIN_RIGHT, rect.right - event.clientX))
    rightWidth.value = newWidth
  }
}

function stopDrag() {
  dragging.value = null
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
})

const leftStyle = computed(() => {
  if (leftPanelCollapsed.value) return { width: COLLAPSED_WIDTH + 'px', flexShrink: 0 }
  return { width: leftWidth.value + 'px', flexShrink: 0 }
})

const rightStyle = computed(() => {
  if (rightPanelCollapsed.value) return { width: COLLAPSED_WIDTH + 'px', flexShrink: 0 }
  return { width: rightWidth.value + 'px', flexShrink: 0 }
})

const terminalStyle = computed(() => {
  if (terminalCollapsed.value) return { width: COLLAPSED_WIDTH + 'px', flexShrink: 0 }
  return { flex: 1, minWidth: 0 }
})

async function handleConnect(serverKey, charset = 'UTF-8') {
  if (!serverKey) {
    await loadServers()
    return
  }
  await connectServer(serverKey, '', charset)
  leftPanelCollapsed.value = true
  terminalCollapsed.value = false
  rightPanelCollapsed.value = true
}

async function handleReconnect(sessionId) {
  const targetSession = sessions.value.find((session) => session.sessionId === sessionId)
  if (!targetSession) return

  const reconnectPath = targetSession.cwd
  const targetServerKey = targetSession.serverKey
  await closeSession(sessionId)
  await connectServer(targetServerKey, reconnectPath)
}

const reconnectingSessions = new Set()

async function handleAutoReconnect(sessionId) {
  if (reconnectingSessions.has(sessionId)) return
  reconnectingSessions.add(sessionId)

  const targetSession = sessions.value.find((session) => session.sessionId === sessionId)
  if (!targetSession) {
    reconnectingSessions.delete(sessionId)
    return
  }

  ElMessage.warning('SSH连接已断开，正在自动重新连接...')

  try {
    await reconnectSession(sessionId)
  } catch (_err) {
    // reconnectSession already shows error messages
  }

  reconnectingSessions.delete(sessionId)
}

function toggleLeftPanel() {
  if (!leftPanelCollapsed.value && terminalCollapsed.value && rightPanelCollapsed.value) {
    return
  }
  leftPanelCollapsed.value = !leftPanelCollapsed.value
}

function toggleTerminalPanel() {
  if (!terminalCollapsed.value && leftPanelCollapsed.value && rightPanelCollapsed.value) {
    return
  }
  terminalCollapsed.value = !terminalCollapsed.value
}

function toggleRightPanel() {
  if (!rightPanelCollapsed.value && leftPanelCollapsed.value && terminalCollapsed.value) {
    return
  }
  rightPanelCollapsed.value = !rightPanelCollapsed.value
}

function openDialog(mode, target = null) {
  dialogMode.value = mode
  dialogTarget.value = target
  dialogVisible.value = true

  if (mode === 'mkdir') {
    dialogTitle.value = '新建远程目录'
    dialogInitialValue.value = ''
    return
  }

  if (mode === 'rename') {
    dialogTitle.value = '重命名远程文件'
    dialogInitialValue.value = target?.name || ''
    return
  }

  dialogTitle.value = '删除远程文件'
  dialogInitialValue.value = ''
}

async function handleDialogConfirm(value) {
  if (!activeSession.value) return

  try {
    if (dialogMode.value === 'mkdir') {
      await createDirectoryAt(activeFileState.value.cwd, value)
    } else if (dialogMode.value === 'rename' && dialogTarget.value) {
      const basePath = activeFileState.value.cwd || activeSession.value.cwd
      const targetPath = value.startsWith('/') ? value : `${basePath.replace(/\/$/, '')}/${value}`
      await renamePath(dialogTarget.value.path, targetPath)
    } else if (dialogMode.value === 'delete') {
      if (!dialogTarget.value) {
        ElMessage.warning('未选择要删除的目标')
      } else {
        await deletePath(dialogTarget.value.path, Boolean(dialogTarget.value.directory))
      }
    }
  } catch (err) {
    ElMessage.error(err.message || '操作失败')
  }

  dialogVisible.value = false
}
</script>

<template>
  <div class="page-shell compact-page">
    <el-alert v-if="error" type="error" :title="error" :closable="false" show-icon />

    <section class="connect-layout" :class="{ 'is-dragging': dragging }">
      <div :style="leftStyle" class="connect-layout__panel">
        <ServerCatalog
          v-model="searchKeyword"
          :servers="filteredServers"
          :loading="loading"
          :connecting="connecting"
          :connected-server-keys="connectedServerKeys"
          :collapsed="leftPanelCollapsed"
          @toggle-collapse="toggleLeftPanel"
          @connect="handleConnect"
        />
      </div>

      <div
        v-if="!leftPanelCollapsed || !terminalCollapsed"
        class="connect-layout__splitter"
        @mousedown="startDrag('left', $event)"
      />

      <div :style="terminalStyle" class="connect-layout__panel">
        <TerminalTabs
          :sessions="sessions"
          :active-session-id="activeSessionId"
          :collapsed="terminalCollapsed"
          @select="activateSession"
          @close="closeSession"
          @reconnect="handleReconnect"
          @toggle-collapse="toggleTerminalPanel"
          @status-change="({ sessionId, status, message }) => {
            updateSessionStatus(sessionId, status, message)
            if (status === 'ssh-closed') {
              handleAutoReconnect(sessionId)
            }
          }"
          @cwd-change="({ sessionId, cwd }) => updateSessionCwd(sessionId, cwd)"
        />
      </div>

      <div
        v-if="!terminalCollapsed || !rightPanelCollapsed"
        class="connect-layout__splitter"
        @mousedown="startDrag('right', $event)"
      />

      <div :style="rightStyle" class="connect-layout__panel">
        <RemoteFilePanel
          :session="activeSession"
          :state="activeFileState"
          :loading="fileLoading"
          :uploading="uploading"
          :error="fileError"
          :collapsed="rightPanelCollapsed"
          @toggle-collapse="toggleRightPanel"
          @refresh="refreshFiles"
          @go-parent="goToParent"
          @open-path="openPath"
          @download="downloadPath($event.path, $event.directory)"
          @request-upload="uploadFilesTo(activeFileState.cwd || activeSession?.cwd, $event)"
          @create-directory="openDialog('mkdir')"
          @rename="openDialog('rename', $event)"
          @delete="openDialog('delete', $event)"
        />
      </div>
    </section>

    <FileActionDialog
      v-model="dialogVisible"
      :mode="dialogMode"
      :title="dialogTitle"
      :initial-value="dialogInitialValue"
      :target-label="dialogTarget?.name || ''"
      :target-directory="Boolean(dialogTarget?.directory)"
      @confirm="handleDialogConfirm"
    />
  </div>
</template>

<style scoped>
.connect-layout {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 0;
  overflow: hidden;
  align-items: stretch;
}

.connect-layout__panel {
  min-height: 0;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.connect-layout__panel > :deep(*) {
  flex: 1;
  min-height: 0;
}

.connect-layout__splitter {
  width: 6px;
  flex-shrink: 0;
  cursor: col-resize;
  position: relative;
  background: transparent;
  transition: background 0.15s;
}

.connect-layout__splitter::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 2px;
  height: 32px;
  border-radius: 1px;
  background: rgba(30, 41, 59, 0.15);
  transition: background 0.15s, height 0.15s;
}

.connect-layout__splitter:hover::after {
  background: rgba(59, 130, 246, 0.5);
  height: 48px;
}

.connect-layout.is-dragging {
  cursor: col-resize;
}

.connect-layout.is-dragging .connect-layout__splitter::after {
  background: rgba(59, 130, 246, 0.7);
  height: 100%;
}

@media (max-width: 1380px) {
  .connect-layout {
    flex-wrap: wrap;
  }

  .connect-layout__panel {
    flex: 1 1 300px;
    min-width: 0;
  }

  .connect-layout__splitter {
    display: none;
  }
}

@media (max-width: 980px) {
  .connect-layout__panel {
    flex: 1 1 100%;
  }
}
</style>
