import api from './axios'

export const getProducts = (page = 1, search = '') =>
  api.get(`/products?page=${page}&search=${search}`).then((r) => {
    // Transform response: convert 'data' to 'items' for admin panel compatibility
    return {
      items: r.data.data || [],
      total: r.data.total,
      page: r.data.page,
      per_page: r.data.per_page,
      total_pages: r.data.pages,
    }
  })

export const getProduct = (id: string) =>
  api.get(`/products/${id}`).then((r) => r.data.data)

export const createProduct = (data: Record<string, unknown>) =>
  api.post('/products', data).then((r) => r.data)

export const updateProduct = (id: string, data: Record<string, unknown>) =>
  api.put(`/products/${id}`, data).then((r) => r.data)

export const updateStock = (id: string, stock: number) =>
  api.put(`/products/${id}`, { stock }).then((r) => r.data)

export const deleteProduct = (id: string) =>
  api.delete(`/products/${id}`).then((r) => r.data)

export const getCategories = () =>
  api.get('/categories').then((r) => r.data.data || [])
