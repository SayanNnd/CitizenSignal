import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { USE_MOCK_AUTH } from '../lib/env';
import { getMe, login } from '../api/auth';
import { isMockAdmin } from '../api/mock';

export interface SignInResult {
  error: string | null;
  /** True when this sign-in created the account. */
  created?: boolean;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  /** True when the server lists this account's email as an admin (`GET /api/auth/me`). */
  isAdmin: boolean;
  /** Signs in, or registers first if the email is new. */
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function fakeSession(email: string): Session {
  return { access_token: 'mock', user: { id: 'mock-user', email } } as unknown as Session;
}

/** The server's first field error ("Wrong password for this email", "Enter a valid email address"). */
function errorMessage(e: unknown): string {
  const err = e as { status?: number; data?: { error?: { details?: { message: string }[] } }; message?: string };
  if (err.status === undefined) return "Can't reach the server. Check your connection and try again.";
  return err.data?.error?.details?.[0]?.message ?? err.message ?? 'Could not log in.';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!USE_MOCK_AUTH);

  useEffect(() => {
    if (USE_MOCK_AUTH) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Upvote state and "Your Issues" depend on who is logged in: drop them when that changes.
  const userId = session?.user.id ?? null;
  const lastUserId = useRef(userId);
  useEffect(() => {
    if (lastUserId.current === userId) return;
    lastUserId.current = userId;
    queryClient.removeQueries({ queryKey: ['issues', 'mine'] });
    queryClient.invalidateQueries();
  }, [userId, queryClient]);

  // Admin is a server-side list of emails, so ask the server; a restored session never goes through login.
  const me = useQuery({
    queryKey: ['me', userId],
    queryFn: getMe,
    enabled: !!userId && !USE_MOCK_AUTH,
    staleTime: Infinity,
  });
  const isAdmin = USE_MOCK_AUTH ? isMockAdmin(session?.user.email) : !!me.data?.is_admin;

  const signIn = async (email: string, password: string): Promise<SignInResult> => {
    if (USE_MOCK_AUTH) {
      setSession(fakeSession(email.trim().toLowerCase()));
      return { error: null };
    }
    try {
      const res = await login(email, password);
      const { error } = await supabase.auth.setSession({ access_token: res.access_token, refresh_token: res.refresh_token });
      return { error: error?.message ?? null, created: res.created };
    } catch (e) {
      return { error: errorMessage(e) };
    }
  };

  const signOut = async () => {
    if (USE_MOCK_AUTH) {
      setSession(null);
      return;
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, isAdmin, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
