import { create } from 'zustand'
import { authApi, usersApi } from '@/api/endpoints'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  hydrated: boolean
  loginModalOpen: boolean
  openLogin: () => void
  closeLogin: () => void
  hydrate: () => Promise<void>
  sendOtp: (phone: string) => Promise<void>
  verifyOtp: (phone: string, otp: string) => Promise<void>
  logout: () => Promise<void>
  refreshMe: () => Promise<void>
  setUser: (user: User) => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: (() => {
    try {
      const raw = localStorage.getItem('user')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })(),
  isAuthenticated: !!localStorage.getItem('auth_token'),
  hydrated: false,
  loginModalOpen: false,

  openLogin: () => set({ loginModalOpen: true }),
  closeLogin: () => set({ loginModalOpen: false }),

  hydrate: async () => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      set({ hydrated: true })
      return
    }
    try {
      const { data } = await usersApi.me()
      const user = data.data
      localStorage.setItem('user', JSON.stringify(user))
      set({ user, isAuthenticated: true, hydrated: true })
    } catch {
      set({ hydrated: true })
    }
  },

  sendOtp: async (phone: string) => {
    await authApi.sendOtp(phone)
  },

  verifyOtp: async (phone: string, otp: string) => {
    const { data } = await authApi.verifyOtp(phone, otp)
    const payload = data.data
    localStorage.setItem('auth_token', payload.access_token)
    localStorage.setItem('refresh_token', payload.refresh_token)
    set({ isAuthenticated: true, loginModalOpen: false })
    // The token response carries no user object — fetch the profile separately.
    await get().refreshMe()
  },

  logout: async () => {
    try {
      await authApi.logout()
    } catch {
      // Best-effort — clear local session regardless of server response.
    }
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    set({ user: null, isAuthenticated: false })
  },

  refreshMe: async () => {
    const { data } = await usersApi.me()
    const user = data.data
    localStorage.setItem('user', JSON.stringify(user))
    set({ user })
  },

  setUser: (user: User) => {
    localStorage.setItem('user', JSON.stringify(user))
    set({ user })
  },
}))

// The axios client force-clears tokens on a genuine 401 from /auth/refresh
// (expired/invalid refresh token). Sync the store so the UI reflects that
// immediately instead of only on the next navigation.
window.addEventListener('gmart:logout', () => {
  useAuthStore.setState({ user: null, isAuthenticated: false })
})
