import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '@/store/authStore';

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
      const refreshToken = await getToken('refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, { refresh_token: refreshToken });
          await setToken('auth_token', data.data.access_token);
          await setToken('refresh_token', data.data.refresh_token);
          original.headers.Authorization = `Bearer ${data.data.access_token}`;
          return api(original);
        } catch (refreshError: any) {
          // Only clear the session if the server explicitly rejected the
          // refresh token (expired/invalid). A network error or server
          // hiccup here must NOT log the user out — otherwise a brief
          // connectivity blip coinciding with access-token expiry would
          // force a fresh login every time.
          const status = refreshError?.response?.status;
          if (status === 401 || status === 400) {
            // Session is really over — clear tokens *and* the store, otherwise
            // the app keeps acting logged in while every call fails.
            await useAuthStore.getState().logout();
          }
        }
      }
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
  // Send the refresh token so the server revokes it too, not just the access token.
  logout: async () => {
    const refresh_token = await getToken('refresh_token');
    return api.post('/auth/logout', refresh_token ? { refresh_token } : {});
  },
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

// Family Members
export const familyMembersApi = {
  list: () => api.get('/users/family-members'),
  create: (data: { name?: string; age: number; weight_kg: number }) =>
    api.post('/users/family-members', data),
  update: (id: string, data: { name?: string; age?: number; weight_kg?: number }) =>
    api.patch(`/users/family-members/${id}`, data),
  remove: (id: string) => api.delete(`/users/family-members/${id}`),
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

// Support
export const supportApi = {
  listTickets: () => api.get('/support/tickets'),
  getTicket: (id: string) => api.get(`/support/tickets/${id}`),
  startOrContinue: (message: string, subject: string = 'Support Query') =>
    api.post('/support/tickets', { subject, message }),
  sendMessage: (ticketId: string, message: string) =>
    api.post(`/support/tickets/${ticketId}/messages`, { message }),
};

// Notifications
export const notificationsApi = {
  registerToken: (token: string, device_type: string = 'android') =>
    api.post('/notifications/register-token', { token, device_type }),
};

export default api;
