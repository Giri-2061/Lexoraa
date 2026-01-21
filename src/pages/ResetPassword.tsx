import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, Lock, ShieldCheck, KeyRound, AlertTriangle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const resetPasswordSchema = z.object({
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PageState = 'loading' | 'valid' | 'invalid' | 'success';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pageState, setPageState] = useState<PageState>('loading');

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User clicked the reset link and is ready to set new password
        setPageState('valid');
      } else if (event === 'SIGNED_IN' && session) {
        // Check if this is a recovery session by checking the URL or session
        // When user clicks reset link, they get a session with access_token in URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const type = hashParams.get('type');
        
        if (type === 'recovery') {
          setPageState('valid');
        } else {
          // Normal sign in, not a recovery
          setPageState('valid'); // Allow password reset if they have a session
        }
      }
    });

    // Also check on mount - user might have valid session from clicking reset link
    const checkSession = async () => {
      // Check URL hash for recovery parameters
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');
      
      if (accessToken && type === 'recovery') {
        // Set the session from URL hash
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: hashParams.get('refresh_token') || '',
        });
        
        if (data.session && !error) {
          setPageState('valid');
          // Clean up URL
          window.history.replaceState({}, '', window.location.pathname);
          return;
        }
      }
      
      // Check for existing session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setPageState('valid');
      } else {
        setPageState('invalid');
      }
    };

    // Small delay to allow auth state change to fire first
    const timer = setTimeout(checkSession, 500);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = resetPasswordSchema.safeParse({ password, confirmPassword });

    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          newErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);

    if (error) {
      toast.error(error.message);
    } else {
      setPageState('success');
      toast.success('Password updated successfully!');
    }
  };

  // Loading state
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  // Success state
  if (pageState === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4 py-8">
        <div className="w-full max-w-md">
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 relative">
                <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse" />
                <div className="relative p-4 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
                  <CheckCircle2 className="h-10 w-10 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Password Reset Complete!
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-2">
                Your password has been successfully updated
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800 rounded-xl p-5 text-center">
                <ShieldCheck className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-green-800 dark:text-green-200 font-medium">
                  Your account is now secure
                </p>
                <p className="text-green-700 dark:text-green-300 text-sm mt-1">
                  You can now sign in with your new password
                </p>
              </div>

              <Button
                onClick={() => navigate('/auth')}
                className="w-full h-11 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
              >
                Continue to Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Invalid/expired token state
  if (pageState === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4 py-8">
        <div className="w-full max-w-md">
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 relative">
                <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl" />
                <div className="relative p-4 rounded-full bg-gradient-to-br from-red-500 to-orange-600 shadow-lg">
                  <AlertTriangle className="h-10 w-10 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                Link Expired
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-2">
                This password reset link is no longer valid
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-5">
                <p className="text-amber-800 dark:text-amber-200 text-sm">
                  Password reset links expire after 1 hour for security reasons. 
                  Please request a new link to reset your password.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => navigate('/auth/forgot-password')}
                  className="w-full h-11 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  Request New Reset Link
                </Button>
                
                <Button
                  onClick={() => navigate('/auth')}
                  variant="outline"
                  className="w-full"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Valid token - show password reset form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4 py-8">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
              <div className="relative p-4 rounded-full bg-gradient-to-br from-primary to-purple-600 shadow-lg">
                <Lock className="h-10 w-10 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Create New Password
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Choose a strong password to secure your account
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">
                    New Password
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className="h-6 px-2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span className="ml-1 text-xs">{showPassword ? 'Hide' : 'Show'}</span>
                  </Button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`pl-10 h-11 ${errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    autoFocus
                  />
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <span className="inline-block h-1 w-1 rounded-full bg-destructive" />
                    {errors.password}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Must be at least 6 characters
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="confirm-password" className="text-sm font-medium">
                    Confirm Password
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="h-6 px-2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span className="ml-1 text-xs">{showConfirmPassword ? 'Hide' : 'Show'}</span>
                  </Button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`pl-10 h-11 ${errors.confirmPassword ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <span className="inline-block h-1 w-1 rounded-full bg-destructive" />
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Password match indicator */}
              {password && confirmPassword && (
                <div className={`flex items-center gap-2 text-sm ${password === confirmPassword ? 'text-green-600' : 'text-amber-600'}`}>
                  {password === confirmPassword ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Passwords match</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4" />
                      <span>Passwords don't match yet</span>
                    </>
                  )}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-11 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg shadow-primary/25" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Update Password
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t">
              <div className="flex items-start gap-3 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                <p>
                  Your password will be securely encrypted. We recommend using a unique password 
                  that you don't use on other websites.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Remember your password?{' '}
          <Link to="/auth" className="text-primary hover:underline font-medium">
            Sign in instead
          </Link>
        </p>
      </div>
    </div>
  );
}
