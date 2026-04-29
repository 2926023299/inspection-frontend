import axios from 'axios'

const envApiBaseURL = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '') || ''
let unauthorizedHandler = null

export const apiBaseURL = envApiBaseURL || (import.meta.env.DEV ? 'http://localhost:8091' : '')

axios.defaults.withCredentials = true

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

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = typeof handler === 'function' ? handler : null
}

export function createRequestError(message, code) {
  const error = new Error(message)
  error.code = code
  return error
}

export function notifyUnauthorized(message = '需要登录后操作') {
  unauthorizedHandler?.(createRequestError(message, 1))
}

const http = axios.create({
  baseURL: apiBaseURL,
  timeout: 15000,
  withCredentials: true,
})

http.interceptors.response.use(
  (response) => {
    const payload = response.data

    if (payload && Object.prototype.hasOwnProperty.call(payload, 'code') && payload.code !== 200) {
      const message = payload.otherMessage || payload.errorMessage || '请求失败'
      const error = createRequestError(message, payload.code)
      if (payload.code === 1 && !response.config?.skipAuthRedirect) {
        unauthorizedHandler?.(error)
      }
      return Promise.reject(error)
    }

    if (payload && Object.prototype.hasOwnProperty.call(payload, 'data')) {
      return payload.data
    }

    return payload
  },
  (error) => {
    const code = error?.response?.data?.code
    const message = error?.response?.data?.otherMessage || error?.response?.data?.errorMessage || error.message || '网络请求失败'
    const normalizedError = createRequestError(message, code)
    if (code === 1 && !error?.config?.skipAuthRedirect) {
      unauthorizedHandler?.(normalizedError)
    }
    return Promise.reject(normalizedError)
  },
)

export default http
