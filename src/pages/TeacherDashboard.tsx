import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BookOpen, Headphones, Mic, PenTool, TrendingUp, Clock, Target, 
  Users, GraduationCap, Award, BarChart3 
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PremiumBadge } from "@/components/premium/PremiumBadge";

interface StudentStats {
  user_id: string;
  full_name: string | null;
  email: string | null;
  tests_count: number;
  avg_band: number;
  highest_band: number;
  total_minutes: number;
}

interface ClassroomInfo {
  id: string;
  name: string;
  student_count: number;
}

const TeacherDashboard = () => {
  const { user, role, loading } = useAuth();
  const [classrooms, setClassrooms] = useState<ClassroomInfo[]>([]);
  const [studentStats, setStudentStats] = useState<StudentStats[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const fetchTeacherData = async () => {
      if (!user) return;

      // Fetch teacher's classrooms
      const { data: classroomsData } = await supabase
        .from('classrooms')
        .select('id, name')
        .eq('teacher_id', user.id);

      if (!classroomsData || classroomsData.length === 0) {
        setLoadingData(false);
        return;
      }

      const classroomIds = classroomsData.map(c => c.id);

      // Fetch all memberships for these classrooms
      const { data: memberships } = await supabase
        .from('classroom_memberships')
        .select('student_id, classroom_id')
        .in('classroom_id', classroomIds);

      if (!memberships) {
        setLoadingData(false);
        return;
      }

      // Calculate classroom info with student counts
      const classroomInfo: ClassroomInfo[] = classroomsData.map(c => ({
        ...c,
        student_count: memberships.filter(m => m.classroom_id === c.id).length
      }));
      setClassrooms(classroomInfo);

      // Get unique student IDs
      const studentIds = [...new Set(memberships.map(m => m.student_id))];

      if (studentIds.length === 0) {
        setLoadingData(false);
        return;
      }

      // Fetch profiles for these students
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', studentIds);

      // Fetch test results for these students
      const { data: testResults } = await supabase
        .from('test_results')
        .select('*')
        .in('user_id', studentIds);

      // Calculate stats per student
      const stats: StudentStats[] = studentIds.map(studentId => {
        const profile = profiles?.find(p => p.user_id === studentId);
        const results = testResults?.filter(r => r.user_id === studentId) || [];
        
        return {
          user_id: studentId,
          full_name: profile?.full_name || null,
          email: profile?.email || null,
          tests_count: results.length,
          avg_band: results.length > 0 
            ? results.reduce((sum, r) => sum + Number(r.band_score), 0) / results.length 
            : 0,
          highest_band: results.length > 0 
            ? Math.max(...results.map(r => Number(r.band_score))) 
            : 0,
          total_minutes: results.reduce((sum, r) => sum + (r.duration_minutes || 0), 0)
        };
      });

      // Sort by tests count descending
      stats.sort((a, b) => b.tests_count - a.tests_count);
      setStudentStats(stats);
      setLoadingData(false);
    };

    if (user && (role === 'consultancy_owner' || role === 'super_admin')) {
      fetchTeacherData();
    }
  }, [user, role]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Aggregate stats
  const totalStudents = studentStats.length;
  const totalTests = studentStats.reduce((sum, s) => sum + s.tests_count, 0);
  const totalHours = Math.round(studentStats.reduce((sum, s) => sum + s.total_minutes, 0) / 60);
  const overallAvgBand = totalStudents > 0 && studentStats.some(s => s.tests_count > 0)
    ? studentStats.filter(s => s.tests_count > 0).reduce((sum, s) => sum + s.avg_band, 0) / studentStats.filter(s => s.tests_count > 0).length
    : 0;
  const highestBand = studentStats.length > 0 
    ? Math.max(...studentStats.map(s => s.highest_band)) 
    : 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground">Teacher Dashboard</h1>
              <PremiumBadge />
            </div>
            <p className="text-muted-foreground">
              Welcome back! Track your students' IELTS preparation progress.
            </p>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Students
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{totalStudents}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Tests Taken
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{totalTests}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Practice Hours
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{totalHours}h</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Average Band Score
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {overallAvgBand > 0 ? overallAvgBand.toFixed(1) : "N/A"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Highest Band Score
                </CardTitle>
                <Award className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {highestBand > 0 ? highestBand.toFixed(1) : "N/A"}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Classrooms Overview */}
          <h2 className="text-xl font-semibold text-foreground mb-4">Your Classrooms</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {loadingData ? (
              <div className="col-span-full text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : classrooms.length === 0 ? (
              <Card className="col-span-full border-dashed">
                <CardContent className="py-8 text-center">
                  <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No classrooms yet. Create one from the Classrooms page.</p>
                </CardContent>
              </Card>
            ) : (
              classrooms.map((classroom) => (
                <Card key={classroom.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{classroom.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{classroom.student_count} students</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Student Analytics Table */}
          <h2 className="text-xl font-semibold text-foreground mb-4">Student Performance</h2>
          <Card>
            <CardContent className="py-4">
              {loadingData ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : studentStats.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No students enrolled yet.</p>
                  <p className="text-sm mt-1">Students will appear here once they join your classrooms.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Student</th>
                        <th className="text-center py-3 px-4 font-medium text-muted-foreground">Tests</th>
                        <th className="text-center py-3 px-4 font-medium text-muted-foreground">Hours</th>
                        <th className="text-center py-3 px-4 font-medium text-muted-foreground">Avg Band</th>
                        <th className="text-center py-3 px-4 font-medium text-muted-foreground">Highest Band</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentStats.map((student) => (
                        <tr key={student.user_id} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium text-foreground">
                                {student.full_name || 'Unknown'}
                              </p>
                              <p className="text-sm text-muted-foreground">{student.email}</p>
                            </div>
                          </td>
                          <td className="text-center py-3 px-4 font-medium text-foreground">
                            {student.tests_count}
                          </td>
                          <td className="text-center py-3 px-4 text-foreground">
                            {Math.round(student.total_minutes / 60)}h
                          </td>
                          <td className="text-center py-3 px-4">
                            <span className={`font-medium ${student.avg_band >= 6.5 ? 'text-green-600' : student.avg_band >= 5 ? 'text-amber-600' : 'text-foreground'}`}>
                              {student.tests_count > 0 ? student.avg_band.toFixed(1) : 'N/A'}
                            </span>
                          </td>
                          <td className="text-center py-3 px-4">
                            <span className={`font-bold ${student.highest_band >= 7 ? 'text-primary' : 'text-foreground'}`}>
                              {student.tests_count > 0 ? student.highest_band.toFixed(1) : 'N/A'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TeacherDashboard;
