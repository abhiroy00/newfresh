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
  loginEmail: (email: string, password: string) => Promise<void>
  signupEmail: (name: string | undefined, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshMe: () => Promise<void>
  setUser: (user: User) => void
}

function storeTokens(payload: { access_token: string; refresh_token: string }) {
  localStorage.setItem('auth_token', payload.access_token)
  localStorage.setItem('refresh_token', payload.refresh_token)
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
    storeTokens(data.data)
    set({ isAuthenticated: true, loginModalOpen: false })
    // The token response carries no user object — fetch the profile separately.
    await get().refreshMe()
  },

  loginEmail: async (email: string, password: string) => {
    const { data } = await authApi.loginEmail(email, password)
    storeTokens(data.data)
    set({ isAuthenticated: true, loginModalOpen: false })
    await get().refreshMe()
  },

  signupEmail: async (name: string | undefined, email: string, password: string) => {
    const { data } = await authApi.signupEmail({ name, email, password })
    storeTokens(data.data)
    set({ isAuthenticated: true, loginModalOpen: false })
    await get().refreshMe()
  },

  logout: async () => {
    try {
      // Send the refresh token so the backend can revoke it too — otherwise
      // a cached/leaked copy (or one resurrected by a racing token-refresh)
      // can silently mint a new session after the user has logged out.
      await authApi.logout(localStorage.getItem('refresh_token'))
    } catch {
      // Best-effort — clear local session regardless of server response.
    }
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    set({ user: null, isAuthenticated: false })
    // Also resets the cart store, which otherwise keeps the previous user's
    // items/badge count in memory until a full page reload.
    window.dispatchEvent(new Event('gmart:logout'))
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
