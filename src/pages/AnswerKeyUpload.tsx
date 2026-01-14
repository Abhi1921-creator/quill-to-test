import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, CheckCircle, AlertCircle, Upload, FileText, Download, Loader2, X, FileUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Question {
  id: string;
  question_text: string;
  question_type: 'single_correct' | 'multiple_correct' | 'true_false' | 'numeric';
  options: { id: string; text: string }[];
  correct_answer: string | string[] | number | null;
  order_index: number;
  section_id: string | null;
}

interface Section {
  id: string;
  name: string;
  order_index: number;
}

export default function AnswerKeyUpload() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [examTitle, setExamTitle] = useState('');
  const [sections, setSections] = useState<Section[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | string[] | number>>({});
  const [existingAnswerKey, setExistingAnswerKey] = useState<{ id: string; version: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [activeTab, setActiveTab] = useState<string>('manual');
  
  // PDF upload state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [extractingPdf, setExtractingPdf] = useState(false);
  const [extractingAnswers, setExtractingAnswers] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (examId) {
      fetchExamData();
    }
  }, [examId]);

  const fetchExamData = async () => {
    try {
      // Fetch exam
      const { data: exam, error: examError } = await supabase
        .from('exams')
        .select('title')
        .eq('id', examId)
        .single();

      if (examError) throw examError;
      setExamTitle(exam.title);

      // Fetch sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('exam_sections')
        .select('id, name, order_index')
        .eq('exam_id', examId)
        .order('order_index');

      if (sectionsError) throw sectionsError;
      setSections(sectionsData || []);

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('id, question_text, question_type, options, correct_answer, order_index, section_id')
        .eq('exam_id', examId)
        .order('order_index');

      if (questionsError) throw questionsError;
      
      const typedQuestions: Question[] = (questionsData || []).map(q => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type as 'single_correct' | 'multiple_correct' | 'true_false' | 'numeric',
        options: Array.isArray(q.options) ? q.options as { id: string; text: string }[] : [],
        correct_answer: q.correct_answer as string | string[] | number | null,
        order_index: q.order_index,
        section_id: q.section_id,
      }));
      setQuestions(typedQuestions);

      // Initialize answers from questions' correct_answer
      const initialAnswers: Record<string, string | string[] | number> = {};
      typedQuestions.forEach((q) => {
        if (q.correct_answer !== null && q.correct_answer !== undefined) {
          initialAnswers[q.id] = q.correct_answer;
        }
      });

      // Check for existing answer key
      const { data: answerKey } = await supabase
        .from('answer_keys')
        .select('id, version, answers')
        .eq('exam_id', examId)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (answerKey) {
        setExistingAnswerKey({ id: answerKey.id, version: answerKey.version || 1 });
        // Merge answer key answers with initial answers
        const keyAnswers = answerKey.answers as Record<string, string | string[] | number>;
        Object.assign(initialAnswers, keyAnswers);
      }

      setAnswers(initialAnswers);
    } catch (error) {
      console.error('Error fetching exam data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load exam data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSingleAnswerChange = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleMultipleAnswerChange = (questionId: string, optionId: string, checked: boolean) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[questionId]) ? [...(prev[questionId] as string[])] : [];
      if (checked) {
        return { ...prev, [questionId]: [...current, optionId] };
      } else {
        return { ...prev, [questionId]: current.filter((id) => id !== optionId) };
      }
    });
  };

  const handleNumericalAnswerChange = (questionId: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setAnswers((prev) => ({ ...prev, [questionId]: numValue }));
    } else if (value === '' || value === '-') {
      setAnswers((prev) => {
        const newAnswers = { ...prev };
        delete newAnswers[questionId];
        return newAnswers;
      });
    }
  };

  const handleSave = async () => {
    if (!examId || !user) return;

    setSaving(true);
    try {
      // Update questions' correct_answer
      for (const question of questions) {
        const answer = answers[question.id];
        if (answer !== undefined) {
          await supabase
            .from('questions')
            .update({ correct_answer: answer })
            .eq('id', question.id);
        }
      }

      // Save/update answer key
      if (existingAnswerKey) {
        await supabase
          .from('answer_keys')
          .update({
            answers,
            version: existingAnswerKey.version + 1,
            uploaded_by: user.id,
          })
          .eq('id', existingAnswerKey.id);
      } else {
        await supabase.from('answer_keys').insert({
          exam_id: examId,
          answers,
          uploaded_by: user.id,
          version: 1,
        });
      }

      toast({
        title: 'Answer Key Saved',
        description: 'The answer key has been saved successfully.',
      });

      navigate(`/exams/${examId}/manage`);
    } catch (error) {
      console.error('Error saving answer key:', error);
      toast({
        title: 'Error',
        description: 'Failed to save answer key.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getAnswerStatus = (questionId: string) => {
    const answer = answers[questionId];
    if (answer === undefined || answer === null) return 'unanswered';
    if (Array.isArray(answer) && answer.length === 0) return 'unanswered';
    return 'answered';
  };

  const getQuestionsBySection = (sectionId: string | null) => {
    return questions.filter((q) => q.section_id === sectionId);
  };

  const answeredCount = questions.filter((q) => getAnswerStatus(q.id) === 'answered').length;

  // Generate template for bulk upload
  const generateTemplate = () => {
    const lines = questions.map((q, idx) => {
      const qNum = idx + 1;
      if (q.question_type === 'single_correct') {
        const optionLabels = q.options.map((_, i) => String.fromCharCode(65 + i)).join('/');
        return `Q${qNum}: ${optionLabels}`;
      } else if (q.question_type === 'multiple_correct') {
        const optionLabels = q.options.map((_, i) => String.fromCharCode(65 + i)).join(',');
        return `Q${qNum}: ${optionLabels} (multiple, e.g., A,C)`;
      } else if (q.question_type === 'numeric') {
        return `Q${qNum}: [numerical value]`;
      } else {
        return `Q${qNum}: [true/false]`;
      }
    });
    setBulkInput(lines.join('\n'));
  };

  // Export current answers as text
  const exportAnswers = () => {
    const lines = questions.map((q, idx) => {
      const qNum = idx + 1;
      const answer = answers[q.id];
      if (!answer) return `Q${qNum}: `;
      
      if (q.question_type === 'single_correct') {
        const optionIndex = q.options.findIndex(opt => opt.id === answer);
        return `Q${qNum}: ${optionIndex >= 0 ? String.fromCharCode(65 + optionIndex) : ''}`;
      } else if (q.question_type === 'multiple_correct' && Array.isArray(answer)) {
        const labels = answer.map(a => {
          const idx = q.options.findIndex(opt => opt.id === a);
          return idx >= 0 ? String.fromCharCode(65 + idx) : '';
        }).filter(Boolean).sort().join(',');
        return `Q${qNum}: ${labels}`;
      } else {
        return `Q${qNum}: ${answer}`;
      }
    });
    setBulkInput(lines.join('\n'));
  };

  // Parse bulk input and apply answers
  const parseBulkInput = () => {
    const lines = bulkInput.split('\n').filter(line => line.trim());
    const newAnswers: Record<string, string | string[] | number> = { ...answers };
    let parsed = 0;
    
    for (const line of lines) {
      // Match patterns like "Q1: A" or "1: A,B,C" or "Q1: 42.5"
      const match = line.match(/^Q?(\d+)\s*[:\.]\s*(.+)$/i);
      if (!match) continue;
      
      const qNum = parseInt(match[1], 10) - 1;
      const answerStr = match[2].trim();
      
      if (qNum < 0 || qNum >= questions.length) continue;
      
      const question = questions[qNum];
      
      if (question.question_type === 'single_correct') {
        // Parse single letter like "A", "B", "C", "D"
        const letterMatch = answerStr.match(/^([A-Da-d])$/);
        if (letterMatch) {
          const optionIndex = letterMatch[1].toUpperCase().charCodeAt(0) - 65;
          if (optionIndex >= 0 && optionIndex < question.options.length) {
            newAnswers[question.id] = question.options[optionIndex].id;
            parsed++;
          }
        }
      } else if (question.question_type === 'multiple_correct') {
        // Parse multiple letters like "A,C" or "A, B, D"
        const letters = answerStr.split(/[,\s]+/).map(s => s.trim().toUpperCase()).filter(s => /^[A-D]$/.test(s));
        const optionIds = letters.map(letter => {
          const idx = letter.charCodeAt(0) - 65;
          return idx >= 0 && idx < question.options.length ? question.options[idx].id : null;
        }).filter(Boolean) as string[];
        if (optionIds.length > 0) {
          newAnswers[question.id] = optionIds;
          parsed++;
        }
      } else if (question.question_type === 'numeric') {
        // Parse numerical value
        const numValue = parseFloat(answerStr);
        if (!isNaN(numValue)) {
          newAnswers[question.id] = numValue;
          parsed++;
        }
      }
    }
    
    setAnswers(newAnswers);
    toast({
      title: 'Answers Imported',
      description: `Successfully parsed ${parsed} answers from bulk input.`,
    });
    setActiveTab('manual');
  };

  // PDF upload handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const extractTextFromPDF = async (pdfFile: File): Promise<string> => {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.mjs',
      import.meta.url
    ).toString();

    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += `\n--- Page ${i} ---\n${pageText}`;
    }
    
    return fullText;
  };

  const handlePdfFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast({
        title: 'Invalid file',
        description: 'Please upload a PDF file.',
        variant: 'destructive',
      });
      return;
    }
    
    setPdfFile(file);
    
    try {
      setExtractingPdf(true);
      const text = await extractTextFromPDF(file);
      
      setExtractingPdf(false);
      setExtractingAnswers(true);
      
      // Call AI to extract answers
      const { data, error } = await supabase.functions.invoke('extract-answers', {
        body: { pdfContent: text, totalQuestions: questions.length },
      });
      
      if (error) throw error;
      
      if (data.success && data.data?.answers) {
        applyExtractedAnswers(data.data.answers);
        toast({
          title: 'Answers Extracted',
          description: `Successfully extracted ${data.data.answers.length} answers from PDF.`,
        });
      } else {
        throw new Error(data.error || 'Failed to extract answers');
      }
    } catch (error) {
      console.error('Error extracting answers:', error);
      toast({
        title: 'Extraction Failed',
        description: error instanceof Error ? error.message : 'Failed to extract answers from PDF.',
        variant: 'destructive',
      });
    } finally {
      setExtractingPdf(false);
      setExtractingAnswers(false);
    }
  };

  const applyExtractedAnswers = (extractedAnswers: { questionNumber: number; answer: string }[]) => {
    const newAnswers: Record<string, string | string[] | number> = { ...answers };
    let applied = 0;
    
    for (const extracted of extractedAnswers) {
      const qIndex = extracted.questionNumber - 1;
      if (qIndex < 0 || qIndex >= questions.length) continue;
      
      const question = questions[qIndex];
      const answerStr = extracted.answer?.toString().trim();
      if (!answerStr) continue;
      
      if (question.question_type === 'single_correct' || question.question_type === 'true_false') {
        // Handle single letter answer
        const letterMatch = answerStr.match(/^([A-Da-d])$/i);
        if (letterMatch) {
          const optionIndex = letterMatch[1].toUpperCase().charCodeAt(0) - 65;
          if (optionIndex >= 0 && optionIndex < question.options.length) {
            newAnswers[question.id] = question.options[optionIndex].id;
            applied++;
          }
        } else if (question.question_type === 'true_false') {
          // Handle True/False
          const lower = answerStr.toLowerCase();
          if (lower === 'true' || lower === 't') {
            const trueOpt = question.options.find(o => o.text.toLowerCase() === 'true');
            if (trueOpt) {
              newAnswers[question.id] = trueOpt.id;
              applied++;
            }
          } else if (lower === 'false' || lower === 'f') {
            const falseOpt = question.options.find(o => o.text.toLowerCase() === 'false');
            if (falseOpt) {
              newAnswers[question.id] = falseOpt.id;
              applied++;
            }
          }
        }
      } else if (question.question_type === 'multiple_correct') {
        // Handle multiple letters like "A,C" or "AC"
        const letters = answerStr.split(/[,\s]*/).map(s => s.trim().toUpperCase()).filter(s => /^[A-D]$/.test(s));
        const optionIds = letters.map(letter => {
          const idx = letter.charCodeAt(0) - 65;
          return idx >= 0 && idx < question.options.length ? question.options[idx].id : null;
        }).filter(Boolean) as string[];
        if (optionIds.length > 0) {
          newAnswers[question.id] = optionIds;
          applied++;
        }
      } else if (question.question_type === 'numeric') {
        // Handle numerical value
        const numValue = parseFloat(answerStr);
        if (!isNaN(numValue)) {
          newAnswers[question.id] = numValue;
          applied++;
        }
      }
    }
    
    setAnswers(newAnswers);
    setActiveTab('manual');
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handlePdfFile(droppedFile);
    }
  }, [questions]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handlePdfFile(selectedFile);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const removePdfFile = () => {
    setPdfFile(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-[600px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Answer Key</h1>
              <p className="text-sm text-muted-foreground">{examTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-sm">
              {answeredCount} / {questions.length} answered
            </Badge>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Answer Key'}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Manual Entry
            </TabsTrigger>
            <TabsTrigger value="pdf" className="flex items-center gap-2">
              <FileUp className="h-4 w-4" />
              PDF Upload
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Bulk Text
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pdf" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileUp className="h-5 w-5" />
                  Upload Answer Key PDF
                </CardTitle>
                <CardDescription>
                  Upload a PDF containing the answer key. AI will automatically extract answers and match them to questions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pdfFile ? (
                  <div className="border-2 border-dashed border-primary/30 bg-primary/5 rounded-lg p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{pdfFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      {(extractingPdf || extractingAnswers) ? (
                        <div className="flex items-center gap-2 text-primary">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span className="text-sm">
                            {extractingPdf ? 'Reading PDF...' : 'Extracting answers...'}
                          </span>
                        </div>
                      ) : (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={removePdfFile}
                          className="shrink-0"
                        >
                          <X className="h-5 w-5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div 
                    className={cn(
                      "border-2 border-dashed rounded-lg p-12 transition-colors cursor-pointer",
                      isDragging 
                        ? "border-primary bg-primary/5" 
                        : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
                    )}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleButtonClick}
                  >
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <FileUp className="h-8 w-8 text-primary" />
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-medium">
                          Drop your answer key PDF here
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          or click to browse files
                        </p>
                      </div>
                      <Button variant="outline" className="mt-2" onClick={(e) => { e.stopPropagation(); handleButtonClick(); }}>
                        Select PDF File
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileInput}
                        className="hidden"
                      />
                    </div>
                  </div>
                )}

                <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2 mt-4">
                  <p className="font-medium">Supported Answer Key Formats:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Grid/table format with Question No. and Answer columns</li>
                    <li>List format like "Q1: A, Q2: B, Q3: C"</li>
                    <li>Answer sheets with numbered answers</li>
                    <li>Supports single correct, multiple correct, and numerical answers</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Bulk Answer Upload
                </CardTitle>
                <CardDescription>
                  Paste or type answers in bulk format. Use A, B, C, D for options. For multiple correct answers, separate with commas (e.g., A,C).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={generateTemplate}>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Template
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportAnswers}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Current Answers
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bulk-input">Answer Key (one per line)</Label>
                  <Textarea
                    id="bulk-input"
                    value={bulkInput}
                    onChange={(e) => setBulkInput(e.target.value)}
                    placeholder={`Q1: A\nQ2: B,C\nQ3: D\nQ4: 42.5\n...`}
                    className="min-h-[300px] font-mono text-sm"
                  />
                </div>

                <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
                  <p className="font-medium">Format Instructions:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li><code className="bg-muted px-1 rounded">Q1: A</code> - Single correct (option A)</li>
                    <li><code className="bg-muted px-1 rounded">Q2: A,C</code> - Multiple correct (options A and C)</li>
                    <li><code className="bg-muted px-1 rounded">Q3: 42.5</code> - Numerical answer</li>
                  </ul>
                </div>

                <Button onClick={parseBulkInput} className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Apply Bulk Answers
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual" className="space-y-6">
            {sections.length > 0 ? (
              sections.map((section) => (
                <Card key={section.id}>
                  <CardHeader>
                    <CardTitle>{section.name}</CardTitle>
                    <CardDescription>
                      {getQuestionsBySection(section.id).length} questions
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {getQuestionsBySection(section.id).map((question, idx) => (
                      <QuestionAnswerInput
                        key={question.id}
                        question={question}
                        questionNumber={idx + 1}
                        answer={answers[question.id]}
                        onSingleChange={handleSingleAnswerChange}
                        onMultipleChange={handleMultipleAnswerChange}
                        onNumericalChange={handleNumericalAnswerChange}
                      />
                    ))}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Questions</CardTitle>
                  <CardDescription>{questions.length} questions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {questions.map((question, idx) => (
                    <QuestionAnswerInput
                      key={question.id}
                      question={question}
                      questionNumber={idx + 1}
                      answer={answers[question.id]}
                      onSingleChange={handleSingleAnswerChange}
                      onMultipleChange={handleMultipleAnswerChange}
                      onNumericalChange={handleNumericalAnswerChange}
                    />
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

interface QuestionAnswerInputProps {
  question: Question;
  questionNumber: number;
  answer: string | string[] | number | undefined;
  onSingleChange: (questionId: string, optionId: string) => void;
  onMultipleChange: (questionId: string, optionId: string, checked: boolean) => void;
  onNumericalChange: (questionId: string, value: string) => void;
}

function QuestionAnswerInput({
  question,
  questionNumber,
  answer,
  onSingleChange,
  onMultipleChange,
  onNumericalChange,
}: QuestionAnswerInputProps) {
  const hasAnswer = answer !== undefined && answer !== null && 
    (!Array.isArray(answer) || answer.length > 0);

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium">Q{questionNumber}.</span>
            <Badge variant="secondary" className="text-xs">
              {question.question_type.replace('_', ' ')}
            </Badge>
            {hasAnswer ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {question.question_text}
          </p>
        </div>
      </div>

      <div className="pt-2">
        {(question.question_type === 'single_correct' || question.question_type === 'true_false') && (
          <RadioGroup
            value={String(answer || '')}
            onValueChange={(value) => onSingleChange(question.id, value)}
            className="grid grid-cols-2 gap-2"
          >
            {question.options.map((option) => (
              <div key={option.id} className="flex items-center space-x-2">
                <RadioGroupItem value={option.id} id={`${question.id}-${option.id}`} />
                <Label htmlFor={`${question.id}-${option.id}`} className="text-sm cursor-pointer">
                  {option.text}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}

        {question.question_type === 'multiple_correct' && (
          <div className="grid grid-cols-2 gap-2">
            {question.options.map((option) => {
              const selectedAnswers = Array.isArray(answer) ? answer : [];
              return (
                <div key={option.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${question.id}-${option.id}`}
                    checked={selectedAnswers.includes(option.id)}
                    onCheckedChange={(checked) =>
                      onMultipleChange(question.id, option.id, checked as boolean)
                    }
                  />
                  <Label htmlFor={`${question.id}-${option.id}`} className="text-sm cursor-pointer">
                    {option.text}
                  </Label>
                </div>
              );
            })}
          </div>
        )}

        {question.question_type === 'numeric' && (
          <div className="max-w-xs">
            <Label htmlFor={`numeric-${question.id}`} className="text-sm mb-1 block">
              Correct Answer
            </Label>
            <Input
              id={`numeric-${question.id}`}
              type="number"
              step="any"
              value={answer !== undefined ? String(answer) : ''}
              onChange={(e) => onNumericalChange(question.id, e.target.value)}
              placeholder="Enter numerical answer"
            />
          </div>
        )}
      </div>
    </div>
  );
}
