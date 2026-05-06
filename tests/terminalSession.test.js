import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildTerminalPingMessage,
  getTerminalReconnectDelay,
  shouldReconnectTerminalSocket,
} from '../src/utils/terminalSession.js'

test('terminal ping payload matches backend message shape', () => {
  assert.equal(buildTerminalPingMessage(), JSON.stringify({ type: 'ping' }))
})

test('terminal reconnect delay is capped at the largest configured delay', () => {
  assert.equal(getTerminalReconnectDelay(0), 1000)
  assert.equal(getTerminalReconnectDelay(1), 2000)
  assert.equal(getTerminalReconnectDelay(2), 5000)
  assert.equal(getTerminalReconnectDelay(99), 10000)
})

test('terminal reconnect only runs for non-manual closes with a session id', () => {
  assert.equal(shouldReconnectTerminalSocket({ manualClose: false, sessionId: 'abc' }), true)
  assert.equal(shouldReconnectTerminalSocket({ manualClose: true, sessionId: 'abc' }), false)
  assert.equal(shouldReconnectTerminalSocket({ manualClose: false, sessionId: '' }), false)
})
