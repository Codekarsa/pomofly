'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Star, MessageCircle, Bug, Lightbulb, AlertTriangle } from 'lucide-react';
import { useErrorHandling } from '@/hooks/useErrorHandling';
import { FeedbackData } from '@/lib/errorHandling';

interface FeedbackDialogProps {
  trigger?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialType?: FeedbackData['type'];
  context?: Record<string, any>;
}

const feedbackTypes = [
  { value: 'general' as const, label: 'General Feedback', icon: MessageCircle, color: 'text-blue-600' },
  { value: 'bug' as const, label: 'Bug Report', icon: Bug, color: 'text-red-600' },
  { value: 'feature' as const, label: 'Feature Request', icon: Lightbulb, color: 'text-yellow-600' },
  { value: 'error' as const, label: 'Error Report', icon: AlertTriangle, color: 'text-orange-600' },
];

export function FeedbackDialog({ 
  trigger, 
  isOpen, 
  onOpenChange, 
  initialType = 'general',
  context = {}
}: FeedbackDialogProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackData['type']>(initialType);
  const [rating, setRating] = useState<number>(0);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { collectFeedback } = useErrorHandling();

  const handleOpenChange = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
    } else {
      setOpen(newOpen);
    }

    if (!newOpen) {
      // Reset form when closing
      setType(initialType);
      setRating(0);
      setMessage('');
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) return;

    setIsSubmitting(true);

    try {
      await collectFeedback({
        type,
        rating: rating || undefined,
        message: message.trim(),
        context: {
          ...context,
          component: 'FeedbackDialog',
          timestamp: new Date()
        }
      });

      handleOpenChange(false);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isControlled = isOpen !== undefined && onOpenChange !== undefined;
  const dialogOpen = isControlled ? isOpen : open;

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Your Feedback</DialogTitle>
          <DialogDescription>
            Help us improve Pomofly by sharing your thoughts, reporting issues, or suggesting features.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Feedback Type */}
          <div className="space-y-3">
            <Label>What type of feedback is this?</Label>
            <RadioGroup value={type} onValueChange={(value) => setType(value as FeedbackData['type'])}>
              {feedbackTypes.map(({ value, label, icon: Icon, color }) => (
                <div key={value} className="flex items-center space-x-2">
                  <RadioGroupItem value={value} id={value} />
                  <Label 
                    htmlFor={value} 
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Icon className={`w-4 h-4 ${color}`} />
                    {label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Rating (for general feedback) */}
          {type === 'general' && (
            <div className="space-y-3">
              <Label>How would you rate your experience?</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 rounded hover:bg-gray-100 transition-colors"
                  >
                    <Star 
                      className={`w-6 h-6 ${
                        star <= rating 
                          ? 'fill-yellow-400 text-yellow-400' 
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-sm text-gray-600">
                  {rating === 1 && "We're sorry to hear that. Please tell us what went wrong."}
                  {rating === 2 && "Thanks for the feedback. How can we improve?"}
                  {rating === 3 && "Thanks! What would make it better?"}
                  {rating === 4 && "Great! What did you like most?"}
                  {rating === 5 && "Wonderful! We'd love to know what made your experience great."}
                </p>
              )}
            </div>
          )}

          {/* Message */}
          <div className="space-y-3">
            <Label htmlFor="feedback-message">
              {type === 'bug' && 'Please describe the bug and steps to reproduce it'}
              {type === 'feature' && 'Describe the feature you\'d like to see'}
              {type === 'error' && 'Tell us about the error you encountered'}
              {type === 'general' && 'Share your thoughts with us'}
            </Label>
            <Textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                type === 'bug' 
                  ? "1. I was trying to...\n2. I clicked on...\n3. Then this happened..."
                  : type === 'feature'
                  ? "It would be great if I could..."
                  : type === 'error'
                  ? "I got an error when I tried to..."
                  : "Tell us what you think..."
              }
              rows={4}
              required
              className="resize-none"
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={!message.trim() || isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Send Feedback'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Feedback button component for easy placement
export function FeedbackButton({ variant = "outline", size = "default", children, ...props }: 
  Omit<FeedbackDialogProps, 'trigger'> & {
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    size?: "default" | "sm" | "lg" | "icon";
    children?: React.ReactNode;
  }) {
  
  return (
    <FeedbackDialog
      trigger={
        <Button variant={variant} size={size}>
          <MessageCircle className="w-4 h-4 mr-2" />
          {children || 'Feedback'}
        </Button>
      }
      {...props}
    />
  );
}

// Quick feedback for specific error contexts
export function ErrorFeedbackDialog({ errorId, context, ...props }: 
  Omit<FeedbackDialogProps, 'initialType'> & {
    errorId?: string;
    context?: Record<string, any>;
  }) {
  
  return (
    <FeedbackDialog
      initialType="error"
      context={{
        ...context,
        errorId,
        component: 'ErrorFeedbackDialog'
      }}
      {...props}
    />
  );
}

// Feature request dialog
export function FeatureFeedbackDialog(props: Omit<FeedbackDialogProps, 'initialType'>) {
  return (
    <FeedbackDialog
      initialType="feature"
      {...props}
    />
  );
}

// Bug report dialog
export function BugFeedbackDialog(props: Omit<FeedbackDialogProps, 'initialType'>) {
  return (
    <FeedbackDialog
      initialType="bug"
      {...props}
    />
  );
}