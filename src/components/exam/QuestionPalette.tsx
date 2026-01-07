import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export type QuestionStatus = 'not-visited' | 'visited' | 'answered' | 'marked' | 'marked-answered';

interface Question {
  id: string;
  status: QuestionStatus;
  sectionId?: string;
}

interface Section {
  id: string;
  name: string;
}

interface QuestionPaletteProps {
  questions: Question[];
  sections?: Section[];
  currentQuestionIndex: number;
  currentSectionId?: string;
  onQuestionClick: (index: number) => void;
  onSectionChange?: (sectionId: string) => void;
}

const statusColors: Record<QuestionStatus, string> = {
  'not-visited': 'bg-[hsl(var(--state-not-visited))] text-white hover:opacity-80',
  'visited': 'bg-[hsl(var(--state-visited))] text-white hover:opacity-80',
  'answered': 'bg-[hsl(var(--state-answered))] text-white hover:opacity-80',
  'marked': 'bg-[hsl(var(--state-marked))] text-white hover:opacity-80',
  'marked-answered': 'bg-[hsl(var(--state-marked))] text-white ring-2 ring-[hsl(var(--state-answered))] hover:opacity-80',
};

export const QuestionPalette = ({
  questions,
  sections,
  currentQuestionIndex,
  currentSectionId,
  onQuestionClick,
  onSectionChange,
}: QuestionPaletteProps) => {
  const filteredQuestions = currentSectionId
    ? questions.filter((q) => q.sectionId === currentSectionId)
    : questions;

  const getQuestionIndex = (question: Question) => {
    return questions.findIndex((q) => q.id === question.id);
  };

  const statusCounts = {
    'not-visited': questions.filter((q) => q.status === 'not-visited').length,
    'visited': questions.filter((q) => q.status === 'visited').length,
    'answered': questions.filter((q) => q.status === 'answered').length,
    'marked': questions.filter((q) => q.status === 'marked').length,
    'marked-answered': questions.filter((q) => q.status === 'marked-answered').length,
  };

  return (
    <div className="bg-card rounded-xl border p-4 h-full flex flex-col">
      <h3 className="font-semibold mb-3">Question Palette</h3>

      {/* Section Tabs */}
      {sections && sections.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4 pb-3 border-b">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => onSectionChange?.(section.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                currentSectionId === section.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              )}
            >
              {section.name}
            </button>
          ))}
        </div>
      )}

      {/* Question Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-5 gap-2">
          {filteredQuestions.map((question, displayIndex) => {
            const actualIndex = getQuestionIndex(question);
            return (
              <button
                key={question.id}
                onClick={() => onQuestionClick(actualIndex)}
                className={cn(
                  'w-10 h-10 rounded-lg font-medium text-sm transition-all',
                  statusColors[question.status],
                  actualIndex === currentQuestionIndex && 'ring-2 ring-foreground ring-offset-2 ring-offset-background'
                )}
              >
                {displayIndex + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground mb-2">Legend</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[hsl(var(--state-not-visited))]" />
            <span>Not Visited ({statusCounts['not-visited']})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[hsl(var(--state-visited))]" />
            <span>Not Answered ({statusCounts['visited']})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[hsl(var(--state-answered))]" />
            <span>Answered ({statusCounts['answered']})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[hsl(var(--state-marked))]" />
            <span>Marked ({statusCounts['marked'] + statusCounts['marked-answered']})</span>
          </div>
        </div>
      </div>
    </div>
  );
};
