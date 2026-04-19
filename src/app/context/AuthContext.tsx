import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  const isRefreshingRef = useRef(false);
  const signOutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshSession = async () => {
    console.log('[refreshSession] start');
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('[refreshSession] getSession complete — session:', session ? `exists (uid: ${session.user.id})` : 'null', '| error:', sessionError);

      if (session?.user) {
        setSupabaseUserId(session.user.id);

        console.log('[refreshSession] starting profiles query for uid:', session.user.id);
        const profileQuery = supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        const profileTimeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 5000));
        const result = await Promise.race([profileQuery, profileTimeout]);
        console.log('[refreshSession] profiles race resolved — result:', result);

        const profile = result && 'data' in result ? result.data : null;
        const timedOut = result === null;
        console.log('[refreshSession] profile:', profile, '| timed out:', timedOut);

        if (profile && profile.display_name) {
          const userObj = {
            id: session.user.id,
            username: profile.display_name,
            email: session.user.email || '',
            avatar: profile.avatar || '👤',
            genderSymbol: profile.gender,
            enabledActivities: profile.enabled_activities || [],
            activityProfiles: profile.activity_profiles || {},
            statusMessage: profile.status_message || '',
            vibingMode: profile.vibing_mode || false,
          };
          console.log('[refreshSession] setting full user:', userObj);
          setUser(userObj);
        } else {
          const fallbackUser = {
            id: session.user.id,
            username: '',
            email: session.user.email || '',
            avatar: '👤',
            enabledActivities: [],
            activityProfiles: {},
          };
          console.log('[refreshSession] setting fallback user (no profile / timeout):', fallbackUser);
          setUser(fallbackUser);
        }
      } else {
        console.log('[refreshSession] no session — clearing user');
        setSupabaseUserId(null);
        setUser(null);
      }
    } catch (err) {
      console.error('[refreshSession] caught error:', err);
    } finally {
      console.log('[refreshSession] complete — setLoading(false)');
      setLoading(false);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[onAuthStateChange] event:', event, '| session:', session ? `exists (uid: ${session.user.id})` : 'null');

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        // Cancel any pending sign-out clear (token refresh fires SIGNED_OUT then SIGNED_IN)
        if (signOutTimerRef.current) {
          clearTimeout(signOutTimerRef.current);
          signOutTimerRef.current = null;
        }
        if (session?.user) {
          if (!isRefreshingRef.current) {
            isRefreshingRef.current = true;
            try {
              await refreshSession();
            } finally {
              isRefreshingRef.current = false;
            }
          }
        } else if (event === 'INITIAL_SESSION') {
          // No session on initial load — user is logged out
          setSupabaseUserId(null);
          setUser(null);
          setLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        // Delay clearing state — Supabase fires SIGNED_OUT during token refresh
        // before immediately firing SIGNED_IN. Cancel if SIGNED_IN arrives first.
        signOutTimerRef.current = setTimeout(() => {
          signOutTimerRef.current = null;
          setSupabaseUserId(null);
          setUser(null);
          setLoading(false);
        }, 500);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (signOutTimerRef.current) clearTimeout(signOutTimerRef.current);
    };
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