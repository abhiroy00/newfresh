import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

// Storage helpers for web/native compatibility
const getToken = async (key: string): Promise<string | null> => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem(key);
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
};

const setToken = async (key: string, value: string): Promise<void> => {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(key, value);
  } else {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      console.warn(`Failed to set ${key}`);
    }
  }
};

const removeToken = async (key: string): Promise<void> => {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(key);
  } else {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      console.warn(`Failed to delete ${key}`);
    }
  }
};

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request Interceptor — attach JWT
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await getToken('auth_token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch (e) {
      console.warn('Token read error:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor — handle 401, attempt refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = await getToken('refresh_token');
        if (refreshToken) {
          const { data } = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, { refresh_token: refreshToken });
          await setToken('auth_token', data.data.access_token);
          await setToken('refresh_token', data.data.refresh_token);
          original.headers.Authorization = `Bearer ${data.data.access_token}`;
          return api(original);
        }
      } catch {}
      await removeToken('auth_token');
      await removeToken('refresh_token');
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  sendOtp: (phone: string) =>
    api.post('/auth/send-otp', { phone }),
  verifyOtp: (phone: string, otp: string) =>
    api.post('/auth/verify-otp', { phone, otp }),
  refresh: (refresh_token: string) =>
    api.post('/auth/refresh', { refresh_token }),
  logout: () => api.post('/auth/logout'),
};

// Users
export const usersApi = {
  me: () => api.get('/users/me'),
  updateMe: (data: { name?: string; email?: string }) =>
    api.patch('/users/me', data),
  listAddresses: () => api.get('/users/addresses'),
  createAddress: (data: {
    label?: string; full_name: string; phone: string;
    line1: string; line2?: string; city: string; state: string;
    pincode: string; landmark?: string; latitude?: number;
    longitude?: number; is_default?: boolean;
  }) => api.post('/users/addresses', data),
  updateAddress: (id: string, data: Record<string, any>) =>
    api.patch(`/users/addresses/${id}`, data),
  deleteAddress: (id: string) => api.delete(`/users/addresses/${id}`),
};

// Products
export const productsApi = {
  list: (params?: {
    page?: number; per_page?: number; category_id?: string;
    search?: string; is_featured?: boolean; is_organic?: boolean; sort?: string;
  }) => api.get('/products', { params }),
  detail: (id: string) => api.get(`/products/${id}`),
  categories: () => api.get('/categories'),
};

// Cart
export const cartApi = {
  get: () => api.get('/cart'),
  addItem: (product_id: string, quantity: number) =>
    api.post('/cart/items', { product_id, quantity }),
  updateItem: (itemId: string, quantity: number) =>
    api.put(`/cart/items/${itemId}`, { quantity }),
  removeItem: (itemId: string) => api.delete(`/cart/items/${itemId}`),
  clear: () => api.delete('/cart'),
};

// Orders
export const ordersApi = {
  list: (params?: { page?: number; per_page?: number }) =>
    api.get('/orders', { params }),
  detail: (id: string) => api.get(`/orders/${id}`),
  create: (payload: { address_id: string; payment_method?: string; notes?: string }) =>
    api.post('/orders', payload),
  cancel: (id: string, reason?: string) =>
    api.post(`/orders/${id}/cancel`, { reason }),
};

// Payments
export const paymentsApi = {
  createOrder: (order_id: string) =>
    api.post('/payments/create-order', { order_id }),
  verify: (data: {
    razorpay_order_id: string; razorpay_payment_id: string;
    razorpay_signature: string; order_id: string;
  }) => api.post('/payments/verify', data),
};

// Notifications
export const notificationsApi = {
  registerToken: (token: string, device_type: string = 'android') =>
    api.post('/notifications/register-token', { token, device_type }),
};

export default api;
