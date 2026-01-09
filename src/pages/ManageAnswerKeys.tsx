import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, KeyRound, FileText, Check, AlertCircle } from 'lucide-react';

interface ExamWithAnswerKey {
  id: string;
  title: string;
  description: string | null;
  status: string;
  total_marks: number | null;
  question_count: number;
  has_answer_key: boolean;
}

const ManageAnswerKeys = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const [exams, setExams] = useState<ExamWithAnswerKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchExams = async () => {
      if (!profile?.institute_id) return;

      try {
        // Fetch exams created by this user or in their institute
        const { data: examData, error: examError } = await supabase
          .from('exams')
          .select('id, title, description, status, total_marks')
          .eq('institute_id', profile.institute_id)
          .order('created_at', { ascending: false });

        if (examError) throw examError;

        // Fetch question counts and answer key status for each exam
        const examsWithDetails = await Promise.all(
          (examData || []).map(async (exam) => {
            // Get question count
            const { count: questionCount } = await supabase
              .from('questions')
              .select('*', { count: 'exact', head: true })
              .eq('exam_id', exam.id);

            // Check if answer key exists
            const { data: answerKey } = await supabase
              .from('answer_keys')
              .select('id')
              .eq('exam_id', exam.id)
              .maybeSingle();

            // Check if questions have correct answers set
            const { data: questionsWithAnswers } = await supabase
              .from('questions')
              .select('correct_answer')
              .eq('exam_id', exam.id)
              .not('correct_answer', 'is', null);

            const hasAnswerKey = !!answerKey || (questionsWithAnswers?.length ?? 0) > 0;

            return {
              ...exam,
              question_count: questionCount || 0,
              has_answer_key: hasAnswerKey,
            };
          })
        );

        setExams(examsWithDetails);
      } catch (error) {
        console.error('Error fetching exams:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (profile) {
      fetchExams();
    }
  }, [profile]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card sticky top-0 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center">
            <Skeleton className="h-10 w-48" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
              <KeyRound className="h-4 w-4 text-success" />
            </div>
            <span className="font-display font-bold">Manage Answer Keys</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-display font-bold">Select an Exam</h1>
          <p className="text-muted-foreground">
            Choose an exam to set or update its answer key for automatic evaluation.
          </p>
        </div>

        {exams.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Exams Found</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create an exam first to manage its answer key.
              </p>
              <Button onClick={() => navigate('/exams/create')}>
                Create Exam
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {exams.map((exam) => (
              <Card
                key={exam.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/exams/${exam.id}/answer-key`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{exam.title}</CardTitle>
                      {exam.description && (
                        <CardDescription className="mt-1">
                          {exam.description}
                        </CardDescription>
                      )}
                    </div>
                    <Badge variant={exam.status === 'published' ? 'default' : 'secondary'}>
                      {exam.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{exam.question_count} questions</span>
                      <span>{exam.total_marks || 0} marks</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {exam.has_answer_key ? (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                          <Check className="h-3 w-3 mr-1" />
                          Answer Key Set
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          No Answer Key
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ManageAnswerKeys;
