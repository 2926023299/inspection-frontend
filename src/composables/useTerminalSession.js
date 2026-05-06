import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import { buildTerminalWebSocketUrl } from '@/api/serverConnections'
import {
  buildTerminalPingMessage,
  getTerminalReconnectDelay,
  shouldReconnectTerminalSocket,
  TERMINAL_HEARTBEAT_INTERVAL_MS,
} from '@/utils/terminalSession'
import '@xterm/xterm/css/xterm.css'

export function useTerminalSession(sessionRef, activeRef, onStatus, onCwd) {
  const terminalRef = ref(null)
  const status = ref('connecting')
  let terminal
  let fitAddon
  let socket
  let resizeObserver
  let heartbeatTimer
  let reconnectTimer
  let reconnectAttempt = 0
  let manualClose = false

  function createTerminal() {
    terminal = new Terminal({
      cursorBlink: true,
      fontFamily: '"JetBrains Mono", Consolas, "Courier New", monospace',
      fontSize: 12,
      lineHeight: 1.22,
      theme: {
        background: '#101826',
        foreground: '#f0ede7',
        cursor: '#c35f37',
        selectionBackground: 'rgba(195, 95, 55, 0.22)',
      },
    })

    fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.open(terminalRef.value)
    requestAnimationFrame(() => {
      resizeTerminal()
      setTimeout(resizeTerminal, 80)
      setTimeout(resizeTerminal, 220)
      setTimeout(resizeTerminal, 500)
      terminal.focus()
    })
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        resizeTerminal()
      })
    }

    terminal.onData((data) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return
      }
      socket.send(JSON.stringify({ type: 'input', data }))
    })
  }

  function bindSocket(sessionId) {
    socket = new WebSocket(buildTerminalWebSocketUrl(sessionId))

    socket.addEventListener('open', () => {
      reconnectAttempt = 0
      clearReconnectTimer()
      startHeartbeat()
      status.value = 'connected'
      onStatus(sessionId, 'connected', '终端已连接')
      resizeTerminal()
    })

    socket.addEventListener('message', (event) => {
      const payload = JSON.parse(event.data)
      if (payload.type === 'output') {
        terminal?.write(payload.data || '')
        return
      }
      if (payload.type === 'status') {
        status.value = payload.status || 'connected'
        onStatus(sessionId, payload.status || 'connected', payload.message || '')
        return
      }
      if (payload.type === 'cwd') {
        onCwd(sessionId, payload.path || '')
      }
    })

    socket.addEventListener('close', () => {
      stopHeartbeat()
      if (shouldReconnectTerminalSocket({ manualClose, sessionId })) {
        scheduleReconnect(sessionId)
        return
      }
      status.value = 'closed'
      onStatus(sessionId, 'closed', '终端已断开')
    })

    socket.addEventListener('error', () => {
      status.value = 'error'
      onStatus(sessionId, 'error', '终端连接异常')
    })
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      window.clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  function startHeartbeat() {
    stopHeartbeat()
    heartbeatTimer = window.setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(buildTerminalPingMessage())
      }
    }, TERMINAL_HEARTBEAT_INTERVAL_MS)
  }

  function clearReconnectTimer() {
    if (reconnectTimer) {
      window.clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  function scheduleReconnect(sessionId) {
    if (reconnectTimer || !shouldReconnectTerminalSocket({ manualClose, sessionId })) {
      return
    }

    const delay = getTerminalReconnectDelay(reconnectAttempt)
    reconnectAttempt += 1
    status.value = 'reconnecting'
    onStatus(sessionId, 'reconnecting', '终端连接已断开，正在重连')

    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null
      if (shouldReconnectTerminalSocket({ manualClose, sessionId })) {
        bindSocket(sessionId)
      }
    }, delay)
  }

  function resizeTerminal() {
    if (!terminal || !fitAddon || !sessionRef.value) return
    fitAddon.fit()
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'resize', cols: terminal.cols, rows: terminal.rows }))
    }
  }

  function destroySession() {
    manualClose = true
    stopHeartbeat()
    clearReconnectTimer()
    window.removeEventListener('resize', resizeTerminal)
    resizeObserver?.disconnect()
    resizeObserver = null
    if (socket) {
      socket.close()
      socket = null
    }
    if (terminal) {
      terminal.dispose()
      terminal = null
    }
  }

  onMounted(() => {
    if (!sessionRef.value) return
    createTerminal()
    bindSocket(sessionRef.value.sessionId)
    resizeObserver = new ResizeObserver(() => {
      resizeTerminal()
    })
    if (terminalRef.value) {
      resizeObserver.observe(terminalRef.value)
    }
    window.addEventListener('resize', resizeTerminal)
  })

  watch(
    activeRef,
    (active) => {
      if (active && terminal) {
        resizeTerminal()
        terminal.focus()
      }
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    destroySession()
  })

  async function copyTerminal() {
    if (!terminal) return

    let text = ''
    if (terminal.hasSelection()) {
      text = terminal.getSelection()
    } else {
      const lines = []
      for (let index = 0; index < terminal.buffer.active.length; index += 1) {
        const line = terminal.buffer.active.getLine(index)
        if (line) {
          lines.push(line.translateToString(true))
        }
      }
      text = lines.join('\n').trim()
    }

    if (!text) return
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return
    }

    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.setAttribute('readonly', '')
    textArea.style.position = 'absolute'
    textArea.style.left = '-9999px'
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
  }

  function clearTerminal() {
    terminal?.clear()
  }

  return {
    terminalRef,
    status,
    resizeTerminal,
    clearTerminal,
    copyTerminal,
  }
}
