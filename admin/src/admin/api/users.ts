import api from './axios'

export const getUsers = (page = 1, search = '') =>
  api.get(`/admin/users?page=${page}&search=${search}`).then((r) => r.data)

export const getUser = (id: string) =>
  api.get(`/admin/users/${id}`).then((r) => r.data)

export const deleteUser = (id: string) =>
  api.delete(`/admin/users/${id}`).then((r) => r.data)
