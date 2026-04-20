import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) navigate('/activity-hub', { replace: true });
  }, [user, navigate]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/activity-hub`,
        queryParams: { hd: 'usc.edu' },
      },
    });
    if (authError) {
      setError('Sign in failed. Please try again.');
      setLoading(false);
    }
    // On success the browser redirects — no further action needed here
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* Background blobs */}
      <div aria-hidden className="pointer-events-none select-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-32 w-[480px] h-[480px] rounded-full bg-[#990000]/10 blur-[100px]" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-purple-500/12 blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-pink-300/8 blur-[80px]" />
      </div>
      {/* Floating decorative emojis */}
      <div aria-hidden className="pointer-events-none select-none fixed inset-0 -z-10 overflow-hidden">
        <span className="absolute top-[12%] left-[8%] text-4xl opacity-20 rotate-[-15deg]">🐮</span>
        <span className="absolute top-[20%] right-[10%] text-3xl opacity-15 rotate-[10deg]">⚽</span>
        <span className="absolute bottom-[25%] left-[6%] text-3xl opacity-15 rotate-[-8deg]">🎮</span>
        <span className="absolute bottom-[18%] right-[8%] text-4xl opacity-15 rotate-[12deg]">📚</span>
        <span className="absolute top-[60%] right-[5%] text-2xl opacity-10 rotate-[-5deg]">🎉</span>
        <span className="absolute top-[45%] left-[4%] text-2xl opacity-10 rotate-[8deg]">✨</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <Card className="p-6 sm:p-10 bg-card border-border text-center">
          {/* Branding */}
          <div className="mb-8">
            <Shield className="h-12 w-12 mx-auto mb-4 text-[#990000]" />
            <h1 className="mb-1">MOO 🐮</h1>
            <p className="text-muted-foreground text-sm">Connect with USC students</p>
          </div>

          {/* Error */}
          {error && (
            <p className="mb-4 text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Google sign-in button */}
          <Button
            onClick={handleGoogleSignIn}
            disabled={loading}
            size="lg"
            variant="outline"
            className="w-full gap-3 border-2 hover:bg-secondary/80"
          >
            {/* Google logo SVG */}
            <svg viewBox="0 0 24 24" className="h-5 w-5 flex-shrink-0" aria-hidden>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {loading ? 'Redirecting…' : 'Sign in with USC Google Account'}
          </Button>

          <p className="mt-4 text-xs text-muted-foreground">
            Only <span className="font-medium">@usc.edu</span> accounts are accepted
          </p>
        </Card>
      </motion.div>
    </div>
  );
}
