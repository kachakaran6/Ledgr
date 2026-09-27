import React, { useRef, useEffect } from 'react';
import { SearchIcon, XIcon, CalendarIcon, RotateCcwIcon } from './icons';
import { useUI } from '../context/UIContext';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import type { DatePreset, SubtaskStatus } from '@ledgr/shared';

interface FilterBarProps {
  totalCount: number;
  filteredCount: number;
}

const PRESETS: Array<{ id: DatePreset; label: string }> = [
  { id: 'all', label: 'All History' },
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last_7_days', label: 'Last 7 Days' },
  { id: 'this_month', label: 'This Month' },
  { id: 'custom', label: 'Custom Range' },
];

const STATUSES: Array<{ id: SubtaskStatus | 'all'; label: string; variant: 'outline' | 'done' | 'inProgress' | 'cancelled' }> = [
  { id: 'all', label: 'All Status', variant: 'outline' },
  { id: 'done', label: 'Done', variant: 'done' },
  { id: 'in_progress', label: 'In Progress', variant: 'inProgress' },
  { id: 'cancelled', label: 'Cancelled', variant: 'cancelled' },
];

export const FilterBar: React.FC<FilterBarProps> = ({ totalCount, filteredCount }) => {
  const {
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
    clearAllFilters,
    hasActiveFilters,
  } = useUI();

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global key listener for '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="w-full bg-card/60 border-b border-border/80 px-4 sm:px-6 py-3 transition-colors">
      <div className="max-w-7xl mx-auto space-y-3">
        {/* Search Bar + Live Count Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search past work logs, titles, parts, tags... (Press / to focus)"
              className="pl-9 pr-16 bg-background h-9 rounded-lg"
            />
            {searchQuery ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground"
              >
                <XIcon className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <kbd className="hidden sm:inline-block absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono bg-muted text-muted-foreground border border-border rounded">
                /
              </kbd>
            )}
          </div>

          {/* Live Count & Reset Button */}
          <div className="flex items-center justify-between sm:justify-end gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background border border-border text-xs text-muted-foreground">
              <span className="font-semibold text-primary">{filteredCount}</span>
              <span>of {totalCount} tasks</span>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-8 gap-1 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <RotateCcwIcon className="h-3 w-3" />
                <span>Reset</span>
              </Button>
            )}
          </div>
        </div>

        {/* Date Preset Filter Chips & Status Filter Row */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <div className="flex items-center gap-1 text-muted-foreground mr-1 pl-0.5">
            <CalendarIcon className="h-3.5 w-3.5" />
          </div>

          {PRESETS.map((p) => {
            const isActive = datePreset === p.id;
            return (
              <Button
                key={p.id}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDatePreset(p.id)}
                className="h-7 px-2.5 text-xs font-medium rounded-md whitespace-nowrap"
              >
                {p.label}
              </Button>
            );
          })}

          <Separator orientation="vertical" className="h-4 mx-1.5" />

          {/* Status Filters - Text Only Semantic Badges / Buttons */}
          <div className="flex items-center gap-1">
            {STATUSES.map((s) => {
              const isSelected = (s.id === 'all' && !statusFilter) || statusFilter === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStatusFilter(s.id === 'all' ? undefined : (s.id as SubtaskStatus))}
                  className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-foreground text-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Date Range Picker */}
        {datePreset === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-background border border-border text-xs animate-in fade-in">
            <span className="font-medium text-foreground">Custom Past Range:</span>
            <div className="flex items-center gap-2">
              <label className="text-muted-foreground">From:</label>
              <Input
                type="date"
                max={todayStr}
                value={customStartDate || ''}
                onChange={(e) => setCustomStartDate(e.target.value || undefined)}
                className="h-8 w-auto text-xs bg-card"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-muted-foreground">To:</label>
              <Input
                type="date"
                max={todayStr}
                value={customEndDate || ''}
                onChange={(e) => setCustomEndDate(e.target.value || undefined)}
                className="h-8 w-auto text-xs bg-card"
              />
            </div>
            <Badge variant="outline" className="text-[11px] text-amber-500 border-amber-500/30">
              Future dates disabled
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
};
