import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../lib/supabase';

export function AuthNavigator() {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && window.location.pathname !== '/login') {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return null;
}
