import React, { useState, useEffect, useRef } from 'react';
import {
  CalendarIcon,
  ClockIcon,
  DollarSignIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  PlusIcon,
} from './icons';
import { getTodayDateString, getYesterdayDateString, isPastOrToday } from '@ledgr/shared';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import type { Title, Subtask, CreateSubtaskInput, SubtaskStatus } from '@ledgr/shared';

interface AddSubtaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  titles: Title[];
  selectedTitleId: string | null;
  onSave: (data: CreateSubtaskInput) => Promise<void>;
  onCreateTitlePrompt?: () => void;
  editingSubtask?: Subtask | null;
}

export const AddSubtaskModal: React.FC<AddSubtaskModalProps> = ({
  isOpen,
  onClose,
  titles,
  selectedTitleId,
  onSave,
  onCreateTitlePrompt,
  editingSubtask,
}) => {
  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();

  const [titleId, setTitleId] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [entryDate, setEntryDate] = useState<string>(today);
  const [status, setStatus] = useState<SubtaskStatus>('done');
  const [tagInput, setTagInput] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [cost, setCost] = useState<string>('');
  const [timeSpent, setTimeSpent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const descInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingSubtask) {
      setTitleId(editingSubtask.title_id);
      setDescription(editingSubtask.description);
      setEntryDate(editingSubtask.entry_date);
      setStatus(editingSubtask.status);
      setTags(editingSubtask.tags || []);
      setCost(editingSubtask.cost != null ? String(editingSubtask.cost) : '');
      setTimeSpent(editingSubtask.time_spent_minutes != null ? String(editingSubtask.time_spent_minutes) : '');
    } else {
      setTitleId(selectedTitleId || titles[0]?.id || '');
      setDescription('');
      setEntryDate(today);
      setStatus('done');
      setTags([]);
      setCost('');
      setTimeSpent('');
    }
    setError(null);
  }, [editingSubtask, selectedTitleId, titles, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => descInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!titleId) {
      setError('Please select or create a title category.');
      return;
    }

    if (!description.trim()) {
      setError('Please enter a task description.');
      return;
    }

    // Strict Past-Only Rule Validation
    if (!isPastOrToday(entryDate)) {
      setError('Future dates are strictly forbidden. You can only log work for today or past dates.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        title_id: titleId,
        description: description.trim(),
        entry_date: entryDate,
        status,
        tags,
        cost: cost ? parseFloat(cost) : null,
        time_spent_minutes: timeSpent ? parseInt(timeSpent, 10) : null,
        sort_order: editingSubtask?.sort_order ?? 0,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save subtask record');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-full max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingSubtask ? 'Edit Work Record' : 'Log Past Work Entry'}
          </DialogTitle>
          <DialogDescription>
            Record completed work with strict past-date verification
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          {error && (
            <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2 font-medium">
              <AlertTriangleIcon className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title Category Selection */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">
                Category / Title
              </label>
              {onCreateTitlePrompt && (
                <button
                  type="button"
                  onClick={onCreateTitlePrompt}
                  className="text-[11px] text-primary hover:underline font-medium inline-flex items-center gap-0.5"
                >
                  <PlusIcon className="h-3 w-3" />
                  <span>New Title</span>
                </button>
              )}
            </div>
            {titles.length > 0 ? (
              <select
                value={titleId}
                onChange={(e) => setTitleId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs sm:text-sm shadow-sm transition-colors text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {titles.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center justify-between p-2 rounded-md border border-dashed border-border bg-muted/30 text-xs">
                <span className="text-muted-foreground">No categories yet.</span>
                {onCreateTitlePrompt && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onCreateTitlePrompt}
                    className="h-7 text-xs"
                  >
                    Create Title
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Description Field */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              What was completed? (Required)
            </label>
            <textarea
              ref={descInputRef}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Repaired brake caliper and bled hydraulic lines"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm shadow-sm transition-colors text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
              required
            />
          </div>

          {/* Date Picker + Quick One-Tap Toggles */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              Completion Date (Past Only)
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="date"
                  max={today}
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="pl-9 h-9 text-xs sm:text-sm w-full"
                  required
                />
              </div>

              {/* Quick Today / Yesterday Toggles */}
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                <Button
                  type="button"
                  variant={entryDate === today ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEntryDate(today)}
                  className="h-9 px-3 text-xs"
                >
                  Today
                </Button>
                <Button
                  type="button"
                  variant={entryDate === yesterday ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEntryDate(yesterday)}
                  className="h-9 px-3 text-xs"
                >
                  Yesterday
                </Button>
              </div>
            </div>
          </div>

          {/* Status Selection */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              Status
            </label>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {(['done', 'in_progress', 'cancelled'] as SubtaskStatus[]).map((s) => (
                <Button
                  type="button"
                  key={s}
                  variant={status === s ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatus(s)}
                  className="h-8 capitalize text-xs px-1 sm:px-3 truncate"
                >
                  {s.replace('_', ' ')}
                </Button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              Tags (Optional)
            </label>
            <div className="flex items-center gap-1.5">
              <Input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="e.g. brakes, fleet-a"
                className="h-8 text-xs flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddTag}
                className="h-8 px-3 text-xs flex-shrink-0"
              >
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1 max-h-20 overflow-y-auto">
                {tags.map((t) => (
                  <Badge
                    key={t}
                    variant="secondary"
                    className="text-xs gap-1 pr-1.5 py-0.5"
                  >
                    <span>{t}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="hover:text-destructive ml-0.5 text-xs font-bold leading-none"
                    >
                      &times;
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Cost & Time Spent */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                Cost ($)
              </label>
              <div className="relative">
                <DollarSignIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="0.00"
                  className="pl-8 h-8 text-xs w-full"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                Time Spent (min)
              </label>
              <div className="relative">
                <ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  type="number"
                  min="0"
                  value={timeSpent}
                  onChange={(e) => setTimeSpent(e.target.value)}
                  placeholder="45"
                  className="pl-8 h-8 text-xs w-full"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={isSubmitting}
              className="text-xs gap-1.5 font-medium"
            >
              <CheckCircle2Icon className="h-3.5 w-3.5" />
              <span>{isSubmitting ? 'Saving...' : editingSubtask ? 'Update Record' : 'Log Record'}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
