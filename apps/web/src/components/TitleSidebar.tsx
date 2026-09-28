import React from 'react';
import {
  FolderIcon,
  PlusIcon,
  MoreVerticalIcon,
  EditIcon,
  TrashIcon,
  ArchiveIcon,
  LayersIcon,
} from './icons';
import { useUI } from '../context/UIContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import type { Title } from '@ledgr/shared';

interface TitleSidebarProps {
  titles: Title[];
  onAddTitle: () => void;
  onEditTitle: (title: Title) => void;
  onDeleteTitle: (titleId: string) => void;
  onArchiveTitle: (titleId: string, isArchived: boolean) => void;
}

export const TitleSidebar: React.FC<TitleSidebarProps> = ({
  titles,
  onAddTitle,
  onEditTitle,
  onDeleteTitle,
  onArchiveTitle,
}) => {
  const { selectedTitleId, setSelectedTitleId } = useUI();
  const totalTasks = titles.reduce((acc, t) => acc + (t.subtask_count || 0), 0);

  return (
    <>
      {/* Mobile Horizontal Workspace Bar */}
      <div className="lg:hidden w-full bg-card/60 border-b border-border px-3 py-2 flex items-center gap-1.5 overflow-x-auto flex-shrink-0">
        <button
          type="button"
          onClick={() => setSelectedTitleId(null)}
          className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
            selectedTitleId === null
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-muted/70 text-muted-foreground hover:text-foreground'
          }`}
        >
          <FolderIcon className="h-3 w-3" />
          <span>All</span>
          <Badge
            variant={selectedTitleId === null ? 'outline' : 'secondary'}
            className={`text-[9px] px-1 py-0 ml-0.5 ${
              selectedTitleId === null ? 'border-primary-foreground/30 text-primary-foreground' : ''
            }`}
          >
            {totalTasks}
          </Badge>
        </button>

        {titles.map((title) => {
          const isSelected = selectedTitleId === title.id;
          return (
            <button
              key={title.id}
              type="button"
              onClick={() => setSelectedTitleId(title.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/70 text-muted-foreground hover:text-foreground'
              }`}
            >
              <span
                className="h-2 w-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: title.color || 'hsl(var(--primary))' }}
              />
              <span className="truncate max-w-[110px]">{title.name}</span>
              <Badge
                variant={isSelected ? 'outline' : 'secondary'}
                className={`text-[9px] px-1 py-0 ml-0.5 ${
                  isSelected ? 'border-primary-foreground/30 text-primary-foreground' : ''
                }`}
              >
                {title.subtask_count || 0}
              </Badge>
            </button>
          );
        })}

        <Button
          variant="outline"
          size="sm"
          onClick={onAddTitle}
          className="flex-shrink-0 h-6 px-2 text-[11px] gap-1 font-medium ml-auto"
        >
          <PlusIcon className="h-3 w-3" />
          <span>Title</span>
        </Button>
      </div>

      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex w-72 flex-shrink-0 flex-col h-full bg-card/50 border-r border-border">
        {/* Sidebar Header */}
        <div className="p-3.5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayersIcon className="h-4 w-4 text-primary" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Categories &amp; Titles
            </h2>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={onAddTitle}
            className="h-7 px-2.5 text-xs gap-1 font-medium"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            <span>Add Title</span>
          </Button>
        </div>

        {/* Title List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
          {/* All Titles Option */}
          <button
            type="button"
            onClick={() => setSelectedTitleId(null)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              selectedTitleId === null
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-foreground hover:bg-muted'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FolderIcon className="h-3.5 w-3.5 opacity-80" />
              <span>All Titles</span>
            </div>
            <Badge
              variant={selectedTitleId === null ? 'outline' : 'secondary'}
              className={`text-[10px] px-1.5 py-0 ${
                selectedTitleId === null ? 'border-primary-foreground/30 text-primary-foreground' : ''
              }`}
            >
              {totalTasks}
            </Badge>
          </button>

          <div className="pt-2 pb-1 px-1 flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Workspaces ({titles.length})
            </span>
          </div>

          {titles.length === 0 ? (
            <div className="p-4 text-center space-y-2">
              <p className="text-xs text-muted-foreground">No titles yet.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={onAddTitle}
                className="text-xs h-7"
              >
                Create your first title
              </Button>
            </div>
          ) : (
            titles.map((title) => {
              const isSelected = selectedTitleId === title.id;

              return (
                <div key={title.id} className="relative group">
                  <div
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedTitleId(title.id)}
                      className="flex items-center gap-2.5 min-w-0 pr-2 flex-1 text-left"
                    >
                      <span
                        className="h-2 w-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: title.color || 'hsl(var(--primary))' }}
                      />
                      <div className="truncate">
                        <p className="font-semibold truncate">{title.name}</p>
                        {title.last_logged_date && (
                          <p
                            className={`text-[10px] truncate ${
                              isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                            }`}
                          >
                            Last: {title.last_logged_date}
                          </p>
                        )}
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Badge
                        variant={isSelected ? 'outline' : 'secondary'}
                        className={`text-[10px] px-1.5 py-0 ${
                          isSelected ? 'border-primary-foreground/30 text-primary-foreground' : ''
                        }`}
                      >
                        {title.subtask_count || 0}
                      </Badge>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className={`p-1 rounded hover:bg-muted-foreground/20 ${
                              isSelected ? 'text-primary-foreground' : 'text-muted-foreground opacity-0 group-hover:opacity-100'
                            }`}
                          >
                            <MoreVerticalIcon className="h-3.5 w-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="right" className="w-36">
                          <DropdownMenuItem onClick={() => onEditTitle(title)} className="gap-2">
                            <EditIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>Edit Title</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onArchiveTitle(title.id, !title.is_archived)}
                            className="gap-2"
                          >
                            <ArchiveIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{title.is_archived ? 'Unarchive' : 'Archive'}</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              if (confirm(`Delete title "${title.name}" and all its logged subtasks?`)) {
                                onDeleteTitle(title.id);
                              }
                            }}
                            className="gap-2 text-destructive focus:text-destructive"
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
};
