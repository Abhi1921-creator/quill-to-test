import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Trophy, Target, Clock, CheckCircle, XCircle, MinusCircle } from 'lucide-react';

interface Result {
  id: string;
  total_questions: number;
  attempted: number;
  correct: number;
  wrong: number;
  skipped: number;
  total_marks: number;
  marks_obtained: number;
  percentage: number;
  accuracy: number;
  time_taken_seconds: number;
  rank: number | null;
  percentile: number | null;
  section_wise_scores: Record<string, { correct: number; wrong: number; marks: number; total: number }>;
  evaluated_at: string;
}

interface Exam {
  id: string;
  title: string;
  duration_minutes: number;
  passing_marks: number | null;
}

export default function ExamResults() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [result, setResult] = useState<Result | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      fetchResult();
    }
  }, [sessionId]);

  const fetchResult = async () => {
    try {
      const { data: resultData, error: resultError } = await supabase
        .from('results')
        .select('*, exams(id, title, duration_minutes, passing_marks)')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (resultError) throw resultError;

      if (!resultData) {
        toast({
          title: 'Result Not Found',
          description: 'The result for this exam session is not available yet.',
          variant: 'destructive',
        });
        navigate('/dashboard');
        return;
      }

      setResult({
        ...resultData,
        section_wise_scores: (resultData.section_wise_scores as Record<string, { correct: number; wrong: number; marks: number; total: number }>) || {},
      });
      setExam(resultData.exams as unknown as Exam);
    } catch (error) {
      console.error('Error fetching result:', error);
      toast({
        title: 'Error',
        description: 'Failed to load result.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const isPassed = exam?.passing_marks ? result && result.marks_obtained >= exam.passing_marks : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  if (!result || !exam) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 mb-4"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold">{exam.title}</h1>
          <p className="text-primary-foreground/80 mt-1">Exam Result</p>
        </div>
      </div>

      {/* Score Summary */}
      <div className="max-w-4xl mx-auto px-6 -mt-6">
        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <div className="flex items-center gap-3 mb-2">
                  <Trophy className="h-8 w-8 text-yellow-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Your Score</p>
                    <p className="text-4xl font-bold">
                      {result.marks_obtained} / {result.total_marks}
                    </p>
                  </div>
                </div>
                {isPassed !== null && (
                  <Badge variant={isPassed ? 'default' : 'destructive'} className="mt-2">
                    {isPassed ? 'PASSED' : 'NOT PASSED'}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">{result.percentage.toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground">Percentage</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{result.accuracy.toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground">Accuracy</p>
                </div>
                {result.rank && (
                  <div>
                    <p className="text-2xl font-bold text-primary">#{result.rank}</p>
                    <p className="text-sm text-muted-foreground">Rank</p>
                  </div>
                )}
                {result.percentile && (
                  <div>
                    <p className="text-2xl font-bold text-primary">{result.percentile.toFixed(1)}</p>
                    <p className="text-sm text-muted-foreground">Percentile</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Correct
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{result.correct}</p>
              <p className="text-sm text-muted-foreground">questions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                Wrong
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">{result.wrong}</p>
              <p className="text-sm text-muted-foreground">questions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MinusCircle className="h-4 w-4 text-muted-foreground" />
                Skipped
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-muted-foreground">{result.skipped}</p>
              <p className="text-sm text-muted-foreground">questions</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Attempt Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Questions Attempted</span>
                <span>{result.attempted} / {result.total_questions}</span>
              </div>
              <Progress value={(result.attempted / result.total_questions) * 100} className="h-2" />
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Time Taken: {formatTime(result.time_taken_seconds)}</span>
              </div>
              <div>
                <span>Exam Duration: {exam.duration_minutes} minutes</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {Object.keys(result.section_wise_scores).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Section-wise Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(result.section_wise_scores).map(([sectionId, scores]) => (
                  <div key={sectionId} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Section</span>
                      <span className="text-sm">
                        {scores.marks} / {scores.total} marks
                      </span>
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span className="text-green-600">✓ {scores.correct} correct</span>
                      <span className="text-red-600">✗ {scores.wrong} wrong</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-center">
          <Button onClick={() => navigate('/dashboard')} size="lg">
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
