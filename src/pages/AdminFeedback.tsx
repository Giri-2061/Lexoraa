import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Star, MessageSquare, TrendingUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchAllFeedback, getFeedbackStats } from '@/lib/feedbackService';
import type { FeedbackRecord, FeedbackStats } from '@/types/feedback';

const PAGE_SIZE = 20;

const AdminFeedback = () => {
  const { user, role, loading } = useAuth();
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
        const numericFilter = ratingFilter !== 'all' ? parseInt(ratingFilter, 10) : undefined;
        const result = await fetchAllFeedback({
          ratingFilter: numericFilter,
          sortOrder,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        });
        setFeedback(result.data);
        setTotal(result.total);
      } catch (err) {
        console.error('Failed to load feedback:', err);
      }
      setLoadingData(false);
    };
    if (role === 'super_admin') load();
  }, [role, ratingFilter, sortOrder, page]);

  useEffect(() => {
    if (role === 'super_admin') {
      getFeedbackStats().then(setStats).catch(console.error);
    }
  }, [role]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user || role !== 'super_admin') return <Navigate to="/" replace />;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const renderStars = (count: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`h-4 w-4 ${s <= count ? 'fill-yellow-400 text-yellow-400' : 'fill-transparent text-muted-foreground/30'}`} />
      ))}
    </div>
  );

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-grow pt-24 pb-12">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-foreground mb-2">Feedback Dashboard</h1>
          <p className="text-muted-foreground mb-8">View and analyse user feedback across the platform.</p>

          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Feedback</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold text-foreground">{stats.totalCount}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Average Rating</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-foreground">{stats.averageRating.toFixed(1)}</span>
                    {renderStars(Math.round(stats.averageRating))}
                  </div>
                </CardContent>
              </Card>
              <Card className="sm:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Rating Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    {[5, 4, 3, 2, 1].map((r) => {
                      const count = stats.ratingDistribution[r] ?? 0;
                      const pct = stats.totalCount > 0 ? (count / stats.totalCount) * 100 : 0;
                      return (
                        <div key={r} className="flex items-center gap-2 text-sm">
                          <span className="w-3 text-muted-foreground">{r}</span>
                          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-yellow-400 transition-all" style={{ width: `${pct}%` }} />
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

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Select value={ratingFilter} onValueChange={(v) => { setRatingFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Filter by rating" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="1">1 Star</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))} className="gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5" />
              {sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
            </Button>
            <span className="ml-auto text-sm text-muted-foreground">{total} result{total !== 1 ? 's' : ''}</span>
          </div>

          <Card>
            <CardContent className="py-4">
              {loadingData ? (
                <div className="text-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" /></div>
              ) : feedback.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No feedback found.</div>
              ) : (
                <div className="space-y-3">
                  {feedback.map((fb) => (
                    <div key={fb.id} className="flex flex-col gap-2 p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        {renderStars(fb.rating)}
                        <span className="text-xs text-muted-foreground">{formatDate(fb.created_at)}</span>
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

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button variant="outline" size="icon" disabled={page === 0} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
              <Button variant="outline" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminFeedback;
