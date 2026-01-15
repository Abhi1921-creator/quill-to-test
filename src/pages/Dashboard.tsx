import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  GraduationCap, 
  FileText, 
  Users, 
  BarChart3, 
  Plus, 
  Clock,
  ChevronRight,
  LogOut,
  Settings,
  Building2,
  KeyRound
} from 'lucide-react';

interface DashboardStats {
  totalExams: number;
  completedExams: number;
  totalAttempts: number;
  avgScore: number | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading, signOut, getPrimaryRole, hasRole } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalExams: 0,
    completedExams: 0,
    totalAttempts: 0,
    avgScore: null,
  });

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user, profile]);

  const fetchStats = async () => {
    if (!user) return;

    const isStudentRole = hasRole('student') && !hasRole('teacher') && !hasRole('institute_admin') && !hasRole('super_admin');

    if (isStudentRole) {
      // Fetch student stats
      const { count: completedCount } = await supabase
        .from('exam_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', user.id)
        .eq('status', 'submitted');

      const { data: results } = await supabase
        .from('results')
        .select('percentage')
        .eq('student_id', user.id);

      const avgScore = results && results.length > 0
        ? results.reduce((sum, r) => sum + (r.percentage || 0), 0) / results.length
        : null;

      // Count available published exams
      const { count: availableCount } = await supabase
        .from('exams')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published');

      setStats({
        totalExams: availableCount || 0,
        completedExams: completedCount || 0,
        totalAttempts: completedCount || 0,
        avgScore,
      });
    } else {
      // Fetch teacher/admin stats - use fallback for null institute_id
      let query = supabase.from('exams').select('*', { count: 'exact', head: true });
      
      if (profile?.institute_id) {
        query = query.eq('institute_id', profile.institute_id);
      } else {
        query = query.eq('created_by', user.id);
      }

      const { count: examCount } = await query;

      // Get total attempts on user's exams
      let examIdsQuery = supabase.from('exams').select('id');
      if (profile?.institute_id) {
        examIdsQuery = examIdsQuery.eq('institute_id', profile.institute_id);
      } else {
        examIdsQuery = examIdsQuery.eq('created_by', user.id);
      }
      
      const { data: examIds } = await examIdsQuery;
      
      let totalAttempts = 0;
      if (examIds && examIds.length > 0) {
        const { count } = await supabase
          .from('exam_sessions')
          .select('*', { count: 'exact', head: true })
          .in('exam_id', examIds.map(e => e.id));
        totalAttempts = count || 0;
      }

      setStats({
        totalExams: examCount || 0,
        completedExams: 0,
        totalAttempts,
        avgScore: null,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-card">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const primaryRole = getPrimaryRole();
  const isAdmin = hasRole('institute_admin') || hasRole('super_admin');
  const isTeacher = hasRole('teacher');
  const isStudent = hasRole('student') && !isAdmin && !isTeacher;

  const getRoleLabel = () => {
    switch (primaryRole) {
      case 'super_admin':
        return 'Super Admin';
      case 'institute_admin':
        return 'Institute Admin';
      case 'teacher':
        return 'Teacher';
      default:
        return 'Student';
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <span className="text-xl font-display font-bold">ExamPro</span>
              <span className="hidden md:inline-block ml-2 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-medium">
                {getRoleLabel()}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold mb-2">
            Welcome back, {profile?.full_name || 'User'}!
          </h1>
          <p className="text-muted-foreground">
            {isStudent 
              ? 'View your available exams and track your performance.'
              : isTeacher
              ? 'Manage your exams and monitor student performance.'
              : 'Manage your institute, exams, and analytics.'}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {isStudent ? (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Available Exams</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalExams}</div>
                  <p className="text-xs text-muted-foreground mt-1">Ready to attempt</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Completed Exams</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.completedExams}</div>
                  <p className="text-xs text-muted-foreground mt-1">Total attempts</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Average Score</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.avgScore !== null ? `${stats.avgScore.toFixed(1)}%` : '--'}</div>
                  <p className="text-xs text-muted-foreground mt-1">Across all exams</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Time Spent</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0h</div>
                  <p className="text-xs text-muted-foreground mt-1">Total practice time</p>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Exams</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalExams}</div>
                  <p className="text-xs text-muted-foreground mt-1">Created exams</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Students</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground mt-1">Enrolled students</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Attempts</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalAttempts}</div>
                  <p className="text-xs text-muted-foreground mt-1">Total attempts</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Avg Score</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">--</div>
                  <p className="text-xs text-muted-foreground mt-1">Across all exams</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* For Admins and Teachers */}
          {(isAdmin || isTeacher) && (
            <>
              <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate('/exams/create')}>
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Create New Exam</CardTitle>
                  <CardDescription>
                    Upload a PDF or create an exam manually with AI-powered question extraction.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="p-0 h-auto text-primary">
                    Get Started <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate('/exams')}>
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-2 group-hover:bg-accent/20 transition-colors">
                    <FileText className="h-6 w-6 text-accent" />
                  </div>
                  <CardTitle>Manage Exams</CardTitle>
                  <CardDescription>
                    View, edit, and publish your exams. Upload answer keys and manage results.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="p-0 h-auto text-accent">
                    View All <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate('/exams/answer-keys')}>
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mb-2 group-hover:bg-success/20 transition-colors">
                    <KeyRound className="h-6 w-6 text-success" />
                  </div>
                  <CardTitle>Manage Answer Keys</CardTitle>
                  <CardDescription>
                    Set or update correct answers for your exams to enable automatic evaluation.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="p-0 h-auto text-success">
                    Manage Keys <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {isAdmin && (
            <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate('/institute')}>
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center mb-2 group-hover:bg-warning/20 transition-colors">
                  <Building2 className="h-6 w-6 text-warning" />
                </div>
                <CardTitle>Institute Settings</CardTitle>
                <CardDescription>
                  Manage your institute, teachers, students, and invite codes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" className="p-0 h-auto text-warning">
                  Manage <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* For Students */}
          {isStudent && (
            <>
              <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate('/exams')}>
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Available Exams</CardTitle>
                  <CardDescription>
                    View and attempt exams assigned to you by your institute.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="p-0 h-auto text-primary">
                    Browse Exams <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate('/results')}>
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mb-2 group-hover:bg-success/20 transition-colors">
                    <BarChart3 className="h-6 w-6 text-success" />
                  </div>
                  <CardTitle>My Results</CardTitle>
                  <CardDescription>
                    View your exam results, detailed analytics, and performance history.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="p-0 h-auto text-success">
                    View Results <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate('/join-institute')}>
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center mb-2 group-hover:bg-info/20 transition-colors">
                    <Building2 className="h-6 w-6 text-info" />
                  </div>
                  <CardTitle>Join Institute</CardTitle>
                  <CardDescription>
                    Enter an invite code to join a coaching institute or school.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="p-0 h-auto text-info">
                    Enter Code <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {/* Common - Analytics */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate('/analytics')}>
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center mb-2 group-hover:bg-info/20 transition-colors">
                <BarChart3 className="h-6 w-6 text-info" />
              </div>
              <CardTitle>Analytics</CardTitle>
              <CardDescription>
                {isStudent 
                  ? 'Track your progress, identify strengths and weaknesses.'
                  : 'View comprehensive exam and student analytics.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="p-0 h-auto text-info">
                View Analytics <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
