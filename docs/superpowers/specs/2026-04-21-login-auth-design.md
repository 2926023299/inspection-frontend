# 登录鉴权设计

## 背景

当前巡检系统缺少登录入口，所有页面、接口和服务器终端能力可直接访问。需求是新增一个登录页，账号密码固定写在后端，用户名为 `admin`，密码为 `JCDZ@is.01`，并对现有前端页面、后端接口以及终端 WebSocket 统一加登录保护。

本次改动涉及两个仓库：

- `inspection-frontend`：新增登录页、路由守卫、登录状态管理、退出登录入口。
- `commonUtil`：新增登录接口、Session 登录态、HTTP 鉴权拦截器、WebSocket 握手拦截。

## 目标

- 未登录用户访问任意业务页面时，自动跳转到登录页。
- 登录成功后进入工作台，并可继续访问现有所有业务功能。
- 退出登录后，前端立即清理状态并回到登录页。
- 后端接口和服务器终端 WebSocket 统一校验 Session，避免只拦页面不拦能力接口。
- 保持当前系统的视觉语言，登录页采用分栏控制台方案，登录前后风格连续。

## 非目标

- 不引入数据库用户表。
- 不引入 JWT、OAuth 或第三方单点登录。
- 不实现多角色、多账号和权限细分。
- 不重构现有业务页面的数据查询逻辑，只在入口和网关层补鉴权。

## 方案结论

采用基于 `HttpSession` 的固定账号登录：

- 后端提供 `/auth/login`、`/auth/logout`、`/auth/session` 三个接口。
- 登录成功后在 Session 中写入固定用户标识，例如 `authUser=admin`。
- 前端所有请求携带 cookie，业务路由在进入前通过 `/auth/session` 确认登录态。
- 后端通过 `HandlerInterceptor` 拦截业务 HTTP 接口，通过 `HandshakeInterceptor` 拦截终端 WebSocket 握手。

选择该方案的原因：

- 与“账号密码固定写死在后端”的需求最匹配。
- 不需要额外 token 刷新和本地存储管理。
- 可以同时覆盖普通接口和 WebSocket 连接。
- 对当前前后端代码侵入最小，能在现有结构上补齐。

## 前端设计

### 页面与路由

前端新增独立登录页路由 `/login`，并保持现有 Layout 业务壳不变：

- `/login`：不挂载 `Layout.vue`，单独展示登录页。
- `/dashboard`、`/server`、`/connect`、`/java`、`/topology`、`/history/:ip`：全部视为受保护页面。

路由守卫规则：

- 访问受保护页面时，如果尚未确认登录态，先调用 `/auth/session`。
- 未登录则跳转 `/login`，并带上原目标地址，登录成功后回跳。
- 已登录用户再次访问 `/login` 时，直接跳转 `/dashboard`。

### 登录页视觉与交互

登录页采用已确认的 B 方案，保持当前系统的深色控制台语言：

- 左侧为深色品牌介绍区，延续现有侧栏的暗色渐变、品牌字样和功能摘要。
- 右侧为浅色登录表单区，输入项仅保留用户名和密码。
- 移动端收敛为单栏，上方展示品牌说明，下方展示登录表单。
- 登录按钮在提交期间展示加载态，避免重复提交。
- 错误提示使用 Element Plus 的表单校验与消息提示，不暴露内部实现细节。

### 登录状态管理

前端新增统一鉴权模块，职责如下：

- 发起 `login/logout/session` 请求。
- 缓存当前页面生命周期内的登录状态和用户名。
- 在登录成功后更新内存状态，在退出后立即清空。
- 为 `http.js` 和直接使用 `axios` 的上传下载请求统一开启 `withCredentials`。

不把登录结果作为可信来源持久化到 `localStorage`。浏览器刷新后以 `/auth/session` 返回结果为准，避免前端本地状态和后端 Session 脱节。

### 退出入口

在现有 Layout 顶部或侧栏增加退出登录入口，展示当前用户为 `admin`：

- 点击退出后调用 `/auth/logout`。
- 请求成功后清空前端鉴权状态并跳转 `/login`。
- 如果会话已经失效，也统一回到登录页。

### 失效处理

前端在以下场景统一视为未登录：

- `/auth/session` 返回未登录。
- 业务接口返回 `AppHttpCodeEnum.NEED_LOGIN`。
- WebSocket 因未登录被拒绝建立。

发生上述情况时：

- 清空前端内存中的登录状态。
- 如果当前不在登录页，则跳转 `/login`。
- 保留用户原访问地址，方便登录后返回。

## 后端设计

### 固定账号

固定账号和密码直接写在后端服务代码中：

- 用户名：`admin`
- 密码：`JCDZ@is.01`

本次不下沉到数据库，也不读取外部配置。

### 登录接口

新增鉴权控制器，提供以下接口：

- `POST /auth/login`
  - 入参：`username`、`password`
  - 校验固定账号密码
  - 成功：写入 Session 并返回当前用户信息
  - 失败：返回 `LOGIN_PASSWORD_ERROR`
- `POST /auth/logout`
  - 销毁当前 Session
  - 幂等处理，重复退出也返回成功
- `GET /auth/session`
  - 用于前端启动阶段确认当前 Session 是否有效
  - 已登录时返回当前用户名
  - 未登录时返回 `NEED_LOGIN`

### Session 约定

后端统一使用固定 Session Key，例如 `LOGIN_USER`：

- 登录成功时写入 `admin`
- 登出时移除该值并让 Session 失效
- HTTP 拦截器和 WebSocket 握手拦截器共用同一个 Session Key 进行校验

### HTTP 鉴权拦截

新增 Spring MVC 拦截器，仅拦截当前业务接口路径：

- `/Inspection/**`
- `/server-connections/**`

放行路径：

- `/auth/login`
- `/auth/logout`
- `/auth/session`
- `/error`

拦截行为：

- Session 中不存在 `LOGIN_USER` 时，抛出 `CustomException(AppHttpCodeEnum.NEED_LOGIN)`
- 已登录则放行

这样可以复用现有全局异常处理，保持返回体仍是 `ResponseResult` 结构。

### WebSocket 鉴权拦截

服务器终端使用 `/ws/server-connections/terminal/**` 建立 WebSocket。该链路当前没有登录校验，因此本次新增握手拦截器：

- 在握手阶段读取 `HttpSession`
- 如果不存在 `LOGIN_USER`，直接拒绝握手
- 如果已登录，则允许建立连接

这样可以防止用户绕过前端页面，直接连接终端 WebSocket。

### CORS 与 Cookie

由于前端需要携带 Session Cookie，本次需要统一允许凭证请求：

- `CorsFilter` 保持 `allowCredentials=true`
- 避免使用会导致浏览器拒绝凭证请求的通配源写法
- 至少允许本地开发地址，例如 `http://localhost:*` 和 `http://127.0.0.1:*`
- 生产同源部署继续按浏览器同源策略工作

## 文件改动规划

### inspection-frontend

预计新增或修改以下文件：

- `src/router/index.js`
  - 新增 `/login` 路由
  - 新增全局前置守卫
- `src/pages/LoginPage.vue`
  - 新增分栏控制台登录页
- `src/api/http.js`
  - 统一开启 `withCredentials`
  - 处理未登录响应
- `src/api/auth.js`
  - 封装 `login/logout/session` 请求
- `src/composables/useAuth.js`
  - 统一维护前端登录态
- `src/components/Layout.vue`
  - 展示当前用户与退出登录入口

### commonUtil

预计新增或修改以下文件：

- `src/main/java/com/tool/otsutil/controller/AuthController.java`
  - 提供登录、退出、会话查询接口
- `src/main/java/com/tool/otsutil/model/dto/auth/LoginRequest.java`
  - 登录请求体
- `src/main/java/com/tool/otsutil/model/vo/auth/LoginUserView.java`
  - 登录用户返回体
- `src/main/java/com/tool/otsutil/service/auth/AuthService.java`
  - 固定账号校验与 Session 写入逻辑
- `src/main/java/com/tool/otsutil/config/LoginAuthInterceptor.java`
  - HTTP Session 鉴权拦截器
- `src/main/java/com/tool/otsutil/config/WebMvcAuthConfig.java`
  - 注册 HTTP 拦截器
- `src/main/java/com/tool/otsutil/serverconnection/websocket/LoginHandshakeInterceptor.java`
  - WebSocket 握手登录校验
- `src/main/java/com/tool/otsutil/serverconnection/websocket/ServerTerminalWebSocketConfig.java`
  - 注册握手拦截器
- `src/main/java/com/tool/otsutil/config/CorsConfig.java`
  - 调整允许凭证时的源规则

## 数据流

### 登录成功链路

1. 用户访问受保护页面。
2. 前端路由守卫发现未确认登录态，调用 `GET /auth/session`。
3. 如果未登录，跳转 `/login?redirect=<原路径>`。
4. 用户提交用户名和密码到 `POST /auth/login`。
5. 后端校验固定账号密码，写入 Session。
6. 前端更新内存登录态，跳转回原目标页或 `/dashboard`。
7. 后续接口与 WebSocket 复用同一 Session Cookie。

### 登出链路

1. 用户点击退出登录。
2. 前端调用 `POST /auth/logout`。
3. 后端销毁 Session。
4. 前端清空状态并跳转 `/login`。

### 会话失效链路

1. 前端请求业务接口或建立 WebSocket。
2. 后端发现 Session 失效，HTTP 返回 `NEED_LOGIN`，或握手直接失败。
3. 前端统一清理状态并回到登录页。

## 错误处理

- 用户名或密码错误：返回 `LOGIN_PASSWORD_ERROR`，前端展示“用户名或密码错误”。
- 未登录访问：返回 `NEED_LOGIN`，前端跳回登录页。
- 重复退出：不视为错误，保持幂等。
- 登录页已登录访问：直接回工作台，避免重复登录。

## 测试设计

### 后端

至少覆盖以下测试：

- 正确账号密码登录成功并写入 Session。
- 错误账号或密码登录失败。
- 未登录访问 `/Inspection/dashboard` 返回 `NEED_LOGIN`。
- 已登录后访问受保护接口成功。
- 未登录建立终端 WebSocket 握手被拒绝。

### 前端

至少覆盖以下验证：

- 直接打开受保护路由会跳转登录页。
- 登录成功后会回跳到原始目标页。
- 已登录访问 `/login` 会自动回工作台。
- 退出登录后不能继续访问业务页。
- 服务器连接页在未登录时不会建立终端会话。

## 风险与边界

- 当前后端使用 CORS 通配规则，若不调整源配置，浏览器携带 Session Cookie 的请求会被拒绝，这是本次实现必须修正的点。
- 终端 WebSocket 与普通 HTTP 接口是两条链路，若只做 HTTP 拦截，会留下未授权终端入口，因此必须同时处理握手校验。
- 本次是固定账号登录，属于最小可用方案，后续如果需要多账号，应把 `AuthService` 的固定常量替换为配置或持久化用户源，而不是推倒重做前端守卫结构。

## 实施顺序

建议按以下顺序落地，减少联调回滚成本：

1. 先在后端完成 `auth` 接口和 Session 校验。
2. 再接入前端鉴权模块和路由守卫。
3. 最后补登录页 UI、退出入口和失效跳转细节。
4. 联调 HTTP 接口与终端 WebSocket，确认两条链路都被保护。
