import axios from 'axios'
import http, { buildRequestUrl, buildWebSocketUrl } from './http'

export function listServerConnections() {
  return http.get('/server-connections/servers')
}

export function openServerConnectionSession(payload) {
  return http.post('/server-connections/sessions', payload)
}

export function closeServerConnectionSession(sessionId) {
  return http.delete(`/server-connections/sessions/${sessionId}`)
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
  })

  if (response.data?.code && response.data.code !== 200) {
    throw new Error(response.data.otherMessage || response.data.errorMessage || '上传失败')
  }
}

export async function downloadRemoteFile(sessionId, path) {
  const response = await axios.get(buildRequestUrl(`/server-connections/sessions/${sessionId}/download`), {
    params: { path },
    responseType: 'blob',
    timeout: 120000,
  })

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
