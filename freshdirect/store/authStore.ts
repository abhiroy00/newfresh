import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export type User = {
  id: string;
  name: string;
  phone: string;
  email?: string;
};

type AuthState = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  // True once loadFromStorage has finished — routing must wait for this,
  // otherwise a slow SecureStore read sends a logged-in user to login.
  hydrated: boolean;
  setUser: (user: User, token?: string) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  hydrated: false,

  setUser: async (user, token) => {
    // Check if we're on web
    if (typeof window !== 'undefined' && window.localStorage) {
      if (token) {
        localStorage.setItem('auth_token', token);
      }
      if (user) {
        localStorage.setItem('auth_user', JSON.stringify(user));
      }
    } else {
      // Native: use SecureStore
      if (token) {
        await SecureStore.setItemAsync('auth_token', token);
      }
      if (user) {
        await SecureStore.setItemAsync('auth_user', JSON.stringify(user));
      }
    }
    set({ user, token: token ?? null, isAuthenticated: true });
  },

  logout: async () => {
    // refresh_token must go too — otherwise the axios 401 interceptor
    // silently mints a new access token and resurrects the session
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('refresh_token');
    } else {
      // Native: use SecureStore
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('auth_user');
      await SecureStore.deleteItemAsync('refresh_token');
    }
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadFromStorage: async () => {
    try {
      // Check if we're on web (localStorage available)
      if (typeof window !== 'undefined' && window.localStorage) {
        const token = localStorage.getItem('auth_token');
        const userStr = localStorage.getItem('auth_user');
        if (token && userStr) {
          const user = JSON.parse(userStr) as User;
          if (user && user.id && user.phone) {
            set({ user, token, isAuthenticated: true });
          } else {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
          }
        }
        return;
      }

      // Native: use SecureStore
      const token = await SecureStore.getItemAsync('auth_token');
      const userStr = await SecureStore.getItemAsync('auth_user');
      if (token && userStr) {
        const user = JSON.parse(userStr) as User;
        if (user && user.id && user.phone) {
          set({ user, token, isAuthenticated: true });
        } else {
          await SecureStore.deleteItemAsync('auth_token');
          await SecureStore.deleteItemAsync('auth_user');
        }
      }
    } catch (e) {
      console.warn('Failed to load auth from storage:', e);
    } finally {
      set({ hydrated: true });
    }
  },
}));
