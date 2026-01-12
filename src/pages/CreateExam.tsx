import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PDFUploader } from '@/components/exam/PDFUploader';
import { ExamTypeSelector, ExamType } from '@/components/exam/ExamTypeSelector';
import { QuestionReview, ExtractedSection, ExtractedQuestion } from '@/components/exam/QuestionReview';
import { 
  ArrowLeft, 
  ArrowRight, 
  Wand2, 
  Save, 
  Loader2,
  GraduationCap,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Step = 'type' | 'upload' | 'review' | 'configure';

const steps: { id: Step; title: string; description: string }[] = [
  { id: 'type', title: 'Exam Type', description: 'Select the exam format' },
  { id: 'upload', title: 'Upload PDF', description: 'Upload your question paper' },
  { id: 'review', title: 'Review Questions', description: 'Verify extracted questions' },
  { id: 'configure', title: 'Configure', description: 'Set exam parameters' },
];

const CreateExam = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState<Step>('type');
  const [examType, setExamType] = useState<ExamType | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfText, setPdfText] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedSections, setExtractedSections] = useState<ExtractedSection[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Exam configuration
  const [examConfig, setExamConfig] = useState({
    title: '',
    description: '',
    duration_minutes: 60,
    instructions: '',
    shuffle_questions: false,
    shuffle_options: false,
    show_result_immediately: true,
    negative_marking: true,
    passing_marks: 40,
  });

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const handleExtractQuestions = async () => {
    if (!pdfText) {
      toast({
        title: 'No PDF content',
        description: 'Please upload a PDF file first.',
        variant: 'destructive',
      });
      return;
    }

    setIsExtracting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('extract-questions', {
        body: { pdfContent: pdfText, examType },
      });

      if (error) throw error;
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to extract questions');
      }

      // Transform the extracted data into our format
      const sections: ExtractedSection[] = data.data.sections.map((section: any, sIdx: number) => ({
        name: section.name || `Section ${sIdx + 1}`,
        questions: section.questions.map((q: any, qIdx: number) => ({
          id: `q-${sIdx}-${qIdx}`,
          question_text: q.question_text,
          question_type: q.question_type || 'single_correct',
          options: q.options || [],
          marks: q.marks || 1,
          negative_marks: q.negative_marks || 0.25,
        })),
      }));

      setExtractedSections(sections);
      
      toast({
        title: 'Questions extracted!',
        description: `Found ${data.data.metadata.total_questions} questions in ${sections.length} section(s).`,
      });
      
      setCurrentStep('review');
    } catch (error) {
      console.error('Extraction error:', error);
      toast({
        title: 'Extraction failed',
        description: error instanceof Error ? error.message : 'Failed to extract questions from PDF.',
        variant: 'destructive',
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSaveExam = async () => {
    if (!examConfig.title) {
      toast({
        title: 'Title required',
        description: 'Please enter an exam title.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      // Calculate total marks
      const totalMarks = extractedSections.reduce(
        (acc, section) => acc + section.questions.reduce((qAcc, q) => qAcc + q.marks, 0),
        0
      );

      // Create exam
      const { data: exam, error: examError } = await supabase
        .from('exams')
        .insert({
          title: examConfig.title,
          description: examConfig.description,
          institute_id: profile?.institute_id || null,
          exam_type: examType || 'custom',
          duration_minutes: examConfig.duration_minutes,
          instructions: examConfig.instructions,
          shuffle_questions: examConfig.shuffle_questions,
          shuffle_options: examConfig.shuffle_options,
          show_result_immediately: examConfig.show_result_immediately,
          negative_marking: examConfig.negative_marking,
          passing_marks: examConfig.passing_marks,
          total_marks: totalMarks,
          status: 'draft',
          created_by: profile.id,
        })
        .select()
        .single();

      if (examError) throw examError;

      // Create sections and questions
      for (let sIdx = 0; sIdx < extractedSections.length; sIdx++) {
        const section = extractedSections[sIdx];
        
        const { data: sectionData, error: sectionError } = await supabase
          .from('exam_sections')
          .insert({
            exam_id: exam.id,
            name: section.name,
            order_index: sIdx,
          })
          .select()
          .single();

        if (sectionError) throw sectionError;

        // Insert questions for this section
        const questionsToInsert = section.questions.map((q, qIdx) => ({
          exam_id: exam.id,
          section_id: sectionData.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options,
          marks: q.marks,
          negative_marks: q.negative_marks,
          order_index: qIdx,
        }));

        const { error: questionsError } = await supabase
          .from('questions')
          .insert(questionsToInsert);

        if (questionsError) throw questionsError;
      }

      toast({
        title: 'Exam created!',
        description: `"${examConfig.title}" has been saved as a draft. Set up the answer key next.`,
      });

      navigate(`/exams/${exam.id}/answer-key`);
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Failed to save exam',
        description: error instanceof Error ? error.message : 'An error occurred while saving.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'type':
        return examType !== null;
      case 'upload':
        return pdfFile !== null && pdfText.length > 0;
      case 'review':
        return extractedSections.length > 0 && extractedSections.some(s => s.questions.length > 0);
      case 'configure':
        return examConfig.title.trim().length > 0;
      default:
        return false;
    }
  };

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      if (currentStep === 'upload' && extractedSections.length === 0) {
        handleExtractQuestions();
      } else {
        setCurrentStep(steps[nextIndex].id);
      }
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold">Create Exam</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isActive = step.id === currentStep;
              const isCompleted = index < currentStepIndex;
              
              return (
                <div key={step.id} className="flex-1 flex items-center">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors",
                      isActive && "bg-primary text-primary-foreground",
                      isCompleted && "bg-primary/20 text-primary",
                      !isActive && !isCompleted && "bg-muted text-muted-foreground"
                    )}>
                      {isCompleted ? <Check className="h-5 w-5" /> : index + 1}
                    </div>
                    <div className="hidden md:block">
                      <p className={cn(
                        "text-sm font-medium",
                        isActive && "text-primary",
                        !isActive && "text-muted-foreground"
                      )}>
                        {step.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={cn(
                      "flex-1 h-0.5 mx-4",
                      isCompleted ? "bg-primary" : "bg-muted"
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {currentStep === 'type' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-display font-bold">Select Exam Type</h2>
                <p className="text-muted-foreground mt-1">
                  Choose the exam format to help AI better understand the question structure
                </p>
              </div>
              <ExamTypeSelector selected={examType} onSelect={setExamType} />
            </div>
          )}

          {currentStep === 'upload' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-display font-bold">Upload Question Paper</h2>
                <p className="text-muted-foreground mt-1">
                  Upload your exam PDF and let AI extract all questions automatically
                </p>
              </div>
              
              <PDFUploader
                onFileSelect={setPdfFile}
                onTextExtracted={setPdfText}
                isExtracting={isExtracting}
              />

              {pdfText && !isExtracting && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Wand2 className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Ready to extract questions</p>
                        <p className="text-sm text-muted-foreground">
                          {pdfText.length.toLocaleString()} characters detected
                        </p>
                      </div>
                      <Button onClick={handleExtractQuestions} disabled={isExtracting}>
                        {isExtracting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Extracting...
                          </>
                        ) : (
                          <>
                            <Wand2 className="mr-2 h-4 w-4" />
                            Extract Questions
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {currentStep === 'review' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-display font-bold">Review Extracted Questions</h2>
                <p className="text-muted-foreground mt-1">
                  Verify the extracted questions and make any necessary corrections
                </p>
              </div>
              
              <QuestionReview
                sections={extractedSections}
                onUpdate={setExtractedSections}
              />
            </div>
          )}

          {currentStep === 'configure' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-display font-bold">Configure Exam</h2>
                <p className="text-muted-foreground mt-1">
                  Set the exam title, duration, and other parameters
                </p>
              </div>

              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>Enter the exam title and description</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Exam Title *</label>
                      <Input
                        value={examConfig.title}
                        onChange={(e) => setExamConfig({ ...examConfig, title: e.target.value })}
                        placeholder="e.g., SSC CGL 2024 Mock Test 1"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <Textarea
                        value={examConfig.description}
                        onChange={(e) => setExamConfig({ ...examConfig, description: e.target.value })}
                        placeholder="Brief description of the exam..."
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Instructions</label>
                      <Textarea
                        value={examConfig.instructions}
                        onChange={(e) => setExamConfig({ ...examConfig, instructions: e.target.value })}
                        placeholder="Instructions for candidates..."
                        className="mt-1.5"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Exam Settings</CardTitle>
                    <CardDescription>Configure duration and scoring</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium">Duration (minutes)</label>
                        <Input
                          type="number"
                          value={examConfig.duration_minutes}
                          onChange={(e) => setExamConfig({ ...examConfig, duration_minutes: parseInt(e.target.value) || 60 })}
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Passing Marks (%)</label>
                        <Input
                          type="number"
                          value={examConfig.passing_marks}
                          onChange={(e) => setExamConfig({ ...examConfig, passing_marks: parseInt(e.target.value) || 40 })}
                          className="mt-1.5"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStepIndex === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {currentStep === 'configure' ? (
            <Button onClick={handleSaveExam} disabled={!canProceed() || isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Exam
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={!canProceed() || isExtracting}>
              {isExtracting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
};

export default CreateExam;
