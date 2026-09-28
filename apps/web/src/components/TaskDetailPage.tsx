import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  CheckIcon,
  XIcon,
} from './icons';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { DatePicker } from './ui/date-picker';
import {
  SkeletonRowList,
  InlineError,
  InlineSpinner,
  useDelayedLoading,
} from './LoadingFeedback';
import { getTodayDateString, getYesterdayDateString, isPastOrToday, formatDisplayDate } from '@ledgr/shared';
import type { Title, Subtask, CreateSubtaskInput, SubtaskStatus } from '@ledgr/shared';

interface TaskDetailPageProps {
  task: Title;
  subtasks: (Subtask & { _isOptimistic?: boolean })[];
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onBack: () => void;
  onUpdateTitle: (titleId: string, input: { name: string; color?: string }) => Promise<void>;
  onDeleteTitle: (titleId: string) => Promise<void>;
  onAddSubtask: (input: CreateSubtaskInput) => Promise<void>;
  onEditSubtask: (subtask: Subtask) => void;
  onDeleteSubtask: (subtaskId: string) => Promise<void>;
}

export const TaskDetailPage: React.FC<TaskDetailPageProps> = ({
  task,
  subtasks,
  isLoading,
  isError,
  onRetry,
  onBack,
  onUpdateTitle,
  onDeleteTitle,
  onAddSubtask,
  onEditSubtask,
  onDeleteSubtask,
}) => {
  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();

  // Loading floor: minimum 300ms duration for skeleton
  const showSkeleton = useDelayedLoading(isLoading, 300);

  // Task & Subtask action states
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [deletingSubtaskId, setDeletingSubtaskId] = useState<string | null>(null);

  // Title Editing State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitleName, setEditedTitleName] = useState(task.name);
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditedTitleName(task.name);
  }, [task]);

  useEffect(() => {
    if (isEditingTitle) {
      setTimeout(() => titleInputRef.current?.focus(), 50);
    }
  }, [isEditingTitle]);

  const handleSaveTitle = async () => {
    if (!editedTitleName.trim()) return;
    setIsSavingTitle(true);
    try {
      await onUpdateTitle(task.id, {
        name: editedTitleName.trim(),
        color: task.color,
      });
      setIsEditingTitle(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update title');
    } finally {
      setIsSavingTitle(false);
    }
  };

  // Add Subtask Simple Form State
  const [desc, setDesc] = useState('');
  const [entryDate, setEntryDate] = useState(today);
  const status: SubtaskStatus = 'done';
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!desc.trim()) return;

    if (!isPastOrToday(entryDate)) {
      setError('Future dates are not allowed. You can only log work for today or past dates.');
      return;
    }

    setIsAdding(true);
    try {
      await onAddSubtask({
        title_id: task.id,
        description: desc.trim(),
        entry_date: entryDate,
        status,
        tags: [],
        cost: null,
        time_spent_minutes: null,
        sort_order: 0,
      });

      setDesc('');
      setEntryDate(today);
    } catch (err: any) {
      setError(err.message || 'Failed to add subtask');
    } finally {
      setIsAdding(false);
    }
  };

  // Sort subtasks: newest date first
  const sortedSubtasks = [...subtasks].sort((a, b) =>
    b.entry_date.localeCompare(a.entry_date) || (b.created_at || '').localeCompare(a.created_at || '')
  );

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Top Header Bar */}
      <div className="border-b border-border bg-card/80 sticky top-0 z-20 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-1.5 text-xs font-semibold hover:bg-muted"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span>Back to Tasks</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            disabled={isDeletingTask}
            onClick={async () => {
              if (confirm(`Delete task "${task.name}" and all its subtasks?`)) {
                setIsDeletingTask(true);
                try {
                  await onDeleteTitle(task.id);
                  onBack();
                } finally {
                  setIsDeletingTask(false);
                }
              }
            }}
            className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5 h-8 disabled:opacity-50"
          >
            {isDeletingTask ? (
              <InlineSpinner size="xs" />
            ) : (
              <TrashIcon className="h-3.5 w-3.5" />
            )}
            <span>{isDeletingTask ? 'Deleting...' : 'Delete'}</span>
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        {/* Task Title (Editable directly) */}
        <div className="bg-card border border-border p-4 rounded-xl shadow-xs">
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <Input
                ref={titleInputRef}
                type="text"
                value={editedTitleName}
                onChange={(e) => setEditedTitleName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
                className="font-heading font-medium h-10 text-base flex-1"
                placeholder="Task title..."
                disabled={isSavingTitle}
              />
              <Button
                onClick={handleSaveTitle}
                size="sm"
                disabled={isSavingTitle || !editedTitleName.trim()}
                className="gap-1 text-xs font-medium h-10 px-3"
              >
                {isSavingTitle ? (
                  <>
                    <InlineSpinner size="xs" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-3.5 w-3.5" />
                    <span>Save</span>
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  setEditedTitleName(task.name);
                  setIsEditingTitle(false);
                }}
                variant="outline"
                size="sm"
                disabled={isSavingTitle}
                className="h-10 px-3 text-xs"
              >
                <XIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="h-2 w-2 rounded-full shrink-0 bg-muted-foreground/60" />
                <h1
                  onClick={() => setIsEditingTitle(true)}
                  className="font-heading font-medium text-lg sm:text-xl text-foreground truncate cursor-pointer hover:underline underline-offset-4"
                  title="Click to edit title"
                >
                  {task.name}
                </h1>
                <button
                  type="button"
                  onClick={() => setIsEditingTitle(true)}
                  className="p-1 rounded text-muted-foreground hover:text-foreground"
                  title="Edit title"
                >
                  <EditIcon className="h-3.5 w-3.5" />
                </button>
              </div>

              <span className="font-mono tabular-nums text-xs text-muted-foreground shrink-0">
                {subtasks.length} {subtasks.length === 1 ? 'subtask' : 'subtasks'}
              </span>
            </div>
          )}
        </div>

        {/* Simple Subtask Log Form */}
        <div className="bg-card border border-border p-3.5 rounded-xl shadow-xs space-y-2.5">
          <form onSubmit={handleCreateSubtask} className="space-y-2.5">
            {error && (
              <p className="text-xs text-destructive font-medium">{error}</p>
            )}

            {/* Responsive Input Layout */}
            <div className="space-y-2">
              <Input
                type="text"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Log what you did for this task..."
                className="h-9 text-xs sm:text-sm w-full bg-background"
                disabled={isAdding}
                autoFocus
              />

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <DatePicker
                    value={entryDate}
                    onChange={setEntryDate}
                    className="h-8 text-xs flex-1 bg-background"
                    disabled={isAdding}
                  />

                  <Button
                    type="button"
                    variant={entryDate === today ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setEntryDate(today)}
                    className="h-8 px-2.5 text-[11px] shrink-0"
                  >
                    Today
                  </Button>
                  <Button
                    type="button"
                    variant={entryDate === yesterday ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setEntryDate(yesterday)}
                    className="h-8 px-2.5 text-[11px] shrink-0"
                  >
                    Yesterday
                  </Button>
                </div>

                <Button
                  type="submit"
                  disabled={isAdding || !desc.trim()}
                  size="sm"
                  className="h-8 px-3 text-xs gap-1 font-semibold shrink-0 w-full sm:w-auto"
                >
                  {isAdding ? (
                    <>
                      <InlineSpinner size="xs" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <PlusIcon className="h-3.5 w-3.5" />
                      <span>Add Subtask</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* Subtasks List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Subtasks
            </h3>
            <span className="font-mono tabular-nums text-[11px] text-muted-foreground">
              {subtasks.length} total
            </span>
          </div>

          {showSkeleton ? (
            <SkeletonRowList count={3} showTitleChip={false} />
          ) : isError ? (
            <InlineError
              message="Failed to load subtasks for this task."
              onRetry={onRetry}
            />
          ) : sortedSubtasks.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border rounded-xl bg-card/40 text-xs text-muted-foreground">
              No subtasks logged for this task yet. Type above to add one!
            </div>
          ) : (
            <div className="space-y-1.5">
              {sortedSubtasks.map((st) => {
                const displayDate = formatDisplayDate(st.entry_date);
                const isDone = st.status === 'done';
                const isInProgress = st.status === 'in_progress';
                const isSubtaskDeleting = deletingSubtaskId === st.id;

                return (
                  <div
                    key={st.id}
                    className="p-3 rounded-xl border border-border bg-card hover:border-border/90 flex items-center justify-between gap-3 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <CheckCircle2Icon
                        className={`h-4 w-4 shrink-0 ${
                          isDone
                            ? 'text-[var(--status-done)]'
                            : isInProgress
                            ? 'text-[var(--status-in-progress)]'
                            : 'text-[var(--status-cancelled)]'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs sm:text-sm text-foreground truncate flex-1">
                            {st.description}
                          </p>
                          {Boolean(st._isOptimistic) && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/80 px-2 py-0.5 rounded-full font-mono shrink-0">
                              <InlineSpinner size="xs" />
                              <span>syncing...</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono tabular-nums text-[11px] text-muted-foreground">
                        {displayDate}
                      </span>

                      <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          disabled={Boolean(st._isOptimistic)}
                          onClick={() => onEditSubtask(st)}
                          className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-40"
                          title="Edit"
                        >
                          <EditIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(st._isOptimistic) || isSubtaskDeleting}
                          onClick={async () => {
                            if (confirm('Delete this subtask?')) {
                              setDeletingSubtaskId(st.id);
                              try {
                                await onDeleteSubtask(st.id);
                              } finally {
                                setDeletingSubtaskId(null);
                              }
                            }
                          }}
                          className="p-1 rounded text-muted-foreground hover:text-destructive disabled:opacity-40"
                          title="Delete"
                        >
                          {isSubtaskDeleting ? (
                            <InlineSpinner size="xs" />
                          ) : (
                            <TrashIcon className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
