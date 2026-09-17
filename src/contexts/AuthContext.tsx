import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile, Role } from '../lib/database.types';
import { supabase } from '../lib/supabase';

type SignInReason = 'invalid_credentials' | 'role_mismatch' | 'profile_unavailable';

type SignInResult =
  | { error: null; reason?: never; accountRole?: never }
  | { error: Error; reason: SignInReason; accountRole?: Role };

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string, expectedRole: Role) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isTherapist: boolean;
  isClient: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  return data ?? null;
}

function isPortalRole(role: unknown): role is Role {
  return role === 'therapist' || role === 'client';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const signInInProgress = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).then(setProfile);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // signIn() valida o role antes de publicar a sessão para o restante da UI.
      // Ignorar apenas este SIGNED_IN evita um redirecionamento momentâneo para
      // a área errada quando credenciais válidas são usadas na aba incorreta.
      if (event === 'SIGNED_IN' && signInInProgress.current) return;

      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          const p = await fetchProfile(session.user.id);
          setProfile(p);
        } else {
          setProfile(null);
        }
        if (event === 'INITIAL_SESSION') {
          setLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (
    email: string,
    password: string,
    expectedRole: Role,
  ): Promise<SignInResult> => {
    signInInProgress.current = true;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error || !data.user || !data.session) {
        return {
          error: new Error(error?.message ?? 'Authentication failed'),
          reason: 'invalid_credentials',
        };
      }

      const p = await fetchProfile(data.user.id);
      if (!p || !isPortalRole(p.role)) {
        await supabase.auth.signOut();
        return {
          error: new Error('Profile unavailable'),
          reason: 'profile_unavailable',
        };
      }

      if (p.role !== expectedRole) {
        const accountRole = p.role;
        await supabase.auth.signOut();
        return {
          error: new Error('Role mismatch'),
          reason: 'role_mismatch',
          accountRole,
        };
      }

      setSession(data.session);
      setUser(data.user);
      setProfile(p);

      return { error: null };
    } finally {
      signInInProgress.current = false;
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // profile só é buscado no login/troca de sessão — telas que atualizam
  // colunas de profiles diretamente (ex: preferência de lembrete do diário)
  // chamam isso depois pra essa cópia em memória não ficar desatualizada
  // enquanto o usuário navega sem dar reload na página.
  const refreshProfile = async () => {
    if (!user) return;
    const p = await fetchProfile(user.id);
    setProfile(p);
  };

  const role = profile?.role
    ?? user?.user_metadata?.role
    ?? user?.app_metadata?.role;

  const isTherapist = role === 'therapist';
  const isClient = role === 'client';

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      signIn,
      signOut,
      refreshProfile,
      isTherapist,
      isClient,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
