import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Option {
  id: string;
  text: string;
}

interface QuestionDisplayProps {
  questionNumber: number;
  totalQuestions: number;
  questionText: string;
  questionType: 'single_correct' | 'multiple_correct' | 'numerical' | 'true_false';
  options: Option[];
  selectedAnswer: string | string[] | null;
  onAnswerChange: (answer: string | string[]) => void;
  marks?: number;
  negativeMarks?: number;
  sectionName?: string;
}

export const QuestionDisplay = ({
  questionNumber,
  totalQuestions,
  questionText,
  questionType,
  options,
  selectedAnswer,
  onAnswerChange,
  marks = 4,
  negativeMarks = 1,
  sectionName,
}: QuestionDisplayProps) => {
  const handleSingleSelect = (value: string) => {
    onAnswerChange(value);
  };

  const handleMultipleSelect = (optionId: string, checked: boolean) => {
    const currentAnswers = Array.isArray(selectedAnswer) ? selectedAnswer : [];
    if (checked) {
      onAnswerChange([...currentAnswers, optionId]);
    } else {
      onAnswerChange(currentAnswers.filter((id) => id !== optionId));
    }
  };

  return (
    <div className="bg-card rounded-xl border p-6 h-full flex flex-col">
      {/* Question Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold">
            Question {questionNumber} of {totalQuestions}
          </span>
          {sectionName && (
            <Badge variant="outline" className="text-xs">
              {sectionName}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Badge className="bg-success text-success-foreground">+{marks}</Badge>
          {negativeMarks > 0 && (
            <Badge variant="destructive">-{negativeMarks}</Badge>
          )}
        </div>
      </div>

      {/* Question Text */}
      <div className="flex-1 overflow-y-auto">
        <p className="text-lg leading-relaxed mb-8 whitespace-pre-wrap">
          {questionText}
        </p>

        {/* Options */}
        {(questionType === 'single_correct' || questionType === 'true_false') && (
          <RadioGroup
            value={typeof selectedAnswer === 'string' ? selectedAnswer : ''}
            onValueChange={handleSingleSelect}
            className="space-y-3"
          >
            {options.map((option, index) => (
              <div
                key={option.id}
                className={cn(
                  'flex items-start gap-3 p-4 rounded-lg border-2 transition-all cursor-pointer hover:bg-muted/50',
                  selectedAnswer === option.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
                )}
                onClick={() => handleSingleSelect(option.id)}
              >
                <RadioGroupItem value={option.id} id={option.id} className="mt-0.5" />
                <Label
                  htmlFor={option.id}
                  className="flex-1 cursor-pointer text-base leading-relaxed"
                >
                  <span className="font-medium text-muted-foreground mr-2">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  {option.text}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}

        {questionType === 'multiple_correct' && (
          <div className="space-y-3">
            {options.map((option, index) => {
              const isChecked = Array.isArray(selectedAnswer) && selectedAnswer.includes(option.id);
              return (
                <div
                  key={option.id}
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-lg border-2 transition-all cursor-pointer hover:bg-muted/50',
                    isChecked ? 'border-primary bg-primary/5' : 'border-border'
                  )}
                  onClick={() => handleMultipleSelect(option.id, !isChecked)}
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(checked) =>
                      handleMultipleSelect(option.id, checked as boolean)
                    }
                    className="mt-0.5"
                  />
                  <Label className="flex-1 cursor-pointer text-base leading-relaxed">
                    <span className="font-medium text-muted-foreground mr-2">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    {option.text}
                  </Label>
                </div>
              );
            })}
          </div>
        )}

        {questionType === 'numerical' && (
          <div className="max-w-xs">
            <Label htmlFor="numerical-answer" className="text-sm text-muted-foreground mb-2 block">
              Enter your answer:
            </Label>
            <input
              id="numerical-answer"
              type="number"
              step="any"
              value={typeof selectedAnswer === 'string' ? selectedAnswer : ''}
              onChange={(e) => onAnswerChange(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border-2 border-border bg-background text-lg focus:border-primary focus:outline-none transition-colors"
              placeholder="Enter numerical value"
            />
          </div>
        )}
      </div>
    </div>
  );
};
