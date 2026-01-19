import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Question {
  id: string;
  question_type: 'single_correct' | 'multiple_correct' | 'numerical';
  correct_answer: string | string[] | number | null;
  marks: number;
  negative_marks: number;
  section_id: string | null;
}

interface Response {
  question_id: string;
  selected_answer: string | string[] | number | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create client with user's auth for verification
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error('Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Authenticated user: ${user.id}`);

    const { sessionId } = await req.json();

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'Session ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role key for database operations (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('exam_sessions')
      .select('*, exams(*)')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is authorized for this session
    // User must be the student who owns the session, or a teacher/admin of the exam's institute
    const isStudent = session.student_id === user.id;
    
    if (!isStudent) {
      // Check if user is a teacher/admin for this exam
      const { data: roles } = await supabaseAuth
        .from('user_roles')
        .select('role, institute_id')
        .eq('user_id', user.id);

      const exam = session.exams;
      const isAuthorized = roles?.some(r => 
        (r.role === 'super_admin') ||
        (r.role === 'institute_admin' && r.institute_id === exam.institute_id) ||
        (r.role === 'teacher' && r.institute_id === exam.institute_id) ||
        (exam.created_by === user.id)
      );

      if (!isAuthorized) {
        console.error(`User ${user.id} not authorized for session ${sessionId}`);
        return new Response(
          JSON.stringify({ error: 'Not authorized to evaluate this exam session' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const exam = session.exams;

    // Get all questions for the exam
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, question_type, correct_answer, marks, negative_marks, section_id')
      .eq('exam_id', exam.id);

    if (questionsError || !questions) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch questions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for answer key (optional override)
    const { data: answerKey } = await supabase
      .from('answer_keys')
      .select('answers')
      .eq('exam_id', exam.id)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get student responses
    const { data: responses, error: responsesError } = await supabase
      .from('responses')
      .select('question_id, selected_answer')
      .eq('session_id', sessionId);

    if (responsesError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch responses' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const responseMap = new Map(responses?.map(r => [r.question_id, r]) || []);
    const answerKeyMap = answerKey?.answers as Record<string, unknown> || {};

    let totalMarks = 0;
    let marksObtained = 0;
    let correct = 0;
    let wrong = 0;
    let attempted = 0;
    let skipped = 0;
    const sectionWiseScores: Record<string, { correct: number; wrong: number; marks: number; total: number }> = {};

    for (const question of questions as Question[]) {
      const questionMarks = Number(question.marks) || 1;
      const negativeMarks = Number(question.negative_marks) || 0;
      totalMarks += questionMarks;

      // Initialize section scores
      const sectionId = question.section_id || 'default';
      if (!sectionWiseScores[sectionId]) {
        sectionWiseScores[sectionId] = { correct: 0, wrong: 0, marks: 0, total: 0 };
      }
      sectionWiseScores[sectionId].total += questionMarks;

      const response = responseMap.get(question.id);
      const studentAnswer = response?.selected_answer;

      // Get correct answer - prioritize answer key over question's correct_answer
      const correctAnswer = answerKeyMap[question.id] ?? question.correct_answer;

      if (!studentAnswer || (Array.isArray(studentAnswer) && studentAnswer.length === 0)) {
        skipped++;
        continue;
      }

      attempted++;

      // Evaluate based on question type
      let isCorrect = false;

      if (question.question_type === 'single_correct') {
        isCorrect = String(studentAnswer) === String(correctAnswer);
      } else if (question.question_type === 'multiple_correct') {
        // For multiple correct, both arrays must match exactly
        const studentArr = Array.isArray(studentAnswer) ? [...studentAnswer].sort() : [studentAnswer];
        const correctArr = Array.isArray(correctAnswer) ? [...correctAnswer].sort() : [correctAnswer];
        isCorrect = studentArr.length === correctArr.length && 
                    studentArr.every((val, idx) => String(val) === String(correctArr[idx]));
      } else if (question.question_type === 'numerical') {
        // For numerical, compare as numbers with small tolerance
        const studentNum = parseFloat(String(studentAnswer));
        const correctNum = parseFloat(String(correctAnswer));
        isCorrect = Math.abs(studentNum - correctNum) < 0.001;
      }

      if (isCorrect) {
        correct++;
        marksObtained += questionMarks;
        sectionWiseScores[sectionId].correct++;
        sectionWiseScores[sectionId].marks += questionMarks;
      } else {
        wrong++;
        if (exam.negative_marking && negativeMarks > 0) {
          marksObtained -= negativeMarks;
        }
        sectionWiseScores[sectionId].wrong++;
        if (exam.negative_marking && negativeMarks > 0) {
          sectionWiseScores[sectionId].marks -= negativeMarks;
        }
      }
    }

    const percentage = totalMarks > 0 ? (marksObtained / totalMarks) * 100 : 0;
    const accuracy = attempted > 0 ? (correct / attempted) * 100 : 0;
    const timeTaken = session.start_time && session.end_time
      ? Math.floor((new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / 1000)
      : 0;

    // Check if result already exists
    const { data: existingResult } = await supabase
      .from('results')
      .select('id')
      .eq('session_id', sessionId)
      .maybeSingle();

    const resultData = {
      session_id: sessionId,
      exam_id: exam.id,
      student_id: session.student_id,
      total_questions: questions.length,
      attempted,
      correct,
      wrong,
      skipped,
      total_marks: totalMarks,
      marks_obtained: marksObtained,
      percentage: Math.round(percentage * 100) / 100,
      accuracy: Math.round(accuracy * 100) / 100,
      time_taken_seconds: timeTaken,
      section_wise_scores: sectionWiseScores,
      evaluated_at: new Date().toISOString(),
      is_published: exam.show_result_immediately || false,
    };

    let result;
    if (existingResult) {
      const { data, error } = await supabase
        .from('results')
        .update(resultData)
        .eq('id', existingResult.id)
        .select()
        .single();
      result = data;
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from('results')
        .insert(resultData)
        .select()
        .single();
      result = data;
      if (error) throw error;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        result,
        summary: {
          totalQuestions: questions.length,
          attempted,
          correct,
          wrong,
          skipped,
          marksObtained,
          totalMarks,
          percentage: Math.round(percentage * 100) / 100,
          accuracy: Math.round(accuracy * 100) / 100,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Evaluation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Evaluation failed';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
