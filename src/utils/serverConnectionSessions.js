export const SERVER_CONNECTION_SESSIONS_STORAGE_KEY = 'server-connect-open-sessions'

function normalizeSession(session) {
  if (!session || typeof session !== 'object') {
    return null
  }

  const sessionId = typeof session.sessionId === 'string' ? session.sessionId.trim() : ''
  const serverKey = typeof session.serverKey === 'string' ? session.serverKey.trim() : ''
  if (!sessionId || !serverKey) {
    return null
  }

  return {
    sessionId,
    serverKey,
    displayName: typeof session.displayName === 'string' ? session.displayName : '',
    username: typeof session.username === 'string' ? session.username : '',
    cwd: typeof session.cwd === 'string' ? session.cwd : '',
  }
}

export function serializeServerConnectionSessions(sessions, activeSessionId) {
  const normalizedSessions = Array.isArray(sessions)
    ? sessions.map(normalizeSession).filter(Boolean)
    : []
  const activeExists = normalizedSessions.some((session) => session.sessionId === activeSessionId)

  return JSON.stringify({
    activeSessionId: activeExists ? activeSessionId : '',
    sessions: normalizedSessions,
  })
}

export function parseStoredServerConnectionSessions(rawValue) {
  if (!rawValue) {
    return { sessions: [], activeSessionId: '' }
  }

  try {
    const parsed = JSON.parse(rawValue)
    const sessions = Array.isArray(parsed.sessions)
      ? parsed.sessions.map(normalizeSession).filter(Boolean)
      : []
    const activeSessionId = sessions.some((session) => session.sessionId === parsed.activeSessionId)
      ? parsed.activeSessionId
      : ''

    return { sessions, activeSessionId }
  } catch {
    return { sessions: [], activeSessionId: '' }
  }
}
