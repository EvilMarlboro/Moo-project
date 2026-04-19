import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface User {
  id?: string;
  username: string;
  email: string;
  avatar: string;
  genderSymbol?: string;
  selectedCategories?: string[];
  enabledActivities: string[];
  activityProfiles: {
    [activityName: string]: any;
  };
  statusMessage?: string;
  vibingMode?: boolean;
}

interface AuthContextType {
  user: User | null;
  supabaseUserId: string | null;
  loading: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  refreshSession: () => Promise<void>;
  clearMatchesOnLogout?: () => void; // For MatchContext to register
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setSupabaseUserId(session.user.id);
        
        // Load complete profile from Supabase profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile && profile.display_name) {
          // User has a complete profile
          setUser({
            id: session.user.id,
            username: profile.display_name,
            email: session.user.email || '',
            avatar: profile.avatar || '👤',
            genderSymbol: profile.gender,
            enabledActivities: profile.enabled_activities || [],
            activityProfiles: profile.activity_profiles || {},
            statusMessage: profile.status_message || '',
            vibingMode: profile.vibing_mode || false,
          });
        } else {
          // No complete profile - user needs to set up profile
          setUser(null);
        }
      } else {
        setSupabaseUserId(null);
        setUser(null);
      }
    } catch (err) {
      console.error('Error refreshing session:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setSupabaseUserId(session.user.id);
        // Trigger a refresh to load profile
        await refreshSession();
      } else if (event === 'SIGNED_OUT') {
        setSupabaseUserId(null);
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = (userData: User) => {
    setUser(userData);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSupabaseUserId(null);
  };

  const updateUser = async (updates: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
    
    // Persist to Supabase profiles table
    if (supabaseUserId) {
      const profileUpdates: any = {};
      
      if (updates.username) profileUpdates.display_name = updates.username;
      if (updates.avatar) profileUpdates.avatar = updates.avatar;
      if (updates.genderSymbol !== undefined) profileUpdates.gender = updates.genderSymbol;
      if (updates.enabledActivities) profileUpdates.enabled_activities = updates.enabledActivities;
      if (updates.activityProfiles) profileUpdates.activity_profiles = updates.activityProfiles;
      if (updates.statusMessage !== undefined) profileUpdates.status_message = updates.statusMessage;
      if (updates.vibingMode !== undefined) profileUpdates.vibing_mode = updates.vibingMode;
      
      if (Object.keys(profileUpdates).length > 0) {
        const { error } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', supabaseUserId);
        
        if (error) {
          console.error('Error updating profile:', error);
        }
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, supabaseUserId, loading, login, logout, updateUser, refreshSession }}>
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