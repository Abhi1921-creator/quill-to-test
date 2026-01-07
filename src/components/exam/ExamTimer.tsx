import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExamTimerProps {
  formattedTime: string;
  isWarning: boolean;
  isCritical: boolean;
}

export const ExamTimer = ({ formattedTime, isWarning, isCritical }: ExamTimerProps) => {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold transition-all',
        isCritical && 'bg-destructive text-destructive-foreground animate-pulse',
        isWarning && !isCritical && 'bg-warning text-warning-foreground',
        !isWarning && !isCritical && 'bg-primary/10 text-primary'
      )}
    >
      {isCritical ? (
        <AlertTriangle className="h-5 w-5" />
      ) : (
        <Clock className="h-5 w-5" />
      )}
      <span>{formattedTime}</span>
    </div>
  );
};
