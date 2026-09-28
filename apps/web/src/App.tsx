import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, DownloadIcon } from './components/icons';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { TitleSidebar } from './components/TitleSidebar';
import { SubtaskList } from './components/SubtaskList';
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

  // 2. Fetch Subtasks Query
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
        // Local Dexie query & filter
        let localItems = await localDb.subtasks.toArray();
        localItems = localItems.filter((s) => !s.deleted_at && (!user?.id || s.user_id === user.id));

        if (selectedTitleId) {
          localItems = localItems.filter((s) => s.title_id === selectedTitleId);
        }

        if (statusFilter) {
          localItems = localItems.filter((s) => s.status === statusFilter);
        }

        // Date preset filtering
        const { startDate, endDate } = datePreset !== 'all' && datePreset !== 'custom'
          ? getDateRangeFromPreset(datePreset)
          : { startDate: customStartDate, endDate: customEndDate };
        if (startDate) localItems = localItems.filter((s) => s.entry_date >= startDate);
        if (endDate) localItems = localItems.filter((s) => s.entry_date <= endDate);

        // Search text filtering
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
            color: input.color || '#0d9488',
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
      if (saved?.id) {
        setSelectedTitleId(saved.id);
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
    },
  });

  const archiveTitleMutation = useMutation({
    mutationFn: async ({ id, isArchived }: { id: string; isArchived: boolean }) => {
      await localDb.titles.update(id, { is_archived: isArchived });
      await syncEngine.queueMutation('UPDATE_TITLE', id, { is_archived: isArchived });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['titles'] });
    },
  });

  // Enforce Mandatory Authentication (AuthGate)
  if (!user && !isAuthLoading) {
    return <AuthGate />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary selection:text-primary-foreground pb-20 sm:pb-0">
      {/* Header */}
      <Header />

      {/* Filter & Search Bar */}
      <FilterBar totalCount={totalCount} filteredCount={subtasks.length} />

      {/* Main Two-Pane Split Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col lg:flex-row overflow-hidden">
        {/* Left Titles Sidebar */}
        <TitleSidebar
          titles={titles}
          onAddTitle={() => {
            setEditingTitle(null);
            setIsAddTitleOpen(true);
          }}
          onEditTitle={(title) => {
            setEditingTitle(title);
            setIsAddTitleOpen(true);
          }}
          onDeleteTitle={(id) => deleteTitleMutation.mutate(id)}
          onArchiveTitle={(id, isArchived) => archiveTitleMutation.mutate({ id, isArchived })}
        />

        {/* Right Subtask Feed */}
        <main className="flex-1 overflow-y-auto bg-background">
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
          />
        </main>
      </div>

      {/* Mobile Floating Action Button (+) */}
      <div className="fixed bottom-6 right-6 z-30 flex items-center gap-2 sm:hidden">
        <button
          type="button"
          onClick={() => {
            setEditingSubtask(null);
            setIsAddSubtaskOpen(true);
          }}
          className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl flex items-center justify-center transition-transform active:scale-95"
          title="Log Past Task"
        >
          <PlusIcon className="h-6 w-6" />
        </button>
      </div>

      {/* Selection Mode Bottom Floating Export Bar */}
      {isSelectionMode && selectedSubtaskIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] sm:w-auto min-w-[320px] p-2.5 rounded-xl bg-card border border-border text-foreground shadow-2xl flex items-center justify-between gap-4 animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2 pl-2">
            <span className="font-bold text-sm text-primary">
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
