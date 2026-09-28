import React from 'react';
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
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import type { Subtask } from '@ledgr/shared';

interface SubtaskListProps {
  subtasks: Subtask[];
  isLoading: boolean;
  onEditSubtask: (subtask: Subtask) => void;
  onDeleteSubtask: (subtaskId: string) => void;
  onOpenAddModal: () => void;
}

export const SubtaskList: React.FC<SubtaskListProps> = ({
  subtasks,
  isLoading,
  onEditSubtask,
  onDeleteSubtask,
  onOpenAddModal,
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

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-3 max-w-5xl mx-auto">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 rounded-lg border border-border bg-card space-y-2.5"
          >
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-5 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (subtasks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-16 text-center max-w-md mx-auto">
        <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3 shadow-xs">
          <CalendarIcon className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">
          {hasActiveFilters ? 'No matching logs found' : 'No past work logged yet'}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {hasActiveFilters
            ? 'Try changing your search term or adjusting the date range filter.'
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
              className="gap-1.5 font-medium text-xs"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              <span>Log First Entry (Press N)</span>
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Group subtasks by Date descending
  const groupedByDate: Array<{ date: string; displayDate: string; items: Subtask[] }> = [];
  const dateMap = new Map<string, Subtask[]>();

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
        <div className="sticky top-0 z-20 flex items-center justify-between p-2 rounded-lg bg-primary/10 border border-primary/20 text-xs font-medium text-foreground backdrop-blur-md shadow-xs mb-3">
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
            <span className="text-muted-foreground text-xs font-semibold">
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
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <h3 className="text-xs font-bold tracking-tight text-foreground uppercase">
                {group.displayDate}
              </h3>
              <span className="text-[11px] text-muted-foreground font-normal">
                ({group.date})
              </span>
            </div>
            <span className="text-[11px] font-medium text-muted-foreground">
              {group.items.length} {group.items.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          {/* Subtask Rows */}
          <div className="space-y-1.5">
            {group.items.map((subtask) => {
              const isSelected = selectedSubtaskIds.has(subtask.id);

              return (
                <div
                  key={subtask.id}
                  onClick={() => {
                    if (isSelectionMode) {
                      toggleSelectSubtask(subtask.id);
                    }
                  }}
                  className={`group relative rounded-lg border p-3 transition-all ${
                    isSelected
                      ? 'bg-primary/5 border-primary shadow-xs'
                      : 'bg-card border-border hover:border-border/90'
                  } ${isSelectionMode ? 'cursor-pointer' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      {/* Selection Checkbox */}
                      {isSelectionMode ? (
                        <div className="pt-0.5 shrink-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectSubtask(subtask.id)}
                            className="h-4 w-4 rounded text-primary focus:ring-ring border-input bg-background cursor-pointer"
                          />
                        </div>
                      ) : (
                        <div className="pt-0.5 shrink-0 text-muted-foreground">
                          <CheckCircle2Icon className="h-3.5 w-3.5 text-primary/70" />
                        </div>
                      )}

                      {/* Main Task Content */}
                      <div className="min-w-0 flex-1 space-y-1">
                        {/* Title pill shown when viewing all titles or when title exists */}
                        {!selectedTitleId && subtask.title && (
                          <div className="inline-block mr-2">
                            <Badge
                              variant="outline"
                              className="text-[10px] font-medium py-0 px-1.5 border-border text-foreground"
                              style={{
                                borderColor: subtask.title.color || 'hsl(var(--primary))',
                              }}
                            >
                              {subtask.title.name}
                            </Badge>
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
                      <div className="flex items-center gap-0.5 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditSubtask(subtask);
                          }}
                          title="Edit Entry"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        >
                          <EditIcon className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Delete this entry?')) {
                              onDeleteSubtask(subtask.id);
                            }
                          }}
                          title="Delete Entry"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </Button>
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
