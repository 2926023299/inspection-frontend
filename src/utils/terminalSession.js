export const TERMINAL_HEARTBEAT_INTERVAL_MS = 30000
export const TERMINAL_RECONNECT_DELAYS_MS = [1000, 2000, 5000, 10000]

export function buildTerminalPingMessage() {
  return JSON.stringify({ type: 'ping' })
}

export function getTerminalReconnectDelay(attempt) {
  const normalizedAttempt = Number.isInteger(attempt) && attempt > 0 ? attempt : 0
  const index = Math.min(normalizedAttempt, TERMINAL_RECONNECT_DELAYS_MS.length - 1)
  return TERMINAL_RECONNECT_DELAYS_MS[index]
}

export function shouldReconnectTerminalSocket({ manualClose, sessionId }) {
  return Boolean(sessionId) && !manualClose
}
