import { create } from 'zustand'

interface User {
  id: string
  name: string
  email: string
  is_admin: boolean
  is_rider: boolean
}

interface AuthStore {
  token: string | null
  user: User | null
  login: (token: string, user: User) => void
  logout: () => void
}

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem('admin_user')
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export const useAuthStore = create<AuthStore>((set) => ({
  token: localStorage.getItem('admin_token'),
  user: loadUser(),
  login: (token, user) => {
    localStorage.setItem('admin_token', token)
    localStorage.setItem('admin_user', JSON.stringify(user))
    set({ token, user })
  },
  logout: () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    set({ token: null, user: null })
  },
}))
