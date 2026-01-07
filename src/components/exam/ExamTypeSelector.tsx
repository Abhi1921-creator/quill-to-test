import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Building2, 
  Landmark, 
  Cpu, 
  Stethoscope, 
  ScrollText, 
  Settings2 
} from 'lucide-react';

const examTypes = [
  {
    id: 'ssc',
    name: 'SSC',
    description: 'Staff Selection Commission exams',
    icon: Building2,
    sections: ['Quantitative Aptitude', 'Reasoning', 'English', 'General Awareness'],
  },
  {
    id: 'banking',
    name: 'Banking',
    description: 'IBPS, SBI, RBI exams',
    icon: Landmark,
    sections: ['Quantitative Aptitude', 'Reasoning', 'English', 'General Awareness', 'Computer'],
  },
  {
    id: 'engineering',
    name: 'Engineering',
    description: 'JEE, GATE, ESE exams',
    icon: Cpu,
    sections: ['Physics', 'Chemistry', 'Mathematics', 'Technical'],
  },
  {
    id: 'medical',
    name: 'Medical',
    description: 'NEET, AIIMS exams',
    icon: Stethoscope,
    sections: ['Physics', 'Chemistry', 'Biology'],
  },
  {
    id: 'upsc',
    name: 'UPSC',
    description: 'Civil Services exams',
    icon: ScrollText,
    sections: ['General Studies', 'CSAT', 'Optional'],
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Create your own format',
    icon: Settings2,
    sections: [],
  },
] as const;

export type ExamType = typeof examTypes[number]['id'];

interface ExamTypeSelectorProps {
  selected: ExamType | null;
  onSelect: (type: ExamType) => void;
}

export const ExamTypeSelector = ({ selected, onSelect }: ExamTypeSelectorProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {examTypes.map((type) => {
        const Icon = type.icon;
        const isSelected = selected === type.id;
        
        return (
          <Card
            key={type.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              isSelected 
                ? "border-primary ring-2 ring-primary/20 bg-primary/5" 
                : "hover:border-primary/50"
            )}
            onClick={() => onSelect(type.id)}
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">{type.name}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {type.description}
                  </p>
                  {type.sections.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {type.sections.slice(0, 3).map((section) => (
                        <Badge 
                          key={section} 
                          variant="secondary" 
                          className="text-xs"
                        >
                          {section}
                        </Badge>
                      ))}
                      {type.sections.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{type.sections.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
