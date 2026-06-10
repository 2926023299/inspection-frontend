import axios from 'axios'
import http, { buildRequestUrl, buildWebSocketUrl, createRequestError, notifyUnauthorized } from './http'

export function listServerConnections() {
  return http.get('/server-connections/servers')
}

export function openServerConnectionSession(payload) {
  return http.post('/server-connections/sessions', payload)
}

export function closeServerConnectionSession(sessionId) {
  return http.delete(`/server-connections/sessions/${sessionId}`)
}

export function reconnectServerConnectionSession(sessionId) {
  return http.post(`/server-connections/sessions/${sessionId}/reconnect`)
}

export function getServerConnectionCwd(sessionId) {
  return http.get(`/server-connections/sessions/${sessionId}/cwd`)
}

export function listRemoteFiles(sessionId, path) {
  return http.get(`/server-connections/sessions/${sessionId}/files`, {
    params: path ? { path } : {},
  })
}

export function createRemoteDirectory(sessionId, payload) {
  return http.post(`/server-connections/sessions/${sessionId}/directories`, payload)
}

export function renameRemoteFile(sessionId, payload) {
  return http.post(`/server-connections/sessions/${sessionId}/files/rename`, payload)
}

export function deleteRemoteFile(sessionId, payload) {
  return http.post(`/server-connections/sessions/${sessionId}/files/delete`, payload)
}

export async function uploadRemoteFiles(sessionId, path, files) {
  const formData = new FormData()
  if (path) {
    formData.append('path', path)
  }
  Array.from(files || []).forEach((file) => {
    formData.append('files', file)
  })

  const response = await axios.post(buildRequestUrl(`/server-connections/sessions/${sessionId}/upload`), formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 120000,
    withCredentials: true,
  })

  if (response.data?.code && response.data.code !== 200) {
    const message = response.data.otherMessage || response.data.errorMessage || '上传失败'
    if (response.data.code === 1) {
      notifyUnauthorized(message)
    }
    throw createRequestError(message, response.data.code)
  }
}

export async function downloadRemoteFile(sessionId, path) {
  const response = await axios.get(buildRequestUrl(`/server-connections/sessions/${sessionId}/download`), {
    params: { path },
    responseType: 'blob',
    timeout: 120000,
    withCredentials: true,
  })

  const contentType = response.headers['content-type'] || ''
  if (contentType.includes('application/json')) {
    const payload = JSON.parse(await response.data.text())
    const message = payload.otherMessage || payload.errorMessage || '下载失败'
    if (payload.code === 1) {
      notifyUnauthorized(message)
    }
    throw createRequestError(message, payload.code)
  }

  const disposition = response.headers['content-disposition'] || ''
  const encodedMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i)
  const plainMatch = disposition.match(/filename=\"?([^\";]+)\"?/i)
  const fileName = encodedMatch?.[1]
    ? decodeURIComponent(encodedMatch[1])
    : plainMatch?.[1] || 'download.bin'

  const downloadUrl = window.URL.createObjectURL(new Blob([response.data]))
  const anchor = document.createElement('a')
  anchor.href = downloadUrl
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  window.URL.revokeObjectURL(downloadUrl)
}

export function buildTerminalWebSocketUrl(sessionId) {
  return buildWebSocketUrl(`/ws/server-connections/terminal/${encodeURIComponent(sessionId)}`)
}

/* ---- 远程文件快捷路径（书签） ---- */

export function listBookmarks(serverKey) {
  return http.get('/server-connections/bookmarks', {
    params: serverKey ? { serverKey } : {},
  })
}

export function saveBookmark(payload) {
  return http.post('/server-connections/bookmarks', payload)
}

export function deleteBookmark(id) {
  return http.delete(`/server-connections/bookmarks/${id}`)
}

/* ---- 服务器连接快捷路径（收藏） ---- */

export function listServerBookmarks() {
  return http.get('/server-connections/server-bookmarks')
}

export function saveServerBookmark(payload) {
  return http.post('/server-connections/server-bookmarks', payload)
}

export function deleteServerBookmark(id) {
  return http.delete(`/server-connections/server-bookmarks/${id}`)
}
