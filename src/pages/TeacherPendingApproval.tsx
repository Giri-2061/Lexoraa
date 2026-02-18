import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle, GraduationCap, ArrowRight, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type RequestStatus = 'pending' | 'approved' | 'rejected' | 'none';

export default function TeacherPendingApproval() {
  const navigate = useNavigate();
  const { user, loading, role } = useAuth();
  const [status, setStatus] = useState<RequestStatus>('pending');
  const [checking, setChecking] = useState(true);

  // If already approved (has consultancy_owner role), redirect
  useEffect(() => {
    if (!loading && role === 'consultancy_owner') {
      navigate('/dashboard', { replace: true });
    }
    if (!loading && role === 'super_admin') {
      navigate('/admin', { replace: true });
    }
  }, [role, loading, navigate]);

  // Check teacher request status
  useEffect(() => {
    const checkStatus = async () => {
      if (!user) {
        setChecking(false);
        return;
      }

      const { data, error } = await supabase
        .from('teacher_requests' as any)
        .select('status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) {
        setStatus('none');
      } else {
        setStatus((data[0] as any).status as RequestStatus);
      }
      setChecking(false);
    };

    if (!loading) checkStatus();
  }, [user, loading]);

  // If approved, redirect after a moment
  useEffect(() => {
    if (status === 'approved') {
      const timer = setTimeout(() => navigate('/dashboard', { replace: true }), 3000);
      return () => clearTimeout(timer);
    }
  }, [status, navigate]);

  const handleRefresh = async () => {
    setChecking(true);
    if (!user) return;

    const { data } = await supabase
      .from('teacher_requests' as any)
      .select('status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      setStatus((data[0] as any).status as RequestStatus);
    }
    setChecking(false);
  };

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4">
      <Card className="w-full max-w-md shadow-lg border-border/50">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 rounded-full bg-primary/10">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Teacher Account Request
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {status === 'pending' && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <Badge variant="secondary" className="gap-1.5 px-4 py-2 text-base">
                  <Clock className="h-4 w-4" />
                  Pending Review
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Your teacher account request has been submitted and is awaiting admin approval. 
                You'll receive full teacher access once your request is reviewed.
              </p>
              <p className="text-sm text-muted-foreground">
                In the meantime, you can use the platform as a student.
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <Button onClick={handleRefresh} variant="outline" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Check Status
                </Button>
                <Button onClick={() => navigate('/')} className="gap-2">
                  Continue as Student
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {status === 'approved' && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <Badge className="gap-1.5 px-4 py-2 text-base bg-green-500 hover:bg-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Approved!
                </Badge>
              </div>
              <p className="text-foreground font-medium">
                Your teacher account has been approved! 🎉
              </p>
              <p className="text-muted-foreground text-sm">
                Redirecting you to the dashboard...
              </p>
              <Button onClick={() => navigate('/dashboard')} className="gap-2">
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {status === 'rejected' && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <Badge variant="destructive" className="gap-1.5 px-4 py-2 text-base">
                  <XCircle className="h-4 w-4" />
                  Request Declined
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Unfortunately, your teacher account request was not approved. 
                You can still use the platform as a student.
              </p>
              <Button onClick={() => navigate('/')} className="gap-2">
                Continue as Student
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {status === 'none' && (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                No teacher request found. If you'd like to register as a teacher, 
                please sign up with the teacher toggle enabled.
              </p>
              <Button onClick={() => navigate('/auth')} className="gap-2">
                Go to Sign Up
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
