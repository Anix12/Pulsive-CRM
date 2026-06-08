import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  login: async (email, password) => {
    const { data } = await api.post('/api/v1/auth/login', { email, password });
    const { user, accessToken, refreshToken } = data.data;
    await AsyncStorage.multiSet([['accessToken', accessToken], ['refreshToken', refreshToken]]);
    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    try { await api.post('/api/v1/auth/logout'); } catch {}
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
    set({ user: null, isAuthenticated: false });
  },

  hydrate: async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (token) {
        const { data } = await api.get('/api/v1/auth/me');
        set({ user: data.data, isAuthenticated: true });
      }
    } catch {
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
    }
  },
}));
