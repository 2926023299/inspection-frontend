import axios from 'axios'

export const apiBaseURL =
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:8091' : '')

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
