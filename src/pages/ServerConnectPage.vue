<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
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
  closeSession,
  activateSession,
  updateSessionStatus,
  updateSessionCwd,
  closeAllSessions,
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
const connectLayoutColumns = computed(() => {
  if (leftPanelCollapsed.value && terminalCollapsed.value && !rightPanelCollapsed.value) {
    return '56px 56px minmax(0, 1fr)'
  }

  if (!leftPanelCollapsed.value && terminalCollapsed.value && rightPanelCollapsed.value) {
    return 'minmax(280px, 1fr) 56px 56px'
  }

  if (leftPanelCollapsed.value && !terminalCollapsed.value && rightPanelCollapsed.value) {
    return '56px minmax(0, 1fr) 56px'
  }

  if (!leftPanelCollapsed.value && terminalCollapsed.value && !rightPanelCollapsed.value) {
    return 'minmax(260px, 0.92fr) 56px minmax(320px, 1.08fr)'
  }

  const left = leftPanelCollapsed.value ? '56px' : '280px'
  const terminal = terminalCollapsed.value ? '56px' : 'minmax(0, 1fr)'
  const right = rightPanelCollapsed.value ? '56px' : '340px'
  return `${left} ${terminal} ${right}`
})

function restorePanelPreference() {
  leftPanelCollapsed.value = window.localStorage.getItem('server-connect-left-panel-collapsed') === 'true'
  terminalCollapsed.value = window.localStorage.getItem('server-connect-terminal-collapsed') === 'true'
  rightPanelCollapsed.value = window.localStorage.getItem('server-connect-right-panel-collapsed') === 'true'
}

onMounted(() => {
  restorePanelPreference()
  loadServers()
  window.addEventListener('beforeunload', closeAllSessions)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', closeAllSessions)
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

async function handleConnect(serverKey) {
  if (!serverKey) {
    await loadServers()
    return
  }
  await connectServer(serverKey)
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

  if (dialogMode.value === 'mkdir') {
    await createDirectoryAt(activeFileState.value.cwd, value)
  } else if (dialogMode.value === 'rename' && dialogTarget.value) {
    const basePath = activeFileState.value.cwd || activeSession.value.cwd
    const targetPath = value.startsWith('/') ? value : `${basePath.replace(/\/$/, '')}/${value}`
    await renamePath(dialogTarget.value.path, targetPath)
  } else if (dialogMode.value === 'delete' && dialogTarget.value) {
    await deletePath(dialogTarget.value.path, Boolean(dialogTarget.value.directory))
  }

  dialogVisible.value = false
}
</script>

<template>
  <div class="page-shell compact-page">
    <el-alert v-if="error" type="error" :title="error" :closable="false" show-icon />

    <section class="connect-layout" :style="{ '--connect-grid-columns': connectLayoutColumns }">
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

      <TerminalTabs
        :sessions="sessions"
        :active-session-id="activeSessionId"
        :collapsed="terminalCollapsed"
        @select="activateSession"
        @close="closeSession"
        @reconnect="handleReconnect"
        @toggle-collapse="toggleTerminalPanel"
        @status-change="({ sessionId, status, message }) => updateSessionStatus(sessionId, status, message)"
        @cwd-change="({ sessionId, cwd }) => updateSessionCwd(sessionId, cwd)"
      />

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
  display: grid;
  grid-template-columns: var(--connect-grid-columns);
  gap: 18px;
  flex: 1;
  min-height: 0;
  align-items: stretch;
}

@media (max-width: 1380px) {
  .connect-layout {
    grid-template-columns: 280px minmax(0, 1fr);
  }

  .connect-layout > :last-child {
    grid-column: 1 / -1;
  }
}

@media (max-width: 980px) {
  .connect-layout {
    grid-template-columns: 1fr;
  }
}
</style>
