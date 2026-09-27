import React from 'react';
import {
  CalendarIcon,
  ClockIcon,
  DollarSignIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  XCircleIcon,
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
    density,
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
      <div className="p-4 sm:p-6 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="p-4 rounded-xl border border-border bg-card space-y-2.5"
          >
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (subtasks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-center">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4 shadow-sm">
          <CalendarIcon className="h-7 w-7" />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-foreground">
          {hasActiveFilters ? 'No matching past work found' : 'No past work logged yet'}
        </h3>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-sm">
          {hasActiveFilters
            ? 'Try changing your search query, adjusting the date range preset, or clearing filters.'
            : 'Log what you did today or yesterday to begin building your verifiable proof-of-work ledger.'}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {hasActiveFilters ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={clearAllFilters}
              className="text-xs"
            >
              Clear all filters
            </Button>
          ) : (
            <Button
              variant="default"
              size="default"
              onClick={onOpenAddModal}
              className="gap-2 font-medium"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Log First Task (Press N)</span>
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
  const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedSubtaskIds.has(id));

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Selection Mode Bulk Toolbar */}
      {isSelectionMode && (
        <div className="sticky top-14 z-20 flex items-center justify-between p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-xs font-medium text-foreground backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                if (isAllSelected) clearSelectedSubtasks();
                else selectAllSubtasks(allFilteredIds);
              }}
              className="h-7 px-2.5 text-xs gap-1.5"
            >
              {isAllSelected ? <CheckSquareIcon className="h-3.5 w-3.5" /> : <SquareIcon className="h-3.5 w-3.5" />}
              <span>{isAllSelected ? 'Deselect All' : 'Select All Filtered'}</span>
            </Button>
            <span className="text-muted-foreground">
              {selectedSubtaskIds.size} selected
            </span>
          </div>

          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            Tip: Shift-click to select ranges
          </span>
        </div>
      )}

      {/* Date Groups */}
      {groupedByDate.map((group) => (
        <section key={group.date} className="space-y-2">
          {/* Sticky Date Header */}
          <div className="sticky top-14 sm:top-[60px] z-10 py-1.5 flex items-center justify-between bg-background/95 backdrop-blur-sm border-b border-border/60">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <h3 className="text-xs font-bold tracking-tight text-foreground uppercase">
                {group.displayDate}
              </h3>
              <span className="text-[11px] text-muted-foreground font-normal">({group.date})</span>
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
                  className={`group relative rounded-lg border transition-all ${
                    density === 'compact' ? 'p-2.5' : 'p-3.5'
                  } ${
                    isSelected
                      ? 'bg-primary/5 border-primary shadow-xs'
                      : 'bg-card border-border hover:border-border/80'
                  } ${isSelectionMode ? 'cursor-pointer' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Selection Checkbox */}
                      {isSelectionMode && (
                        <div className="pt-0.5 flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectSubtask(subtask.id)}
                            className="h-4 w-4 rounded text-primary focus:ring-ring border-input bg-background"
                          />
                        </div>
                      )}

                      {/* Status Icon */}
                      <div className="pt-0.5 flex-shrink-0">
                        {subtask.status === 'done' && <CheckCircle2Icon className="h-4 w-4 text-status-done" />}
                        {subtask.status === 'in_progress' && <AlertCircleIcon className="h-4 w-4 text-status-inprogress" />}
                        {subtask.status === 'cancelled' && <XCircleIcon className="h-4 w-4 text-status-cancelled" />}
                      </div>

                      {/* Task Info */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {subtask.title && (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-semibold text-foreground"
                              style={{ borderColor: subtask.title.color || 'hsl(var(--primary))' }}
                            >
                              {subtask.title.name}
                            </Badge>
                          )}

                          <Badge
                            variant={
                              subtask.status === 'done'
                                ? 'done'
                                : subtask.status === 'in_progress'
                                ? 'inProgress'
                                : 'cancelled'
                            }
                            className="text-[10px] py-0 px-1.5 uppercase font-mono"
                          >
                            {subtask.status.replace('_', ' ')}
                          </Badge>
                        </div>

                        {/* Description */}
                        <p className="text-xs sm:text-sm font-normal text-foreground whitespace-pre-wrap leading-relaxed">
                          {subtask.description}
                        </p>

                        {/* Tags and Metadata Chips - Text Only without Icon Clutter */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px] text-muted-foreground">
                          {subtask.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-[10px] font-normal px-1.5 py-0 rounded-md"
                            >
                              {tag}
                            </Badge>
                          ))}

                          {subtask.cost != null && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-muted text-foreground text-[10px] font-mono font-medium">
                              <DollarSignIcon className="h-2.5 w-2.5 text-status-done" />
                              {subtask.cost.toFixed(2)}
                            </span>
                          )}

                          {subtask.time_spent_minutes != null && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-muted text-foreground text-[10px] font-mono font-medium">
                              <ClockIcon className="h-2.5 w-2.5 text-primary" />
                              {subtask.time_spent_minutes}m
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Controls */}
                    {!isSelectionMode && (
                      <div className="flex items-center gap-0.5 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEditSubtask(subtask)}
                          title="Edit Task"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        >
                          <EditIcon className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Delete this task record? (Recoverable in trash for 30 days)')) {
                              onDeleteSubtask(subtask.id);
                            }
                          }}
                          title="Delete Task"
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
