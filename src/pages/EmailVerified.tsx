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
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');
      
      if (error) {
        setStatus('error');
        setErrorMessage(errorDescription || 'Email verification failed');
        return;
      }

      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

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

        if (type === 'signup' || type === 'email') {
          setStatus('success');
          return;
        }
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        setStatus('error');
        setErrorMessage('Failed to verify your session');
        return;
      }

      if (session?.user) {
        if (session.user.email_confirmed_at) {
          setStatus('success');
        } else {
          setStatus('already-verified');
        }
      } else {
        setStatus('error');
        setErrorMessage('Verification link may have expired. Please try logging in or request a new link.');
      }
    };

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md shadow-md border border-gray-200 dark:border-gray-800">
        <CardHeader className="text-center space-y-4">
          {status === 'verifying' && (
            <>
              <div className="flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1e3a5f]/10 dark:bg-[#1e3a5f]/30">
                  <Loader2 className="h-7 w-7 text-[#1e3a5f] dark:text-[#5a8ac4] animate-spin" />
                </div>
              </div>
              <div>
                <CardTitle className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Verifying Your Email
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400 mt-2">
                  Please wait while we verify your email address...
                </CardDescription>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div>
                <CardTitle className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Email Verified
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400 mt-2">
                  Your email has been successfully verified. You can now access all features.
                </CardDescription>
              </div>
            </>
          )}

          {status === 'already-verified' && (
            <>
              <div className="flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1e3a5f]/10 dark:bg-[#1e3a5f]/30">
                  <CheckCircle2 className="h-7 w-7 text-[#1e3a5f] dark:text-[#5a8ac4]" />
                </div>
              </div>
              <div>
                <CardTitle className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Already Verified
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400 mt-2">
                  Your email was already verified. You're all set!
                </CardDescription>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <XCircle className="h-7 w-7 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <div>
                <CardTitle className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Verification Failed
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400 mt-2">
                  {errorMessage}
                </CardDescription>
              </div>
            </>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {(status === 'success' || status === 'already-verified') && (
            <Button 
              onClick={handleContinue} 
              className="w-full h-11 bg-[#1e3a5f] hover:bg-[#2d4a6f] text-white" 
              size="lg"
            >
              Continue to App
            </Button>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <Button 
                onClick={handleGoToLogin} 
                className="w-full h-11 bg-[#1e3a5f] hover:bg-[#2d4a6f] text-white" 
                size="lg"
              >
                Go to Login
              </Button>
              <p className="text-sm text-center text-gray-500 dark:text-gray-400">
                If you continue to have issues, please contact support.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
