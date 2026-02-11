import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, BookOpen, RefreshCw, Eye, EyeOff, GraduationCap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import LegalLinks from '@/components/LegalLinks';

const loginSchema = z.object({
  email: z.string().trim().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

const signupSchema = z.object({
  fullName: z.string().trim().min(2, { message: 'Name must be at least 2 characters' }),
  email: z.string().trim().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading, signIn, signUp } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});
  
  // Signup form state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupShowPassword, setSignupShowPassword] = useState(false);
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupShowConfirmPassword, setSignupShowConfirmPassword] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);
  const [teacherOrg, setTeacherOrg] = useState('');
  const [teacherReason, setTeacherReason] = useState('');
  const [signupErrors, setSignupErrors] = useState<Record<string, string>>({});
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Load remember me preference on mount
  useEffect(() => {
    const rememberMeEmail = localStorage.getItem('rememberMeEmail');
    if (rememberMeEmail) {
      setLoginEmail(rememberMeEmail);
      setRememberMe(true);
    }
  }, []);

  // Clear all auth data on mount to fix any corrupted tokens
  useEffect(() => {
    const clearAuthIfNeeded = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('reset') === 'true') {
        await supabase.auth.signOut();
        localStorage.clear();
        sessionStorage.clear();
        toast.success('Authentication cleared! Please sign in again.');
        // Remove the query param
        window.history.replaceState({}, '', '/auth');
      }
    };
    clearAuthIfNeeded();
  }, []);

  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleClearAuth = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    sessionStorage.clear();
    toast.success('All authentication data cleared! Please sign in again.');
    window.location.reload();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErrors({});
    
    const result = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0].toString()] = err.message;
        }
      });
      setLoginErrors(errors);
      return;
    }

    setIsSubmitting(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsSubmitting(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password');
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('Please verify your email before logging in. Check your inbox for the verification link.');
        navigate('/auth/check-email', { state: { email: loginEmail } });
      } else {
        toast.error(error.message);
      }
    } else {
      // Handle remember me
      if (rememberMe) {
        localStorage.setItem('rememberMeEmail', loginEmail);
      } else {
        localStorage.removeItem('rememberMeEmail');
      }

      // Check if the user has a pending teacher request
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user) {
        const { data: teacherReq } = await supabase
          .from('teacher_requests' as any)
          .select('status')
          .eq('user_id', session.session.user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (teacherReq && teacherReq.length > 0 && (teacherReq[0] as any).status === 'pending') {
          toast.success('Welcome back! Your teacher request is still pending.');
          navigate('/auth/teacher-pending');
          return;
        }
      }

      toast.success('Welcome back!');
      navigate('/');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupErrors({});
    
    if (!acceptTerms) {
      setSignupErrors({ terms: 'You must accept the Terms of Service and Privacy Policy' });
      return;
    }
    
    const result = signupSchema.safeParse({
      fullName: signupName,
      email: signupEmail,
      password: signupPassword,
      confirmPassword: signupConfirmPassword,
    });
    
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0].toString()] = err.message;
        }
      });
      setSignupErrors(errors);
      return;
    }

    setIsSubmitting(true);
    // Teachers register as 'student' first; approval grants consultancy_owner
    const { error, data } = await signUp(signupEmail, signupPassword, signupName, 'student');
    setIsSubmitting(false);

    if (error) {
      if (error.message.includes('User already registered')) {
        toast.error('An account with this email already exists');
      } else {
        toast.error(error.message);
      }
    } else {
      // If teacher toggle is on, submit a teacher request
      if (isTeacher && data?.user) {
        await supabase.from('teacher_requests' as any).insert({
          user_id: data.user.id,
          full_name: signupName,
          email: signupEmail,
          organization: teacherOrg || null,
          reason: teacherReason || null,
        });
      }

      // Check if email confirmation is required
      if (data?.user && !data.user.email_confirmed_at) {
        navigate('/auth/check-email', {
          state: { email: signupEmail, isTeacher },
        });
      } else if (isTeacher) {
        navigate('/auth/teacher-pending');
      } else {
        toast.success('Account created successfully!');
        navigate('/');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4">
      <Card className={`w-full max-w-md shadow-lg border-border/50 ${isTeacher ? 'border-red-500 bg-red-50' : ''}`}>
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 rounded-full bg-primary/10">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-foreground">
              LEXORA
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Sign in to access your practice tests and track your progress
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="your@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className={loginErrors.email ? 'border-destructive' : ''}
                  />
                  {loginErrors.email && (
                    <p className="text-sm text-destructive">{loginErrors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Password</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                      className="h-6 px-2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className={loginErrors.password ? 'border-destructive' : ''}
                  />
                  {loginErrors.password && (
                    <p className="text-sm text-destructive">{loginErrors.password}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
                  <Label htmlFor="remember-me" className="text-sm font-normal cursor-pointer">
                    Remember this email
                  </Label>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>

                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => navigate('/auth/forgot-password')}
                    className="text-muted-foreground hover:text-primary"
                  >
                    Forgot your password?
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <div className="flex items-center justify-start space-x-2 mb-4">
                <Switch
                  id="teacher-mode"
                  checked={isTeacher}
                  onCheckedChange={setIsTeacher}
                />
                <Label htmlFor="teacher-mode" className="flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4" />
                  Register as Teacher
                </Label>
              </div>

              {isTeacher && (
                <div className="p-3 mb-2 rounded-lg border border-amber-500/30 bg-amber-500/5 text-sm text-amber-700 dark:text-amber-400 space-y-1">
                  <p className="font-medium">Teacher accounts require admin approval</p>
                  <p className="text-xs text-muted-foreground">After signing up, your request will be reviewed by our team. You'll be notified once approved.</p>
                </div>
              )}
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    className={signupErrors.fullName ? 'border-destructive' : ''}
                  />
                  {signupErrors.fullName && (
                    <p className="text-sm text-destructive">{signupErrors.fullName}</p>
                  )}
                </div>

                {isTeacher && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="signup-org">Organization / Institute (optional)</Label>
                      <Input
                        id="signup-org"
                        type="text"
                        placeholder="e.g. British Council, ABC Academy"
                        value={teacherOrg}
                        onChange={(e) => setTeacherOrg(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-reason">Why do you want a teacher account? (optional)</Label>
                      <Textarea
                        id="signup-reason"
                        placeholder="Brief description of your teaching background..."
                        value={teacherReason}
                        onChange={(e) => setTeacherReason(e.target.value)}
                        rows={2}
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className={signupErrors.email ? 'border-destructive' : ''}
                  />
                  {signupErrors.email && (
                    <p className="text-sm text-destructive">{signupErrors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="signup-password">Password</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSignupShowPassword(!signupShowPassword)}
                      className="h-6 px-2 text-muted-foreground hover:text-foreground"
                    >
                      {signupShowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Input
                    id="signup-password"
                    type={signupShowPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className={signupErrors.password ? 'border-destructive' : ''}
                  />
                  {signupErrors.password && (
                    <p className="text-sm text-destructive">{signupErrors.password}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="signup-confirm">Confirm Password</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSignupShowConfirmPassword(!signupShowConfirmPassword)}
                      className="h-6 px-2 text-muted-foreground hover:text-foreground"
                    >
                      {signupShowConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Input
                    id="signup-confirm"
                    type={signupShowConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    className={signupErrors.confirmPassword ? 'border-destructive' : ''}
                  />
                  {signupErrors.confirmPassword && (
                    <p className="text-sm text-destructive">{signupErrors.confirmPassword}</p>
                  )}
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="accept-terms"
                    checked={acceptTerms}
                    onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                    className="mt-1"
                  />
                  <Label htmlFor="accept-terms" className="text-sm font-normal cursor-pointer leading-relaxed">
                    I agree to the{' '}
                    <LegalLinks variant="signup" />
                  </Label>
                </div>
                {signupErrors.terms && (
                  <p className="text-sm text-destructive">{signupErrors.terms}</p>
                )}

                <Button type="submit" className="w-full" disabled={isSubmitting || !acceptTerms}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          
          {/* Debug: Clear auth button */}
          <div className="mt-6 pt-4 border-t border-border">
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              onClick={handleClearAuth}
              className="w-full text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Having login issues? Clear auth data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
