import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useSearchParams } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Shield,
  Users,
  BookOpen,
  Star,
  MessageSquare,
  TrendingUp,
  GraduationCap,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Crown,
  User,
  BarChart3,
  Activity,
  PenTool,
  Headphones,
  Mic,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAllTeacherRequests, useReviewTeacherRequest } from '@/hooks/useTeacherRequests';
import { useAllPremiumRequests, useReviewPremiumRequest } from '@/hooks/usePremium';
import { fetchAllFeedback, getFeedbackStats } from '@/lib/feedbackService';
import type { FeedbackRecord, FeedbackStats } from '@/types/feedback';
import { format } from 'date-fns';

// ── System Analytics ─────────────────────────────────────────

interface SystemStats {
  totalUsers: number;
  totalTeachers: number;
  totalStudents: number;
  totalTests: number;
  writingTests: number;
  readingTests: number;
  listeningTests: number;
  speakingTests: number;
  totalClassrooms: number;
  recentSignups: number; // last 7 days
  recentTests: number; // last 7 days
}

function useSystemStats() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        // Total users (profiles)
        const { count: totalUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Teachers (consultancy_owner)
        const { count: totalTeachers } = await supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'consultancy_owner');

        // Students
        const { count: totalStudents } = await supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'student');

        // Total test results
        const { count: totalTests } = await supabase
          .from('test_results')
          .select('*', { count: 'exact', head: true });

        // Tests by type
        const { count: writingTests } = await supabase
          .from('test_results')
          .select('*', { count: 'exact', head: true })
          .eq('test_type', 'writing');

        const { count: readingTests } = await supabase
          .from('test_results')
          .select('*', { count: 'exact', head: true })
          .eq('test_type', 'reading');

        const { count: listeningTests } = await supabase
          .from('test_results')
          .select('*', { count: 'exact', head: true })
          .eq('test_type', 'listening');

        const { count: speakingTests } = await supabase
          .from('test_results')
          .select('*', { count: 'exact', head: true })
          .eq('test_type', 'speaking');

        // Classrooms
        const { count: totalClassrooms } = await supabase
          .from('classrooms')
          .select('*', { count: 'exact', head: true });

        // Recent signups (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const { count: recentSignups } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo.toISOString());

        // Recent tests (last 7 days)
        const { count: recentTests } = await supabase
          .from('test_results')
          .select('*', { count: 'exact', head: true })
          .gte('completed_at', sevenDaysAgo.toISOString());

        setStats({
          totalUsers: totalUsers ?? 0,
          totalTeachers: totalTeachers ?? 0,
          totalStudents: totalStudents ?? 0,
          totalTests: totalTests ?? 0,
          writingTests: writingTests ?? 0,
          readingTests: readingTests ?? 0,
          listeningTests: listeningTests ?? 0,
          speakingTests: speakingTests ?? 0,
          totalClassrooms: totalClassrooms ?? 0,
          recentSignups: recentSignups ?? 0,
          recentTests: recentTests ?? 0,
        });
      } catch (err) {
        console.error('Failed to load system stats:', err);
      }
      setLoading(false);
    };

    load();
  }, []);

  return { stats, loading };
}

// ── Main Component ───────────────────────────────────────────

const SuperAdminDashboard = () => {
  const { user, role, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') ?? 'overview';

  const setTab = (tab: string) => {
    setSearchParams({ tab }, { replace: true });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user || role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-grow pt-24 pb-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Super Admin Dashboard</h1>
              <p className="text-muted-foreground">Manage users, requests, feedback & analytics</p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
              <TabsTrigger value="overview" className="gap-1.5">
                <BarChart3 className="h-4 w-4 hidden sm:inline" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="teachers" className="gap-1.5">
                <GraduationCap className="h-4 w-4 hidden sm:inline" />
                Teachers
              </TabsTrigger>
              <TabsTrigger value="premium" className="gap-1.5">
                <Crown className="h-4 w-4 hidden sm:inline" />
                Premium
              </TabsTrigger>
              <TabsTrigger value="feedback" className="gap-1.5">
                <MessageSquare className="h-4 w-4 hidden sm:inline" />
                Feedback
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <OverviewTab />
            </TabsContent>

            <TabsContent value="teachers">
              <TeacherRequestsTab />
            </TabsContent>

            <TabsContent value="premium">
              <PremiumRequestsTab />
            </TabsContent>

            <TabsContent value="feedback">
              <FeedbackTab />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SuperAdminDashboard;

// ═══════════════════════════════════════════════════════════════
// TAB 1: Overview / System Analytics
// ═══════════════════════════════════════════════════════════════

function OverviewTab() {
  const { stats, loading } = useSystemStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!stats) {
    return <p className="text-center text-muted-foreground py-12">Failed to load analytics.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Row 1: User counts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={<Users className="h-5 w-5" />}
          color="text-blue-500"
        />
        <StatCard
          title="Students"
          value={stats.totalStudents}
          icon={<User className="h-5 w-5" />}
          color="text-green-500"
        />
        <StatCard
          title="Teachers"
          value={stats.totalTeachers}
          icon={<GraduationCap className="h-5 w-5" />}
          color="text-purple-500"
        />
        <StatCard
          title="Classrooms"
          value={stats.totalClassrooms}
          icon={<BookOpen className="h-5 w-5" />}
          color="text-amber-500"
        />
      </div>

      {/* Row 2: Test counts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Tests"
          value={stats.totalTests}
          icon={<BarChart3 className="h-5 w-5" />}
          color="text-primary"
        />
        <StatCard
          title="Writing"
          value={stats.writingTests}
          icon={<PenTool className="h-5 w-5" />}
          color="text-emerald-500"
        />
        <StatCard
          title="Reading"
          value={stats.readingTests}
          icon={<BookOpen className="h-5 w-5" />}
          color="text-sky-500"
        />
        <StatCard
          title="Listening"
          value={stats.listeningTests}
          icon={<Headphones className="h-5 w-5" />}
          color="text-orange-500"
        />
        <StatCard
          title="Speaking"
          value={stats.speakingTests}
          icon={<Mic className="h-5 w-5" />}
          color="text-rose-500"
        />
      </div>

      {/* Row 3: Activity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              New Users (Last 7 Days)
            </CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.recentSignups}</div>
            <p className="text-xs text-muted-foreground mt-1">new registrations this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tests Taken (Last 7 Days)
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.recentTests}</div>
            <p className="text-xs text-muted-foreground mt-1">tests completed this week</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={color}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value.toLocaleString()}</div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 2: Teacher Requests
// ═══════════════════════════════════════════════════════════════

function TeacherRequestsTab() {
  const { data: requests, isLoading } = useAllTeacherRequests();
  const reviewMutation = useReviewTeacherRequest();

  const pendingRequests = requests?.filter((r) => r.status === 'pending') ?? [];
  const processedRequests = requests?.filter((r) => r.status !== 'pending') ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" /> Pending
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="gap-1 bg-green-500 hover:bg-green-600">
            <CheckCircle className="h-3 w-3" /> Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" /> Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Pending */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Requests ({pendingRequests.length})
          </CardTitle>
          <CardDescription>Teacher account requests awaiting your review</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">No pending teacher requests</p>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((req) => (
                <div key={req.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{req.full_name}</p>
                        <p className="text-sm text-muted-foreground">{req.email}</p>
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(req.created_at), 'PPP')}
                    </span>
                  </div>
                  {req.organization && (
                    <p className="text-sm">
                      <span className="font-medium">Organization:</span> {req.organization}
                    </p>
                  )}
                  {req.reason && (
                    <p className="text-sm bg-muted p-3 rounded">{req.reason}</p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        reviewMutation.mutate({
                          requestId: req.id,
                          userId: req.user_id,
                          approved: true,
                        })
                      }
                      disabled={reviewMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        reviewMutation.mutate({
                          requestId: req.id,
                          userId: req.user_id,
                          approved: false,
                        })
                      }
                      disabled={reviewMutation.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processed */}
      <Card>
        <CardHeader>
          <CardTitle>Processed Requests ({processedRequests.length})</CardTitle>
          <CardDescription>Previously reviewed teacher requests</CardDescription>
        </CardHeader>
        <CardContent>
          {processedRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">No processed requests</p>
          ) : (
            <div className="space-y-3">
              {processedRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{req.full_name}</p>
                      <p className="text-xs text-muted-foreground">{req.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {req.reviewed_at && format(new Date(req.reviewed_at), 'PPP')}
                    </span>
                    {getStatusBadge(req.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 3: Premium Requests (reuses existing hooks)
// ═══════════════════════════════════════════════════════════════

function PremiumRequestsTab() {
  const { data: requests, isLoading } = useAllPremiumRequests();
  const reviewMutation = useReviewPremiumRequest();

  const pendingRequests = requests?.filter((r) => r.status === 'pending') ?? [];
  const processedRequests = requests?.filter((r) => r.status !== 'pending') ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" /> Pending
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="gap-1 bg-green-500 hover:bg-green-600">
            <CheckCircle className="h-3 w-3" /> Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" /> Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Pending Premium Requests ({pendingRequests.length})
          </CardTitle>
          <CardDescription>Student premium membership requests</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">No pending requests</p>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div key={request.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{request.user_name || 'Unknown User'}</p>
                        <p className="text-sm text-muted-foreground">{request.user_email}</p>
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(request.created_at), 'PPP')}
                    </span>
                  </div>
                  {request.reason && (
                    <p className="text-sm bg-muted p-3 rounded">{request.reason}</p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        reviewMutation.mutate({
                          requestId: request.id,
                          userId: request.user_id,
                          approved: true,
                        })
                      }
                      disabled={reviewMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        reviewMutation.mutate({
                          requestId: request.id,
                          userId: request.user_id,
                          approved: false,
                        })
                      }
                      disabled={reviewMutation.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Processed Requests ({processedRequests.length})</CardTitle>
          <CardDescription>Previously reviewed premium requests</CardDescription>
        </CardHeader>
        <CardContent>
          {processedRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">No processed requests</p>
          ) : (
            <div className="space-y-3">
              {processedRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{request.user_name || 'Unknown User'}</p>
                      <p className="text-xs text-muted-foreground">{request.user_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {request.reviewed_at && format(new Date(request.reviewed_at), 'PPP')}
                    </span>
                    {getStatusBadge(request.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 4: Feedback (inline version of AdminFeedback)
// ═══════════════════════════════════════════════════════════════

const FB_PAGE_SIZE = 20;

function FeedbackTab() {
  const [feedback, setFeedback] = useState<FeedbackRecord[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoadingData(true);
      try {
        const numericFilter =
          ratingFilter !== 'all' ? parseInt(ratingFilter, 10) : undefined;
        const result = await fetchAllFeedback({
          ratingFilter: numericFilter,
          sortOrder,
          limit: FB_PAGE_SIZE,
          offset: page * FB_PAGE_SIZE,
        });
        setFeedback(result.data);
        setTotal(result.total);
      } catch (err) {
        console.error('Failed to load feedback:', err);
      }
      setLoadingData(false);
    };
    load();
  }, [ratingFilter, sortOrder, page]);

  useEffect(() => {
    getFeedbackStats().then(setStats).catch(console.error);
  }, []);

  const totalPages = Math.ceil(total / FB_PAGE_SIZE);

  const renderStars = (count: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-4 w-4 ${
            s <= count
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-transparent text-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  );

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="space-y-6">
      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Feedback
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.totalCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Average Rating
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-foreground">
                  {stats.averageRating.toFixed(1)}
                </span>
                {renderStars(Math.round(stats.averageRating))}
              </div>
            </CardContent>
          </Card>
          <Card className="sm:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Rating Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {[5, 4, 3, 2, 1].map((r) => {
                  const count = stats.ratingDistribution[r] ?? 0;
                  const pct =
                    stats.totalCount > 0 ? (count / stats.totalCount) * 100 : 0;
                  return (
                    <div key={r} className="flex items-center gap-2 text-sm">
                      <span className="w-3 text-muted-foreground">{r}</span>
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-yellow-400 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-muted-foreground">{count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={ratingFilter}
          onValueChange={(v) => {
            setRatingFilter(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ratings</SelectItem>
            <SelectItem value="5">5 Stars</SelectItem>
            <SelectItem value="4">4 Stars</SelectItem>
            <SelectItem value="3">3 Stars</SelectItem>
            <SelectItem value="2">2 Stars</SelectItem>
            <SelectItem value="1">1 Star</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
          className="gap-1.5"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          {sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
        </Button>
        <span className="ml-auto text-sm text-muted-foreground">
          {total} result{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Feedback list */}
      <Card>
        <CardContent className="py-4">
          {loadingData ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
            </div>
          ) : feedback.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No feedback found.</div>
          ) : (
            <div className="space-y-3">
              {feedback.map((fb) => (
                <div key={fb.id} className="flex flex-col gap-2 p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    {renderStars(fb.rating)}
                    <span className="text-xs text-muted-foreground">
                      {formatDate(fb.created_at)}
                    </span>
                  </div>
                  {fb.message && <p className="text-sm text-foreground">{fb.message}</p>}
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>Platform: {fb.platform}</span>
                    <span>User: {fb.user_id.slice(0, 8)}…</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
