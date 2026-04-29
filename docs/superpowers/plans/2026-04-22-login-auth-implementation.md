# Login Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a hard-coded `admin / JCDZ@is.01` login flow that protects the Vue app, Spring Boot APIs, and terminal WebSocket access.

**Architecture:** Add session-based auth in `commonUtil` with dedicated auth endpoints plus HTTP and WebSocket gatekeeping. In `inspection-frontend`, add a login route, a focused auth composable/API layer, and global route guarding that keeps the existing layout intact for protected pages.

**Tech Stack:** Vue 3 + Vue Router + Element Plus + Axios, Spring Boot 2.7 + Spring MVC + WebSocket + JUnit 5/MockMvc.

---

## File Map

- `C:/Users/GXL/IdeaProjects/commonUtil/src/test/java/com/tool/otsutil/auth/AuthFlowTest.java`
  Backend auth regression coverage for login, session probing, protected API access, and logout.
- `C:/Users/GXL/IdeaProjects/commonUtil/src/test/java/com/tool/otsutil/serverconnection/websocket/LoginHandshakeInterceptorTest.java`
  WebSocket session gate coverage.
- `C:/Users/GXL/IdeaProjects/commonUtil/src/main/java/com/tool/otsutil/controller/AuthController.java`
  Login, logout, and session endpoints.
- `C:/Users/GXL/IdeaProjects/commonUtil/src/main/java/com/tool/otsutil/service/auth/AuthService.java`
  Hard-coded credential validation and session helpers.
- `C:/Users/GXL/IdeaProjects/commonUtil/src/main/java/com/tool/otsutil/model/dto/auth/LoginRequest.java`
  Login request payload.
- `C:/Users/GXL/IdeaProjects/commonUtil/src/main/java/com/tool/otsutil/model/vo/auth/LoginUserView.java`
  Auth session response payload.
- `C:/Users/GXL/IdeaProjects/commonUtil/src/main/java/com/tool/otsutil/config/LoginAuthInterceptor.java`
  HTTP session guard.
- `C:/Users/GXL/IdeaProjects/commonUtil/src/main/java/com/tool/otsutil/config/WebMvcAuthConfig.java`
  Registers the HTTP auth interceptor.
- `C:/Users/GXL/IdeaProjects/commonUtil/src/main/java/com/tool/otsutil/serverconnection/websocket/LoginHandshakeInterceptor.java`
  Rejects WebSocket handshakes without login session.
- `C:/Users/GXL/IdeaProjects/commonUtil/src/main/java/com/tool/otsutil/serverconnection/websocket/ServerTerminalWebSocketConfig.java`
  Wires the handshake interceptor into the terminal endpoint.
- `C:/Users/GXL/IdeaProjects/commonUtil/src/main/java/com/tool/otsutil/config/CorsConfig.java`
  Allows credentialed localhost development requests.
- `C:/Users/GXL/IdeaProjects/inspection-frontend/src/api/auth.js`
  Frontend auth API wrapper.
- `C:/Users/GXL/IdeaProjects/inspection-frontend/src/composables/useAuth.js`
  Shared login state, auth bootstrap, redirect handling, and logout behavior.
- `C:/Users/GXL/IdeaProjects/inspection-frontend/src/api/http.js`
  Credentialed requests and global unauthenticated handling.
- `C:/Users/GXL/IdeaProjects/inspection-frontend/src/router/index.js`
  Adds `/login` and the global route guard.
- `C:/Users/GXL/IdeaProjects/inspection-frontend/src/pages/LoginPage.vue`
  B-direction split login screen.
- `C:/Users/GXL/IdeaProjects/inspection-frontend/src/components/Layout.vue`
  Shows current user and exposes logout.

### Task 1: Backend Auth HTTP Tests

**Files:**
- Create: `C:/Users/GXL/IdeaProjects/commonUtil/src/test/java/com/tool/otsutil/auth/AuthFlowTest.java`

- [ ] **Step 1: Write the failing test**

```java
package com.tool.otsutil.auth;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AuthFlowTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldLoginProbeProtectedEndpointAndLogout() throws Exception {
        mockMvc.perform(get("/Inspection/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(1));

        MockHttpSession session = (MockHttpSession) mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"JCDZ@is.01\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.username").value("admin"))
                .andReturn()
                .getRequest()
                .getSession(false);

        mockMvc.perform(get("/auth/session").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.username").value("admin"));

        mockMvc.perform(get("/Inspection/dashboard").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        mockMvc.perform(post("/auth/logout").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        mockMvc.perform(get("/auth/session").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(1));
    }

    @Test
    void shouldRejectInvalidPassword() throws Exception {
        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"wrong\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(2));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `mvn -Dtest=AuthFlowTest test`
Expected: FAIL because `/auth/*` endpoints and auth interceptor do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```java
// Create auth controller/service/session guard classes from later tasks
// until the test returns code 200 for valid login and code 1/2 for unauthenticated/invalid cases.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `mvn -Dtest=AuthFlowTest test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C C:/Users/GXL/IdeaProjects/commonUtil add src/test/java/com/tool/otsutil/auth/AuthFlowTest.java src/main/java/com/tool/otsutil/controller/AuthController.java src/main/java/com/tool/otsutil/service/auth/AuthService.java src/main/java/com/tool/otsutil/model/dto/auth/LoginRequest.java src/main/java/com/tool/otsutil/model/vo/auth/LoginUserView.java src/main/java/com/tool/otsutil/config/LoginAuthInterceptor.java src/main/java/com/tool/otsutil/config/WebMvcAuthConfig.java src/main/java/com/tool/otsutil/config/CorsConfig.java
git -C C:/Users/GXL/IdeaProjects/commonUtil commit -m "feat: add session auth endpoints"
```

### Task 2: WebSocket Handshake Guard

**Files:**
- Create: `C:/Users/GXL/IdeaProjects/commonUtil/src/test/java/com/tool/otsutil/serverconnection/websocket/LoginHandshakeInterceptorTest.java`
- Create: `C:/Users/GXL/IdeaProjects/commonUtil/src/main/java/com/tool/otsutil/serverconnection/websocket/LoginHandshakeInterceptor.java`
- Modify: `C:/Users/GXL/IdeaProjects/commonUtil/src/main/java/com/tool/otsutil/serverconnection/websocket/ServerTerminalWebSocketConfig.java`

- [ ] **Step 1: Write the failing test**

```java
package com.tool.otsutil.serverconnection.websocket;

import org.junit.jupiter.api.Test;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.support.HttpSessionHandshakeInterceptor;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LoginHandshakeInterceptorTest {

    @Test
    void shouldRejectHandshakeWithoutLoginUser() throws Exception {
        LoginHandshakeInterceptor interceptor = new LoginHandshakeInterceptor();
        assertFalse(interceptor.beforeHandshake(null, null, null, new HashMap<String, Object>()));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `mvn -Dtest=LoginHandshakeInterceptorTest test`
Expected: FAIL because the interceptor class does not exist.

- [ ] **Step 3: Write minimal implementation**

```java
// Create LoginHandshakeInterceptor that reads LOGIN_USER from HttpSession and returns false when absent.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `mvn -Dtest=LoginHandshakeInterceptorTest test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C C:/Users/GXL/IdeaProjects/commonUtil add src/test/java/com/tool/otsutil/serverconnection/websocket/LoginHandshakeInterceptorTest.java src/main/java/com/tool/otsutil/serverconnection/websocket/LoginHandshakeInterceptor.java src/main/java/com/tool/otsutil/serverconnection/websocket/ServerTerminalWebSocketConfig.java
git -C C:/Users/GXL/IdeaProjects/commonUtil commit -m "feat: protect terminal websocket handshake"
```

### Task 3: Frontend Auth API and Guard

**Files:**
- Create: `C:/Users/GXL/IdeaProjects/inspection-frontend/src/api/auth.js`
- Create: `C:/Users/GXL/IdeaProjects/inspection-frontend/src/composables/useAuth.js`
- Modify: `C:/Users/GXL/IdeaProjects/inspection-frontend/src/api/http.js`
- Modify: `C:/Users/GXL/IdeaProjects/inspection-frontend/src/router/index.js`

- [ ] **Step 1: Write the failing test/manual verification target**

```text
Open /inspection/dashboard without an auth cookie.
Expected: redirect to /inspection/login?redirect=%2Fdashboard
```

- [ ] **Step 2: Run the app and verify it currently fails**

Run: `npm run build`
Expected: build passes, but the manual route-protection expectation is not implemented yet.

- [ ] **Step 3: Write minimal implementation**

```javascript
// auth.js
import http from './http'

export function login(payload) {
  return http.post('/auth/login', payload)
}

export function logout() {
  return http.post('/auth/logout')
}

export function fetchSession() {
  return http.get('/auth/session')
}
```

```javascript
// useAuth.js
import { computed, ref } from 'vue'
import { fetchSession, login, logout } from '@/api/auth'
```

```javascript
// router/index.js
// add /login route and beforeEach guard that resolves auth before protected routes
```

- [ ] **Step 4: Run verification**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C C:/Users/GXL/IdeaProjects/inspection-frontend add src/api/auth.js src/composables/useAuth.js src/api/http.js src/router/index.js
git -C C:/Users/GXL/IdeaProjects/inspection-frontend commit -m "feat: add frontend auth guard"
```

### Task 4: Login Page and Layout Integration

**Files:**
- Create: `C:/Users/GXL/IdeaProjects/inspection-frontend/src/pages/LoginPage.vue`
- Modify: `C:/Users/GXL/IdeaProjects/inspection-frontend/src/components/Layout.vue`

- [ ] **Step 1: Write the failing test/manual verification target**

```text
Visit /inspection/login on desktop and mobile widths.
Expected: split-layout login page, submitting valid credentials enters the dashboard, logout returns to login.
```

- [ ] **Step 2: Run the build or preview to confirm the UI is still missing**

Run: `npm run build`
Expected: PASS, but login screen and logout affordance are absent.

- [ ] **Step 3: Write minimal implementation**

```vue
<!-- LoginPage.vue -->
<script setup>
import { reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
</script>
```

```vue
<!-- Layout.vue -->
<!-- add current user badge and logout button in header -->
```

- [ ] **Step 4: Run verification**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C C:/Users/GXL/IdeaProjects/inspection-frontend add src/pages/LoginPage.vue src/components/Layout.vue
git -C C:/Users/GXL/IdeaProjects/inspection-frontend commit -m "feat: add login page and logout controls"
```

### Task 5: End-to-End Verification

**Files:**
- Modify: `C:/Users/GXL/IdeaProjects/commonUtil/src/test/java/com/tool/otsutil/auth/AuthFlowTest.java`
- Modify: `C:/Users/GXL/IdeaProjects/commonUtil/src/test/java/com/tool/otsutil/serverconnection/websocket/LoginHandshakeInterceptorTest.java`
- Modify: `C:/Users/GXL/IdeaProjects/inspection-frontend/docs/superpowers/specs/2026-04-21-login-auth-design.md`

- [ ] **Step 1: Run backend verification**

Run: `mvn -Dtest=AuthFlowTest,LoginHandshakeInterceptorTest test`
Expected: PASS

- [ ] **Step 2: Run frontend verification**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Run a final status check**

Run: `git -C C:/Users/GXL/IdeaProjects/commonUtil status --short && git -C C:/Users/GXL/IdeaProjects/inspection-frontend status --short`
Expected: only intended auth-related file changes remain.

- [ ] **Step 4: Commit**

```bash
git -C C:/Users/GXL/IdeaProjects/commonUtil add -A
git -C C:/Users/GXL/IdeaProjects/commonUtil commit -m "test: verify session auth flow"
git -C C:/Users/GXL/IdeaProjects/inspection-frontend add -A
git -C C:/Users/GXL/IdeaProjects/inspection-frontend commit -m "docs: record login auth implementation"
```
