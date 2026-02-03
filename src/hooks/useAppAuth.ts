import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';

interface AppUser {
  id: string;
  username: string;
  display_name: string | null;
  expires_at: string;
  is_active: boolean;
}

interface AppAuthState {
  appUser: AppUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ error: string | null }>;
  logout: () => void;
  checkAccess: () => boolean;
}

// Simple hash function (must match the one in AdminUsers)
const simpleHash = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "fluxo_salt_2024");
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const useAppAuth = create<AppAuthState>()(
  persist(
    (set, get) => ({
      appUser: null,
      isLoading: false,

      login: async (username: string, password: string) => {
        set({ isLoading: true });
        
        try {
          const passwordHash = await simpleHash(password);
          
          // Fetch user by username - using public select policy
          const { data, error } = await supabase
            .from('app_users')
            .select('id, username, display_name, expires_at, is_active, password_hash')
            .eq('username', username.toLowerCase().trim())
            .maybeSingle();

          if (error) {
            set({ isLoading: false });
            return { error: 'Error al verificar usuario' };
          }

          if (!data) {
            set({ isLoading: false });
            return { error: 'Usuario no encontrado' };
          }

          // Check password
          if (data.password_hash !== passwordHash) {
            set({ isLoading: false });
            return { error: 'Contraseña incorrecta' };
          }

          // Check if active
          if (!data.is_active) {
            set({ isLoading: false });
            return { error: 'Tu cuenta está desactivada. Contacta al administrador.' };
          }

          // Check expiration
          const now = new Date();
          const expires = new Date(data.expires_at);
          if (expires <= now) {
            set({ isLoading: false });
            return { error: 'Tu suscripción ha expirado. Contacta al administrador.' };
          }

          // Success!
          set({
            appUser: {
              id: data.id,
              username: data.username,
              display_name: data.display_name,
              expires_at: data.expires_at,
              is_active: data.is_active,
            },
            isLoading: false,
          });

          return { error: null };
        } catch {
          set({ isLoading: false });
          return { error: 'Error de conexión' };
        }
      },

      logout: () => {
        set({ appUser: null });
      },

      checkAccess: () => {
        const { appUser } = get();
        if (!appUser) return false;
        
        // Check if still active and not expired
        if (!appUser.is_active) return false;
        
        const now = new Date();
        const expires = new Date(appUser.expires_at);
        if (expires <= now) return false;

        return true;
      },
    }),
    {
      name: 'fluxo-app-auth',
      partialize: (state) => ({ appUser: state.appUser }),
    }
  )
);
