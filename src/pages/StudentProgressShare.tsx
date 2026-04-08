import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { ArrowLeft, BarChart3, Copy, Linkedin, MessageCircle, Share2, Sparkles, TrendingUp, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { supabase } from '@/integrations/supabase/client';
import { downloadStudentProgressImage, shareStudentProgressImage } from '@/lib/studentProgressImage';
import {
  buildStudentProgressDescription,
  buildStudentProgressShareText,
  buildStudentProgressSummary,
  buildStudentProgressTitle,
  type StudentProgressSnapshot,
  type StudentProgressTestResult,
} from '@/lib/studentProgressShare';

interface ProgressShareRow {
  share_id: string;
  display_name: string | null;
  snapshot: StudentProgressSnapshot | null;
}

const chartConfig = {
  bandScore: {
    label: 'Band score',
    color: '#22c55e',
  },
};

export default function StudentProgressShare() {
  const { shareId } = useParams<{ shareId: string }>();
  const navigate = useNavigate();
  const [share, setShare] = useState<ProgressShareRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShare = async () => {
      if (!shareId) return;

      const { data, error } = await supabase
        .from('student_progress_shares')
        .select('share_id, display_name, snapshot')
        .eq('share_id', shareId)
        .eq('is_public', true)
        .single<ProgressShareRow>();

      if (!error && data) {
        setShare(data);
      }

      setLoading(false);
    };

    fetchShare();
  }, [shareId]);

  const summary = useMemo(() => {
    const snapshotResults = (share?.snapshot?.recentResults || []) as StudentProgressTestResult[];
    return share?.snapshot?.summary || buildStudentProgressSummary(snapshotResults);
  }, [share]);

  useEffect(() => {
    if (!share) return;

    const title = buildStudentProgressTitle(share.display_name || share.snapshot?.displayName || null);
    const description = buildStudentProgressDescription(share.display_name || share.snapshot?.displayName || null, summary);
    const origin = window.location.origin;

    document.title = `${title} | Lexora`;

    upsertMeta('description', description);
    upsertMeta('og:title', title, 'property');
    upsertMeta('og:description', description, 'property');
    upsertMeta('og:type', 'profile', 'property');
    upsertMeta('twitter:card', 'summary_large_image');
    upsertMeta('twitter:title', title);
    upsertMeta('twitter:description', description);
    upsertMeta('og:url', `${origin}/share/progress/${share.share_id}`, 'property');
    upsertMeta('twitter:url', `${origin}/share/progress/${share.share_id}`);
  }, [share, summary]);

  const shareText = buildStudentProgressShareText(share?.display_name || share?.snapshot?.displayName || null, summary);
  const shareUrl = share?.share_id ? `${window.location.origin}/share/progress/${share.share_id}` : '';

  const copyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied');
  };

  const shareToPlatform = async (platform: 'x' | 'whatsapp' | 'linkedin' | 'system') => {
    if (!shareUrl) return;

    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(`${shareText} ${shareUrl}`);

    if (platform === 'system' && navigator.share) {
      await navigator.share({ title: 'Lexora progress', text: shareText, url: shareUrl });
      return;
    }

    const targets = {
      x: `https://twitter.com/intent/tweet?text=${encodedText}`,
      whatsapp: `https://wa.me/?text=${encodedText}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      system: shareUrl,
    } as const;

    window.open(targets[platform], '_blank', 'noopener,noreferrer');
  };

  const handleDownloadImage = async () => {
    if (!share?.snapshot) return;

    try {
      await downloadStudentProgressImage({
        displayName: share.display_name || share.snapshot.displayName,
        snapshot: share.snapshot,
      });
      toast.success('Share card downloaded');
    } catch (error) {
      console.error('Failed to download share image', error);
      toast.error('Failed to generate share image');
    }
  };

  const handleShareImage = async () => {
    if (!share?.snapshot) return;

    const shared = await shareStudentProgressImage({
      displayName: share.display_name || share.snapshot.displayName,
      snapshot: share.snapshot,
    });

    if (!shared) {
      toast.error('Your browser cannot share files directly. Download the image instead.');
    }
  };

  if (loading) {
    return <ShareSkeleton />;
  }

  if (!share) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <Card className="w-full max-w-lg border-white/10 bg-white/5 text-white">
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">Progress share</p>
            <h1 className="text-3xl font-semibold">This progress card was not found</h1>
            <p className="text-white/70">The link may be invalid or the owner has not published this summary yet.</p>
            <Button onClick={() => navigate('/dashboard')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const snapshotResults = (share.snapshot?.recentResults || []) as StudentProgressTestResult[];
  const topPerformance = summary.totalTests > 0 ? `${summary.highestBand.toFixed(1)} max band` : 'No tests yet';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.2),_transparent_30%),linear-gradient(135deg,_#07110f,_#0b1320_52%,_#07110f)] text-white">
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Badge className="gap-2 rounded-full border-emerald-400/30 bg-emerald-400/10 text-emerald-200">
            <Sparkles className="h-3.5 w-3.5" />
            Public student progress
          </Badge>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.25fr_0.9fr]">
          <Card className="overflow-hidden border-white/10 bg-white/10 text-white shadow-2xl shadow-emerald-950/30 backdrop-blur">
            <CardContent className="space-y-6 p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">Lexora progress card</p>
                  <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">{share.display_name || 'Student'}'s IELTS journey</h1>
                  <p className="mt-3 max-w-2xl text-sm text-white/70 sm:text-base">
                    A Strava-style snapshot of tests completed, average performance, highest band, and the trend line across recent attempts.
                  </p>
                </div>
                <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-4 text-right">
                  <p className="text-xs uppercase tracking-[0.18em] text-emerald-200/80">Latest band</p>
                  <p className="text-4xl font-bold text-emerald-300">{summary.totalTests > 0 ? summary.highestBand.toFixed(1) : 'N/A'}</p>
                  <p className="text-xs text-white/60">Best recorded score</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Metric label="Total tests" value={summary.totalTests.toString()} />
                <Metric label="Average band" value={summary.averageBand.toFixed(1)} />
                <Metric label="Highest band" value={summary.highestBand.toFixed(1)} />
                <Metric label="Streak" value={`${summary.currentStreakDays}d`} />
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/20 p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/55">Band trend</p>
                    <h2 className="text-xl font-semibold">Recent progress graph</h2>
                  </div>
                  <Badge variant="outline" className="border-white/10 bg-white/5 text-white">
                    <TrendingUp className="mr-1 h-3.5 w-3.5" />
                    {summary.bandChange >= 0 ? '+' : ''}{summary.bandChange.toFixed(1)} since start
                  </Badge>
                </div>

                {summary.chartPoints.length > 0 ? (
                  <div className="h-72 w-full">
                    <ChartContainer config={chartConfig} className="h-full w-full" id="student-progress-share">
                      <AreaChart data={summary.chartPoints} margin={{ top: 12, right: 8, left: -16, bottom: 0 }}>
                        <defs>
                          <linearGradient id="share-band-gradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.45} />
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: 'rgba(255,255,255,0.72)', fontSize: 12 }} />
                        <YAxis domain={[0, 9]} tickLine={false} axisLine={false} width={32} tick={{ fill: 'rgba(255,255,255,0.72)', fontSize: 12 }} />
                        <Tooltip content={<ChartTooltipContent hideLabel />} />
                        <Area
                          type="monotone"
                          dataKey="bandScore"
                          stroke="#86efac"
                          strokeWidth={3}
                          fill="url(#share-band-gradient)"
                          dot={{ r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      </AreaChart>
                    </ChartContainer>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-white/60">
                    Complete a few tests and your band trend will appear here.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-white/10 bg-white/5 text-white backdrop-blur">
              <CardContent className="space-y-4 p-6">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-white/55">Summary</p>
                  <h2 className="mt-2 text-2xl font-semibold">Shareable metadata</h2>
                </div>
                <p className="text-sm text-white/70">
                  {buildStudentProgressDescription(share.display_name || share.snapshot?.displayName || null, summary)}
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <MiniInfo label="Latest test" value={summary.latestTestAt ? new Date(summary.latestTestAt).toLocaleDateString() : 'N/A'} />
                  <MiniInfo label="Top performance" value={topPerformance} />
                  <MiniInfo label="Tests by type" value={Object.keys(summary.testsByType).length.toString()} />
                  <MiniInfo label="Share status" value="Public" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5 text-white backdrop-blur">
              <CardContent className="space-y-3 p-6">
                <p className="text-sm uppercase tracking-[0.18em] text-white/55">Share anywhere</p>
                <h2 className="text-2xl font-semibold">Send this card to social media</h2>
                <p className="text-sm text-white/70">
                  Copy the link or open it directly in X, WhatsApp, LinkedIn, or the native share sheet.
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button onClick={copyLink} className="gap-2">
                    <Copy className="h-4 w-4" />
                    Copy link
                  </Button>
                  <Button variant="outline" onClick={() => shareToPlatform('system')} className="gap-2 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                  <Button variant="outline" onClick={handleShareImage} className="gap-2 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                    <Sparkles className="h-4 w-4" />
                    Share image
                  </Button>
                  <Button variant="ghost" onClick={handleDownloadImage} className="gap-2 text-white hover:bg-white/10 hover:text-white">
                    <Copy className="h-4 w-4" />
                    Download image
                  </Button>
                  <Button variant="outline" onClick={() => shareToPlatform('x')} className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                    <X className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={() => shareToPlatform('whatsapp')} className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={() => shareToPlatform('linkedin')} className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                    <Linkedin className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5 text-white backdrop-blur">
              <CardContent className="space-y-3 p-6">
                <div className="flex items-center gap-2 text-emerald-300">
                  <BarChart3 className="h-4 w-4" />
                  <p className="text-sm uppercase tracking-[0.18em]">Recent tests</p>
                </div>
                {snapshotResults.length > 0 ? (
                  <div className="space-y-2">
                    {snapshotResults.slice(-5).reverse().map((result) => (
                      <div key={result.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
                        <div>
                          <p className="font-medium text-white">{result.test_type.toUpperCase()} {result.test_id}</p>
                          <p className="text-white/60">{new Date(result.created_at).toLocaleDateString()}</p>
                        </div>
                        <Badge className="bg-emerald-400/10 text-emerald-200">Band {Number(result.band_score || 0).toFixed(1)}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-white/60">No test history available in this share snapshot.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.18em] text-white/55">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className="mt-1 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function ShareSkeleton() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl animate-pulse space-y-6">
        <div className="h-12 w-40 rounded-xl bg-white/10" />
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.9fr]">
          <div className="h-[34rem] rounded-3xl bg-white/10" />
          <div className="space-y-6">
            <div className="h-48 rounded-3xl bg-white/10" />
            <div className="h-44 rounded-3xl bg-white/10" />
            <div className="h-44 rounded-3xl bg-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
}

function upsertMeta(attributeName: string, content: string, attributeType: 'name' | 'property' = 'name') {
  let element = document.head.querySelector(`meta[${attributeType}="${attributeName}"]`) as HTMLMetaElement | null;

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attributeType, attributeName);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}
