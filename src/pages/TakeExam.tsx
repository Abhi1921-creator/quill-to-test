import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useExamTimer } from '@/hooks/useExamTimer';
import { ExamTimer } from '@/components/exam/ExamTimer';
import { QuestionPalette, type QuestionStatus } from '@/components/exam/QuestionPalette';
import { QuestionDisplay } from '@/components/exam/QuestionDisplay';
import { ExamActions } from '@/components/exam/ExamActions';
import { SubmitDialog } from '@/components/exam/SubmitDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { GraduationCap, User } from 'lucide-react';
import type { Json } from '@/integrations/supabase/types';

interface ExamData {
  id: string;
  title: string;
  duration_minutes: number;
  instructions: string | null;
  negative_marking: boolean | null;
  negative_marks_per_question: number | null;
}

interface Section {
  id: string;
  name: string;
  order_index: number;
}

interface Question {
  id: string;
  question_text: string;
  question_type: 'single_correct' | 'multiple_correct' | 'numerical' | 'true_false';
  options: { id: string; text: string }[];
  marks: number | null;
  negative_marks: number | null;
  section_id: string | null;
  order_index: number;
}

interface Response {
  questionId: string;
  selectedAnswer: string | string[] | null;
  isMarkedForReview: boolean;
  isVisited: boolean;
  timeSpent: number;
}

const TakeExam = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [exam, setExam] = useState<ExamData | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Map<string, Response>>(new Map());
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentSectionId, setCurrentSectionId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAutoSave = useCallback(async () => {
    if (!sessionId || responses.size === 0) return;

    try {
      const responsesArray = Array.from(responses.values());
      const upsertData = responsesArray.map((r) => ({
        session_id: sessionId,
        question_id: r.questionId,
        selected_answer: r.selectedAnswer as Json,
        is_marked_for_review: r.isMarkedForReview,
        is_visited: r.isVisited,
        time_spent_seconds: r.timeSpent,
        answered_at: r.selectedAnswer ? new Date().toISOString() : null,
      }));

      await supabase.from('responses').upsert(upsertData, {
        onConflict: 'session_id,question_id',
      });

      // Update session
      await supabase
        .from('exam_sessions')
        .update({
          current_question_index: currentQuestionIndex,
          time_remaining_seconds: timeRemaining,
        })
        .eq('id', sessionId);
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, [sessionId, responses, currentQuestionIndex]);

  const handleTimeUp = useCallback(async () => {
    toast({
      title: 'Time\'s Up!',
      description: 'Your exam has been automatically submitted.',
      variant: 'destructive',
    });
    await handleSubmitExam();
  }, []);

  const { formattedTime, isWarning, isCritical, timeRemaining } = useExamTimer({
    initialSeconds: (exam?.duration_minutes || 180) * 60,
    onTimeUp: handleTimeUp,
    autoSaveInterval: 30,
    onAutoSave: handleAutoSave,
  });

  // Fetch exam data
  useEffect(() => {
    const fetchExamData = async () => {
      if (!examId || !user) return;

      try {
        // Fetch exam
        const { data: examData, error: examError } = await supabase
          .from('exams')
          .select('id, title, duration_minutes, instructions, negative_marking, negative_marks_per_question')
          .eq('id', examId)
          .single();

        if (examError) throw examError;
        setExam(examData);

        // Fetch sections
        const { data: sectionsData } = await supabase
          .from('exam_sections')
          .select('id, name, order_index')
          .eq('exam_id', examId)
          .order('order_index');

        setSections(sectionsData || []);
        if (sectionsData && sectionsData.length > 0) {
          setCurrentSectionId(sectionsData[0].id);
        }

        // Fetch questions
        const { data: questionsData, error: questionsError } = await supabase
          .from('questions')
          .select('id, question_text, question_type, options, marks, negative_marks, section_id, order_index')
          .eq('exam_id', examId)
          .order('order_index');

        if (questionsError) throw questionsError;

        const parsedQuestions = (questionsData || []).map((q) => ({
          ...q,
          question_type: q.question_type as Question['question_type'],
          options: (q.options as { id: string; text: string }[]) || [],
        }));

        setQuestions(parsedQuestions);

        // Initialize responses
        const initialResponses = new Map<string, Response>();
        parsedQuestions.forEach((q) => {
          initialResponses.set(q.id, {
            questionId: q.id,
            selectedAnswer: null,
            isMarkedForReview: false,
            isVisited: false,
            timeSpent: 0,
          });
        });
        setResponses(initialResponses);

        // Create or resume session
        const { data: existingSession } = await supabase
          .from('exam_sessions')
          .select('id, current_question_index, time_remaining_seconds')
          .eq('exam_id', examId)
          .eq('student_id', user.id)
          .eq('status', 'in_progress')
          .single();

        if (existingSession) {
          setSessionId(existingSession.id);
          setCurrentQuestionIndex(existingSession.current_question_index || 0);

          // Load existing responses
          const { data: existingResponses } = await supabase
            .from('responses')
            .select('*')
            .eq('session_id', existingSession.id);

          if (existingResponses) {
            existingResponses.forEach((r) => {
              initialResponses.set(r.question_id, {
                questionId: r.question_id,
                selectedAnswer: r.selected_answer as string | string[] | null,
                isMarkedForReview: r.is_marked_for_review || false,
                isVisited: r.is_visited || false,
                timeSpent: r.time_spent_seconds || 0,
              });
            });
            setResponses(new Map(initialResponses));
          }
        } else {
          // Create new session
          const { data: newSession, error: sessionError } = await supabase
            .from('exam_sessions')
            .insert({
              exam_id: examId,
              student_id: user.id,
              status: 'in_progress',
              ip_address: '',
              user_agent: navigator.userAgent,
            })
            .select('id')
            .single();

          if (sessionError) throw sessionError;
          setSessionId(newSession.id);
        }

        // Mark first question as visited
        if (parsedQuestions.length > 0) {
          const firstQuestion = initialResponses.get(parsedQuestions[0].id);
          if (firstQuestion) {
            firstQuestion.isVisited = true;
            setResponses(new Map(initialResponses));
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching exam:', error);
        toast({
          title: 'Error',
          description: 'Failed to load exam. Please try again.',
          variant: 'destructive',
        });
        navigate('/dashboard');
      }
    };

    fetchExamData();
  }, [examId, user, navigate, toast]);

  const currentQuestion = questions[currentQuestionIndex];
  const currentResponse = currentQuestion ? responses.get(currentQuestion.id) : null;

  const handleAnswerChange = (answer: string | string[]) => {
    if (!currentQuestion) return;

    setResponses((prev) => {
      const newResponses = new Map(prev);
      const response = newResponses.get(currentQuestion.id);
      if (response) {
        response.selectedAnswer = answer;
        response.isVisited = true;
      }
      return newResponses;
    });
  };

  const handleQuestionClick = (index: number) => {
    setCurrentQuestionIndex(index);
    const question = questions[index];
    if (question) {
      setResponses((prev) => {
        const newResponses = new Map(prev);
        const response = newResponses.get(question.id);
        if (response) {
          response.isVisited = true;
        }
        return newResponses;
      });
    }
  };

  const handleSaveAndNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      handleQuestionClick(currentQuestionIndex + 1);
    }
  };

  const handleMarkForReview = () => {
    if (!currentQuestion) return;

    setResponses((prev) => {
      const newResponses = new Map(prev);
      const response = newResponses.get(currentQuestion.id);
      if (response) {
        response.isMarkedForReview = !response.isMarkedForReview;
      }
      return newResponses;
    });
  };

  const handleClearResponse = () => {
    if (!currentQuestion) return;

    setResponses((prev) => {
      const newResponses = new Map(prev);
      const response = newResponses.get(currentQuestion.id);
      if (response) {
        response.selectedAnswer = null;
      }
      return newResponses;
    });
  };

  const handleSubmitExam = async () => {
    if (!sessionId || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Save all responses
      await handleAutoSave();

      // Update session status
      await supabase
        .from('exam_sessions')
        .update({
          status: 'submitted',
          end_time: new Date().toISOString(),
        })
        .eq('id', sessionId);

      toast({
        title: 'Exam Submitted',
        description: 'Your exam has been submitted successfully.',
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Error submitting exam:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit exam. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
      setShowSubmitDialog(false);
    }
  };

  const getQuestionStatus = (questionId: string): QuestionStatus => {
    const response = responses.get(questionId);
    if (!response) return 'not-visited';

    if (!response.isVisited) return 'not-visited';
    if (response.isMarkedForReview && response.selectedAnswer) return 'marked-answered';
    if (response.isMarkedForReview) return 'marked';
    if (response.selectedAnswer) return 'answered';
    return 'visited';
  };

  const getStats = () => {
    let answered = 0;
    let notAnswered = 0;
    let markedForReview = 0;
    let notVisited = 0;

    responses.forEach((response) => {
      if (!response.isVisited) {
        notVisited++;
      } else if (response.selectedAnswer) {
        answered++;
        if (response.isMarkedForReview) markedForReview++;
      } else {
        notAnswered++;
        if (response.isMarkedForReview) markedForReview++;
      }
    });

    return {
      total: questions.length,
      answered,
      notAnswered,
      markedForReview,
      notVisited,
    };
  };

  const paletteQuestions = questions.map((q) => ({
    id: q.id,
    status: getQuestionStatus(q.id),
    sectionId: q.section_id || undefined,
  }));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Skeleton className="h-16 w-full mb-4" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3">
            <Skeleton className="h-[500px] w-full" />
          </div>
          <Skeleton className="h-[500px] w-full" />
        </div>
      </div>
    );
  }

  if (!exam || !currentQuestion) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">No questions found for this exam.</p>
      </div>
    );
  }

  const currentSectionName = sections.find((s) => s.id === currentQuestion.section_id)?.name;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold truncate max-w-md">{exam.title}</h1>
              <p className="text-xs text-muted-foreground">
                {questions.length} Questions • {exam.duration_minutes} Minutes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ExamTimer
              formattedTime={formattedTime}
              isWarning={isWarning}
              isCritical={isCritical}
            />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="hidden md:inline">{profile?.full_name || 'Candidate'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
          {/* Question Display */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <div className="flex-1">
              <QuestionDisplay
                questionNumber={currentQuestionIndex + 1}
                totalQuestions={questions.length}
                questionText={currentQuestion.question_text}
                questionType={currentQuestion.question_type}
                options={currentQuestion.options}
                selectedAnswer={currentResponse?.selectedAnswer || null}
                onAnswerChange={handleAnswerChange}
                marks={currentQuestion.marks || 4}
                negativeMarks={currentQuestion.negative_marks || (exam.negative_marking ? (exam.negative_marks_per_question || 1) : 0)}
                sectionName={currentSectionName}
              />
            </div>

            {/* Actions */}
            <ExamActions
              onPrevious={() => handleQuestionClick(currentQuestionIndex - 1)}
              onNext={() => handleQuestionClick(currentQuestionIndex + 1)}
              onSaveAndNext={handleSaveAndNext}
              onMarkForReview={handleMarkForReview}
              onClearResponse={handleClearResponse}
              onSubmit={() => setShowSubmitDialog(true)}
              isFirstQuestion={currentQuestionIndex === 0}
              isLastQuestion={currentQuestionIndex === questions.length - 1}
              isMarkedForReview={currentResponse?.isMarkedForReview || false}
              hasAnswer={!!currentResponse?.selectedAnswer}
            />
          </div>

          {/* Question Palette */}
          <div className="hidden lg:block">
            <QuestionPalette
              questions={paletteQuestions}
              sections={sections}
              currentQuestionIndex={currentQuestionIndex}
              currentSectionId={currentSectionId}
              onQuestionClick={handleQuestionClick}
              onSectionChange={setCurrentSectionId}
            />
          </div>
        </div>
      </main>

      {/* Submit Dialog */}
      <SubmitDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        onConfirm={handleSubmitExam}
        stats={getStats()}
        timeRemaining={formattedTime}
      />
    </div>
  );
};

export default TakeExam;
