import {
  CloudSlashIcon,
  MoonIcon,
  SunIcon,
  HelpCircleIcon,
  UserIcon,
  LogOutIcon,
  TrashIcon,
  CheckSquareIcon,
  SquareIcon,
  RefreshCwIcon,
  FileTextIcon,
  DownloadCloudIcon,
  SmartphoneIcon,
} from './icons';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useSyncStatus } from '../lib/sync';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';

interface HeaderProps {
  showSelection?: boolean;
  canInstall?: boolean;
  isInstalled?: boolean;
  onInstall?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  showSelection = false,
  canInstall = false,
  isInstalled = false,
  onInstall,
}) => {
  const { user, logout, deleteAccount } = useAuth();
  const {
    theme,
    toggleTheme,
    isSelectionMode,
    setIsSelectionMode,
    clearSelectedSubtasks,
    setIsShortcutsOpen,
    setIsAuthOpen,
    setIsExportOpen,
  } = useUI();
  const { status, pendingCount, flush } = useSyncStatus();

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-card/95 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-13 py-2 flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <span className="font-heading font-semibold text-lg tracking-tight text-foreground">
            Ledgr
          </span>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {/* Sync Status Badge */}
          <button
            type="button"
            onClick={flush}
            title={status === 'offline' ? `Offline (${pendingCount} queued)` : 'Click to sync now'}
            className={`items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted/70 transition-colors ${
              status === 'synced' ? 'hidden sm:inline-flex' : 'flex'
            }`}
          >
            {status === 'synced' && (
              <span className="text-[11px] hidden sm:inline text-muted-foreground">Synced</span>
            )}
            {status === 'syncing' && (
              <>
                <RefreshCwIcon className="h-3 w-3 text-muted-foreground animate-spin" />
                <span className="text-[11px] hidden sm:inline text-muted-foreground">Syncing...</span>
              </>
            )}
            {status === 'offline' && (
              <>
                <CloudSlashIcon className="h-3.5 w-3.5 text-[var(--status-in-progress)]" />
                <span className="text-[11px] text-[var(--status-in-progress)]">
                  Offline {pendingCount > 0 && <span className="font-mono tabular-nums">({pendingCount})</span>}
                </span>
              </>
            )}
            {status === 'error' && (
              <>
                <span className="h-2 w-2 rounded-full bg-[var(--status-cancelled)]" />
                <span className="text-[11px] hidden sm:inline text-[var(--status-cancelled)]">Sync error</span>
              </>
            )}
          </button>

          <Separator orientation="vertical" className="h-4" />

          {/* Select Mode Toggle (only when on All Logs / Ledger tab) */}
          {showSelection && (
            <Button
              variant={isSelectionMode ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                if (isSelectionMode) clearSelectedSubtasks();
              }}
              className="h-8 px-2 sm:px-2.5 text-xs gap-1.5 font-medium animate-in fade-in"
              title={isSelectionMode ? 'Done Selecting' : 'Select records for export'}
            >
              {isSelectionMode ? (
                <CheckSquareIcon className="h-3.5 w-3.5" />
              ) : (
                <SquareIcon className="h-3.5 w-3.5" />
              )}
              <span>{isSelectionMode ? 'Done' : 'Select'}</span>
            </Button>
          )}

          {/* PWA Install Button (shown when installable) */}
          {canInstall && onInstall && (
            <Button
              variant="outline"
              size="sm"
              onClick={onInstall}
              className="h-8 px-2.5 text-xs gap-1.5 font-medium border-primary/30 text-primary hover:bg-primary/10 transition-colors"
              title="Install Ledgr as a desktop or mobile application"
            >
              <DownloadCloudIcon className="h-3.5 w-3.5" />
              <span className="hidden xs:inline sm:inline">Install App</span>
            </Button>
          )}

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            title="Toggle theme"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            {theme === 'dark' ? (
              <SunIcon className="h-3.5 w-3.5 text-foreground" />
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
                <div className="h-4 w-4 rounded-full bg-muted text-foreground flex items-center justify-center text-[10px] font-bold font-mono">
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
                {isInstalled && (
                  <p className="text-[10px] text-primary font-mono mt-1 flex items-center gap-1">
                    <SmartphoneIcon className="h-3 w-3" /> Standalone PWA Mode
                  </p>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {canInstall && onInstall && (
                <DropdownMenuItem onClick={onInstall} className="gap-2 text-xs font-semibold text-primary cursor-pointer">
                  <DownloadCloudIcon className="h-3.5 w-3.5 text-primary" />
                  <span>Install Ledgr App</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setIsExportOpen(true)} className="gap-2 text-xs font-medium cursor-pointer">
                <FileTextIcon className="h-3.5 w-3.5 text-foreground" />
                <span>Export Report (PDF / Excel)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsShortcutsOpen(true)} className="gap-2 text-xs cursor-pointer">
                <HelpCircleIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Shortcuts (?)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsAuthOpen(true)} className="gap-2 text-xs cursor-pointer">
                <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Switch Account</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={deleteAccount}
                className="gap-2 text-xs text-destructive focus:text-destructive cursor-pointer"
              >
                <TrashIcon className="h-3.5 w-3.5" />
                <span>Delete Account</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="gap-2 text-xs cursor-pointer">
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
