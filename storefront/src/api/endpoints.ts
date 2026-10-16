import api from './client'

export const authApi = {
  sendOtp: (phone: string) => api.post('/auth/send-otp', { phone }),
  verifyOtp: (phone: string, otp: string) => api.post('/auth/verify-otp', { phone, otp }),
  refresh: (refresh_token: string) => api.post('/auth/refresh', { refresh_token }),
  logout: (refresh_token?: string | null) => api.post('/auth/logout', refresh_token ? { refresh_token } : {}),
}

export const usersApi = {
  me: () => api.get('/users/me'),
  updateMe: (data: { name?: string; email?: string }) => api.patch('/users/me', data),
  listAddresses: () => api.get('/users/addresses'),
  createAddress: (data: {
    label?: string; full_name: string; phone: string
    line1: string; line2?: string; city: string; state: string
    pincode: string; landmark?: string; latitude?: number
    longitude?: number; is_default?: boolean
  }) => api.post('/users/addresses', data),
  updateAddress: (id: string, data: Record<string, any>) => api.patch(`/users/addresses/${id}`, data),
  deleteAddress: (id: string) => api.delete(`/users/addresses/${id}`),
}

export const productsApi = {
  list: (params?: {
    page?: number; per_page?: number; category_id?: string
    search?: string; is_featured?: boolean; is_organic?: boolean; sort?: string
  }) => api.get('/products', { params }),
  detail: (id: string) => api.get(`/products/${id}`),
  categories: () => api.get('/categories'),
  carousel: () => api.get('/carousel'),
}

export const cartApi = {
  get: () => api.get('/cart'),
  addItem: (product_id: string, quantity: number) => api.post('/cart/items', { product_id, quantity }),
  updateItem: (itemId: string, quantity: number) => api.put(`/cart/items/${itemId}`, { quantity }),
  removeItem: (itemId: string) => api.delete(`/cart/items/${itemId}`),
  clear: () => api.delete('/cart'),
}

export const ordersApi = {
  list: (params?: { page?: number; per_page?: number }) => api.get('/orders', { params }),
  detail: (id: string) => api.get(`/orders/${id}`),
  create: (payload: { address_id: string; payment_method?: string; notes?: string }) => api.post('/orders', payload),
  cancel: (id: string, reason?: string) => api.post(`/orders/${id}/cancel`, { reason }),
}

export const paymentsApi = {
  createOrder: (order_id: string) => api.post('/payments/create-order', { order_id }),
  verify: (data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; order_id: string }) =>
    api.post('/payments/verify', data),
}

export const wishlistApi = {
  list: () => api.get('/wishlist'),
  add: (productId: string) => api.post(`/wishlist/${productId}`),
  remove: (productId: string) => api.delete(`/wishlist/${productId}`),
}

export const supportApi = {
  listTickets: () => api.get('/support/tickets'),
  getTicket: (id: string) => api.get(`/support/tickets/${id}`),
  startOrContinue: (message: string, subject = 'Support Query') => api.post('/support/tickets', { subject, message }),
  sendMessage: (ticketId: string, message: string) => api.post(`/support/tickets/${ticketId}/messages`, { message }),
}
