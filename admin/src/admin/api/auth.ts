import api from './axios'

export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password }).then((r) => r.data)

export const getMe = () =>
  api.get('/auth/me').then((r) => r.data)
