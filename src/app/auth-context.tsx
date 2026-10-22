import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { UserSession } from '../types/index.ts';
import { canPerformAction, LynusAction } from '../utils/permissions.ts';
import { supabase, isSupabaseConnected } from '../lib/supabase.ts';
import { sha256Hex } from '../utils/sha256.ts';

interface AuthContextType {
  user: UserSession;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  can: (action: LynusAction) => boolean;
}

const DEFAULT_USER: UserSession = {
  id: 'usr-admin-01',
  email: 'ricardohenrique748@gmail.com',
  name: 'Ricardo Henrique',
  role: 'admin',
};

// Demo-mode account (used only while Supabase is not configured). The password is stored as
// sha256("<email>:<password>") so it isn't readable in the bundle — this is NOT real security.
const DEMO_ACCOUNT = {
  email: 'ricardoluz@lynustech.com.br',
  passwordHash: '8c2defc769d99e4a15e129e0fd0a45c3c55a292661e2013a1c2adfd78abfc6e4',
  user: {
    id: 'usr-ricardo-luz',
    email: 'ricardoluz@lynustech.com.br',
    name: 'Ricardo Luz',
    role: 'admin',
  } as UserSession,
};

// Only two users, both admins: every authenticated session gets full access
const ROLE_KEY = 'lynus_current_role'; // legacy key from the old role simulator, cleared on sign-out
const DEMO_SESSION_KEY = 'lynus_demo_session';

const AuthContext = createContext<AuthContextType>({
  user: DEFAULT_USER,
  isAuthenticated: false,
  isLoading: true,
  signIn: async () => {},
  signOut: async () => {},
  can: () => true,
});

function readDemoSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(DEMO_SESSION_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as UserSession;
    // Drop sessions from the old "any e-mail" demo mode
    if (saved.email !== DEMO_ACCOUNT.email) return null;
    return { ...saved, role: 'admin' };
  } catch {
    return null;
  }
}

// Builds the app user from a Supabase session, using public.profiles for name
async function loadSupabaseUser(session: Session): Promise<UserSession> {
  const authUser = session.user;
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, avatar_url')
    .eq('id', authUser.id)
    .maybeSingle();

  return {
    id: authUser.id,
    email: authUser.email ?? '',
    name: profile?.full_name || authUser.user_metadata?.full_name || authUser.email || 'Usuário',
    role: 'admin',
    avatarUrl: profile?.avatar_url ?? undefined,
  };
}

function translateAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'E-mail ou senha incorretos.';
  if (/email not confirmed/i.test(message)) return 'Confirme seu e-mail antes de entrar.';
  if (/rate limit|too many/i.test(message)) return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  if (/fetch|network/i.test(message)) return 'Não foi possível conectar ao servidor. Verifique sua internet.';
  return message;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessionUser, setSessionUser] = useState<UserSession | null>(() =>
    isSupabaseConnected ? null : readDemoSession()
  );
  const [isLoading, setIsLoading] = useState(isSupabaseConnected);

  useEffect(() => {
    if (!isSupabaseConnected) return;

    let active = true;
    const apply = async (session: Session | null) => {
      const next = session ? await loadSupabaseUser(session) : null;
      if (!active) return;
      setSessionUser(next);
      setIsLoading(false);
    };

    supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      // Defer to avoid calling Supabase inside the auth callback
      setTimeout(() => apply(session), 0);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (isSupabaseConnected) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(translateAuthError(error.message));
      return;
    }

    // Demo mode (Supabase not configured): single local account, session kept in the browser
    const normalizedEmail = email.trim().toLowerCase();
    const hash = await sha256Hex(`${normalizedEmail}:${password}`);
    if (normalizedEmail !== DEMO_ACCOUNT.email || hash !== DEMO_ACCOUNT.passwordHash) {
      throw new Error('E-mail ou senha incorretos.');
    }
    const demoUser: UserSession = DEMO_ACCOUNT.user;
    try {
      localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(demoUser));
    } catch {}
    setSessionUser(demoUser);
  };

  const signOut = async () => {
    if (isSupabaseConnected) {
      await supabase.auth.signOut();
    }
    try {
      localStorage.removeItem(DEMO_SESSION_KEY);
      localStorage.removeItem(ROLE_KEY);
    } catch {}
    setSessionUser(null);
  };

  const user = sessionUser ?? DEFAULT_USER;

  const can = (action: LynusAction) => {
    return canPerformAction(user.role, action);
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!sessionUser, isLoading, signIn, signOut, can }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
