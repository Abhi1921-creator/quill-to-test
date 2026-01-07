import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, HelpCircle, Flag } from 'lucide-react';

interface SubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  stats: {
    total: number;
    answered: number;
    notAnswered: number;
    markedForReview: number;
    notVisited: number;
  };
  timeRemaining: string;
}

export const SubmitDialog = ({
  open,
  onOpenChange,
  onConfirm,
  stats,
  timeRemaining,
}: SubmitDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Confirm Submission
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            Are you sure you want to submit your exam? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4 space-y-4">
          {/* Time Remaining */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
            <span className="text-sm font-medium">Time Remaining</span>
            <Badge variant="outline" className="font-mono">
              {timeRemaining}
            </Badge>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10">
              <CheckCircle className="h-4 w-4 text-success" />
              <div>
                <p className="text-sm font-medium">{stats.answered}</p>
                <p className="text-xs text-muted-foreground">Answered</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{stats.notAnswered}</p>
                <p className="text-xs text-muted-foreground">Not Answered</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[hsl(var(--state-marked))]/10">
              <Flag className="h-4 w-4 text-[hsl(var(--state-marked))]" />
              <div>
                <p className="text-sm font-medium">{stats.markedForReview}</p>
                <p className="text-xs text-muted-foreground">Marked for Review</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <div>
                <p className="text-sm font-medium">{stats.notVisited}</p>
                <p className="text-xs text-muted-foreground">Not Visited</p>
              </div>
            </div>
          </div>

          {stats.notVisited > 0 && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              You have {stats.notVisited} question(s) that you haven't visited yet.
            </p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Continue Exam</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-primary hover:bg-primary/90"
          >
            Submit Exam
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
