import test from 'node:test'
import assert from 'node:assert/strict'

import {
  parseStoredServerConnectionSessions,
  serializeServerConnectionSessions,
} from '../src/utils/serverConnectionSessions.js'

test('server connection session storage keeps only restorable metadata', () => {
  const raw = serializeServerConnectionSessions([
    {
      sessionId: 's1',
      serverKey: '127.0.0.1:22:gxl',
      displayName: '127.0.0.1:gxl',
      username: 'gxl',
      cwd: '/home/gxl',
      status: 'connected',
      message: 'connected',
      ignored: true,
    },
  ], 's1')

  assert.deepEqual(JSON.parse(raw), {
    activeSessionId: 's1',
    sessions: [
      {
        sessionId: 's1',
        serverKey: '127.0.0.1:22:gxl',
        displayName: '127.0.0.1:gxl',
        username: 'gxl',
        cwd: '/home/gxl',
      },
    ],
  })
})

test('server connection session storage ignores invalid payloads', () => {
  assert.deepEqual(parseStoredServerConnectionSessions(''), { sessions: [], activeSessionId: '' })
  assert.deepEqual(parseStoredServerConnectionSessions('{bad json'), { sessions: [], activeSessionId: '' })
  assert.deepEqual(parseStoredServerConnectionSessions(JSON.stringify({ sessions: [{ sessionId: '' }] })), {
    sessions: [],
    activeSessionId: '',
  })
})
