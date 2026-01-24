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
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log('ResetPassword - Auth event:', event, 'Has session:', !!session);
      
      if (event === 'PASSWORD_RECOVERY') {
        setPageState('valid');
      } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session) {
        setPageState('valid');
      }
    });

    const checkInitialState = async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!mounted) return;
      
      const hash = window.location.hash;
      if (hash && hash.includes('type=recovery')) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        if (!mounted) return;
        
        window.history.replaceState({}, '', window.location.pathname);
        
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setPageState('valid');
        } else {
          setPageState('invalid');
        }
        return;
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!mounted) return;
      
      if (session) {
        setPageState('valid');
      } else {
        setPageState('invalid');
      }
    };

    checkInitialState();

    return () => {
      mounted = false;
      subscription.unsubscribe();
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#1e3a5f] mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  // Success state
  if (pageState === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-8">
        <div className="w-full max-w-md">
          <Card className="shadow-md border border-gray-200 dark:border-gray-800">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl font-semibold text-gray-900 dark:text-white">
                Password Reset Complete
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400 mt-1">
                Your password has been successfully updated
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
                <ShieldCheck className="h-6 w-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
                <p className="text-green-800 dark:text-green-200 font-medium text-sm">
                  Your account is now secure
                </p>
                <p className="text-green-700 dark:text-green-300 text-sm mt-1">
                  You can now sign in with your new password
                </p>
              </div>

              <Button
                onClick={() => navigate('/auth')}
                className="w-full h-11 bg-[#1e3a5f] hover:bg-[#2d4a6f] text-white"
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-8">
        <div className="w-full max-w-md">
          <Card className="shadow-md border border-gray-200 dark:border-gray-800">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-7 w-7 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-2xl font-semibold text-gray-900 dark:text-white">
                Link Expired
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400 mt-1">
                This password reset link is no longer valid
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <p className="text-amber-800 dark:text-amber-200 text-sm">
                  Password reset links expire after 1 hour for security reasons. 
                  Please request a new link to reset your password.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => navigate('/auth/forgot-password')}
                  className="w-full h-11 bg-[#1e3a5f] hover:bg-[#2d4a6f] text-white"
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-8">
      <div className="w-full max-w-md">
        <Card className="shadow-md border border-gray-200 dark:border-gray-800">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#1e3a5f]/10 dark:bg-[#1e3a5f]/30">
              <Lock className="h-7 w-7 text-[#1e3a5f] dark:text-[#5a8ac4]" />
            </div>
            <CardTitle className="text-2xl font-semibold text-gray-900 dark:text-white">
              Create New Password
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400 mt-1">
              Choose a strong password to secure your account
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    New Password
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className="h-6 px-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span className="ml-1 text-xs">{showPassword ? 'Hide' : 'Show'}</span>
                  </Button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`pl-10 h-11 ${errors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    autoFocus
                  />
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {errors.password}
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Must be at least 6 characters
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="confirm-password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Confirm Password
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="h-6 px-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span className="ml-1 text-xs">{showConfirmPassword ? 'Hide' : 'Show'}</span>
                  </Button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`pl-10 h-11 ${errors.confirmPassword ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Password match indicator */}
              {password && confirmPassword && (
                <div className={`flex items-center gap-2 text-sm ${password === confirmPassword ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
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
                className="w-full h-11 bg-[#1e3a5f] hover:bg-[#2d4a6f] text-white" 
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

            <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-3 text-xs text-gray-500 dark:text-gray-400">
                <ShieldCheck className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                <p>
                  Your password will be securely encrypted. We recommend using a unique password 
                  that you don't use on other websites.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
          Remember your password?{' '}
          <Link to="/auth" className="text-[#1e3a5f] hover:text-[#2d4a6f] dark:text-[#5a8ac4] hover:underline font-medium">
            Sign in instead
          </Link>
        </p>
      </div>
    </div>
  );
}
