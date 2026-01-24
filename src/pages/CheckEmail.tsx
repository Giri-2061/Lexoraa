import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function CheckEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isResending, setIsResending] = useState(false);
  
  const email = location.state?.email || 'your email';

  const handleResendEmail = async () => {
    if (!location.state?.email) {
      toast.error('Email address not found. Please sign up again.');
      navigate('/auth');
      return;
    }

    setIsResending(true);
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: location.state.email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/verified`,
      },
    });

    setIsResending(false);

    if (error) {
      toast.error('Failed to resend email. Please try again.');
    } else {
      toast.success('Verification email sent! Check your inbox.');
    }
  };

  const handleBackToSignIn = () => {
    navigate('/auth');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md shadow-md border border-gray-200 dark:border-gray-800">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1e3a5f]/10 dark:bg-[#1e3a5f]/30">
              <Mail className="h-7 w-7 text-[#1e3a5f] dark:text-[#5a8ac4]" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-semibold text-gray-900 dark:text-white">
              Check Your Email
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400 mt-2">
              We've sent a verification link to
            </CardDescription>
            <p className="font-medium text-gray-900 dark:text-white mt-1 break-all">
              {email}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-sm text-gray-900 dark:text-white">What to do next:</h3>
            <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-decimal list-inside">
              <li>Open your email inbox</li>
              <li>Look for an email from LoungeLearning</li>
              <li>Click the verification link in the email</li>
              <li>You'll be redirected back to continue</li>
            </ol>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Can't find the email?</strong> Check your spam or junk folder. 
              The email may take a few minutes to arrive.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              variant="outline"
              onClick={handleResendEmail}
              disabled={isResending}
              className="w-full"
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Resend Verification Email
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              onClick={handleBackToSignIn}
              className="w-full text-gray-600 dark:text-gray-400"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
