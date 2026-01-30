import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type VerificationStatus = 'verifying' | 'success' | 'error' | 'already-verified';

export default function EmailVerified() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<VerificationStatus>('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleEmailVerification = async () => {
      // Check for error in URL params (from Supabase redirect)
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');
      
      if (error) {
        setStatus('error');
        setErrorMessage(errorDescription || 'Email verification failed');
        return;
      }

      // Check URL hash for tokens (Supabase puts them in the hash)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      // If we have tokens in the hash, set the session
      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          setStatus('error');
          setErrorMessage('Failed to verify your session');
          return;
        }

        // Successfully set session from email verification
        if (type === 'signup' || type === 'email') {
          setStatus('success');
          return;
        }
      }

      // Check if there's already a session (user might have clicked link when already logged in)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        setStatus('error');
        setErrorMessage('Failed to verify your session');
        return;
      }

      if (session?.user) {
        // Check if email is confirmed
        if (session.user.email_confirmed_at) {
          setStatus('success');
        } else {
          setStatus('already-verified');
        }
      } else {
        // No session - might be expired link or already verified
        setStatus('error');
        setErrorMessage('Verification link may have expired. Please try logging in or request a new link.');
      }
    };

    // Small delay to show loading state
    const timer = setTimeout(() => {
      handleEmailVerification();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchParams]);

  const handleContinue = () => {
    navigate('/');
  };

  const handleGoToLogin = () => {
    navigate('/auth');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4">
      <Card className="w-full max-w-md shadow-lg border-border/50">
        <CardHeader className="text-center space-y-4">
          {status === 'verifying' && (
            <>
              <div className="flex justify-center">
                <div className="p-4 rounded-full bg-primary/10">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-foreground">
                  Verifying Your Email
                </CardTitle>
                <CardDescription className="text-muted-foreground mt-2">
                  Please wait while we verify your email address...
                </CardDescription>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="flex justify-center">
                <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-foreground">
                  Email Verified!
                </CardTitle>
                <CardDescription className="text-muted-foreground mt-2">
                  Your email has been successfully verified. You can now access all features.
                </CardDescription>
              </div>
            </>
          )}

          {status === 'already-verified' && (
            <>
              <div className="flex justify-center">
                <div className="p-4 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <CheckCircle2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-foreground">
                  Already Verified
                </CardTitle>
                <CardDescription className="text-muted-foreground mt-2">
                  Your email was already verified. You're all set!
                </CardDescription>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="flex justify-center">
                <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/30">
                  <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-foreground">
                  Verification Failed
                </CardTitle>
                <CardDescription className="text-muted-foreground mt-2">
                  {errorMessage}
                </CardDescription>
              </div>
            </>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {(status === 'success' || status === 'already-verified') && (
            <Button onClick={handleContinue} className="w-full" size="lg">
              Continue to App
            </Button>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <Button onClick={handleGoToLogin} className="w-full" size="lg">
                Go to Login
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                If you continue to have issues, please contact support.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
