import axios from 'axios'

const envApiBaseURL = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '') || ''

export const apiBaseURL = envApiBaseURL || (import.meta.env.DEV ? 'http://localhost:8091' : '')

function normalizePath(path) {
  return path.startsWith('/') ? path : `/${path}`
}

export function buildRequestUrl(path) {
  const normalizedPath = normalizePath(path)
  return apiBaseURL ? `${apiBaseURL}${normalizedPath}` : normalizedPath
}

export function buildWebSocketUrl(path) {
  const normalizedPath = normalizePath(path)

  if (apiBaseURL) {
    return `${apiBaseURL.replace(/^http/i, 'ws')}${normalizedPath}`
  }

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}${normalizedPath}`
  }

  return normalizedPath
}

export function getApiBaseLabel() {
  if (apiBaseURL) {
    return apiBaseURL.replace(/^https?:\/\//, '')
  }

  if (typeof window !== 'undefined') {
    return window.location.host
  }

  return 'same-origin'
}

const http = axios.create({
  baseURL: apiBaseURL,
  timeout: 15000,
})

http.interceptors.response.use(
  (response) => {
    const payload = response.data

    if (payload && Object.prototype.hasOwnProperty.call(payload, 'code') && payload.code !== 200) {
      const message = payload.otherMessage || payload.errorMessage || '请求失败'
      return Promise.reject(new Error(message))
    }

    if (payload && Object.prototype.hasOwnProperty.call(payload, 'data')) {
      return payload.data
    }

    return payload
  },
  (error) => {
    const message = error?.response?.data?.otherMessage || error?.response?.data?.errorMessage || error.message || '网络请求失败'
    return Promise.reject(new Error(message))
  },
)

export default http
