import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const AuthContext = createContext(null);

function metadataProfile(authUser) {
  const meta = authUser?.user_metadata || {};
  return {
    id: authUser?.id || '',
    email: authUser?.email || '',
    full_name: String(meta.full_name || '').trim(),
    company_name: String(meta.company_name || '').trim(),
  };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return undefined;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) setAuthError(error.message);
      setSession(data?.session || null);
      setAuthUser(data?.session?.user || null);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession || null);
      setAuthUser(nextSession?.user || null);
      setAuthError('');
    });

    return () => {
      mounted = false;
      subscription?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authUser?.id || !isSupabaseConfigured) {
      setProfile(null);
      return;
    }

    let cancelled = false;
    const fallback = metadataProfile(authUser);

    supabase
      .from('profiles')
      .select('id, full_name, company_name')
      .eq('id', authUser.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setProfile(fallback);
          return;
        }
        setProfile({ ...fallback, ...(data || {}) });
      });

    return () => { cancelled = true; };
  }, [authUser?.id]);

  const signIn = async (email, password) => {
    if (!isSupabaseConfigured) return { error: new Error('Authentication backend is not configured.') };
    setAuthError('');
    const result = await supabase.auth.signInWithPassword({
      email: String(email || '').trim().toLowerCase(),
      password,
    });
    if (result.error) setAuthError(result.error.message);
    return result;
  };

  const signUp = async ({ email, password, fullName, companyName }) => {
    if (!isSupabaseConfigured) return { error: new Error('Authentication backend is not configured.') };
    setAuthError('');
    const result = await supabase.auth.signUp({
      email: String(email || '').trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: {
          full_name: String(fullName || '').trim(),
          company_name: String(companyName || '').trim(),
        },
      },
    });
    if (result.error) setAuthError(result.error.message);
    return result;
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) return;
    setAuthError('');
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  const user = useMemo(() => ({
    id: authUser?.id || '',
    email: authUser?.email || '',
    name: profile?.full_name || metadataProfile(authUser).full_name || (authUser?.email ? authUser.email.split('@')[0] : ''),
    company: profile?.company_name || metadataProfile(authUser).company_name || '',
    role: 'Finance Director',
    isAuthenticated: Boolean(authUser),
  }), [authUser, profile]);

  const value = {
    session,
    authUser,
    profile,
    user,
    loading,
    authError,
    isConfigured: isSupabaseConfigured,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
