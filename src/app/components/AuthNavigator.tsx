import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../lib/supabase';

export function AuthNavigator() {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Check if user has a complete profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, display_name, avatar')
          .eq('id', session.user.id)
          .single();

        if (profile && profile.display_name && profile.avatar) {
          // Returning user - skip setup
          navigate('/activity-hub');
        } else {
          // New user - needs setup
          navigate('/profile-setup');
        }
      }
      
      if (event === 'SIGNED_OUT') {
        navigate('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return null;
}
