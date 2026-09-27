import type { DatePreset, SubtaskStatus } from '@ledgr/shared';

export type DensityMode = 'comfortable' | 'compact';
export type ThemeMode = 'dark' | 'light';

export interface UIState {
  selectedTitleId: string | null;
  searchQuery: string;
  datePreset: DatePreset;
  customStartDate?: string;
  customEndDate?: string;
  statusFilter?: SubtaskStatus;
  density: DensityMode;
  theme: ThemeMode;
  isSelectionMode: boolean;
  selectedSubtaskIds: Set<string>;
  isAddSubtaskOpen: boolean;
  isAddTitleOpen: boolean;
  isExportOpen: boolean;
  isShortcutsOpen: boolean;
  isAuthOpen: boolean;
}
