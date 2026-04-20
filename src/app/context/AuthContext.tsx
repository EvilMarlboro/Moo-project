import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getCategoryForActivity } from '../data/activityHelpers';

export interface OnlineUser {
  user_id: string;
  username: string;
  avatar: string;
  genderSymbol?: string;
  activities: string[];
  activityProfiles?: Record<string, any>;
  statusMessage?: string;
  vibingMode?: boolean;
  profileBackground?: string;
  categories: string[];
  online_at: string;
}

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
  profileBackground?: string;
}

interface AuthContextType {
  user: User | null | undefined;
  supabaseUserId: string | null;
  loading: boolean;
  onlineUsers: OnlineUser[];
  login: (user: User) => void;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  refreshSession: () => Promise<void>;
  clearMatchesOnLogout?: () => void; // For MatchContext to register
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Deduplicate presence state by user_id, keeping the most recent entry per user.
function dedupePresence(channel: { presenceState(): Record<string, unknown[]> }): OnlineUser[] {
  const flat = Object.values(channel.presenceState()).flat() as unknown as OnlineUser[];
  const map = new Map<string, OnlineUser>();
  flat.forEach(u => {
    if (!u.user_id) return;
    const existing = map.get(u.user_id);
    if (!existing || u.online_at > existing.online_at) map.set(u.user_id, u);
  });
  return Array.from(map.values());
}

// Pure helper — defined outside the component so it's stable
function buildPresencePayload(u: User, uid: string) {
  const categories = Array.from(new Set(
    (u.enabledActivities || []).map(a => getCategoryForActivity(a)).filter(Boolean)
  ));
  return {
    user_id: uid,
    username: u.username,
    avatar: u.avatar || '👤',
    genderSymbol: u.genderSymbol || '',
    activities: u.enabledActivities || [],
    activityProfiles: u.activityProfiles || {},
    categories,
    vibingMode: u.vibingMode || false,
    statusMessage: u.statusMessage || '',
    profileBackground: u.profileBackground || 'default',
    online_at: new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const isRefreshingRef = useRef(false);
  const signOutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const establishedUserIdRef = useRef<string | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const presenceDataRef = useRef<Record<string, any> | null>(null);
  const lastTrackedPayloadRef = useRef<string | null>(null);

  const refreshSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        setSupabaseUserId(session.user.id);

        const profileQuery = supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        const profileTimeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 5000));
        const result = await Promise.race([profileQuery, profileTimeout]);

        const profile = result && 'data' in result ? result.data : null;

        if (profile && profile.display_name) {
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
            profileBackground: profile.profile_background || 'default',
          });
        } else {
          setUser({
            id: session.user.id,
            username: '',
            email: session.user.email || '',
            avatar: '👤',
            enabledActivities: [],
            activityProfiles: {},
          });
        }
      } else {
        setSupabaseUserId(null);
        setUser(null);
      }
    } catch {
      // session refresh failed silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        // Cancel any pending sign-out clear (token refresh fires SIGNED_OUT then SIGNED_IN)
        if (signOutTimerRef.current) {
          clearTimeout(signOutTimerRef.current);
          signOutTimerRef.current = null;
        }
        if (session?.user) {
          // Ignore SIGNED_IN from token refresh if session is already established.
          // Check is synchronous so a second SIGNED_IN firing before refreshSession
          // finishes is blocked immediately.
          if (event === 'SIGNED_IN' && establishedUserIdRef.current === session.user.id) {
            return;
          }
          if (isRefreshingRef.current) {
            return;
          }
          // Set ref synchronously before the async refreshSession so any
          // subsequent SIGNED_IN for the same uid is blocked immediately.
          establishedUserIdRef.current = session.user.id;
          isRefreshingRef.current = true;
          try {
            await refreshSession();
          } finally {
            isRefreshingRef.current = false;
          }
        } else if (event === 'INITIAL_SESSION') {
          // No session on initial load — user is logged out
          setSupabaseUserId(null);
          setUser(null);
          setLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        // Do NOT clear establishedUserIdRef here — token refresh fires SIGNED_OUT
        // then SIGNED_IN in quick succession. If SIGNED_IN arrives within 500ms it
        // cancels this timer and the ref stays set, blocking the duplicate call.
        // establishedUserIdRef is only cleared when the timer fires (real signout confirmed).
        signOutTimerRef.current = setTimeout(() => {
          signOutTimerRef.current = null;
          establishedUserIdRef.current = null;
          supabase.auth.signOut();
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
      if (updates.profileBackground !== undefined) profileUpdates.profile_background = updates.profileBackground;
      
      if (Object.keys(profileUpdates).length > 0) {
        const { error } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', supabaseUserId);
        
        if (error) {
          // profile update failed silently
        }
      }
    }
  };

  // ── Global presence: channel lifecycle tied to supabaseUserId ──────────────
  // Created on login, destroyed on logout. Never torn down on page navigation.
  useEffect(() => {
    if (!supabaseUserId) {
      if (presenceChannelRef.current) {
        presenceChannelRef.current.untrack().catch(() => {});
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
      presenceDataRef.current = null;
      return;
    }

    // Guard: remove any stale channel before creating a new one so we never
    // end up with two subscriptions to the same channel name.
    if (presenceChannelRef.current) {
      presenceChannelRef.current.untrack().catch(() => {});
      supabase.removeChannel(presenceChannelRef.current);
      presenceChannelRef.current = null;
    }

    // Local flag so heartbeat/focus handlers know if the channel is live.
    let subscribed = false;

    // ALL .on() callbacks MUST be registered before .subscribe() is called.
    const channel = supabase
      .channel('global-online-users')
      .on('presence', { event: 'sync' }, () => {
        setOnlineUsers(dedupePresence(channel));
      })
      .on('presence', { event: 'join' }, () => {
        setOnlineUsers(dedupePresence(channel));
      })
      .on('presence', { event: 'leave' }, () => {
        setOnlineUsers(dedupePresence(channel));
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          subscribed = true;
          // Track with whatever user data is available at subscription time.
          if (presenceDataRef.current) {
            channel
              .track({ ...presenceDataRef.current, online_at: new Date().toISOString() })
              .catch(() => {});
          }
        } else if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          subscribed = false;
        }
      });

    presenceChannelRef.current = channel;

    // Heartbeat: refresh online_at every 30 seconds
    const heartbeat = setInterval(() => {
      if (subscribed && presenceDataRef.current) {
        channel
          .track({ ...presenceDataRef.current, online_at: new Date().toISOString() })
          .catch(() => {});
      }
    }, 30_000);

    // Re-sync on tab focus (catches background-tab reconnects)
    const onFocus = () => {
      if (subscribed && presenceDataRef.current) {
        channel
          .track({ ...presenceDataRef.current, online_at: new Date().toISOString() })
          .catch(() => {});
      }
    };
    window.addEventListener('focus', onFocus);

    return () => {
      subscribed = false;
      clearInterval(heartbeat);
      window.removeEventListener('focus', onFocus);
      channel.untrack().catch(() => {});
      supabase.removeChannel(channel);
      presenceChannelRef.current = null;
      presenceDataRef.current = null;
      lastTrackedPayloadRef.current = null;
      setOnlineUsers([]);
    };
  }, [supabaseUserId]);

  // ── Re-track whenever the user's profile fields change ──────────────────────
  // Skips incomplete profiles (no username) so they don't appear in the hub.
  // Guards against redundant track() calls by comparing a stable payload hash
  // (excluding online_at which changes every call).
  useEffect(() => {
    if (!user || !supabaseUserId || !user.username) return;
    const payload = buildPresencePayload(user, supabaseUserId);
    const { online_at: _oa, ...stable } = payload;
    const hash = JSON.stringify(stable);
    if (lastTrackedPayloadRef.current === hash) return;
    lastTrackedPayloadRef.current = hash;
    presenceDataRef.current = payload;
    if (presenceChannelRef.current) {
      presenceChannelRef.current.track(payload).catch(() => {});
    }
  }, [user, supabaseUserId]);

  return (
    <AuthContext.Provider value={{ user, supabaseUserId, loading, onlineUsers, login, logout, updateUser, refreshSession }}>
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