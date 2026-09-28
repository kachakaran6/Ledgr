import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, DownloadIcon } from './components/icons';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { SubtaskList } from './components/SubtaskList';
import { TaskList } from './components/TaskList';
import { TaskDetailPage } from './components/TaskDetailPage';
import { AddSubtaskModal } from './components/AddSubtaskModal';
import { AddTitleModal } from './components/AddTitleModal';
import { ExportModal } from './components/ExportModal';
import { ShortcutsHelpModal } from './components/ShortcutsHelpModal';
import { AuthModal } from './components/AuthModal';
import { AuthGate } from './components/AuthGate';
import { Button } from './components/ui/button';
import { useUI } from './context/UIContext';
import { useAuth } from './context/AuthContext';
import { api } from './lib/api';
import { localDb } from './lib/db';
import { syncEngine } from './lib/sync';
import { getDateRangeFromPreset } from '@ledgr/shared';
import type { Title, Subtask, CreateSubtaskInput, CreateTitleInput } from '@ledgr/shared';

export const App: React.FC = () => {
  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAuth();
  const {
    selectedTitleId,
    setSelectedTitleId,
    searchQuery,
    datePreset,
    customStartDate,
    customEndDate,
    statusFilter,
    isSelectionMode,
    setIsSelectionMode,
    selectedSubtaskIds,
    toggleTheme,
    isAddSubtaskOpen,
    setIsAddSubtaskOpen,
    isAddTitleOpen,
    setIsAddTitleOpen,
    isExportOpen,
    setIsExportOpen,
    isShortcutsOpen,
    setIsShortcutsOpen,
    isAuthOpen,
    setIsAuthOpen,
  } = useUI();

  const [editingSubtask, setEditingSubtask] = useState<Subtask | null>(null);
  const [editingTitle, setEditingTitle] = useState<Title | null>(null);

  // Active Task for dedicated separate page
  const [activeTaskId, setActiveTaskId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('taskId') || params.get('task') || null;
  });

  // Main screen active tab: 'tasks' (default) vs 'ledger'
  const [activeTab, setActiveTab] = useState<'tasks' | 'ledger'>(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('tab') as 'tasks' | 'ledger') || 'tasks';
  });

  // Sync activeTaskId and activeTab with URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (activeTaskId) {
      params.set('taskId', activeTaskId);
    } else {
      params.delete('taskId');
      params.delete('task');
    }
    if (activeTab === 'ledger') {
      params.set('tab', 'ledger');
    } else {
      params.delete('tab');
    }
    const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, [activeTaskId, activeTab]);

  // Handle browser Back / Forward buttons cleanly
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setActiveTaskId(params.get('taskId') || params.get('task') || null);
      setActiveTab((params.get('tab') as 'tasks' | 'ledger') || 'tasks');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setEditingSubtask(null);
        setIsAddSubtaskOpen(true);
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        setIsSelectionMode(!isSelectionMode);
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        toggleTheme();
      } else if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen(true);
      } else if (e.key === 'Escape') {
        setIsAddSubtaskOpen(false);
        setIsAddTitleOpen(false);
        setIsExportOpen(false);
        setIsShortcutsOpen(false);
        setIsAuthOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelectionMode, setIsSelectionMode, toggleTheme, setIsShortcutsOpen, setIsAddSubtaskOpen, setIsAddTitleOpen, setIsExportOpen, setIsAuthOpen]);

  // 1. Fetch Titles Query
  const { data: titles = [] } = useQuery<Title[]>({
    queryKey: ['titles', user?.id],
    queryFn: async () => {
      try {
        const serverTitles = await api.getTitles();
        if (serverTitles && Array.isArray(serverTitles)) {
          await localDb.titles.bulkPut(serverTitles);
          return serverTitles;
        }
      } catch {
        // Fallback to local Dexie
      }
      const allLocal = await localDb.titles.toArray();
      return allLocal.filter((t) => !t.is_archived && !t.deleted_at && (!user?.id || t.user_id === user.id));
    },
    enabled: !!user && !!api.getToken(),
  });

  // 2. Fetch All User Subtasks (for task statistics on home screen)
  const { data: allUserSubtasks = [] } = useQuery<Subtask[]>({
    queryKey: ['allUserSubtasks', user?.id],
    queryFn: async () => {
      try {
        const serverData = await api.getSubtasks({ limit: 1000 });
        if (serverData && Array.isArray(serverData.items)) {
          await localDb.subtasks.bulkPut(serverData.items);
          return serverData.items;
        }
      } catch {
        // Fallback to Dexie
      }
      const local = await localDb.subtasks.toArray();
      return local.filter((s) => !s.deleted_at && (!user?.id || s.user_id === user.id));
    },
    enabled: !!user && !!api.getToken(),
  });

  // 3. Fetch Subtasks Query for Active Task (Separate Page)
  const { data: activeTaskSubtasks = [], isLoading: isLoadingTaskSubtasks } = useQuery<Subtask[]>({
    queryKey: ['activeTaskSubtasks', user?.id, activeTaskId],
    queryFn: async () => {
      if (!activeTaskId) return [];
      try {
        const serverData = await api.getSubtasks({
          title_ids: [activeTaskId],
          limit: 1000,
        });
        if (serverData && Array.isArray(serverData.items)) {
          await localDb.subtasks.bulkPut(serverData.items);
          return serverData.items;
        }
      } catch {
        // Fallback to Dexie
      }
      const local = await localDb.subtasks.where('title_id').equals(activeTaskId).toArray();
      return local.filter((s) => !s.deleted_at && (!user?.id || s.user_id === user.id));
    },
    enabled: !!activeTaskId && !!user && !!api.getToken(),
  });

  // 4. Fetch Subtasks Query for Ledger / All Activity Log (with filters)
  const { data: subtasksData, isLoading } = useQuery<{ items: Subtask[]; total: number }>({
    queryKey: ['subtasks', user?.id, selectedTitleId, searchQuery, datePreset, customStartDate, customEndDate, statusFilter],
    queryFn: async () => {
      let items: Subtask[] = [];
      try {
        const serverData = await api.getSubtasks({
          title_ids: selectedTitleId ? [selectedTitleId] : undefined,
          search: searchQuery || undefined,
          date_preset: datePreset !== 'all' && datePreset !== 'custom' ? datePreset : undefined,
          start_date: datePreset === 'custom' ? customStartDate : undefined,
          end_date: datePreset === 'custom' ? customEndDate : undefined,
          status: statusFilter,
          limit: 1000,
        });
        if (serverData && Array.isArray(serverData.items)) {
          await localDb.subtasks.bulkPut(serverData.items);
          items = serverData.items;
        }
      } catch {
        // Fallback to Dexie
      }

      if (items.length === 0) {
        let localItems = await localDb.subtasks.toArray();
        localItems = localItems.filter((s) => !s.deleted_at && (!user?.id || s.user_id === user.id));

        if (selectedTitleId) {
          localItems = localItems.filter((s) => s.title_id === selectedTitleId);
        }

        if (statusFilter) {
          localItems = localItems.filter((s) => s.status === statusFilter);
        }

        const { startDate, endDate } = datePreset !== 'all' && datePreset !== 'custom'
          ? getDateRangeFromPreset(datePreset)
          : { startDate: customStartDate, endDate: customEndDate };
        if (startDate) localItems = localItems.filter((s) => s.entry_date >= startDate);
        if (endDate) localItems = localItems.filter((s) => s.entry_date <= endDate);

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          localItems = localItems.filter(
            (s) =>
              s.description.toLowerCase().includes(q) ||
              s.tags.some((t) => t.toLowerCase().includes(q))
          );
        }

        items = localItems;
      }

      // Attach title object
      const titleMap = new Map(titles.map((t) => [t.id, t]));
      items = items.map((s) => ({ ...s, title: s.title || titleMap.get(s.title_id) }));

      // Sort newest-first
      items.sort((a, b) => b.entry_date.localeCompare(a.entry_date) || (b.created_at || '').localeCompare(a.created_at || ''));

      return { items, total: items.length };
    },
    enabled: !!user && !!api.getToken(),
  });

  const subtasks = subtasksData?.items || [];
  const totalCount = subtasksData?.total || 0;

  // Selected subtasks for export
  const selectedSubtasksForExport = selectedSubtaskIds.size > 0
    ? subtasks.filter((s) => selectedSubtaskIds.has(s.id))
    : subtasks;

  // Mutations
  const saveSubtaskMutation = useMutation({
    mutationFn: async (input: CreateSubtaskInput) => {
      let saved: Subtask;
      if (editingSubtask) {
        try {
          saved = await api.updateSubtask(editingSubtask.id, input);
          await localDb.subtasks.put(saved);
        } catch {
          saved = { ...editingSubtask, ...input, updated_at: new Date().toISOString() };
          await localDb.subtasks.put(saved);
          await syncEngine.queueMutation('UPDATE_SUBTASK', editingSubtask.id, input);
        }
      } else {
        try {
          saved = await api.createSubtask(input);
          await localDb.subtasks.put(saved);
        } catch {
          const newId = crypto.randomUUID();
          saved = {
            id: newId,
            user_id: user?.id || '',
            title_id: input.title_id,
            description: input.description,
            entry_date: input.entry_date,
            status: input.status || 'done',
            tags: input.tags || [],
            cost: input.cost ?? null,
            time_spent_minutes: input.time_spent_minutes ?? null,
            sort_order: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
          };
          await localDb.subtasks.add(saved);
          await syncEngine.queueMutation('CREATE_SUBTASK', newId, input);
        }
      }
      return saved;
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks'] });
      queryClient.invalidateQueries({ queryKey: ['allUserSubtasks'] });
      queryClient.invalidateQueries({ queryKey: ['activeTaskSubtasks'] });
      queryClient.invalidateQueries({ queryKey: ['titles'] });
      if (saved && selectedTitleId && saved.title_id !== selectedTitleId) {
        setSelectedTitleId(null);
      }
    },
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        await api.deleteSubtask(id);
      } catch {
        // Fallback
      }
      await localDb.subtasks.delete(id);
      await syncEngine.queueMutation('DELETE_SUBTASK', id, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks'] });
      queryClient.invalidateQueries({ queryKey: ['allUserSubtasks'] });
      queryClient.invalidateQueries({ queryKey: ['activeTaskSubtasks'] });
      queryClient.invalidateQueries({ queryKey: ['titles'] });
    },
  });

  const saveTitleMutation = useMutation({
    mutationFn: async (input: CreateTitleInput) => {
      let saved: Title;
      if (editingTitle) {
        try {
          saved = await api.updateTitle(editingTitle.id, input);
          await localDb.titles.put(saved);
        } catch {
          saved = { ...editingTitle, ...input, updated_at: new Date().toISOString() };
          await localDb.titles.put(saved);
          await syncEngine.queueMutation('UPDATE_TITLE', editingTitle.id, input);
        }
      } else {
        try {
          saved = await api.createTitle(input);
          await localDb.titles.put(saved);
        } catch {
          const newId = crypto.randomUUID();
          saved = {
            id: newId,
            user_id: user?.id || '',
            name: input.name,
            color: input.color || 'var(--muted-foreground)',
            icon: input.icon || 'folder',
            is_archived: false,
            sort_order: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
          };
          await localDb.titles.add(saved);
          await syncEngine.queueMutation('CREATE_TITLE', newId, input);
        }
      }
      return saved;
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['titles'] });
      // When a new task is created, automatically open it in its separate page!
      if (saved?.id && !editingTitle) {
        setActiveTaskId(saved.id);
      }
    },
  });

  const deleteTitleMutation = useMutation({
    mutationFn: async (id: string) => {
      await localDb.titles.delete(id);
      await localDb.subtasks.where('title_id').equals(id).delete();
      await syncEngine.queueMutation('DELETE_TITLE', id, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['titles'] });
      queryClient.invalidateQueries({ queryKey: ['subtasks'] });
      queryClient.invalidateQueries({ queryKey: ['allUserSubtasks'] });
      queryClient.invalidateQueries({ queryKey: ['activeTaskSubtasks'] });
      if (activeTaskId) {
        setActiveTaskId(null);
      }
    },
  });

  // Enforce Mandatory Authentication (AuthGate)
  if (!user && !isAuthLoading) {
    return <AuthGate />;
  }

  // =========================================================================
  // VIEW 1: DEDICATED SEPARATE PAGE FOR A TASK (activeTaskId is set)
  // =========================================================================
  if (activeTaskId) {
    const activeTask = titles.find((t) => t.id === activeTaskId);

    return (
      <div className="min-h-screen bg-background text-foreground">
        {activeTask ? (
          <TaskDetailPage
            task={activeTask}
            subtasks={activeTaskSubtasks}
            isLoading={isLoadingTaskSubtasks}
            onBack={() => setActiveTaskId(null)}
            onUpdateTitle={async (_titleId, input) => {
              setEditingTitle(activeTask);
              await saveTitleMutation.mutateAsync({
                name: input.name,
                color: input.color || activeTask.color || 'var(--muted-foreground)',
                icon: activeTask.icon || 'folder',
                sort_order: activeTask.sort_order || 0,
              });
              setEditingTitle(null);
            }}
            onDeleteTitle={async (titleId) => {
              await deleteTitleMutation.mutateAsync(titleId);
              setActiveTaskId(null);
            }}
            onAddSubtask={async (input) => {
              await saveSubtaskMutation.mutateAsync(input);
            }}
            onEditSubtask={(subtask) => {
              setEditingSubtask(subtask);
              setIsAddSubtaskOpen(true);
            }}
            onDeleteSubtask={async (subtaskId) => {
              await deleteSubtaskMutation.mutateAsync(subtaskId);
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center min-h-[50vh]">
            <h2 className="text-base font-bold text-foreground">Task not found</h2>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              This task may have been deleted or the link is invalid.
            </p>
            <Button onClick={() => setActiveTaskId(null)} size="sm">
              Back to Tasks
            </Button>
          </div>
        )}

        {/* Edit Subtask Modal if opened from TaskDetailPage */}
        <AddSubtaskModal
          isOpen={isAddSubtaskOpen}
          onClose={() => {
            setIsAddSubtaskOpen(false);
            setEditingSubtask(null);
          }}
          titles={titles}
          selectedTitleId={activeTaskId}
          onCreateTitlePrompt={() => {
            setEditingTitle(null);
            setIsAddTitleOpen(true);
          }}
          onSave={async (input) => {
            await saveSubtaskMutation.mutateAsync(input);
          }}
          editingSubtask={editingSubtask}
        />
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: MAIN SCREEN (Tasks list or All Activity Ledger)
  // =========================================================================
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary selection:text-primary-foreground pb-20 sm:pb-0">
      {/* Header */}
      <Header />

      {/* Top View Switcher Tabs: [Tasks] and [All Logs] */}
      <div className="border-b border-border bg-card/60 px-4 sm:px-6 sticky top-13 z-20 backdrop-blur-md">
        <div className="max-w-3xl mx-auto flex items-center gap-4 sm:gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('tasks')}
            className={`py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'tasks'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Tasks</span>
            <span className="font-mono tabular-nums text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
              {titles.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'ledger'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>All Logs</span>
            <span className="font-mono tabular-nums text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
              {totalCount}
            </span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <main className="flex-1 overflow-y-auto bg-background">
        {activeTab === 'tasks' ? (
          <TaskList
            tasks={titles}
            allSubtasks={allUserSubtasks}
            isLoading={isAuthLoading}
            onSelectTask={(taskId) => setActiveTaskId(taskId)}
            onAddTask={() => {
              setEditingTitle(null);
              setIsAddTitleOpen(true);
            }}
            onEditTask={(title) => {
              setEditingTitle(title);
              setIsAddTitleOpen(true);
            }}
            onDeleteTask={(taskId) => deleteTitleMutation.mutate(taskId)}
          />
        ) : (
          <>
            {/* Unified Filter Bar: [Title] [Date Range] [Search] [+ Log] */}
            <FilterBar
              titles={titles}
              totalCount={totalCount}
              filteredCount={subtasks.length}
              onAddTitle={() => {
                setEditingTitle(null);
                setIsAddTitleOpen(true);
              }}
              onEditTitle={(title) => {
                setEditingTitle(title);
                setIsAddTitleOpen(true);
              }}
              onDeleteTitle={(id) => deleteTitleMutation.mutate(id)}
              onOpenAddSubtask={() => {
                setEditingSubtask(null);
                setIsAddSubtaskOpen(true);
              }}
              onOpenTaskPage={(taskId) => setActiveTaskId(taskId)}
            />

            {/* Main Single-Pane Log Feed */}
            <SubtaskList
              subtasks={subtasks}
              isLoading={isLoading}
              onEditSubtask={(subtask) => {
                setEditingSubtask(subtask);
                setIsAddSubtaskOpen(true);
              }}
              onDeleteSubtask={(id) => deleteSubtaskMutation.mutate(id)}
              onOpenAddModal={() => {
                setEditingSubtask(null);
                setIsAddSubtaskOpen(true);
              }}
              onOpenTaskPage={(taskId) => setActiveTaskId(taskId)}
            />
          </>
        )}
      </main>

      {/* Mobile Floating Action Button (+) */}
      <div className="fixed bottom-6 right-6 z-30 flex items-center gap-2 sm:hidden">
        <button
          type="button"
          onClick={() => {
            if (activeTab === 'tasks') {
              setEditingTitle(null);
              setIsAddTitleOpen(true);
            } else {
              setEditingSubtask(null);
              setIsAddSubtaskOpen(true);
            }
          }}
          className="h-12 w-12 rounded-full bg-primary hover:opacity-90 text-primary-foreground shadow-lg flex items-center justify-center transition-transform active:scale-95"
          title={activeTab === 'tasks' ? 'Add Task' : 'Log Past Work'}
        >
          <PlusIcon className="h-6 w-6" />
        </button>
      </div>

      {/* Selection Mode Bottom Floating Export Bar */}
      {isSelectionMode && selectedSubtaskIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] sm:w-auto min-w-[320px] p-2.5 rounded-xl bg-card border border-border text-foreground shadow-2xl flex items-center justify-between gap-4 animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2 pl-2">
            <span className="font-mono tabular-nums font-bold text-sm text-foreground">
              {selectedSubtaskIds.size}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">records selected</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsExportOpen(true)}
              className="gap-1.5 font-medium text-xs h-8"
            >
              <DownloadIcon className="h-3.5 w-3.5" />
              <span>Export Selected</span>
            </Button>
          </div>
        </div>
      )}

      {/* Modals & Drawers */}
      <AddSubtaskModal
        isOpen={isAddSubtaskOpen}
        onClose={() => {
          setIsAddSubtaskOpen(false);
          setEditingSubtask(null);
        }}
        titles={titles}
        selectedTitleId={selectedTitleId}
        onCreateTitlePrompt={() => {
          setEditingTitle(null);
          setIsAddTitleOpen(true);
        }}
        onSave={async (input) => {
          await saveSubtaskMutation.mutateAsync(input);
        }}
        editingSubtask={editingSubtask}
      />

      <AddTitleModal
        isOpen={isAddTitleOpen}
        onClose={() => {
          setIsAddTitleOpen(false);
          setEditingTitle(null);
        }}
        onSave={async (input) => {
          await saveTitleMutation.mutateAsync(input);
        }}
        editingTitle={editingTitle}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        subtasks={selectedSubtasksForExport}
        selectedCount={selectedSubtaskIds.size}
      />

      <ShortcutsHelpModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />
    </div>
  );
};
