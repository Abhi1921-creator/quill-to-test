import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Calendar, FileText, Play, CheckCircle } from "lucide-react";
import { format, isAfter, isBefore, parseISO } from "date-fns";

interface Exam {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  total_marks: number | null;
  starts_at: string | null;
  ends_at: string | null;
  max_attempts: number | null;
  institute_id: string;
}

interface ExamSession {
  exam_id: string;
  status: string;
}

export default function AvailableExams() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchExams();
      fetchUserSessions();
    }
  }, [user]);

  const fetchExams = async () => {
    const { data, error } = await supabase
      .from("exams")
      .select("id, title, description, duration_minutes, total_marks, starts_at, ends_at, max_attempts, institute_id")
      .eq("status", "published")
      .order("starts_at", { ascending: true });

    if (!error && data) {
      setExams(data);
    }
    setLoading(false);
  };

  const fetchUserSessions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("exam_sessions")
      .select("exam_id, status")
      .eq("student_id", user.id);

    if (data) {
      setSessions(data);
    }
  };

  const getExamStatus = (exam: Exam) => {
    const now = new Date();
    const startsAt = exam.starts_at ? parseISO(exam.starts_at) : null;
    const endsAt = exam.ends_at ? parseISO(exam.ends_at) : null;

    if (startsAt && isBefore(now, startsAt)) {
      return { label: "Upcoming", variant: "secondary" as const, canStart: false };
    }
    if (endsAt && isAfter(now, endsAt)) {
      return { label: "Ended", variant: "outline" as const, canStart: false };
    }
    return { label: "Live", variant: "default" as const, canStart: true };
  };

  const getUserExamStatus = (examId: string) => {
    const session = sessions.find((s) => s.exam_id === examId);
    if (!session) return null;
    return session.status;
  };

  const handleStartExam = (examId: string) => {
    navigate(`/exams/${examId}/take`);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Available Exams</h1>
            <p className="text-muted-foreground text-sm">Browse and start your exams</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {exams.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Exams Available</h3>
              <p className="text-muted-foreground mt-1">
                There are no published exams at the moment. Check back later.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {exams.map((exam) => {
              const status = getExamStatus(exam);
              const userStatus = getUserExamStatus(exam.id);
              const isCompleted = userStatus === "submitted";
              const isInProgress = userStatus === "in_progress";

              return (
                <Card key={exam.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <CardTitle className="text-xl">{exam.title}</CardTitle>
                        {exam.description && (
                          <CardDescription className="line-clamp-2">
                            {exam.description}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Badge variant={status.variant}>{status.label}</Badge>
                        {isCompleted && (
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        )}
                        {isInProgress && (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                            In Progress
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        <span>{exam.duration_minutes} minutes</span>
                      </div>
                      {exam.total_marks && (
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-4 w-4" />
                          <span>{exam.total_marks} marks</span>
                        </div>
                      )}
                      {exam.starts_at && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          <span>Starts: {format(parseISO(exam.starts_at), "MMM d, yyyy h:mm a")}</span>
                        </div>
                      )}
                      {exam.ends_at && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          <span>Ends: {format(parseISO(exam.ends_at), "MMM d, yyyy h:mm a")}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {exam.max_attempts && exam.max_attempts > 1
                          ? `${exam.max_attempts} attempts allowed`
                          : "Single attempt"}
                      </span>
                      <Button
                        onClick={() => handleStartExam(exam.id)}
                        disabled={!status.canStart || isCompleted}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        {isInProgress ? "Resume Exam" : isCompleted ? "Completed" : "Start Exam"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
