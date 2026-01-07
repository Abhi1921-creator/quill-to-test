import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  ChevronRight, 
  Flag, 
  Save, 
  RotateCcw,
  Send
} from 'lucide-react';

interface ExamActionsProps {
  onPrevious: () => void;
  onNext: () => void;
  onSaveAndNext: () => void;
  onMarkForReview: () => void;
  onClearResponse: () => void;
  onSubmit: () => void;
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
  isMarkedForReview: boolean;
  hasAnswer: boolean;
}

export const ExamActions = ({
  onPrevious,
  onNext,
  onSaveAndNext,
  onMarkForReview,
  onClearResponse,
  onSubmit,
  isFirstQuestion,
  isLastQuestion,
  isMarkedForReview,
  hasAnswer,
}: ExamActionsProps) => {
  return (
    <div className="bg-card rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onPrevious}
            disabled={isFirstQuestion}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={onNext}
            disabled={isLastQuestion}
            className="gap-1"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={onClearResponse}
            disabled={!hasAnswer}
            className="gap-1 text-muted-foreground"
          >
            <RotateCcw className="h-4 w-4" />
            Clear
          </Button>
          <Button
            variant={isMarkedForReview ? 'secondary' : 'outline'}
            onClick={onMarkForReview}
            className="gap-1"
          >
            <Flag className={`h-4 w-4 ${isMarkedForReview ? 'fill-current' : ''}`} />
            {isMarkedForReview ? 'Marked' : 'Mark for Review'}
          </Button>
          <Button
            onClick={onSaveAndNext}
            className="gap-1 bg-success hover:bg-success/90 text-success-foreground"
          >
            <Save className="h-4 w-4" />
            Save & Next
          </Button>
        </div>

        {/* Submit */}
        <Button
          onClick={onSubmit}
          className="gap-1 bg-primary hover:bg-primary/90"
        >
          <Send className="h-4 w-4" />
          Submit Exam
        </Button>
      </div>
    </div>
  );
};
