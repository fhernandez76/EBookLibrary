import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthResponse } from '../types/api';

interface AuthState {
  user: AuthResponse | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  setAuth: (auth: AuthResponse) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      setAuth: (auth) => {
        localStorage.setItem('auth_token', auth.token);
        set({ user: auth, isAuthenticated: true, isAdmin: auth.role === 'Admin' });
      },
      clearAuth: () => {
        localStorage.removeItem('auth_token');
        set({ user: null, isAuthenticated: false, isAdmin: false });
      },
    }),
    { name: 'auth-storage' }
  )
);
