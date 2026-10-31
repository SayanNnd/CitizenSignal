import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { USE_MOCK_AUTH } from '../lib/env';
import { signInWithGoogleBrowser, type GoogleResult } from './google';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<GoogleResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function fakeSession(email: string): Session {
  return { access_token: 'mock', user: { id: 'mock-user', email } } as unknown as Session;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
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

  const signInWithGoogle = async (): Promise<GoogleResult> => {
    if (USE_MOCK_AUTH) {
      setSession(fakeSession('demo.user@gmail.com'));
      return { error: null };
    }
    return signInWithGoogleBrowser();
  };

  const signOut = async () => {
    if (USE_MOCK_AUTH) {
      setSession(null);
      return;
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
