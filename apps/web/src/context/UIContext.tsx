import React, { createContext, useContext, useState, useEffect } from 'react';
import type { DatePreset, SubtaskStatus } from '@ledgr/shared';
import type { DensityMode, ThemeMode } from '../types';

interface UIContextType {
  selectedTitleId: string | null;
  setSelectedTitleId: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  datePreset: DatePreset;
  setDatePreset: (preset: DatePreset) => void;
  customStartDate?: string;
  setCustomStartDate: (date?: string) => void;
  customEndDate?: string;
  setCustomEndDate: (date?: string) => void;
  statusFilter?: SubtaskStatus;
  setStatusFilter: (status?: SubtaskStatus) => void;
  density: DensityMode;
  toggleDensity: () => void;
  theme: ThemeMode;
  toggleTheme: () => void;
  isSelectionMode: boolean;
  setIsSelectionMode: (active: boolean) => void;
  selectedSubtaskIds: Set<string>;
  toggleSelectSubtask: (id: string) => void;
  selectAllSubtasks: (ids: string[]) => void;
  clearSelectedSubtasks: () => void;
  isAddSubtaskOpen: boolean;
  setIsAddSubtaskOpen: (open: boolean) => void;
  isAddTitleOpen: boolean;
  setIsAddTitleOpen: (open: boolean) => void;
  isExportOpen: boolean;
  setIsExportOpen: (open: boolean) => void;
  isShortcutsOpen: boolean;
  setIsShortcutsOpen: (open: boolean) => void;
  isAuthOpen: boolean;
  setIsAuthOpen: (open: boolean) => void;
  clearAllFilters: () => void;
  hasActiveFilters: boolean;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedTitleId, setSelectedTitleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customStartDate, setCustomStartDate] = useState<string | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<SubtaskStatus | undefined>(undefined);

  const [density, setDensity] = useState<DensityMode>(() => {
    return (localStorage.getItem('logpast_density') as DensityMode) || 'comfortable';
  });

  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem('logpast_theme') as ThemeMode) || 'dark';
  });

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedSubtaskIds, setSelectedSubtaskIds] = useState<Set<string>>(new Set());

  const [isAddSubtaskOpen, setIsAddSubtaskOpen] = useState(false);
  const [isAddTitleOpen, setIsAddTitleOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Sync URL query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const title = params.get('title');
    const q = params.get('q');
    const preset = params.get('preset') as DatePreset;
    const start = params.get('start');
    const end = params.get('end');
    const status = params.get('status') as SubtaskStatus;

    if (title) setSelectedTitleId(title);
    if (q) setSearchQuery(q);
    if (preset) setDatePreset(preset);
    if (start) setCustomStartDate(start);
    if (end) setCustomEndDate(end);
    if (status) setStatusFilter(status);
  }, []);

  // Update URL state (shareable, bookmarkable, refresh-safe)
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedTitleId) params.set('title', selectedTitleId);
    if (searchQuery) params.set('q', searchQuery);
    if (datePreset && datePreset !== 'all') params.set('preset', datePreset);
    if (customStartDate) params.set('start', customStartDate);
    if (customEndDate) params.set('end', customEndDate);
    if (statusFilter) params.set('status', statusFilter);

    const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, [selectedTitleId, searchQuery, datePreset, customStartDate, customEndDate, statusFilter]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('logpast_theme', theme);
  }, [theme]);

  // Apply density
  useEffect(() => {
    localStorage.setItem('logpast_density', density);
  }, [density]);

  const toggleDensity = () => {
    setDensity((prev) => (prev === 'comfortable' ? 'compact' : 'comfortable'));
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const toggleSelectSubtask = (id: string) => {
    setSelectedSubtaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllSubtasks = (ids: string[]) => {
    setSelectedSubtaskIds(new Set(ids));
  };

  const clearSelectedSubtasks = () => {
    setSelectedSubtaskIds(new Set());
  };

  const clearAllFilters = () => {
    setSelectedTitleId(null);
    setSearchQuery('');
    setDatePreset('all');
    setCustomStartDate(undefined);
    setCustomEndDate(undefined);
    setStatusFilter(undefined);
  };

  const hasActiveFilters = Boolean(
    selectedTitleId || searchQuery || datePreset !== 'all' || customStartDate || customEndDate || statusFilter
  );

  return (
    <UIContext.Provider
      value={{
        selectedTitleId,
        setSelectedTitleId,
        searchQuery,
        setSearchQuery,
        datePreset,
        setDatePreset,
        customStartDate,
        setCustomStartDate,
        customEndDate,
        setCustomEndDate,
        statusFilter,
        setStatusFilter,
        density,
        toggleDensity,
        theme,
        toggleTheme,
        isSelectionMode,
        setIsSelectionMode,
        selectedSubtaskIds,
        toggleSelectSubtask,
        selectAllSubtasks,
        clearSelectedSubtasks,
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
        clearAllFilters,
        hasActiveFilters
      }}
    >
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) throw new Error('useUI must be used within a UIProvider');
  return context;
};
