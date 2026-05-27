import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  closeServerConnectionSession,
  getServerConnectionCwd,
  listServerConnections,
  openServerConnectionSession,
} from '@/api/serverConnections'
import {
  parseStoredServerConnectionSessions,
  serializeServerConnectionSessions,
  SERVER_CONNECTION_SESSIONS_STORAGE_KEY,
} from '@/utils/serverConnectionSessions'

export function useServerConnections() {
  const loading = ref(false)
  const connecting = ref(false)
  const error = ref('')
  const servers = ref([])
  const searchKeyword = ref('')
  const sessions = ref([])
  const activeSessionId = ref('')
  let restoredPersistedSessions = false
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

  function persistSessions() {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(
      SERVER_CONNECTION_SESSIONS_STORAGE_KEY,
      serializeServerConnectionSessions(sessions.value, activeSessionId.value),
    )
  }

  async function restorePersistedSessions() {
    if (restoredPersistedSessions || typeof window === 'undefined') {
      return
    }

    restoredPersistedSessions = true
    const stored = parseStoredServerConnectionSessions(
      window.localStorage.getItem(SERVER_CONNECTION_SESSIONS_STORAGE_KEY),
    )
    if (!stored.sessions.length) {
      return
    }

    const restoredSessions = []
    for (const storedSession of stored.sessions) {
      try {
        const liveSession = await getServerConnectionCwd(storedSession.sessionId)
        restoredSessions.push({
          ...storedSession,
          ...liveSession,
          status: 'connecting',
          message: '正在恢复终端连接',
        })
      } catch (_requestError) {
        // Drop stale sessions that no longer exist on the backend.
      }
    }

    sessions.value = restoredSessions
    activeSessionId.value = restoredSessions.some((session) => session.sessionId === stored.activeSessionId)
      ? stored.activeSessionId
      : restoredSessions[0]?.sessionId || ''
    persistSessions()
  }

  async function loadServers() {
    await restorePersistedSessions()
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
      persistSessions()
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
      persistSessions()
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
    persistSessions()
  }

  function activateSession(sessionId) {
    activeSessionId.value = sessionId
    persistSessions()
  }

  function updateSessionStatus(sessionId, status, message) {
    const session = sessions.value.find((item) => item.sessionId === sessionId)
    if (!session) return
    session.status = status
    session.message = message
    persistSessions()
  }

  function updateSessionCwd(sessionId, cwd) {
    const session = sessions.value.find((item) => item.sessionId === sessionId)
    if (!session) return
    session.cwd = cwd
    persistSessions()
  }

  async function closeAllSessions() {
    const currentSessions = [...sessions.value]
    for (const session of currentSessions) {
      await closeSession(session.sessionId)
    }
  }

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
