import axios from 'axios'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1') as string

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry && original.url !== '/auth/refresh') {
      original._retry = true
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refreshToken })
          // The user may have logged out while this refresh was in flight —
          // don't let a late-arriving refresh resurrect a session they just
          // signed out of.
          if (!localStorage.getItem('refresh_token')) {
            return Promise.reject(error)
          }
          localStorage.setItem('auth_token', data.data.access_token)
          localStorage.setItem('refresh_token', data.data.refresh_token)
          original.headers.Authorization = `Bearer ${data.data.access_token}`
          return api(original)
        } catch (refreshError: any) {
          // Only clear the session when the server explicitly rejected the
          // refresh token — a network blip here must not log the user out.
          const status = refreshError?.response?.status
          if (status === 401 || status === 400) {
            localStorage.removeItem('auth_token')
            localStorage.removeItem('refresh_token')
            localStorage.removeItem('user')
            window.dispatchEvent(new Event('gmart:logout'))
          }
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api
