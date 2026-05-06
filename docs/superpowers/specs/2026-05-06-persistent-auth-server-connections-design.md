# 登录与服务器连接保持设计

## 背景

当前系统由 Vue 前端和 Spring Boot 后端组成。登录使用后端 `HttpSession`，受容器空闲超时影响。服务器连接模块使用后端内存中的终端会话和 WebSocket 转发 SSH shell，当前后端会按 `server-connections.idle-timeout-minutes` 清理空闲终端，前端 WebSocket 断开后只更新状态，不会自动重连。

用户目标是：只要用户没有手动点击退出登录、没有手动关闭服务器连接，系统就不因为空闲超时自动退出或断开。

## 范围

本次改动覆盖登录会话生命周期、服务器终端会话生命周期、终端 WebSocket 保活与自动重连。

本次不实现跨后端进程重启恢复原 SSH shell。后端进程重启、电脑休眠、远端 SSH 服务主动断开等场景只能尽量重新建立连接，不能保证原终端进程无损恢复。

## 推荐方案

采用“禁用业务空闲超时 + 前端心跳重连”：

- 登录成功后，后端把当前 `HttpSession` 设置为永不过期，除非用户调用退出登录。
- 后端终端会话默认不因空闲清理，除非用户手动关闭终端或应用停止。
- 前端终端 WebSocket 建立后定时发送 `ping`，让后端持续刷新终端会话访问时间。
- WebSocket 非主动关闭时，前端自动重连同一个后端终端会话。
- 用户手动关闭终端、退出登录、页面组件销毁时，停止该终端 WebSocket 的自动重连。

## 后端设计

### 登录会话

新增认证配置项，默认开启登录会话永不过期：

```yaml
app:
  auth:
    session-never-expire: true
```

`AuthService.login()` 登录成功后读取该配置。配置为 `true` 时调用 `session.setMaxInactiveInterval(-1)`，让该 `HttpSession` 不因空闲过期。`logout()` 继续调用 `session.invalidate()`，手动退出仍然立即失效。

### 终端会话

扩展 `ServerConnectionProperties`：

```yaml
server-connections:
  idle-timeout-minutes: 0
  cleanup-delay-ms: 60000
```

约定 `idle-timeout-minutes <= 0` 表示禁用空闲清理。`TerminalSessionManager.cleanupIdleSessions()` 在该配置禁用时直接返回，不关闭任何终端会话。

保留以下释放路径：

- 用户调用 `DELETE /server-connections/sessions/{sessionId}` 时关闭指定终端会话。
- 后端应用停止时 `closeAllSessions()` 关闭所有 SSH shell 和连接。
- 后端发现终端会话不存在时继续返回现有错误。

## 前端设计

### WebSocket 保活

`useTerminalSession.js` 在 WebSocket `open` 后启动定时器，周期发送：

```json
{"type":"ping"}
```

后端已有 `ping` 分支，会返回 `pong` 并刷新会话访问时间，因此前端无需新增接口。

### 自动重连

`useTerminalSession.js` 区分主动关闭和异常关闭：

- 主动关闭：组件卸载、用户关闭终端、页面离开时由前端显式关闭，不自动重连。
- 异常关闭：网络抖动、浏览器临时断线、WebSocket 错误导致关闭，自动重连同一个 `sessionId`。

重连使用递增延迟，避免网络断开时频繁创建连接。重连成功后恢复 `connected` 状态，并重新发送终端尺寸。

如果后端终端会话已经不存在，重连会失败并保持错误状态，不创建新的 SSH shell，避免用户误以为原终端还在。

### 页面生命周期

当前服务器连接页在 `beforeunload` 上调用 `closeAllSessions()`，这会导致刷新或关闭页面时主动释放所有后端终端会话。为满足“没有手动关闭就不断开”，移除这个自动关闭行为。

页面内已有“关闭终端”操作继续调用后端关闭接口，作为唯一的用户主动释放入口。

## 测试计划

后端：

- 登录成功后断言 `HttpSession.getMaxInactiveInterval()` 为 `-1`。
- 退出登录后断言会话不可继续访问受保护接口。
- `server-connections.idle-timeout-minutes <= 0` 时调用 `cleanupIdleSessions()` 不关闭已有终端会话。

前端：

- 验证终端 WebSocket 打开后会发送 `ping`。
- 验证异常关闭会安排自动重连。
- 验证主动销毁不会触发自动重连。

验证命令：

```powershell
cd C:\Users\GXL\IdeaProjects\commonUtil
.\mvnw test -Dtest=AuthFlowTest,TerminalSessionManagerTest

cd C:\Users\GXL\IdeaProjects\inspection-frontend
npm test
npm run build
```

## 风险与边界

永不过期登录会话适合本地或受控内网工具。若未来部署到多人公网环境，需要重新评估安全策略，至少增加显式会话管理或受信任网络限制。

终端会话不自动清理会增加后端持有的 SSH 连接数量。当前目标以用户手动关闭为释放边界，因此 UI 中关闭终端的行为必须保持清晰可用。
