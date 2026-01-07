import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ChevronDown, 
  ChevronUp, 
  Edit2, 
  Trash2, 
  Check, 
  X,
  GripVertical 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ExtractedQuestion {
  id: string;
  question_text: string;
  question_type: 'single_correct' | 'multiple_correct' | 'true_false' | 'numeric';
  options: string[];
  marks: number;
  negative_marks: number;
  section?: string;
}

export interface ExtractedSection {
  name: string;
  questions: ExtractedQuestion[];
}

interface QuestionReviewProps {
  sections: ExtractedSection[];
  onUpdate: (sections: ExtractedSection[]) => void;
}

const QuestionCard = ({ 
  question, 
  index,
  onUpdate,
  onDelete 
}: { 
  question: ExtractedQuestion;
  index: number;
  onUpdate: (updated: ExtractedQuestion) => void;
  onDelete: () => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedQuestion, setEditedQuestion] = useState(question);

  const handleSave = () => {
    onUpdate(editedQuestion);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedQuestion(question);
    setIsEditing(false);
  };

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'single_correct': return 'Single Correct';
      case 'multiple_correct': return 'Multiple Correct';
      case 'true_false': return 'True/False';
      case 'numeric': return 'Numeric';
      default: return type;
    }
  };

  const getQuestionTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'single_correct': return 'default';
      case 'multiple_correct': return 'secondary';
      case 'true_false': return 'outline';
      case 'numeric': return 'destructive';
      default: return 'default';
    }
  };

  return (
    <Card className={cn(
      "transition-all",
      isEditing && "ring-2 ring-primary"
    )}>
      <CardHeader className="py-3 px-4">
        <div className="flex items-start gap-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <GripVertical className="h-4 w-4 cursor-grab" />
            <span className="font-mono text-sm font-medium">Q{index + 1}</span>
          </div>
          
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <Textarea
                value={editedQuestion.question_text}
                onChange={(e) => setEditedQuestion({ ...editedQuestion, question_text: e.target.value })}
                className="min-h-[60px]"
              />
            ) : (
              <p className={cn(
                "text-sm",
                !isExpanded && "line-clamp-2"
              )}>
                {question.question_text}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={getQuestionTypeBadgeVariant(question.question_type) as any}>
              {getQuestionTypeLabel(question.question_type)}
            </Badge>
            
            {isEditing ? (
              <>
                <Button size="icon" variant="ghost" onClick={handleSave}>
                  <Check className="h-4 w-4 text-green-500" />
                </Button>
                <Button size="icon" variant="ghost" onClick={handleCancel}>
                  <X className="h-4 w-4 text-destructive" />
                </Button>
              </>
            ) : (
              <>
                <Button size="icon" variant="ghost" onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={onDelete}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setIsExpanded(!isExpanded)}>
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      {(isExpanded || isEditing) && (
        <CardContent className="pt-0 pb-4 px-4">
          <div className="ml-10 space-y-4">
            {/* Options */}
            {question.options.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Options</p>
                <div className="space-y-2">
                  {(isEditing ? editedQuestion.options : question.options).map((option, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      {isEditing ? (
                        <Input
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...editedQuestion.options];
                            newOptions[optIdx] = e.target.value;
                            setEditedQuestion({ ...editedQuestion, options: newOptions });
                          }}
                          className="flex-1"
                        />
                      ) : (
                        <span className="text-sm">{option}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Marks and Type */}
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Marks:</span>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editedQuestion.marks}
                    onChange={(e) => setEditedQuestion({ ...editedQuestion, marks: parseFloat(e.target.value) || 0 })}
                    className="w-16 h-8"
                  />
                ) : (
                  <Badge variant="outline">{question.marks}</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Negative:</span>
                {isEditing ? (
                  <Input
                    type="number"
                    step="0.25"
                    value={editedQuestion.negative_marks}
                    onChange={(e) => setEditedQuestion({ ...editedQuestion, negative_marks: parseFloat(e.target.value) || 0 })}
                    className="w-16 h-8"
                  />
                ) : (
                  <Badge variant="outline" className="text-destructive">{question.negative_marks}</Badge>
                )}
              </div>
              {isEditing && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Type:</span>
                  <Select
                    value={editedQuestion.question_type}
                    onValueChange={(value: any) => setEditedQuestion({ ...editedQuestion, question_type: value })}
                  >
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single_correct">Single Correct</SelectItem>
                      <SelectItem value="multiple_correct">Multiple Correct</SelectItem>
                      <SelectItem value="true_false">True/False</SelectItem>
                      <SelectItem value="numeric">Numeric</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export const QuestionReview = ({ sections, onUpdate }: QuestionReviewProps) => {
  const [expandedSections, setExpandedSections] = useState<string[]>(
    sections.map((_, i) => `section-${i}`)
  );

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleUpdateQuestion = (sectionIndex: number, questionIndex: number, updated: ExtractedQuestion) => {
    const newSections = [...sections];
    newSections[sectionIndex].questions[questionIndex] = updated;
    onUpdate(newSections);
  };

  const handleDeleteQuestion = (sectionIndex: number, questionIndex: number) => {
    const newSections = [...sections];
    newSections[sectionIndex].questions.splice(questionIndex, 1);
    onUpdate(newSections);
  };

  const totalQuestions = sections.reduce((acc, s) => acc + s.questions.length, 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Extracted Questions</h3>
          <p className="text-sm text-muted-foreground">
            {totalQuestions} questions in {sections.length} section{sections.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section, sectionIdx) => {
          const sectionId = `section-${sectionIdx}`;
          const isExpanded = expandedSections.includes(sectionId);

          return (
            <Card key={sectionId}>
              <CardHeader 
                className="py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleSection(sectionId)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base">
                      {section.name || `Section ${sectionIdx + 1}`}
                    </CardTitle>
                    <Badge variant="secondary">
                      {section.questions.length} questions
                    </Badge>
                  </div>
                  {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </CardHeader>
              
              {isExpanded && (
                <CardContent className="pt-0 pb-4">
                  <div className="space-y-3">
                    {section.questions.map((question, qIdx) => (
                      <QuestionCard
                        key={question.id}
                        question={question}
                        index={qIdx}
                        onUpdate={(updated) => handleUpdateQuestion(sectionIdx, qIdx, updated)}
                        onDelete={() => handleDeleteQuestion(sectionIdx, qIdx)}
                      />
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
