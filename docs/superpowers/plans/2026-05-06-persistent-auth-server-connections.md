# Persistent Auth Server Connections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep users logged in and keep server terminal sessions alive unless the user explicitly logs out or closes a terminal session.

**Architecture:** The backend removes business idle expiry for authenticated `HttpSession` instances and terminal session records, while still honoring explicit logout/session close calls. The SSH gateway enables SSHJ transport keepalive for real SSH connections, and the frontend keeps WebSocket terminal attachments alive with ping messages plus bounded automatic reconnect to the same backend terminal session.

**Tech Stack:** Spring Boot 2.7, Java 8, SSHJ 0.34.0, Maven, Vue 3 Composition API, Vite, Node test runner, xterm.js.

---

## File Structure

- Create `C:\Users\GXL\IdeaProjects\commonUtil\src\main\java\com\tool\otsutil\config\AuthProperties.java`
  Holds `app.auth.session-never-expire` with default `true`.
- Modify `C:\Users\GXL\IdeaProjects\commonUtil\src\main\java\com\tool\otsutil\service\auth\AuthService.java`
  Applies `HttpSession#setMaxInactiveInterval(-1)` after successful login.
- Modify `C:\Users\GXL\IdeaProjects\commonUtil\src\main\resources\application.yaml`
  Adds `app.auth.session-never-expire: true`, `server-connections.idle-timeout-minutes: 0`, and SSH keepalive defaults.
- Modify `C:\Users\GXL\IdeaProjects\commonUtil\src\main\java\com\tool\otsutil\serverconnection\config\ServerConnectionProperties.java`
  Adds SSH keepalive interval and documents disabled idle cleanup.
- Modify `C:\Users\GXL\IdeaProjects\commonUtil\src\main\java\com\tool\otsutil\serverconnection\service\TerminalSessionManager.java`
  Skips idle cleanup when timeout is `<= 0`.
- Modify `C:\Users\GXL\IdeaProjects\commonUtil\src\main\java\com\tool\otsutil\serverconnection\gateway\SshjRemoteServerGateway.java`
  Enables SSHJ keepalive on real SSH connections.
- Modify `C:\Users\GXL\IdeaProjects\commonUtil\src\main\java\com\tool\otsutil\serverconnection\config\ServerConnectionGatewayConfig.java`
  Injects `ServerConnectionProperties` into the SSHJ gateway.
- Modify backend tests:
  `C:\Users\GXL\IdeaProjects\commonUtil\src\test\java\com\tool\otsutil\auth\AuthFlowTest.java`,
  `C:\Users\GXL\IdeaProjects\commonUtil\src\test\java\com\tool\otsutil\serverconnection\service\TerminalSessionManagerTest.java`,
  `C:\Users\GXL\IdeaProjects\commonUtil\src\test\java\com\tool\otsutil\serverconnection\gateway\SshjRemoteServerGatewayTest.java`.
- Create `C:\Users\GXL\IdeaProjects\inspection-frontend\src\utils\terminalSession.js`
  Pure helpers for ping payloads, reconnect delay, and reconnect eligibility.
- Create `C:\Users\GXL\IdeaProjects\inspection-frontend\src\utils\serverConnectionSessions.js`
  Pure helpers for persisting/restoring open terminal session metadata.
- Create frontend tests:
  `C:\Users\GXL\IdeaProjects\inspection-frontend\tests\terminalSession.test.js`,
  `C:\Users\GXL\IdeaProjects\inspection-frontend\tests\serverConnectionSessions.test.js`.
- Modify `C:\Users\GXL\IdeaProjects\inspection-frontend\package.json`
  Runs all `tests/*.test.js` files.
- Modify `C:\Users\GXL\IdeaProjects\inspection-frontend\src\composables\useTerminalSession.js`
  Adds heartbeat and automatic reconnect.
- Modify `C:\Users\GXL\IdeaProjects\inspection-frontend\src\composables\useServerConnections.js`
  Keeps sessions in module scope, persists session metadata, removes automatic unmount close.
- Modify `C:\Users\GXL\IdeaProjects\inspection-frontend\src\pages\ServerConnectPage.vue`
  Removes `beforeunload` auto-close.

---

### Task 1: Backend Login Session Never Expires

**Files:**
- Create: `C:\Users\GXL\IdeaProjects\commonUtil\src\main\java\com\tool\otsutil\config\AuthProperties.java`
- Modify: `C:\Users\GXL\IdeaProjects\commonUtil\src\main\java\com\tool\otsutil\service\auth\AuthService.java`
- Modify: `C:\Users\GXL\IdeaProjects\commonUtil\src\main\resources\application.yaml`
- Test: `C:\Users\GXL\IdeaProjects\commonUtil\src\test\java\com\tool\otsutil\auth\AuthFlowTest.java`

- [ ] **Step 1: Write the failing session timeout assertion**

In `AuthFlowTest.shouldLoginProbeProtectedEndpointsAndLogout()`, immediately after obtaining `MockHttpSession session`, add:

```java
        org.junit.jupiter.api.Assertions.assertEquals(-1, session.getMaxInactiveInterval());
```

- [ ] **Step 2: Run the backend auth test and verify it fails**

Run:

```powershell
cd C:\Users\GXL\IdeaProjects\commonUtil
.\mvnw test -Dtest=AuthFlowTest
```

Expected: FAIL because login currently does not set the session inactive interval to `-1`.

- [ ] **Step 3: Add auth properties**

Create `AuthProperties.java`:

```java
package com.tool.otsutil.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.auth")
public class AuthProperties {

    /**
     * Keep authenticated sessions alive until explicit logout.
     */
    private boolean sessionNeverExpire = true;
}
```

- [ ] **Step 4: Apply the auth property in AuthService**

Replace `AuthService` with this version:

```java
package com.tool.otsutil.service.auth;

import com.tool.otsutil.config.AuthProperties;
import com.tool.otsutil.exception.CustomException;
import com.tool.otsutil.model.common.AppHttpCodeEnum;
import com.tool.otsutil.model.dto.auth.LoginRequest;
import com.tool.otsutil.model.vo.auth.LoginUserView;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.servlet.http.HttpSession;

@Service
public class AuthService {

    public static final String LOGIN_USER_SESSION_KEY = "LOGIN_USER";

    private static final String FIXED_USERNAME = "admin";
    private static final String FIXED_PASSWORD = "JCDZ@is.01";

    private final AuthProperties authProperties;

    public AuthService() {
        this(new AuthProperties());
    }

    @Autowired
    public AuthService(AuthProperties authProperties) {
        this.authProperties = authProperties;
    }

    public LoginUserView login(LoginRequest request, HttpSession session) {
        String username = request == null ? null : normalize(request.getUsername());
        String password = request == null ? null : request.getPassword();

        if (!FIXED_USERNAME.equals(username) || !FIXED_PASSWORD.equals(password)) {
            throw new CustomException(AppHttpCodeEnum.LOGIN_PASSWORD_ERROR);
        }

        if (authProperties.isSessionNeverExpire()) {
            session.setMaxInactiveInterval(-1);
        }
        session.setAttribute(LOGIN_USER_SESSION_KEY, FIXED_USERNAME);
        return buildUserView(FIXED_USERNAME);
    }

    public void logout(HttpSession session) {
        if (session == null) {
            return;
        }

        try {
            session.invalidate();
        } catch (IllegalStateException ignored) {
            // Ignore invalidated sessions to keep logout idempotent.
        }
    }

    public LoginUserView getCurrentUser(HttpSession session) {
        String username = getLoginUsername(session);
        return username == null ? null : buildUserView(username);
    }

    public boolean isLoggedIn(HttpSession session) {
        return getLoginUsername(session) != null;
    }

    private String getLoginUsername(HttpSession session) {
        if (session == null) {
            return null;
        }

        try {
            Object username = session.getAttribute(LOGIN_USER_SESSION_KEY);
            return username == null ? null : String.valueOf(username);
        } catch (IllegalStateException ignored) {
            return null;
        }
    }

    private LoginUserView buildUserView(String username) {
        LoginUserView view = new LoginUserView();
        view.setUsername(username);
        return view;
    }

    private String normalize(String value) {
        return value == null ? null : value.trim();
    }
}
```

- [ ] **Step 5: Add auth configuration**

In `application.yaml`, under the existing root `app:` block, add `auth` before `file`:

```yaml
app:
  auth:
    session-never-expire: true
  file:
    monitor:
      enabled: true
```

- [ ] **Step 6: Run the backend auth test and verify it passes**

Run:

```powershell
cd C:\Users\GXL\IdeaProjects\commonUtil
.\mvnw test -Dtest=AuthFlowTest
```

Expected: PASS.

- [ ] **Step 7: Commit backend auth changes**

Run:

```powershell
cd C:\Users\GXL\IdeaProjects\commonUtil
git add -- src/main/java/com/tool/otsutil/config/AuthProperties.java src/main/java/com/tool/otsutil/service/auth/AuthService.java src/main/resources/application.yaml src/test/java/com/tool/otsutil/auth/AuthFlowTest.java
git commit -m "feat: keep login sessions alive"
```

Expected: commit succeeds without staging unrelated existing changes.

---

### Task 2: Backend Terminal Session and SSH Keepalive

**Files:**
- Modify: `C:\Users\GXL\IdeaProjects\commonUtil\src\main\java\com\tool\otsutil\serverconnection\config\ServerConnectionProperties.java`
- Modify: `C:\Users\GXL\IdeaProjects\commonUtil\src\main\java\com\tool\otsutil\serverconnection\service\TerminalSessionManager.java`
- Modify: `C:\Users\GXL\IdeaProjects\commonUtil\src\main\java\com\tool\otsutil\serverconnection\gateway\SshjRemoteServerGateway.java`
- Modify: `C:\Users\GXL\IdeaProjects\commonUtil\src\main\java\com\tool\otsutil\serverconnection\config\ServerConnectionGatewayConfig.java`
- Modify: `C:\Users\GXL\IdeaProjects\commonUtil\src\main\resources\application.yaml`
- Test: `C:\Users\GXL\IdeaProjects\commonUtil\src\test\java\com\tool\otsutil\serverconnection\service\TerminalSessionManagerTest.java`
- Test: `C:\Users\GXL\IdeaProjects\commonUtil\src\test\java\com\tool\otsutil\serverconnection\gateway\SshjRemoteServerGatewayTest.java`

- [ ] **Step 1: Add the failing disabled-cleanup test**

Append this test to `TerminalSessionManagerTest`:

```java
    @Test
    void shouldNotCleanupIdleSessionsWhenIdleTimeoutIsDisabled() throws Exception {
        InspectionConfig inspectionConfig = new InspectionConfig();
        inspectionConfig.setServers(Collections.singletonList(
                new ServerConfig("10.0.0.2", 22, "root", "secret", Collections.singletonList("app.jar:start.sh"))
        ));

        ServerCatalogService catalogService = new ServerCatalogService(inspectionConfig);
        ServerConnectionProperties properties = new ServerConnectionProperties();
        properties.setIdleTimeoutMinutes(0);
        TerminalSessionManager manager = new TerminalSessionManager(
                catalogService,
                new MockRemoteServerGateway(),
                properties,
                new ObjectMapper()
        );

        OpenTerminalSessionRequest request = new OpenTerminalSessionRequest();
        request.setServerKey("10.0.0.2:22:root");
        TerminalSessionView session = manager.openSession(request);

        Thread.sleep(5L);
        manager.cleanupIdleSessions();

        Assertions.assertEquals(session.getSessionId(), manager.getSession(session.getSessionId()).getSessionId());
    }
```

- [ ] **Step 2: Add the failing SSH keepalive test**

Add imports to `SshjRemoteServerGatewayTest`:

```java
import com.tool.otsutil.model.dto.inspection.ServerConfig;
import com.tool.otsutil.serverconnection.config.ServerConnectionProperties;
import net.schmizz.keepalive.KeepAlive;
import net.schmizz.sshj.connection.Connection;
import java.util.Collections;
```

Append this test:

```java
    @Test
    void shouldEnableSshKeepAliveWhenOpeningConnection() throws Exception {
        SSHClient sshClient = Mockito.mock(SSHClient.class);
        Connection connection = Mockito.mock(Connection.class);
        KeepAlive keepAlive = Mockito.mock(KeepAlive.class);
        Mockito.when(sshClient.getConnection()).thenReturn(connection);
        Mockito.when(connection.getKeepAlive()).thenReturn(keepAlive);

        InspectionService inspectionService = Mockito.mock(InspectionService.class);
        ServerConfig serverConfig = new ServerConfig("127.0.0.1", 22, "gxl", "secret", Collections.emptyList());
        Mockito.when(inspectionService.connectToServer(serverConfig)).thenReturn(sshClient);

        ServerConnectionProperties properties = new ServerConnectionProperties();
        properties.setSshKeepaliveIntervalSeconds(30);
        SshjRemoteServerGateway gateway = new SshjRemoteServerGateway(inspectionService, properties);

        ServerConnectionHandle handle = gateway.openConnection(serverConfig);

        Assertions.assertEquals("127.0.0.1:22:gxl", handle.getServerKey());
        Mockito.verify(keepAlive).setKeepAliveInterval(30);
    }
```

- [ ] **Step 3: Run tests and verify they fail**

Run:

```powershell
cd C:\Users\GXL\IdeaProjects\commonUtil
.\mvnw test -Dtest=TerminalSessionManagerTest,SshjRemoteServerGatewayTest
```

Expected: FAIL because idle timeout `0` still expires sessions and `SshjRemoteServerGateway` does not accept properties or enable keepalive.

- [ ] **Step 4: Extend server connection properties**

Update `ServerConnectionProperties` to include:

```java
    /**
     * Idle minutes before an unused terminal session is closed. A value of 0 or less disables idle cleanup.
     */
    private int idleTimeoutMinutes = 0;

    /**
     * SSH transport keepalive interval in seconds. A value of 0 or less disables SSH keepalive.
     */
    private int sshKeepaliveIntervalSeconds = 30;
```

Keep the existing `mockEnabled` and `cleanupDelayMs` fields.

- [ ] **Step 5: Skip terminal idle cleanup when disabled**

At the beginning of `TerminalSessionManager.cleanupIdleSessions()`, add:

```java
        if (properties.getIdleTimeoutMinutes() <= 0) {
            return;
        }
```

The method should then compute `idleThreshold` only after this guard.

- [ ] **Step 6: Enable SSHJ keepalive**

Update `SshjRemoteServerGateway` constructor and `openConnection`:

```java
    private final InspectionService inspectionService;
    private final ServerConnectionProperties properties;

    public SshjRemoteServerGateway(InspectionService inspectionService, ServerConnectionProperties properties) {
        this.inspectionService = inspectionService;
        this.properties = properties;
    }

    @Override
    public ServerConnectionHandle openConnection(ServerConfig serverConfig) throws IOException {
        SSHClient sshClient = inspectionService.connectToServer(serverConfig);
        if (properties.getSshKeepaliveIntervalSeconds() > 0) {
            sshClient.getConnection().getKeepAlive().setKeepAliveInterval(properties.getSshKeepaliveIntervalSeconds());
        }
        return new SshjServerConnectionHandle(buildServerKey(serverConfig), sshClient);
    }
```

Add the import:

```java
import com.tool.otsutil.serverconnection.config.ServerConnectionProperties;
import net.schmizz.sshj.SSHClient;
```

Update the existing test `shouldOpenShellWithEchoDisabledBeforeBootstrap()` to instantiate:

```java
        SshjRemoteServerGateway gateway = new SshjRemoteServerGateway(Mockito.mock(InspectionService.class), new ServerConnectionProperties());
```

- [ ] **Step 7: Inject properties into the SSHJ gateway bean**

Change `ServerConnectionGatewayConfig.sshjRemoteServerGateway` to:

```java
    public RemoteServerGateway sshjRemoteServerGateway(InspectionService inspectionService,
                                                       ServerConnectionProperties properties) {
        return new SshjRemoteServerGateway(inspectionService, properties);
    }
```

- [ ] **Step 8: Add server connection configuration**

Add this root block to `application.yaml`:

```yaml
server-connections:
  idle-timeout-minutes: 0
  cleanup-delay-ms: 60000
  ssh-keepalive-interval-seconds: 30
```

- [ ] **Step 9: Run terminal backend tests and verify they pass**

Run:

```powershell
cd C:\Users\GXL\IdeaProjects\commonUtil
.\mvnw test -Dtest=TerminalSessionManagerTest,SshjRemoteServerGatewayTest
```

Expected: PASS.

- [ ] **Step 10: Commit backend terminal changes**

Run:

```powershell
cd C:\Users\GXL\IdeaProjects\commonUtil
git add -- src/main/java/com/tool/otsutil/serverconnection/config/ServerConnectionProperties.java src/main/java/com/tool/otsutil/serverconnection/service/TerminalSessionManager.java src/main/java/com/tool/otsutil/serverconnection/gateway/SshjRemoteServerGateway.java src/main/java/com/tool/otsutil/serverconnection/config/ServerConnectionGatewayConfig.java src/main/resources/application.yaml src/test/java/com/tool/otsutil/serverconnection/service/TerminalSessionManagerTest.java src/test/java/com/tool/otsutil/serverconnection/gateway/SshjRemoteServerGatewayTest.java
git commit -m "feat: keep terminal sessions alive"
```

Expected: commit succeeds without staging unrelated existing changes.

---

### Task 3: Frontend Pure Helpers and Tests

**Files:**
- Create: `C:\Users\GXL\IdeaProjects\inspection-frontend\src\utils\terminalSession.js`
- Create: `C:\Users\GXL\IdeaProjects\inspection-frontend\src\utils\serverConnectionSessions.js`
- Create: `C:\Users\GXL\IdeaProjects\inspection-frontend\tests\terminalSession.test.js`
- Create: `C:\Users\GXL\IdeaProjects\inspection-frontend\tests\serverConnectionSessions.test.js`
- Modify: `C:\Users\GXL\IdeaProjects\inspection-frontend\package.json`

- [ ] **Step 1: Create terminal helper tests**

Create `tests/terminalSession.test.js`:

```js
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
```

- [ ] **Step 2: Create session persistence helper tests**

Create `tests/serverConnectionSessions.test.js`:

```js
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
```

- [ ] **Step 3: Run frontend tests and verify they fail**

Run:

```powershell
cd C:\Users\GXL\IdeaProjects\inspection-frontend
npm test
```

Expected: FAIL because the helper modules do not exist yet, or because `package.json` still runs only the MySQL test file.

- [ ] **Step 4: Add terminal helper implementation**

Create `src/utils/terminalSession.js`:

```js
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
```

- [ ] **Step 5: Add session persistence helper implementation**

Create `src/utils/serverConnectionSessions.js`:

```js
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
```

- [ ] **Step 6: Update the frontend test script**

In `package.json`, change the test script to:

```json
"test": "node --test tests/*.test.js"
```

- [ ] **Step 7: Run frontend tests and verify they pass**

Run:

```powershell
cd C:\Users\GXL\IdeaProjects\inspection-frontend
npm test
```

Expected: PASS.

- [ ] **Step 8: Commit frontend helper changes**

Run:

```powershell
cd C:\Users\GXL\IdeaProjects\inspection-frontend
git add -- package.json src/utils/terminalSession.js src/utils/serverConnectionSessions.js tests/terminalSession.test.js tests/serverConnectionSessions.test.js
git commit -m "feat: add terminal session helpers"
```

Expected: commit succeeds without staging unrelated existing changes.

---

### Task 4: Frontend Terminal WebSocket Heartbeat and Reconnect

**Files:**
- Modify: `C:\Users\GXL\IdeaProjects\inspection-frontend\src\composables\useTerminalSession.js`

- [ ] **Step 1: Import terminal helpers**

Add this import to `useTerminalSession.js`:

```js
import {
  buildTerminalPingMessage,
  getTerminalReconnectDelay,
  shouldReconnectTerminalSocket,
  TERMINAL_HEARTBEAT_INTERVAL_MS,
} from '@/utils/terminalSession'
```

- [ ] **Step 2: Add connection lifecycle state**

Inside `useTerminalSession()`, next to the existing local variables, add:

```js
  let heartbeatTimer
  let reconnectTimer
  let reconnectAttempt = 0
  let manualClose = false
```

- [ ] **Step 3: Add timer cleanup helpers**

Add these functions inside `useTerminalSession()`:

```js
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
```

- [ ] **Step 4: Add reconnect scheduling**

Add this function inside `useTerminalSession()`:

```js
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
```

- [ ] **Step 5: Update WebSocket open/close/error handling**

In `bindSocket(sessionId)`, update the event handlers:

```js
    socket.addEventListener('open', () => {
      reconnectAttempt = 0
      clearReconnectTimer()
      startHeartbeat()
      status.value = 'connected'
      onStatus(sessionId, 'connected', '终端已连接')
      resizeTerminal()
    })
```

Replace the existing `close` handler with:

```js
    socket.addEventListener('close', () => {
      stopHeartbeat()
      if (shouldReconnectTerminalSocket({ manualClose, sessionId })) {
        scheduleReconnect(sessionId)
        return
      }
      status.value = 'closed'
      onStatus(sessionId, 'closed', '终端已断开')
    })
```

Replace the existing `error` handler with:

```js
    socket.addEventListener('error', () => {
      status.value = 'error'
      onStatus(sessionId, 'error', '终端连接异常')
    })
```

- [ ] **Step 6: Make destroy explicit and non-reconnecting**

At the start of `destroySession()`, add:

```js
    manualClose = true
    stopHeartbeat()
    clearReconnectTimer()
```

Keep the existing WebSocket close and terminal disposal logic.

- [ ] **Step 7: Run frontend tests and build**

Run:

```powershell
cd C:\Users\GXL\IdeaProjects\inspection-frontend
npm test
npm run build
```

Expected: both commands PASS.

- [ ] **Step 8: Commit terminal WebSocket changes**

Run:

```powershell
cd C:\Users\GXL\IdeaProjects\inspection-frontend
git add -- src/composables/useTerminalSession.js
git commit -m "feat: reconnect terminal websocket"
```

Expected: commit succeeds without staging unrelated existing changes.

---

### Task 5: Frontend Session Persistence and No Auto-Close

**Files:**
- Modify: `C:\Users\GXL\IdeaProjects\inspection-frontend\src\composables\useServerConnections.js`
- Modify: `C:\Users\GXL\IdeaProjects\inspection-frontend\src\pages\ServerConnectPage.vue`

- [ ] **Step 1: Update imports in useServerConnections**

Replace the first line with:

```js
import { computed, ref } from 'vue'
```

Add `getServerConnectionCwd` to the server connection API imports:

```js
  getServerConnectionCwd,
```

Add storage helper imports:

```js
import {
  parseStoredServerConnectionSessions,
  serializeServerConnectionSessions,
  SERVER_CONNECTION_SESSIONS_STORAGE_KEY,
} from '@/utils/serverConnectionSessions'
```

- [ ] **Step 2: Move server connection state to module scope**

Before `export function useServerConnections()`, add:

```js
const loading = ref(false)
const connecting = ref(false)
const error = ref('')
const servers = ref([])
const searchKeyword = ref('')
const sessions = ref([])
const activeSessionId = ref('')
let restoredPersistedSessions = false
```

Remove the matching `ref(...)` declarations from inside `useServerConnections()`.

- [ ] **Step 3: Add persistence helpers**

Inside `useServerConnections()`, before `loadServers()`, add:

```js
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
```

- [ ] **Step 4: Restore sessions before loading server catalog**

At the start of `loadServers()`, before `loading.value = true`, add:

```js
    await restorePersistedSessions()
```

- [ ] **Step 5: Persist session changes**

In `connectServer()`, after `sessions.value.push(...)` and after `activeSessionId.value = session.sessionId`, call:

```js
      persistSessions()
```

In `closeSession()`, after possibly changing `activeSessionId.value`, call:

```js
    persistSessions()
```

In `activateSession(sessionId)`, after assigning `activeSessionId.value`, call:

```js
    persistSessions()
```

In `updateSessionStatus()` and `updateSessionCwd()`, after mutating the session, call:

```js
    persistSessions()
```

- [ ] **Step 6: Remove automatic close on composable unmount**

Delete this block from `useServerConnections()`:

```js
  onBeforeUnmount(() => {
    closeAllSessions()
  })
```

Keep `closeAllSessions()` exported for explicit future use.

- [ ] **Step 7: Remove beforeunload auto-close from ServerConnectPage**

In `ServerConnectPage.vue`, remove `onUnmounted` from the Vue import:

```js
import { computed, onMounted, ref, watch } from 'vue'
```

Remove `closeAllSessions` from the destructuring result of `useServerConnections()`.

In `onMounted()`, delete:

```js
  window.addEventListener('beforeunload', closeAllSessions)
```

Delete the full `onUnmounted()` block:

```js
onUnmounted(() => {
  window.removeEventListener('beforeunload', closeAllSessions)
})
```

- [ ] **Step 8: Run frontend tests and build**

Run:

```powershell
cd C:\Users\GXL\IdeaProjects\inspection-frontend
npm test
npm run build
```

Expected: both commands PASS.

- [ ] **Step 9: Commit frontend persistence changes**

Run:

```powershell
cd C:\Users\GXL\IdeaProjects\inspection-frontend
git add -- src/composables/useServerConnections.js src/pages/ServerConnectPage.vue
git commit -m "feat: preserve server connection sessions"
```

Expected: commit succeeds without staging unrelated existing changes.

---

### Task 6: Final Verification

**Files:**
- Read-only verification across both repositories.

- [ ] **Step 1: Run backend focused tests**

Run:

```powershell
cd C:\Users\GXL\IdeaProjects\commonUtil
.\mvnw test -Dtest=AuthFlowTest,TerminalSessionManagerTest,SshjRemoteServerGatewayTest,LoginHandshakeInterceptorTest
```

Expected: PASS.

- [ ] **Step 2: Run frontend tests and build**

Run:

```powershell
cd C:\Users\GXL\IdeaProjects\inspection-frontend
npm test
npm run build
```

Expected: PASS.

- [ ] **Step 3: Inspect git status in both repositories**

Run:

```powershell
cd C:\Users\GXL\IdeaProjects\commonUtil
git status --short

cd C:\Users\GXL\IdeaProjects\inspection-frontend
git status --short
```

Expected: only pre-existing unrelated changes remain unstaged, or the task-specific changes are committed. Do not revert unrelated user changes.

---

## Self-Review

Spec coverage:
- Login session never expires: Task 1.
- Terminal sessions do not close from backend idle cleanup: Task 2.
- SSH connection receives keepalive traffic: Task 2.
- WebSocket heartbeat and automatic reconnect: Task 4.
- User manual logout/manual close still releases resources: Tasks 1, 2, and 5 preserve existing explicit close paths.
- Page lifecycle no longer auto-closes sessions: Task 5.
- Tests and final verification: Tasks 1, 2, 3, 4, 5, and 6.

Placeholder scan:
- No placeholder markers or unspecified implementation instructions remain.

Type consistency:
- `AuthProperties.isSessionNeverExpire()` matches Lombok boolean getter conventions.
- `ServerConnectionProperties.getSshKeepaliveIntervalSeconds()` and `setSshKeepaliveIntervalSeconds(...)` match Lombok getter/setter conventions.
- Frontend helper function names in tests match the planned utility exports.
