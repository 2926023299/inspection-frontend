import http from './http'

export function login(payload) {
  return http.post('/auth/login', payload, {
    skipAuthRedirect: true,
  })
}

export function logout() {
  return http.post('/auth/logout', null, {
    skipAuthRedirect: true,
  })
}

export function fetchSession() {
  return http.get('/auth/session', {
    skipAuthRedirect: true,
  })
}
