import React, { useState } from 'react';
import {
  CalendarIcon,
  CheckCircle2Icon,
  EditIcon,
  TrashIcon,
  CheckSquareIcon,
  SquareIcon,
  PlusIcon,
} from './icons';
import { useUI } from '../context/UIContext';
import { formatDisplayDate } from '@ledgr/shared';
import { Button } from './ui/button';
import {
  SkeletonRowList,
  InlineError,
  InlineSpinner,
  useDelayedLoading,
} from './LoadingFeedback';
import type { Subtask } from '@ledgr/shared';

interface SubtaskListProps {
  subtasks: (Subtask & { _isOptimistic?: boolean })[];
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onEditSubtask: (subtask: Subtask) => void;
  onDeleteSubtask: (subtaskId: string) => Promise<void> | void;
  onOpenAddModal: () => void;
  onOpenTaskPage?: (taskId: string) => void;
}

export const SubtaskList: React.FC<SubtaskListProps> = ({
  subtasks,
  isLoading,
  isError,
  onRetry,
  onEditSubtask,
  onDeleteSubtask,
  onOpenAddModal,
  onOpenTaskPage,
}) => {
  const {
    selectedTitleId,
    isSelectionMode,
    selectedSubtaskIds,
    toggleSelectSubtask,
    selectAllSubtasks,
    clearSelectedSubtasks,
    hasActiveFilters,
    clearAllFilters,
  } = useUI();

  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Minimum visible duration of ~300ms prevents jarring flash
  const showSkeleton = useDelayedLoading(isLoading, 300);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    setDeletingId(id);
    try {
      await onDeleteSubtask(id);
    } finally {
      setDeletingId(null);
    }
  };

  if (showSkeleton) {
    return (
      <div className="p-3 sm:p-6 space-y-3 max-w-5xl mx-auto">
        <SkeletonRowList count={4} showTitleChip={!selectedTitleId} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <InlineError
          message="Failed to load log entries. Please check your connection."
          onRetry={onRetry}
        />
      </div>
    );
  }

  if (subtasks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-16 text-center max-w-md mx-auto">
        <div className="h-12 w-12 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground mb-3 shadow-xs">
          <CalendarIcon className="h-6 w-6" />
        </div>
        <h3 className="font-heading font-medium text-base text-foreground">
          {hasActiveFilters ? 'No matching logs found' : 'No past work logged yet'}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {hasActiveFilters
            ? 'Try changing your search term or resetting the date filter.'
            : 'Record what you worked on today or on past dates to build your log history.'}
        </p>
        <div className="mt-5">
          {hasActiveFilters ? (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="text-xs"
            >
              Reset filters
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={onOpenAddModal}
              className="gap-1.5 font-medium text-xs h-9 px-4"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              <span>Log First Entry</span>
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Group subtasks by Date descending
  const groupedByDate: Array<{ date: string; displayDate: string; items: (Subtask & { _isOptimistic?: boolean })[] }> = [];
  const dateMap = new Map<string, (Subtask & { _isOptimistic?: boolean })[]>();

  for (const st of subtasks) {
    if (!dateMap.has(st.entry_date)) {
      dateMap.set(st.entry_date, []);
    }
    dateMap.get(st.entry_date)!.push(st);
  }

  const sortedDates = Array.from(dateMap.keys()).sort((a, b) => b.localeCompare(a));
  for (const d of sortedDates) {
    groupedByDate.push({
      date: d,
      displayDate: formatDisplayDate(d),
      items: dateMap.get(d)!,
    });
  }

  const allFilteredIds = subtasks.map((s) => s.id);
  const isAllSelected =
    allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedSubtaskIds.has(id));

  return (
    <div className="p-3 sm:p-6 space-y-5 max-w-5xl mx-auto">
      {/* Selection Mode Bulk Toolbar */}
      {isSelectionMode && (
        <div className="sticky top-0 z-20 flex items-center justify-between p-2 rounded-xl bg-card border border-border text-xs font-medium text-foreground backdrop-blur-md shadow-xs mb-3">
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                if (isAllSelected) clearSelectedSubtasks();
                else selectAllSubtasks(allFilteredIds);
              }}
              className="h-7 px-2.5 text-xs gap-1.5 font-medium"
            >
              {isAllSelected ? (
                <CheckSquareIcon className="h-3.5 w-3.5" />
              ) : (
                <SquareIcon className="h-3.5 w-3.5" />
              )}
              <span>{isAllSelected ? 'Deselect All' : 'Select All Filtered'}</span>
            </Button>
            <span className="text-muted-foreground text-xs font-mono tabular-nums">
              {selectedSubtaskIds.size} of {subtasks.length} selected
            </span>
          </div>

          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            Tap rows to select for export
          </span>
        </div>
      )}

      {/* Date Groups */}
      {groupedByDate.map((group) => (
        <section key={group.date} className="space-y-2">
          {/* Clean Date Header */}
          <div className="sticky top-0 z-10 py-1.5 px-1 flex items-center justify-between bg-background/95 backdrop-blur-sm border-b border-border/60">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
              <h3 className="font-heading font-medium text-xs tracking-tight text-foreground uppercase">
                {group.displayDate}
              </h3>
              <span className="font-mono tabular-nums text-[11px] text-muted-foreground font-normal">
                ({group.date})
              </span>
            </div>
            <span className="font-mono tabular-nums text-[11px] font-medium text-muted-foreground">
              {group.items.length} {group.items.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          {/* Subtask Rows */}
          <div className="space-y-2">
            {group.items.map((subtask) => {
              const isSelected = selectedSubtaskIds.has(subtask.id);
              const isDone = subtask.status === 'done';
              const isInProgress = subtask.status === 'in_progress';

              return (
                <div
                  key={subtask.id}
                  onClick={() => {
                    if (isSelectionMode) {
                      toggleSelectSubtask(subtask.id);
                    }
                  }}
                  className={`group relative rounded-xl border p-3.5 sm:p-4 transition-all shadow-xs ${
                    isSelected
                      ? 'bg-muted/40 border-foreground/30 ring-1 ring-border'
                      : 'bg-card border-border hover:border-border/90'
                  } ${isSelectionMode ? 'cursor-pointer' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Selection Checkbox or Done Bullet */}
                      {isSelectionMode ? (
                        <div className="pt-0.5 shrink-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectSubtask(subtask.id)}
                            className="h-4 w-4 rounded accent-primary border-input bg-background cursor-pointer"
                          />
                        </div>
                      ) : (
                        <div className="pt-0.5 shrink-0">
                          <CheckCircle2Icon
                            className={`h-4 w-4 ${
                              isDone
                                ? 'text-[var(--status-done)]'
                                : isInProgress
                                ? 'text-[var(--status-in-progress)]'
                                : 'text-[var(--status-cancelled)]'
                            }`}
                          />
                        </div>
                      )}

                      {/* Main Task Content */}
                      <div className="min-w-0 flex-1 space-y-1">
                        {/* Title category badge when viewing All Titles */}
                        {!selectedTitleId && subtask.title && (
                          <div className="mb-1">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-heading font-medium border border-border bg-muted/40 text-foreground/80 ${
                                onOpenTaskPage ? 'cursor-pointer hover:border-foreground/30 hover:text-foreground' : ''
                              } transition-all`}
                              onClick={(e) => {
                                if (onOpenTaskPage) {
                                  e.stopPropagation();
                                  onOpenTaskPage(subtask.title_id);
                                }
                              }}
                              title={onOpenTaskPage ? `Open ${subtask.title.name} task details` : undefined}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
                              {subtask.title.name}
                            </span>
                          </div>
                        )}

                        {/* Optimistic syncing indicator */}
                        {Boolean(subtask._isOptimistic) && (
                          <div className="mb-1">
                            <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/80 px-2 py-0.5 rounded-full font-mono">
                              <InlineSpinner size="xs" />
                              <span>syncing...</span>
                            </span>
                          </div>
                        )}

                        {/* Description */}
                        <p className="text-xs sm:text-sm font-normal text-foreground whitespace-pre-wrap leading-relaxed">
                          {subtask.description}
                        </p>
                      </div>
                    </div>

                    {/* Action Controls */}
                    {!isSelectionMode && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={Boolean(subtask._isOptimistic)}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditSubtask(subtask);
                          }}
                          title="Edit Entry"
                          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
                        >
                          <EditIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(subtask._isOptimistic) || deletingId === subtask.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(subtask.id);
                          }}
                          title="Delete Entry"
                          className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                        >
                          {deletingId === subtask.id ? (
                            <InlineSpinner size="xs" />
                          ) : (
                            <TrashIcon className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};
