import { computed, ref } from 'vue'
import { fetchSession, login, logout } from '@/api/auth'

const currentUser = ref(null)
const sessionResolved = ref(false)
const sessionLoading = ref(false)
let sessionPromise = null

function normalizeUser(user) {
  if (!user || typeof user !== 'object') {
    return null
  }

  const username = typeof user.username === 'string' ? user.username.trim() : ''
  if (!username) {
    return null
  }

  return {
    ...user,
    username,
  }
}

function applyUser(user) {
  currentUser.value = normalizeUser(user)
  sessionResolved.value = true
  return currentUser.value
}

function clearAuthState() {
  currentUser.value = null
  sessionResolved.value = true
}

async function ensureSession(options = {}) {
  if (currentUser.value && !options.force) {
    return currentUser.value
  }

  if (sessionResolved.value && !options.force) {
    return null
  }

  if (!options.force && sessionPromise) {
    return sessionPromise
  }

  sessionLoading.value = true
  sessionPromise = fetchSession()
    .then((user) => {
      return applyUser(user)
    })
    .catch((error) => {
      if (error.code === 1) {
        clearAuthState()
        return null
      }
      throw error
    })
    .finally(() => {
      sessionLoading.value = false
      sessionPromise = null
    })

  return sessionPromise
}

async function signIn(payload) {
  const user = normalizeUser(await login(payload))
  if (!user) {
    clearAuthState()
    throw new Error('登录响应异常，请检查服务器认证接口配置')
  }

  applyUser(user)
  return user
}

async function signOut() {
  try {
    await logout()
  } catch (error) {
    if (error.code !== 1) {
      throw error
    }
  } finally {
    clearAuthState()
  }
}

function handleUnauthorized() {
  clearAuthState()
}

export function useAuth() {
  return {
    currentUser,
    username: computed(() => currentUser.value?.username || ''),
    isAuthenticated: computed(() => Boolean(currentUser.value)),
    sessionResolved: computed(() => sessionResolved.value),
    sessionLoading: computed(() => sessionLoading.value),
    ensureSession,
    signIn,
    signOut,
    handleUnauthorized,
    clearAuthState,
  }
}
