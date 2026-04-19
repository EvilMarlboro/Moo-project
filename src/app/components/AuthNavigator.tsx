import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../lib/supabase';

const AUTH_PAGES = ['/', '/login'];

export function AuthNavigator() {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Only redirect if the user is on an auth page — not on a refresh of a protected page
        if (!AUTH_PAGES.includes(window.location.pathname)) return;

        const profileQuery = supabase
          .from('profiles')
          .select('id, display_name, avatar')
          .eq('id', session.user.id)
          .single();
        const profileTimeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 3000));
        const result = await Promise.race([profileQuery, profileTimeout]);
        const profile = result && 'data' in result ? result.data : null;

        navigate(profile?.display_name && profile?.avatar ? '/activity-hub' : '/profile-setup');
      }

      if (event === 'SIGNED_OUT') {
        navigate('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return null;
}
