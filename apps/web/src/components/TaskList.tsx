import React, { useState, useMemo } from 'react';
import {
  PlusIcon,
  SearchIcon,
  FolderIcon,
  ArrowRightIcon,
  CalendarIcon,
  EditIcon,
  TrashIcon,
} from './icons';
import { Button } from './ui/button';
import { Input } from './ui/input';
import type { Title, Subtask } from '@ledgr/shared';

interface TaskListProps {
  tasks: Title[];
  allSubtasks: Subtask[];
  isLoading: boolean;
  onSelectTask: (taskId: string) => void;
  onAddTask: () => void;
  onEditTask: (task: Title) => void;
  onDeleteTask: (taskId: string) => void;
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
  onSelectTask,
  onAddTask,
  onEditTask,
  onDeleteTask,
}) => {
  const [search, setSearch] = useState('');

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
    if (!search.trim()) return tasks;
    const q = search.toLowerCase().trim();
    return tasks.filter((t) => t.name.toLowerCase().includes(q));
  }, [tasks, search]);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 rounded-xl bg-card border border-border animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
      {/* Search and Add Task Header */}
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

      {/* Empty State */}
      {tasks.length === 0 && (
        <div className="p-10 text-center rounded-xl border border-dashed border-border bg-card/40 my-6">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2.5">
            <FolderIcon className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-foreground">No tasks yet</h3>
          <p className="text-xs text-muted-foreground mt-0.5 mb-4">
            Create a task to start logging subtasks and work history.
          </p>
          <Button onClick={onAddTask} size="sm" className="gap-1.5 text-xs font-semibold">
            <PlusIcon className="h-3.5 w-3.5" />
            <span>Create Task</span>
          </Button>
        </div>
      )}

      {/* Search empty */}
      {tasks.length > 0 && filteredTasks.length === 0 && (
        <div className="p-6 text-center text-xs text-muted-foreground">
          No tasks found matching &quot;{search}&quot;.
        </div>
      )}

      {/* Clean Tasks List */}
      {filteredTasks.length > 0 && (
        <div className="space-y-2">
          {filteredTasks.map((task) => {
            const count = countMap.get(task.id) || task.subtask_count || 0;
            const timeAgo = formatTimeAgo(task.created_at);

            return (
              <div
                key={task.id}
                onClick={() => onSelectTask(task.id)}
                className="p-3.5 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: task.color || '#0d9488' }}
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                      {task.name}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                      <span>{count} {count === 1 ? 'subtask' : 'subtasks'}</span>
                      {timeAgo && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="h-2.5 w-2.5" />
                            <span>Started {timeAgo}</span>
                          </span>
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
                      onClick={() => {
                        if (confirm(`Delete task "${task.name}"?`)) {
                          onDeleteTask(task.id);
                        }
                      }}
                      title="Delete task"
                      className="p-1 rounded text-muted-foreground hover:text-destructive"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <span className="text-xs text-primary font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
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
