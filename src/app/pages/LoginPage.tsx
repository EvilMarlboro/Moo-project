import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Shield, Mail, Lock, AlertCircle, CheckCircle, Eye, EyeOff, X, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { refreshSession } = useAuth();

  // Auto-redirect logged-in users to activity hub
  useEffect(() => {
    let cancelled = false;
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) {
        navigate('/activity-hub', { replace: true });
      }
    };
    checkSession();
    return () => { cancelled = true; };
  }, [navigate]);

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordRequirementsMet = hasMinLength && hasLetter && hasNumber;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const showMismatch = mode === 'signup' && confirmPassword.length > 0 && !passwordsMatch;
  const signupDisabled = mode === 'signup' && (!passwordRequirementsMet || !passwordsMatch);

  const validateEmail = (email: string) => {
    return email.toLowerCase().endsWith('@usc.edu');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(email)) {
      setError('Please use a valid USC email address (@usc.edu)');
      return;
    }

    setLoading(true);
    let didNavigate = false;

    const timeout = setTimeout(() => {
      if (!didNavigate) {
        setLoading(false);
        setError('Sign in is taking too long. Please check your connection and try again.');
      }
    }, 10000);

    try {
      await supabase.auth.signOut();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        if (authError.message?.includes('Email not confirmed')) {
          setEmailNotConfirmed(true);
          setError('Please confirm your USC email first. Check your inbox for a verification link.');
        } else {
          setError('Invalid email or password');
        }
        return;
      }

      console.log('LOG 1: auth succeeded, user id:', data.user.id);

      try {
        console.log('LOG 2: starting profiles query');
        const profileQuery = supabase
          .from('profiles')
          .select('id, display_name, avatar')
          .eq('id', data.user.id)
          .single();
        const profileTimeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 3000));
        const result = await Promise.race([profileQuery, profileTimeout]);
        console.log('LOG 3: profiles query resolved, result:', result);
        const profile = result && 'data' in result ? result.data : null;
        console.log('LOG 4: profile extracted:', profile);
        didNavigate = true;
        console.log('LOG 5: navigating to', profile?.display_name && profile?.avatar ? '/activity-hub' : '/profile-setup');
        navigate(profile && !profile.display_name && !profile.avatar ? '/profile-setup' : '/activity-hub');
      } catch (err) {
        console.log('LOG 6: inner catch fired, error:', err);
        didNavigate = true;
        navigate('/activity-hub');
      }
    } catch (err) {
      console.log('LOG 7: outer catch fired, error:', err);
      setError('Sign in failed. Please try again.');
    } finally {
      console.log('LOG 8: finally block, didNavigate:', didNavigate);
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(email)) {
      setError('Please use your USC email (@usc.edu)');
      return;
    }

    if (!passwordRequirementsMet) {
      setError("Password doesn't meet requirements");
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(authError.message || 'Failed to create account');
        return;
      }

      if (data.session) {
        await refreshSession();
        navigate('/profile-setup');
      } else {
        setSignupSuccess(true);
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    setResendLoading(true);
    setResendSuccess(false);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
      });
      if (resendError) {
        setError(resendError.message || 'Failed to resend confirmation email');
      } else {
        setResendSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend confirmation email');
    } finally {
      setResendLoading(false);
    }
  };

  if (signupSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="max-w-lg w-full p-8 bg-card border-border">
            <div className="text-center mb-6">
              <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
              <h1 className="mb-2">Account Created!</h1>
              <p className="text-muted-foreground">
                Please check your USC email inbox (<strong>{email}</strong>) and click the confirmation link before signing in.
              </p>
            </div>
            <Button
              onClick={() => {
                setSignupSuccess(false);
                setMode('login');
                setPassword('');
              }}
              className="w-full"
              size="lg"
            >
              Back to Sign In
            </Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="p-8 bg-card border-border">
          <div className="text-center mb-8">
            <Shield className="h-12 w-12 mx-auto mb-3 text-[#990000]" />
            <h1 className="mb-2">
              {mode === 'login' ? 'Sign In to MOO' : 'Create MOO Account'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {mode === 'login'
                ? 'Use your USC email to sign in'
                : 'Register with your USC email (@usc.edu)'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-red-500">{error}</p>
                {emailNotConfirmed && (
                  <div className="mt-2">
                    {resendSuccess ? (
                      <p className="text-xs text-green-500">Confirmation email resent! Check your inbox.</p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendConfirmation}
                        disabled={resendLoading}
                        className="text-xs text-[#990000] hover:text-[#7a0000] underline transition-colors disabled:opacity-50"
                      >
                        {resendLoading ? 'Sending...' : 'Resend confirmation email'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="space-y-4">
            <div>
              <Label htmlFor="email">USC Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="yourname@usc.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={mode === 'signup' ? 'At least 8 characters' : 'Enter your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`pl-10 pr-10 ${showMismatch ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <>
                <div className="space-y-1.5 text-xs">
                  {[
                    { met: hasMinLength, label: 'At least 8 characters' },
                    { met: hasLetter, label: 'Contains a letter (a-z or A-Z)' },
                    { met: hasNumber, label: 'Contains a number (0-9)' },
                  ].map((req) => (
                    <div key={req.label} className="flex items-center gap-2">
                      {req.met ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span className={req.met ? 'text-green-500' : 'text-muted-foreground'}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`pl-10 pr-10 ${showMismatch ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {showMismatch && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                </div>
              </>
            )}

            <Button
              type={mode === 'login' ? 'button' : 'submit'}
              onClick={mode === 'login' ? handleLogin : undefined}
              disabled={loading || signupDisabled}
              className="w-full bg-[#990000] hover:bg-[#7a0000] text-white"
              size="lg"
            >
              {loading
                ? (mode === 'login' ? 'Signing in...' : 'Creating account...')
                : (mode === 'login' ? 'Sign In' : 'Sign Up')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setError('');
                setEmailNotConfirmed(false);
                setResendSuccess(false);
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {mode === 'login'
                ? "Don't have an account? Sign Up"
                : 'Already have an account? Sign In'}
            </button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}