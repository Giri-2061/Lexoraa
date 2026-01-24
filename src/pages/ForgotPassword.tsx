import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Mail, ArrowLeft, KeyRound, CheckCircle2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const forgotPasswordSchema = z.object({
  email: z.string().trim().email({ message: 'Please enter a valid email address' }),
});

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = forgotPasswordSchema.safeParse({ email });

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
    
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      
      console.log('Reset password response:', { data, error });
      
      if (error) {
        console.error('Reset password error:', error);
        toast.error(error.message || 'Failed to send reset email');
      } else {
        setIsSubmitted(true);
        toast.success('Password reset email sent!');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state - email sent
  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-8">
        <div className="w-full max-w-md">
          <Card className="shadow-md border border-gray-200 dark:border-gray-800">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl font-semibold text-gray-900 dark:text-white">
                Check Your Email
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400 mt-1">
                We've sent password reset instructions to your email
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="bg-[#1e3a5f]/5 dark:bg-[#1e3a5f]/20 border border-[#1e3a5f]/20 dark:border-[#1e3a5f]/40 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-[#1e3a5f] dark:text-[#5a8ac4] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-[#1e3a5f] dark:text-[#5a8ac4] text-sm">
                      Email sent to:
                    </p>
                    <p className="text-[#1e3a5f]/80 dark:text-[#5a8ac4]/80 text-sm mt-0.5 break-all">
                      {email}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1e3a5f]/10 dark:bg-[#1e3a5f]/30 text-xs font-medium text-[#1e3a5f] dark:text-[#5a8ac4] flex-shrink-0">1</span>
                  <p>Open your email inbox and find the reset email</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1e3a5f]/10 dark:bg-[#1e3a5f]/30 text-xs font-medium text-[#1e3a5f] dark:text-[#5a8ac4] flex-shrink-0">2</span>
                  <p>Click the "Reset Password" button in the email</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1e3a5f]/10 dark:bg-[#1e3a5f]/30 text-xs font-medium text-[#1e3a5f] dark:text-[#5a8ac4] flex-shrink-0">3</span>
                  <p>Create your new password</p>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Didn't receive the email?</strong> Check your spam folder or{' '}
                  <button
                    onClick={() => setIsSubmitted(false)}
                    className="text-amber-700 dark:text-amber-300 hover:underline font-medium"
                  >
                    try again
                  </button>
                </p>
              </div>

              <Button
                onClick={() => navigate('/auth')}
                variant="outline"
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Form state - enter email
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-8">
      <div className="w-full max-w-md">
        <Link
          to="/auth"
          className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to login
        </Link>

        <Card className="shadow-md border border-gray-200 dark:border-gray-800">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#1e3a5f]/10 dark:bg-[#1e3a5f]/30">
              <KeyRound className="h-7 w-7 text-[#1e3a5f] dark:text-[#5a8ac4]" />
            </div>
            <CardTitle className="text-2xl font-semibold text-gray-900 dark:text-white">
              Forgot Password?
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400 mt-1">
              No worries! Enter your email and we'll send you reset instructions.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`pl-10 h-11 ${errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    autoComplete="email"
                    autoFocus
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {errors.email}
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 bg-[#1e3a5f] hover:bg-[#2d4a6f] text-white" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Reset Link...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Reset Link
                  </>
                )}
              </Button>
            </form>

            <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-3 text-xs text-gray-500 dark:text-gray-400">
                <ShieldCheck className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                <p>
                  For security, the reset link expires in 1 hour. If you don't receive an email, 
                  make sure you entered the correct email address.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
          Remember your password?{' '}
          <Link to="/auth" className="text-[#1e3a5f] hover:text-[#2d4a6f] dark:text-[#5a8ac4] hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
