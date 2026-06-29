import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';

interface AppUser {
  id: string;
  username: string;
  display_name: string | null;
  expires_at: string;
  is_active: boolean;
  isAdmin?: boolean; // Supabase admins
}

interface AppAuthState {
  appUser: AppUser | null;
  sessionToken: string | null;
  isLoading: boolean;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  login: (username: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  /** Server-side re-validation. Returns true if access is still allowed. */
  verifyAccess: () => Promise<boolean>;
  /** Cheap optimistic local check, MUST be backed by verifyAccess on mount. */
  checkAccess: () => boolean;
}

export const useAppAuth = create<AppAuthState>()(
  persist(
    (set, get) => ({
      appUser: null,
      sessionToken: null,
      isLoading: false,
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),

      login: async (username: string, password: string) => {
        set({ isLoading: true });

        try {
          // 1) Try Supabase Auth (admin) first
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: username.includes('@') ? username : `${username}@admin.fluxo`,
            password,
          });

          if (!authError && authData.user) {
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', authData.user.id)
              .eq('role', 'admin')
              .maybeSingle();

            if (roleData) {
              set({
                appUser: {
                  id: authData.user.id,
                  username: authData.user.email || 'admin',
                  display_name: 'Administrador',
                  expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                  is_active: true,
                  isAdmin: true,
                },
                sessionToken: null,
                isLoading: false,
              });
              return { error: null };
            }
          }

          // 2) App user login — all validation happens server-side
          const { data, error } = await supabase.functions.invoke('app-auth', {
            body: { action: 'login', username, password },
          });

          if (error || !data?.token || !data?.user) {
            set({ isLoading: false });
            // Generic error to prevent username enumeration
            return { error: 'Credenciales inválidas' };
          }

          set({
            appUser: { ...data.user, isAdmin: false },
            sessionToken: data.token,
            isLoading: false,
          });
          return { error: null };
        } catch {
          set({ isLoading: false });
          return { error: 'Credenciales inválidas' };
        }
      },

      logout: async () => {
        const { sessionToken } = get();
        try {
          await supabase.auth.signOut();
        } catch { /* ignore */ }
        if (sessionToken) {
          try {
            await supabase.functions.invoke('app-auth', {
              body: { action: 'logout', token: sessionToken },
            });
          } catch { /* ignore */ }
        }
        set({ appUser: null, sessionToken: null });
      },

      verifyAccess: async () => {
        const { appUser, sessionToken } = get();
        if (!appUser) return false;

        // Admin: re-validate via Supabase Auth session + role
        if (appUser.isAdmin) {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) { set({ appUser: null }); return false; }
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'admin')
            .maybeSingle();
          if (!roleData) { set({ appUser: null }); return false; }
          return true;
        }

        // App user: re-validate server-side via session token
        if (!sessionToken) { set({ appUser: null }); return false; }

        try {
          const { data, error } = await supabase.functions.invoke('app-auth', {
            body: { action: 'session', token: sessionToken },
          });
          if (error || !data?.user) {
            set({ appUser: null, sessionToken: null });
            return false;
          }
          set({ appUser: { ...data.user, isAdmin: false } });
          return true;
        } catch {
          return false;
        }
      },

      checkAccess: () => {
        const { appUser } = get();
        if (!appUser) return false;
        if (appUser.isAdmin) return true;
        if (!appUser.is_active) return false;
        if (new Date(appUser.expires_at) <= new Date()) return false;
        return true;
      },
    }),
    {
      name: 'fluxo-app-auth',
      partialize: (state) => ({
        appUser: state.appUser,
        sessionToken: state.sessionToken,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
