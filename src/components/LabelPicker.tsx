'use client';

import React, { useState, useCallback } from 'react';
import { useLabels, Label, LABEL_COLORS } from '@/hooks/useLabels';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tag, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LabelPickerProps {
  selectedLabelIds: string[];
  onChange: (labelIds: string[]) => void;
}

const LabelPicker: React.FC<LabelPickerProps> = ({
  selectedLabelIds,
  onChange,
}) => {
  const { labels, addLabel } = useLabels();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState<string>(LABEL_COLORS[0]);

  const handleToggleLabel = useCallback(
    (labelId: string) => {
      if (selectedLabelIds.includes(labelId)) {
        onChange(selectedLabelIds.filter((id) => id !== labelId));
      } else {
        onChange([...selectedLabelIds, labelId]);
      }
    },
    [selectedLabelIds, onChange]
  );

  const handleCreateLabel = useCallback(async () => {
    if (!newLabelName.trim()) return;
    try {
      const newLabelId = await addLabel(newLabelName.trim(), newLabelColor);
      if (newLabelId) {
        onChange([...selectedLabelIds, newLabelId]);
      }
      setNewLabelName('');
      setNewLabelColor(LABEL_COLORS[0]);
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create label:', error);
    }
  }, [newLabelName, newLabelColor, addLabel, selectedLabelIds, onChange]);

  const selectedLabels = labels.filter((l) => selectedLabelIds.includes(l.id));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto gap-1 p-1 text-muted-foreground"
        >
          <Tag className="h-3.5 w-3.5" />
          {selectedLabels.length > 0 ? (
            <span className="flex items-center gap-1">
              {selectedLabels.map((label) => (
                <LabelBadge key={label.id} label={label} size="sm" />
              ))}
            </span>
          ) : (
            <span className="text-xs">Labels</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="space-y-1">
          {labels.length === 0 && !showCreateForm && (
            <p className="py-2 text-center text-xs text-muted-foreground">
              No labels yet
            </p>
          )}
          {labels.map((label) => (
            <button
              key={label.id}
              type="button"
              onClick={() => handleToggleLabel(label.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                selectedLabelIds.includes(label.id)
                  ? 'bg-accent'
                  : 'hover:bg-accent/50'
              )}
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: label.color }}
              />
              <span className="flex-1 truncate text-left">{label.name}</span>
              {selectedLabelIds.includes(label.id) && (
                <span className="text-xs text-primary">&#10003;</span>
              )}
            </button>
          ))}

          {showCreateForm ? (
            <div className="mt-1 space-y-2 border-t pt-2">
              <Input
                type="text"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                placeholder="Label name"
                className="h-7 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateLabel();
                  }
                }}
              />
              <div className="flex flex-wrap items-center gap-1">
                {LABEL_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewLabelColor(color)}
                    className={cn(
                      'h-5 w-5 rounded-full transition-transform',
                      newLabelColor === color &&
                        'scale-110 ring-2 ring-primary ring-offset-1'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  className="h-6 flex-1 text-xs"
                  onClick={handleCreateLabel}
                >
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewLabelName('');
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="mt-1 flex w-full items-center gap-2 rounded-md border-t px-2 py-1.5 pt-2 text-sm text-muted-foreground hover:bg-accent/50"
            >
              <Plus className="h-3.5 w-3.5" />
              Create new label
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const LabelBadge: React.FC<{ label: Label; size?: 'sm' | 'md' }> = ({
  label,
  size = 'md',
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md font-medium',
        size === 'sm' ? 'px-1.5 py-0 text-[10px]' : 'px-2 py-0.5 text-xs'
      )}
      style={{
        backgroundColor: `${label.color}20`,
        color: label.color,
      }}
    >
      <span
        className={cn(
          'rounded-full',
          size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2'
        )}
        style={{ backgroundColor: label.color }}
      />
      {label.name}
    </span>
  );
};

export default LabelPicker;
