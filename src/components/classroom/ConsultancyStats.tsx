import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Headphones, BookOpen, PenTool, Mic, Users, TrendingUp, Crown } from 'lucide-react';

interface SkillAverage {
  type: string;
  avg: number;
  count: number;
}

interface ConsultancyStatsProps {
  consultancyId: string;
  consultancyName: string;
  tier: string;
}

const tierLabel: Record<string, string> = {
  basic: 'Basic',
  professional: 'Professional',
  enterprise: 'Enterprise',
};

const tierLimit: Record<string, number> = {
  basic: 5,
  professional: 15,
  enterprise: 100,
};

const tierColor: Record<string, string> = {
  basic: 'text-blue-600 dark:text-blue-400',
  professional: 'text-purple-600 dark:text-purple-400',
  enterprise: 'text-yellow-600 dark:text-yellow-400',
};

const skillIcons: Record<string, typeof Headphones> = {
  listening: Headphones,
  reading: BookOpen,
  writing: PenTool,
  speaking: Mic,
};

export default function ConsultancyStats({ consultancyId, consultancyName, tier }: ConsultancyStatsProps) {
  const [totalStudents, setTotalStudents] = useState(0);
  const [skillAverages, setSkillAverages] = useState<SkillAverage[]>([]);
  const [overallAvg, setOverallAvg] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);

      // 1. Get all classroom IDs for this consultancy
      const { data: classrooms } = await supabase
        .from('classrooms')
        .select('id')
        .eq('consultancy_id', consultancyId);

      if (!classrooms || classrooms.length === 0) {
        setLoading(false);
        return;
      }

      const classroomIds = classrooms.map(c => c.id);

      // 2. Get all student IDs from those classrooms
      const { data: memberships } = await supabase
        .from('classroom_memberships')
        .select('student_id')
        .in('classroom_id', classroomIds);

      if (!memberships || memberships.length === 0) {
        setTotalStudents(0);
        setLoading(false);
        return;
      }

      const studentIds = [...new Set(memberships.map(m => m.student_id))];
      setTotalStudents(studentIds.length);

      // 3. Get all test_results for these students
      const { data: results } = await supabase
        .from('test_results')
        .select('test_type, band_score')
        .in('user_id', studentIds);

      if (!results || results.length === 0) {
        setLoading(false);
        return;
      }

      // 4. Calculate per-skill averages
      const types = ['listening', 'reading', 'writing', 'speaking'];
      const averages: SkillAverage[] = types.map(type => {
        const typeResults = results.filter(r => r.test_type === type);
        const avg = typeResults.length > 0
          ? typeResults.reduce((sum, r) => sum + Number(r.band_score), 0) / typeResults.length
          : 0;
        return { type, avg, count: typeResults.length };
      });

      setSkillAverages(averages);

      // 5. Overall average across all tests
      const totalAvg = results.length > 0
        ? results.reduce((sum, r) => sum + Number(r.band_score), 0) / results.length
        : 0;
      setOverallAvg(totalAvg);

      setLoading(false);
    };

    fetchStats();
  }, [consultancyId]);

  if (loading) {
    return (
      <Card className="mb-8">
        <CardContent className="py-8 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
        </CardContent>
      </Card>
    );
  }

  const maxStudents = tierLimit[tier] || 5;

  return (
    <div className="mb-8 space-y-4">
      {/* Consultancy Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            {consultancyName} — Overview
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Aggregate performance across all your classrooms
          </p>
        </div>
        <div className={`text-sm font-semibold px-3 py-1 rounded-full border ${tierColor[tier] || ''}`}>
          {tierLabel[tier] || tier} Plan
        </div>
      </div>

      {/* Top-level stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalStudents}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalStudents} / {maxStudents} seats used
            </p>
            <div className="w-full bg-muted rounded-full h-2 mt-2">
              <div
                className="bg-primary rounded-full h-2 transition-all"
                style={{ width: `${Math.min((totalStudents / maxStudents) * 100, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overall Average Band</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {overallAvg > 0 ? overallAvg.toFixed(1) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all skills &amp; students
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tests Taken</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {skillAverages.reduce((sum, s) => sum + s.count, 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              By all enrolled students
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Per-skill breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {skillAverages.map(skill => {
          const Icon = skillIcons[skill.type] || BookOpen;
          return (
            <Card key={skill.type}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg capitalize">{skill.type}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tests taken</span>
                    <span className="font-medium text-foreground">{skill.count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Avg. band</span>
                    <span className="font-medium text-foreground">
                      {skill.avg > 0 ? skill.avg.toFixed(1) : 'N/A'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
