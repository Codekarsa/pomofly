import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EstimationHintProps {
  suggestion: number;
  confidence: 'high' | 'medium' | 'low';
  onApply: () => void;
  similarTasksCount: number;
}

const confidenceStyles = {
  high: 'text-green-600 dark:text-green-400',
  medium: 'text-yellow-600 dark:text-yellow-400',
  low: 'text-gray-500 dark:text-gray-400'
};

const confidenceLabels = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Learning from your patterns'
};

export function EstimationHint({ 
  suggestion, 
  confidence, 
  onApply,
  similarTasksCount 
}: EstimationHintProps) {
  return (
    <div className="inline-flex items-center gap-2 text-sm">
      <span className={confidenceStyles[confidence]}>
        💡 {suggestion} suggested
      </span>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onApply}
        className="h-6 px-2 text-xs hover:bg-primary/10"
      >
        Apply
      </Button>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-gray-400 cursor-help text-xs">ⓘ</span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{confidenceLabels[confidence]}</p>
            {similarTasksCount > 0 && (
              <p className="text-xs text-muted-foreground">
                Based on {similarTasksCount} similar task{similarTasksCount > 1 ? 's' : ''}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}