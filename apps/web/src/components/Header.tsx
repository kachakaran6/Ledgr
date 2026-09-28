import React from 'react';
import {
  HistoryIcon,
  CloudSlashIcon,
  MoonIcon,
  SunIcon,
  HelpCircleIcon,
  UserIcon,
  LogOutIcon,
  DownloadIcon,
  TrashIcon,
  CheckSquareIcon,
  SquareIcon,
  RefreshCwIcon,
} from './icons';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useSyncStatus } from '../lib/sync';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';

export const Header: React.FC = () => {
  const { user, logout, exportAllData, deleteAccount } = useAuth();
  const {
    theme,
    toggleTheme,
    isSelectionMode,
    setIsSelectionMode,
    clearSelectedSubtasks,
    setIsShortcutsOpen,
    setIsAuthOpen,
  } = useUI();
  const { status, pendingCount, flush } = useSyncStatus();

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-card/95 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-13 py-2 flex items-center justify-between gap-3">
        {/* Brand Group */}
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shadow-xs">
            <HistoryIcon className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm sm:text-base font-bold tracking-tight text-foreground">
              LogPast
            </span>
            <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono uppercase tracking-wider text-muted-foreground border-border">
              Ledger
            </Badge>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {/* Sync Status Badge */}
          <button
            type="button"
            onClick={flush}
            title={status === 'offline' ? `Offline (${pendingCount} queued)` : 'Click to sync now'}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted/70 transition-colors"
          >
            {status === 'synced' && (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-[11px] hidden sm:inline text-muted-foreground">Synced</span>
              </>
            )}
            {status === 'syncing' && (
              <>
                <RefreshCwIcon className="h-3 w-3 text-primary animate-spin" />
                <span className="text-[11px] hidden sm:inline text-primary">Syncing...</span>
              </>
            )}
            {status === 'offline' && (
              <>
                <CloudSlashIcon className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-[11px] text-amber-600 dark:text-amber-400">
                  Offline {pendingCount > 0 && `(${pendingCount})`}
                </span>
              </>
            )}
            {status === 'error' && (
              <>
                <span className="h-2 w-2 rounded-full bg-destructive" />
                <span className="text-[11px] hidden sm:inline text-destructive">Sync error</span>
              </>
            )}
          </button>

          <Separator orientation="vertical" className="h-4" />

          {/* Select Mode Toggle */}
          <Button
            variant={isSelectionMode ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setIsSelectionMode(!isSelectionMode);
              if (isSelectionMode) clearSelectedSubtasks();
            }}
            className="h-7 px-2.5 text-xs gap-1.5 font-medium"
          >
            {isSelectionMode ? (
              <CheckSquareIcon className="h-3.5 w-3.5" />
            ) : (
              <SquareIcon className="h-3.5 w-3.5" />
            )}
            <span>{isSelectionMode ? 'Done Selecting' : 'Select'}</span>
          </Button>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            title="Toggle theme"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            {theme === 'dark' ? (
              <SunIcon className="h-3.5 w-3.5 text-amber-400" />
            ) : (
              <MoonIcon className="h-3.5 w-3.5" />
            )}
          </Button>

          {/* Account Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 px-2.5 text-xs rounded-lg border-border"
              >
                <div className="h-4 w-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                  {user?.name ? user.name[0]?.toUpperCase() : <UserIcon className="h-2.5 w-2.5" />}
                </div>
                <span className="max-w-[80px] truncate hidden sm:inline font-medium">
                  {user?.name || user?.email?.split('@')[0] || 'Account'}
                </span>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="right" className="w-56">
              <DropdownMenuLabel>
                <p className="font-semibold text-foreground truncate text-xs">
                  {user?.name || 'Technician'}
                </p>
                <p className="text-[11px] font-normal text-muted-foreground truncate">
                  {user?.email || 'demo@logpast.app'}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsShortcutsOpen(true)} className="gap-2 text-xs">
                <HelpCircleIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Shortcuts (?)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportAllData} className="gap-2 text-xs">
                <DownloadIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Export Account Data</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsAuthOpen(true)} className="gap-2 text-xs">
                <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Switch Account</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={deleteAccount}
                className="gap-2 text-xs text-destructive focus:text-destructive"
              >
                <TrashIcon className="h-3.5 w-3.5" />
                <span>Delete Account</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="gap-2 text-xs">
                <LogOutIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Log Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
