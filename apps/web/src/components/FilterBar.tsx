import React, { useRef, useEffect } from 'react';
import {
  SearchIcon,
  XIcon,
  CalendarIcon,
  RotateCcwIcon,
  FolderIcon,
  ChevronDownIcon,
  PlusIcon,
  CheckIcon,
  EditIcon,
  TrashIcon,
  FileTextIcon,
} from './icons';
import { useUI } from '../context/UIContext';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { DatePicker } from './ui/date-picker';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import { InlineSpinner } from './LoadingFeedback';
import type { Title, DatePreset } from '@ledgr/shared';

interface FilterBarProps {
  titles: Title[];
  totalCount: number;
  filteredCount: number;
  onAddTitle: () => void;
  onEditTitle?: (title: Title) => void;
  onDeleteTitle?: (titleId: string) => void;
  onOpenAddSubtask: () => void;
  onOpenTaskPage?: (taskId: string) => void;
}

const PRESET_OPTIONS: Array<{ id: DatePreset; label: string }> = [
  { id: 'all', label: 'All History' },
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last_7_days', label: 'Last 7 Days' },
  { id: 'this_month', label: 'This Month' },
  { id: 'custom', label: 'Custom Range' },
];

export const FilterBar: React.FC<FilterBarProps> = ({
  titles,
  totalCount,
  filteredCount,
  onAddTitle,
  onEditTitle,
  onDeleteTitle,
  onOpenAddSubtask,
  onOpenTaskPage,
}) => {
  const {
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
    clearAllFilters,
    hasActiveFilters,
    setIsExportOpen,
  } = useUI();

  const [deletingTitleId, setDeletingTitleId] = React.useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global key listener for '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeTitle = titles.find((t) => t.id === selectedTitleId);
  const activeDateLabel =
    PRESET_OPTIONS.find((p) => p.id === datePreset)?.label || 'All History';

  return (
    <div className="w-full bg-card border-b border-border px-3 sm:px-6 py-2.5 transition-colors shadow-xs">
      <div className="max-w-5xl mx-auto space-y-2">
        {/* Responsive Grid / Flex:
            - Mobile: 2-column row for [Title] + [Date], followed by [Search]
            - Desktop: 1 unified row for [Title] + [Date] + [Search] + [+ Log Work] */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Mobile 2-column container for dropdowns */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2 shrink-0">
            {/* 1. Title Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto h-9 justify-between gap-1.5 px-2.5 sm:px-3 text-xs font-medium bg-background sm:min-w-[135px]"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {activeTitle ? (
                      <span className="h-2 w-2 rounded-full shrink-0 bg-muted-foreground/60" />
                    ) : (
                      <FolderIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className="truncate font-heading font-medium">
                      {activeTitle ? activeTitle.name : 'All Titles'}
                    </span>
                  </div>
                  <ChevronDownIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="left" className="w-56">
                <DropdownMenuItem
                  onClick={() => setSelectedTitleId(null)}
                  className="justify-between text-xs cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FolderIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>All Titles</span>
                  </div>
                  {selectedTitleId === null && <CheckIcon className="h-3.5 w-3.5 text-foreground" />}
                </DropdownMenuItem>

                {titles.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider py-1">
                      Workspaces ({titles.length})
                    </DropdownMenuLabel>
                    {titles.map((title) => (
                      <div
                        key={title.id}
                        className="flex items-center justify-between px-2 py-1.5 text-xs rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors group cursor-pointer"
                        onClick={() => setSelectedTitleId(title.id)}
                      >
                        <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                          <span className="h-2 w-2 rounded-full shrink-0 bg-muted-foreground/60" />
                          <span className="truncate font-heading font-medium">{title.name}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-1.5">
                          <span className="font-mono tabular-nums text-[10px] text-muted-foreground mr-1">
                            {title.subtask_count || 0}
                          </span>
                          {selectedTitleId === title.id && (
                            <CheckIcon className="h-3.5 w-3.5 text-foreground shrink-0" />
                          )}
                          {onEditTitle && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditTitle(title);
                              }}
                              title="Edit Title"
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                            >
                              <EditIcon className="h-3 w-3" />
                            </button>
                          )}
                          {onDeleteTitle && (
                            <button
                              type="button"
                              disabled={deletingTitleId === title.id}
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm(`Delete title "${title.name}" and all its logs?`)) {
                                  setDeletingTitleId(title.id);
                                  try {
                                    await onDeleteTitle(title.id);
                                  } finally {
                                    setDeletingTitleId(null);
                                  }
                                }
                              }}
                              title="Delete Title"
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive disabled:opacity-50"
                            >
                              {deletingTitleId === title.id ? (
                                <InlineSpinner size="xs" />
                              ) : (
                                <TrashIcon className="h-3 w-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onAddTitle}
                  className="gap-2 text-xs text-foreground font-medium cursor-pointer"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  <span>Create New Title...</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {activeTitle && onOpenTaskPage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenTaskPage(activeTitle.id)}
                className="h-9 px-2 text-[11px] text-foreground hover:bg-muted border-border shrink-0 hidden sm:inline-flex"
                title={`Open separate page for ${activeTitle.name}`}
              >
                <span>Task Page →</span>
              </Button>
            )}

            {/* 2. Date Range Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={datePreset !== 'all' ? 'secondary' : 'outline'}
                  size="sm"
                  className={`w-full sm:w-auto h-9 justify-between gap-1.5 px-2.5 sm:px-3 text-xs font-medium sm:min-w-[125px] ${
                    datePreset === 'all' ? 'bg-background' : ''
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <CalendarIcon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                    <span className="truncate">{activeDateLabel}</span>
                  </div>
                  <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="left" className="w-48">
                <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider py-1">
                  Date Filter
                </DropdownMenuLabel>
                {PRESET_OPTIONS.map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    onClick={() => setDatePreset(p.id)}
                    className="justify-between text-xs cursor-pointer"
                  >
                    <span>{p.label}</span>
                    {datePreset === p.id && <CheckIcon className="h-3.5 w-3.5 text-foreground" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* 3. Search Box + Reset */}
          <div className="flex items-center gap-1.5 flex-1">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search logs... (/)"
                className="pl-8 pr-8 bg-background h-9 text-xs rounded-md w-full"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                  title="Clear search"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>

            {/* Reset Filters Button (if active) */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                title="Reset all filters"
                className="h-9 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
              >
                <RotateCcwIcon className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Reset</span>
              </Button>
            )}
          </div>

          {/* Entry count indicator (desktop only) */}
          <span className="font-mono tabular-nums text-[11px] text-muted-foreground whitespace-nowrap hidden lg:inline px-1">
            {filteredCount} of {totalCount}
          </span>

          {/* Export Report Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExportOpen(true)}
            className="h-9 px-2.5 sm:px-3 text-xs gap-1.5 font-medium shrink-0 border-border"
            title="Export PDF / Excel report"
          >
            <FileTextIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="hidden xs:inline">Export</span>
          </Button>

          {/* 4. Desktop "+ Log Entry" Button */}
          <Button
            variant="default"
            size="sm"
            onClick={onOpenAddSubtask}
            className="hidden sm:inline-flex h-9 px-3.5 text-xs gap-1.5 font-medium shrink-0"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Log Work</span>
          </Button>
        </div>

        {/* Custom Date Range Picker (shown only when custom is selected) */}
        {datePreset === 'custom' && (
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 p-2.5 rounded-lg bg-muted/40 border border-border text-xs animate-in fade-in">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-[11px] shrink-0">From</span>
              <DatePicker
                value={customStartDate || ''}
                onChange={(val) => setCustomStartDate(val || undefined)}
                placeholder="Start date"
                className="h-7 w-full sm:w-36 text-xs bg-background"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-[11px] shrink-0">To</span>
              <DatePicker
                value={customEndDate || ''}
                onChange={(val) => setCustomEndDate(val || undefined)}
                placeholder="End date"
                className="h-7 w-full sm:w-36 text-xs bg-background"
              />
            </div>
            <span className="text-[10px] text-muted-foreground ml-auto hidden sm:inline col-span-2">
              (Past dates only)
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
