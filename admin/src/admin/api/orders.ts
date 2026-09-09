import api from './axios'

export const getOrders = (page = 1, status = '', search = '') =>
  api
    .get('/admin/orders', {
      params: {
        page,
        status: status || undefined,
        search: search || undefined,
      },
    })
    .then((r) => r.data)

export const getOrder = (id: string) =>
  api.get(`/admin/orders/${id}`).then((r) => r.data)

export const updateOrderStatus = (id: string, status: string) =>
  api.patch(`/admin/orders/${id}/status`, { status }).then((r) => r.data)
