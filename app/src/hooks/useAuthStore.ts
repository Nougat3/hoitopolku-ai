import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import type { AppUser } from '@/types/database';

interface AuthState {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setAppUser: (appUser: AppUser | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  appUser: null,
  loading: true,
  setUser: (user) => set({ user }),
  setAppUser: (appUser) => set({ appUser }),
  setLoading: (loading) => set({ loading })
}));
