import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { Copy, Globe, Link2, Share2, Sparkles, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import {
  buildStudentProgressDescription,
  buildStudentProgressShareText,
  buildStudentProgressSummary,
  buildStudentProgressTitle,
  type StudentProgressTestResult,
} from '@/lib/studentProgressShare';

interface ProgressSharePanelProps {
  userId: string;
  displayName: string | null;
  testResults: StudentProgressTestResult[];
}

interface ProgressShareRecord {
  share_id: string;
}

export default function ProgressSharePanel({ userId, displayName, testResults }: ProgressSharePanelProps) {
  const navigate = useNavigate();
  const summary = useMemo(() => buildStudentProgressSummary(testResults), [testResults]);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [creatingShare, setCreatingShare] = useState(false);

  useEffect(() => {
    const fetchShareLink = async () => {
      const { data } = await supabase
        .from('student_progress_shares')
        .select('share_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (data?.share_id) {
        setShareUrl(`${window.location.origin}/share/progress/${data.share_id}`);
      }
    };

    if (userId) {
      fetchShareLink();
    }
  }, [userId]);

  const copyShareLink = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast.success('Share link copied');
  };

  const createShareLink = async () => {
    if (!userId) return;

    setCreatingShare(true);
    const snapshot = {
      displayName,
      generatedAt: new Date().toISOString(),
      summary,
      recentResults: testResults.slice(-12),
    } as unknown as Json;

    const { data, error } = await supabase
      .from('student_progress_shares')
      .upsert(
        {
          user_id: userId,
          display_name: displayName,
          snapshot,
          is_public: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select('share_id')
      .single<ProgressShareRecord>();

    setCreatingShare(false);

    if (error || !data?.share_id) {
      toast.error('Failed to create share link');
      return;
    }

    const nextShareUrl = `${window.location.origin}/share/progress/${data.share_id}`;
    setShareUrl(nextShareUrl);
    await copyShareLink(nextShareUrl);
    navigate(nextShareUrl.replace(window.location.origin, ''));
  };

  const shareText = buildStudentProgressShareText(displayName, summary);
  const shareDescription = buildStudentProgressDescription(displayName, summary);

  const chartConfig = {
    bandScore: {
      label: 'Band score',
      color: '#22c55e',
    },
  };

  return (
    <Card className="border-emerald-200/60 bg-gradient-to-br from-emerald-50 via-background to-sky-50 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-700">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium uppercase tracking-[0.18em]">Shareable summary</span>
            </div>
            <CardTitle className="mt-2 text-2xl">Your Lexora progress card</CardTitle>
            <CardDescription className="mt-1 max-w-2xl">
              A Strava-style snapshot of your IELTS journey: total tests, average band, highest band, consistency streak,
              and a progress graph that you can share anywhere.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="h-fit gap-1 rounded-full bg-emerald-100 text-emerald-700">
            <Globe className="h-3.5 w-3.5" />
            Public share
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatBlock label="Total tests" value={summary.totalTests.toString()} hint="All scored attempts" />
          <StatBlock label="Average band" value={summary.averageBand.toFixed(1)} hint="Across all tests" />
          <StatBlock label="Highest band" value={summary.highestBand.toFixed(1)} hint="Best result" />
          <StatBlock label="Streak" value={`${summary.currentStreakDays}d`} hint="Current activity streak" />
        </div>

        <div className="rounded-2xl border bg-background/80 p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Progress trend</p>
              <p className="text-lg font-semibold text-foreground">Band score over time</p>
            </div>
            <Badge variant="outline" className="gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              {summary.bandChange >= 0 ? '+' : ''}{summary.bandChange.toFixed(1)} since start
            </Badge>
          </div>

          {summary.chartPoints.length > 0 ? (
            <div className="h-56 w-full">
              <ChartContainer config={chartConfig} className="h-full w-full" id="progress-share">
                <AreaChart data={summary.chartPoints} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="progress-band-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    minTickGap={20}
                  />
                  <YAxis domain={[0, 9]} tickLine={false} axisLine={false} width={32} />
                  <Tooltip content={<ChartTooltipContent hideLabel />} />
                  <Area
                    type="monotone"
                    dataKey="bandScore"
                    stroke="#22c55e"
                    fill="url(#progress-band-gradient)"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ChartContainer>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Your chart will appear here after you complete a few tests.
            </div>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border bg-background/80 p-4">
            <p className="text-sm font-medium text-muted-foreground">Progress summary</p>
            <p className="mt-2 text-foreground">{shareDescription}</p>
          </div>
          <div className="rounded-2xl border bg-background/80 p-4">
            <p className="text-sm font-medium text-muted-foreground">Share text</p>
            <p className="mt-2 text-foreground">{shareText}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={createShareLink} disabled={creatingShare || summary.totalTests === 0} className="gap-2">
            <Share2 className="h-4 w-4" />
            {creatingShare ? 'Creating share link...' : 'Create share link'}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/share/progress')}
            className="gap-2"
            disabled={summary.totalTests === 0}
          >
            <Link2 className="h-4 w-4" />
            Open share page
          </Button>
          {shareUrl && (
            <Button variant="ghost" onClick={() => copyShareLink(shareUrl)} className="gap-2">
              <Copy className="h-4 w-4" />
              Copy link
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatBlock({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border bg-background/80 p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}
