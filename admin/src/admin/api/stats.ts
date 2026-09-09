import api from './axios'

export const getStats = () =>
  api.get('/admin/stats').then((r) => r.data)
