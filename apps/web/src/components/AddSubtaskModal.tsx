import React, { useState, useEffect, useRef } from 'react';
import {
  CalendarIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  PlusIcon,
  ClockIcon,
  DollarSignIcon,
  ChevronDownIcon,
  ChevronUpIcon,
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
  const [showExtraFields, setShowExtraFields] = useState<boolean>(false);
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
      setStatus(editingSubtask.status || 'done');
      setTags(editingSubtask.tags || []);
      setCost(editingSubtask.cost != null ? String(editingSubtask.cost) : '');
      setTimeSpent(
        editingSubtask.time_spent_minutes != null
          ? String(editingSubtask.time_spent_minutes)
          : ''
      );
      if (
        (editingSubtask.tags && editingSubtask.tags.length > 0) ||
        editingSubtask.cost != null ||
        editingSubtask.time_spent_minutes != null
      ) {
        setShowExtraFields(true);
      }
    } else {
      setTitleId(selectedTitleId || titles[0]?.id || '');
      setDescription('');
      setEntryDate(today);
      setStatus('done');
      setTags([]);
      setCost('');
      setTimeSpent('');
      setShowExtraFields(false);
    }
    setError(null);
  }, [editingSubtask, selectedTitleId, titles, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => descInputRef.current?.focus(), 60);
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
      setError('Please select or create a Title category.');
      return;
    }

    if (!description.trim()) {
      setError('Please enter what was completed.');
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
      setError(err.message || 'Failed to save entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg font-bold">
            {editingSubtask ? 'Edit Log Entry' : 'Log Past Work'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Fast, reliable logging for today or past dates
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {error && (
            <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2 font-medium">
              <AlertTriangleIcon className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Title / Category Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">
                Category / Title
              </label>
              {onCreateTitlePrompt && (
                <button
                  type="button"
                  onClick={onCreateTitlePrompt}
                  className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-0.5"
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
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {titles.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-dashed border-border bg-muted/30 text-xs">
                <span className="text-muted-foreground">No categories yet.</span>
                {onCreateTitlePrompt && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onCreateTitlePrompt}
                    className="h-8 text-xs font-medium"
                  >
                    Create Title
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* 2. Description Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Description
            </label>
            <textarea
              ref={descInputRef}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you work on? (e.g. Completed clutch overhaul, inspected wiring)"
              className="w-full rounded-lg border border-input bg-background p-3 text-sm shadow-xs transition-colors text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y min-h-[90px]"
              required
            />
          </div>

          {/* 3. Date Picker with Today & Yesterday Shortcuts */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">
                Date (Past or Today)
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setEntryDate(today)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    entryDate === today
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setEntryDate(yesterday)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    entryDate === yesterday
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Yesterday
                </button>
              </div>
            </div>

            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="date"
                max={today}
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="pl-9 h-10 text-sm w-full bg-background rounded-lg"
                required
              />
            </div>
          </div>

          {/* Optional Extra Fields Accordion */}
          <div className="pt-0.5">
            <button
              type="button"
              onClick={() => setShowExtraFields(!showExtraFields)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium py-1"
            >
              {showExtraFields ? (
                <ChevronUpIcon className="h-3.5 w-3.5" />
              ) : (
                <ChevronDownIcon className="h-3.5 w-3.5" />
              )}
              <span>{showExtraFields ? 'Hide optional details' : 'Add tags, cost, or time (optional)'}</span>
            </button>

            {showExtraFields && (
              <div className="space-y-3 pt-2.5 pb-1 border-t border-border mt-1.5 animate-in fade-in">
                {/* Tags */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Tags</label>
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
                      placeholder="Add tag and press Enter"
                      className="h-9 text-xs flex-1"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleAddTag}
                      className="h-9 px-3 text-xs shrink-0"
                    >
                      Add
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {tags.map((t) => (
                        <Badge
                          key={t}
                          variant="secondary"
                          className="text-[11px] gap-1 pr-1.5 py-0"
                        >
                          <span>{t}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(t)}
                            className="hover:text-destructive text-xs font-bold"
                          >
                            &times;
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cost and Time */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Cost ($)</label>
                    <div className="relative">
                      <DollarSignIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={cost}
                        onChange={(e) => setCost(e.target.value)}
                        placeholder="0.00"
                        className="pl-7 h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Time (min)</label>
                    <div className="relative">
                      <ClockIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <Input
                        type="number"
                        min="0"
                        value={timeSpent}
                        onChange={(e) => setTimeSpent(e.target.value)}
                        placeholder="30"
                        className="pl-7 h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form Submit Actions */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={onClose}
              className="h-10 px-4 text-xs font-medium"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="default"
              disabled={isSubmitting}
              className="h-10 px-4 text-xs gap-1.5 font-medium"
            >
              <CheckCircle2Icon className="h-4 w-4" />
              <span>{isSubmitting ? 'Saving...' : editingSubtask ? 'Save Changes' : 'Log Entry'}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
