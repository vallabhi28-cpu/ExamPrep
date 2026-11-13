import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signInDemo: () => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
  signInDemo: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInDemo = () => {
    const mockUser: User = {
      id: 'demo-student-uuid-1234',
      app_metadata: {},
      user_metadata: { full_name: 'Alex Morgan' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email: 'student@examprep.app',
    } as User;

    const mockSession: Session = {
      access_token: 'demo-access-token',
      refresh_token: 'demo-refresh-token',
      expires_in: 86400,
      token_type: 'bearer',
      user: mockUser,
    };

    setSession(mockSession);
  };

  const signOut = async () => {
    setSession(null);
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore network errors on signout
    }
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut, signInDemo }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
