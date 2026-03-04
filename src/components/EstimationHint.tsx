import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface EstimationHintProps {
  suggestion: number;
  confidence: 'high' | 'medium' | 'low' | 'none';
  onApply: () => void;
  similarTasksCount: number;
  reasoning?: string;
  className?: string;
}

/**
 * Component that displays intelligent time estimation hints
 * Shows as: "💡 X suggested [Apply]" with explanatory tooltip
 */
export function EstimationHint({ 
  suggestion, 
  confidence, 
  onApply,
  similarTasksCount,
  reasoning,
  className = ""
}: EstimationHintProps) {
  const confidenceColors = {
    high: 'text-green-600 dark:text-green-400',
    medium: 'text-yellow-600 dark:text-yellow-400',
    low: 'text-gray-600 dark:text-gray-400',
    none: 'text-gray-500 dark:text-gray-500'
  };

  const confidenceLabels = {
    high: 'High confidence',
    medium: 'Medium confidence', 
    low: 'Low confidence',
    none: 'Insufficient data'
  };

  const tooltipContent = reasoning || `${confidenceLabels[confidence]} - Based on ${similarTasksCount} similar task${similarTasksCount !== 1 ? 's' : ''} you've completed`;

  if (confidence === 'none') {
    return null; // Don't show hint if no confidence
  }

  return (
    <TooltipProvider>
      <div className={`inline-flex items-center gap-2 text-sm ${className}`}>
        <span className={confidenceColors[confidence]}>
          💡 {suggestion} suggested
        </span>
        
        <Button 
          type="button"
          variant="ghost" 
          size="sm" 
          onClick={onApply}
          className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-950"
        >
          Apply
        </Button>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-gray-400 hover:text-gray-600 cursor-help transition-colors">
              ⓘ
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="text-center">
              <div className="font-medium text-xs mb-1">
                {confidenceLabels[confidence]}
              </div>
              <div className="text-xs text-muted-foreground">
                {tooltipContent}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

export default EstimationHint;