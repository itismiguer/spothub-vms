import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';

export type UserRole = 'PLAYER' | 'OWNER' | 'ADMIN' | 'STAFF';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  facility_id?: string;
  business_name?: string;
  business_address?: string;
  verification_doc_url?: string;
  verification_status?: 'pending' | 'verified' | 'rejected';
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (role?: UserRole) => Promise<void>;
  loginWithApple: (role?: UserRole) => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string, role: UserRole, extra?: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.user_metadata);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // Check for pending role from registration
        const pendingRole = localStorage.getItem('pending_role') as UserRole;
        if (pendingRole) {
          localStorage.removeItem('pending_role');
          fetchProfile(session.user.id, { ...session.user.user_metadata, role: pendingRole });
        } else {
          fetchProfile(session.user.id, session.user.user_metadata);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string, userMetadata?: any) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist, create one (e.g. for Google Auth or missing row)
          const userName = userMetadata?.full_name || userMetadata?.name || '';
          const userEmail = userMetadata?.email || '';
          
          const newProfile: any = {
            id: userId,
            email: userEmail,
            name: userName || userEmail.split('@')[0] || 'Athlete',
            role: (userMetadata?.role as UserRole) || 'PLAYER',
            created_at: new Date().toISOString()
          };

          const { error: insertError } = await supabase
            .from('profiles')
            .upsert(newProfile, { onConflict: 'id' });

          if (insertError) {
            console.error('Error creating auto-profile:', insertError);
            // Fallback: set local profile so UI doesn't break
            setProfile(newProfile as UserProfile);
          } else {
            setProfile(newProfile as UserProfile);
          }
        } else {
          console.error('Error fetching profile:', error);
        }
      } else {
        setProfile(data as UserProfile);
      }
    } catch (err) {
      console.error('Error in fetchProfile:', err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (role?: UserRole) => {
    if (role) {
      localStorage.setItem('pending_role', role);
    }
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://builtbymiguel.net'
      }
    });
  };

  const loginWithApple = async (role?: UserRole) => {
    if (role) {
      localStorage.setItem('pending_role', role);
    }
    await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: 'https://builtbymiguel.net'
      }
    });
  };

  const loginWithEmail = async (email: string, pass: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
  };

  const registerWithEmail = async (email: string, pass: string, name: string, role: UserRole, extra?: Partial<UserProfile>) => {
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password: pass,
      options: {
        data: { name, role }
      }
    });
    
    if (error) throw error;
    if (!data.user) return;

    const newProfile: any = {
      id: data.user.id,
      email: email,
      name: name,
      role: role,
      ...extra
    };

    if (role === 'OWNER') {
      newProfile.verification_status = 'pending';
    }

    const { error: profileError } = await supabase.from('profiles').insert([newProfile]);
    if (profileError) throw profileError;
    
    setProfile(newProfile as UserProfile);
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, loginWithApple, loginWithEmail, registerWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
