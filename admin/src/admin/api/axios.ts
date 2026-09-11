import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status
    const serverMsg =
      err.response?.data?.detail ||
      err.response?.data?.message ||
      err.response?.data?.error

    if (status === 401) {
      // Unauthenticated → clear session and bounce to login.
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
      if (!window.location.pathname.endsWith('/login')) {
        window.location.href = '/login'
      }
    } else if (status === 403) {
      // Authenticated but not permitted → tell the user explicitly.
      // Do NOT log them out; they still have a valid session.
      const msg = serverMsg || "You don't have permission to perform this action (403)"
      toast.error(msg)
      if (!window.location.pathname.endsWith('/403') &&
          !window.location.pathname.endsWith('/login')) {
        // Soft-redirect to the dedicated 403 page for full-page failures.
        // Use replace so the back button doesn't loop.
        try {
          window.history.replaceState({ message: msg, from: window.location.pathname }, '', '/403')
          window.dispatchEvent(new PopStateEvent('popstate'))
        } catch {
          window.location.href = '/403'
        }
      }
    }
    return Promise.reject(err)
  }
)

export default api

