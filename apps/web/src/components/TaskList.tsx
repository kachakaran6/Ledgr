import React, { useState, useMemo } from 'react';
import {
  PlusIcon,
  SearchIcon,
  FolderIcon,
  ArrowRightIcon,
  EditIcon,
  TrashIcon,
} from './icons';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  SkeletonCardList,
  InlineError,
  InlineSpinner,
  useDelayedLoading,
  useDebounce,
} from './LoadingFeedback';
import type { Title, Subtask } from '@ledgr/shared';

interface TaskListProps {
  tasks: Title[];
  allSubtasks: Subtask[];
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onSelectTask: (taskId: string) => void;
  onAddTask: () => void;
  onEditTask: (task: Title) => void;
  onDeleteTask: (taskId: string) => Promise<void> | void;
}

function formatTimeAgo(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays} days ago`;
    const months = Math.floor(diffDays / 30);
    if (months === 1) return '1 month ago';
    if (months < 12) return `${months} months ago`;
    const years = Math.floor(diffDays / 365);
    return years === 1 ? '1 year ago' : `${years} years ago`;
  } catch {
    return '';
  }
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  allSubtasks,
  isLoading,
  isError,
  onRetry,
  onSelectTask,
  onAddTask,
  onEditTask,
  onDeleteTask,
}) => {
  const [search, setSearch] = useState('');
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  // Debounced search-as-you-type with immediate visual feedback
  const debouncedSearch = useDebounce(search, 200);
  const isSearchDebouncing = search !== debouncedSearch;

  // Enforce ~300ms minimum floor on skeleton appearance
  const showSkeleton = useDelayedLoading(isLoading || isSearchDebouncing, 300);

  // Map subtask count by task id
  const countMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of allSubtasks) {
      if (s.deleted_at) continue;
      map.set(s.title_id, (map.get(s.title_id) || 0) + 1);
    }
    return map;
  }, [allSubtasks]);

  const filteredTasks = useMemo(() => {
    if (!debouncedSearch.trim()) return tasks;
    const q = debouncedSearch.toLowerCase().trim();
    return tasks.filter((t) => t.name.toLowerCase().includes(q));
  }, [tasks, debouncedSearch]);

  const handleDelete = async (taskId: string, taskName: string) => {
    if (!confirm(`Delete task "${taskName}"?`)) return;
    setDeletingTaskId(taskId);
    try {
      await onDeleteTask(taskId);
    } finally {
      setDeletingTaskId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
      {/* Search and Add Task Header - Stays mounted so input focus is never lost */}
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="pl-9 h-9 text-xs bg-background"
          />
        </div>

        <Button
          onClick={onAddTask}
          size="sm"
          className="hidden sm:inline-flex gap-1.5 text-xs font-semibold h-9 px-3 shrink-0"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          <span>New Task</span>
        </Button>
      </div>

      {/* 1. Loading Skeleton State */}
      {showSkeleton ? (
        <SkeletonCardList count={4} />
      ) : isError ? (
        /* 2. Error State with Retry Button */
        <InlineError
          message="Failed to load tasks from server or local storage."
          onRetry={onRetry}
        />
      ) : tasks.length === 0 ? (
        /* 3. Empty State */
        <div className="p-10 text-center rounded-xl border border-dashed border-border bg-card/40 my-6">
          <div className="h-10 w-10 rounded-xl bg-muted text-foreground flex items-center justify-center mx-auto mb-2.5">
            <FolderIcon className="h-5 w-5" />
          </div>
          <h3 className="font-heading font-medium text-sm text-foreground">No tasks yet</h3>
          <p className="text-xs text-muted-foreground mt-0.5 mb-4">
            Create a task to start logging subtasks and work history.
          </p>
          <Button onClick={onAddTask} size="sm" className="gap-1.5 text-xs font-semibold">
            <PlusIcon className="h-3.5 w-3.5" />
            <span>Create Task</span>
          </Button>
        </div>
      ) : filteredTasks.length === 0 ? (
        /* 4. Search Empty */
        <div className="p-6 text-center text-xs text-muted-foreground">
          No tasks found matching &quot;{search}&quot;.
        </div>
      ) : (
        /* 5. Rendered Tasks List */
        <div className="space-y-2">
          {filteredTasks.map((task) => {
            const count = countMap.get(task.id) || task.subtask_count || 0;
            const timeAgo = formatTimeAgo(task.created_at);
            const isDeleting = deletingTaskId === task.id;

            return (
              <div
                key={task.id}
                onClick={() => onSelectTask(task.id)}
                className="p-3.5 rounded-xl border border-border bg-card hover:bg-muted/40 transition-all cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="h-2 w-2 rounded-full shrink-0 bg-muted-foreground/60" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-heading font-medium text-sm text-foreground truncate">
                      {task.name}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                      <span className="font-mono tabular-nums">
                        {count} {count === 1 ? 'subtask' : 'subtasks'}
                      </span>
                      {timeAgo && (
                        <>
                          <span>•</span>
                          <span className="font-mono tabular-nums">Started {timeAgo}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => onEditTask(task)}
                      title="Edit title"
                      className="p-1 rounded text-muted-foreground hover:text-foreground"
                    >
                      <EditIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => handleDelete(task.id, task.name)}
                      title="Delete task"
                      className="p-1 rounded text-muted-foreground hover:text-destructive disabled:opacity-50"
                    >
                      {isDeleting ? (
                        <InlineSpinner size="xs" />
                      ) : (
                        <TrashIcon className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>

                  <span className="text-xs text-muted-foreground group-hover:text-foreground font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-all">
                    <span>Open</span>
                    <ArrowRightIcon className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
