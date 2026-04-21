import { computed, onBeforeUnmount, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  closeServerConnectionSession,
  listServerConnections,
  openServerConnectionSession,
} from '@/api/serverConnections'

export function useServerConnections() {
  const loading = ref(false)
  const connecting = ref(false)
  const error = ref('')
  const servers = ref([])
  const searchKeyword = ref('')
  const sessions = ref([])
  const activeSessionId = ref('')

  const filteredServers = computed(() => {
    const keyword = searchKeyword.value.trim().toLowerCase()
    if (!keyword) {
      return servers.value
    }

    return servers.value.filter((server) =>
      [server.ip, server.username, server.displayName].some((value) =>
        String(value || '').toLowerCase().includes(keyword),
      ),
    )
  })

  const activeSession = computed(() => sessions.value.find((session) => session.sessionId === activeSessionId.value) || null)

  async function loadServers() {
    loading.value = true
    error.value = ''
    try {
      servers.value = await listServerConnections()
    } catch (requestError) {
      error.value = requestError.message
      servers.value = []
    } finally {
      loading.value = false
    }
  }

  async function connectServer(serverKey, initialPath = '') {
    const existing = sessions.value.find((session) => session.serverKey === serverKey)
    if (existing) {
      activeSessionId.value = existing.sessionId
      return existing
    }

    connecting.value = true
    try {
      const session = await openServerConnectionSession({ serverKey, initialPath: initialPath || null })
      sessions.value.push({
        ...session,
        status: 'connecting',
        message: '正在建立终端连接',
      })
      activeSessionId.value = session.sessionId
      ElMessage.success(`已连接 ${session.displayName}`)
      return session
    } catch (requestError) {
      ElMessage.error(requestError.message)
      throw requestError
    } finally {
      connecting.value = false
    }
  }

  async function closeSession(sessionId) {
    try {
      await closeServerConnectionSession(sessionId)
    } catch (_requestError) {
      // swallow close errors to avoid blocking UI cleanup
    }

    const currentIndex = sessions.value.findIndex((session) => session.sessionId === sessionId)
    if (currentIndex !== -1) {
      sessions.value.splice(currentIndex, 1)
    }

    if (activeSessionId.value === sessionId) {
      activeSessionId.value = sessions.value[currentIndex]?.sessionId || sessions.value[currentIndex - 1]?.sessionId || ''
    }
  }

  function activateSession(sessionId) {
    activeSessionId.value = sessionId
  }

  function updateSessionStatus(sessionId, status, message) {
    const session = sessions.value.find((item) => item.sessionId === sessionId)
    if (!session) return
    session.status = status
    session.message = message
  }

  function updateSessionCwd(sessionId, cwd) {
    const session = sessions.value.find((item) => item.sessionId === sessionId)
    if (!session) return
    session.cwd = cwd
  }

  async function closeAllSessions() {
    const currentSessions = [...sessions.value]
    for (const session of currentSessions) {
      await closeSession(session.sessionId)
    }
  }

  onBeforeUnmount(() => {
    closeAllSessions()
  })

  return {
    loading,
    connecting,
    error,
    servers,
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
  }
}
