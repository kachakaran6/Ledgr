import React from 'react';
import {
  HistoryIcon,
  CloudSlashIcon,
  MoonIcon,
  SunIcon,
  LayersIcon,
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
import { Tooltip } from './ui/tooltip';
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
    density,
    toggleDensity,
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
    <header className="sticky top-0 z-30 w-full border-b border-border bg-card/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Brand Group */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-sm">
            <HistoryIcon className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-foreground">
                LogPast
              </span>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 uppercase font-mono tracking-wider">
                Ledger
              </Badge>
            </div>
          </div>
        </div>

        {/* Grouped Actions Toolbar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Cluster 1: View & Mode Controls */}
          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg border border-border/50">
            {/* Live Sync Status */}
            <Tooltip content={status === 'offline' ? `Offline (${pendingCount} queued)` : 'Click to sync now'}>
              <button
                type="button"
                onClick={flush}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors hover:bg-background/80 text-foreground"
              >
                {status === 'synced' && (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span className="hidden md:inline text-[11px] font-medium text-muted-foreground">Synced</span>
                  </>
                )}
                {status === 'syncing' && (
                  <>
                    <RefreshCwIcon className="h-3 w-3 text-primary animate-spin" />
                    <span className="hidden md:inline text-[11px] font-medium text-primary">Syncing...</span>
                  </>
                )}
                {status === 'offline' && (
                  <>
                    <CloudSlashIcon className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                      Offline {pendingCount > 0 && `(${pendingCount})`}
                    </span>
                  </>
                )}
                {status === 'error' && (
                  <>
                    <span className="h-2 w-2 rounded-full bg-destructive" />
                    <span className="hidden md:inline text-[11px] text-destructive">Sync Issue</span>
                  </>
                )}
              </button>
            </Tooltip>

            <Separator orientation="vertical" className="h-4" />

            {/* Selection Mode Toggle */}
            <Button
              variant={isSelectionMode ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                if (isSelectionMode) clearSelectedSubtasks();
              }}
              className="h-7 px-2.5 text-xs gap-1.5"
            >
              {isSelectionMode ? <CheckSquareIcon className="h-3.5 w-3.5" /> : <SquareIcon className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{isSelectionMode ? 'Selecting' : 'Select'}</span>
            </Button>

            {/* Density Toggle */}
            <Tooltip content={`Switch to ${density === 'comfortable' ? 'Compact' : 'Comfortable'} row height`}>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleDensity}
                className="h-7 w-7 text-muted-foreground hover:text-foreground hidden sm:inline-flex"
              >
                <LayersIcon className="h-3.5 w-3.5" />
              </Button>
            </Tooltip>
          </div>

          <Separator orientation="vertical" className="h-6 hidden sm:block" />

          {/* Cluster 2: Utility & Theme */}
          <div className="flex items-center gap-1">
            <Tooltip content="Toggle Theme">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                {theme === 'dark' ? (
                  <SunIcon className="h-4 w-4 text-amber-400" />
                ) : (
                  <MoonIcon className="h-4 w-4 text-foreground" />
                )}
              </Button>
            </Tooltip>

            <Tooltip content="Keyboard Shortcuts (?)">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsShortcutsOpen(true)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground hidden md:inline-flex"
              >
                <HelpCircleIcon className="h-4 w-4" />
              </Button>
            </Tooltip>

            {/* Cluster 3: Account / Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-2 px-2.5 rounded-lg border-border">
                  <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                    {user?.name ? user.name[0]?.toUpperCase() : <UserIcon className="h-3 w-3" />}
                  </div>
                  <span className="text-xs font-medium max-w-[90px] truncate hidden sm:inline">
                    {user?.name || user?.email || 'Account'}
                  </span>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="right" className="w-56">
                <DropdownMenuLabel>
                  <p className="font-semibold text-foreground truncate">{user?.name || 'Technician'}</p>
                  <p className="text-[11px] font-normal text-muted-foreground truncate">{user?.email || 'demo@logpast.app'}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={exportAllData} className="gap-2">
                  <DownloadIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Download GDPR Data</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsAuthOpen(true)} className="gap-2">
                  <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Switch Account</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={deleteAccount} className="gap-2 text-destructive focus:text-destructive">
                  <TrashIcon className="h-3.5 w-3.5" />
                  <span>Delete Account</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="gap-2">
                  <LogOutIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Log Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};
