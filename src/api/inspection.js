import axios from 'axios'
import http, { buildRequestUrl, createRequestError, notifyUnauthorized } from './http'

export function getDashboardSummary() {
  return http.get('/Inspection/dashboard')
}

export function getServerInspectionList(payload) {
  return http.post('/Inspection/server/list', payload)
}

export function getServerInspectionDetail(params) {
  return http.get('/Inspection/server/detail', { params })
}

export function getServerInspectionHistory(payload) {
  return http.post('/Inspection/server/history', payload)
}

export function runServerInspection() {
  return http.post('/Inspection/server/run')
}

async function downloadInspectionFile(path, fallbackName) {
  const response = await axios.get(buildRequestUrl(path), {
    responseType: 'blob',
    timeout: 60000,
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
  const encodedMatch = disposition.match(/filename\\*=UTF-8''([^;]+)/i)
  const plainMatch = disposition.match(/filename=\"?([^\";]+)\"?/i)
  const fileName = encodedMatch?.[1]
    ? decodeURIComponent(encodedMatch[1])
    : plainMatch?.[1] || fallbackName

  const downloadUrl = window.URL.createObjectURL(new Blob([response.data]))
  const anchor = document.createElement('a')
  anchor.href = downloadUrl
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  window.URL.revokeObjectURL(downloadUrl)
}

export function exportServerInspection() {
  return downloadInspectionFile('/Inspection/server/export/file', 'server-inspection.xlsx')
}

export function getJavaInspectionList(payload) {
  return http.post('/Inspection/java/list', payload)
}

export function getJavaInspectionSummary() {
  return http.get('/Inspection/java/summary')
}

export function getJavaInspectionDetail(params) {
  return http.get('/Inspection/java/detail', { params })
}

export function exportJavaInspection() {
  return downloadInspectionFile('/Inspection/java/export/file', 'java-inspection.xlsx')
}

export function getTopologySummary() {
  return http.get('/Inspection/topology/summary')
}

export function exportTopologySummary() {
  return http.get('/Inspection/topology/export')
}
