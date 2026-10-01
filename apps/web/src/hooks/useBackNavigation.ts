import { useEffect, useRef, useState, useCallback } from 'react';

interface BackNavigationOptions {
  activeTaskId: string | null;
  onCloseTask: () => void;
  openModals: {
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
    showIOSGuide?: boolean;
    setShowIOSGuide?: (open: boolean) => void;
  };
  isSelectionMode: boolean;
  setIsSelectionMode: (active: boolean) => void;
}

export function useBackNavigation({
  activeTaskId,
  onCloseTask,
  openModals,
  isSelectionMode,
  setIsSelectionMode,
}: BackNavigationOptions) {
  const [exitToast, setExitToast] = useState<string | null>(null);
  const lastBackPressRef = useRef<number>(0);
  const modalHistoryPushedRef = useRef<{ [key: string]: boolean }>({});

  const hasAnyModalOpen =
    openModals.isAddSubtaskOpen ||
    openModals.isAddTitleOpen ||
    openModals.isExportOpen ||
    openModals.isShortcutsOpen ||
    openModals.isAuthOpen ||
    Boolean(openModals.showIOSGuide);

  // Synchronize modal open states with browser history
  useEffect(() => {
    const checkAndPushModal = (name: string, isOpen: boolean) => {
      if (isOpen && !modalHistoryPushedRef.current[name]) {
        modalHistoryPushedRef.current[name] = true;
        window.history.pushState({ modal: name }, '');
      } else if (!isOpen && modalHistoryPushedRef.current[name]) {
        modalHistoryPushedRef.current[name] = false;
        if (window.history.state?.modal === name) {
          window.history.back();
        }
      }
    };

    checkAndPushModal('addSubtask', openModals.isAddSubtaskOpen);
    checkAndPushModal('addTitle', openModals.isAddTitleOpen);
    checkAndPushModal('export', openModals.isExportOpen);
    checkAndPushModal('shortcuts', openModals.isShortcutsOpen);
    checkAndPushModal('auth', openModals.isAuthOpen);
    if (openModals.showIOSGuide !== undefined) {
      checkAndPushModal('iosGuide', openModals.showIOSGuide);
    }
  }, [
    openModals.isAddSubtaskOpen,
    openModals.isAddTitleOpen,
    openModals.isExportOpen,
    openModals.isShortcutsOpen,
    openModals.isAuthOpen,
    openModals.showIOSGuide,
  ]);

  // Handle browser popstate (Back/Forward button / Android gesture)
  useEffect(() => {
    const handlePopState = (_e: PopStateEvent) => {
      // 1. Close open modals first
      if (openModals.isAddSubtaskOpen) {
        modalHistoryPushedRef.current['addSubtask'] = false;
        openModals.setIsAddSubtaskOpen(false);
        return;
      }
      if (openModals.isAddTitleOpen) {
        modalHistoryPushedRef.current['addTitle'] = false;
        openModals.setIsAddTitleOpen(false);
        return;
      }
      if (openModals.isExportOpen) {
        modalHistoryPushedRef.current['export'] = false;
        openModals.setIsExportOpen(false);
        return;
      }
      if (openModals.isShortcutsOpen) {
        modalHistoryPushedRef.current['shortcuts'] = false;
        openModals.setIsShortcutsOpen(false);
        return;
      }
      if (openModals.isAuthOpen) {
        modalHistoryPushedRef.current['auth'] = false;
        openModals.setIsAuthOpen(false);
        return;
      }
      if (openModals.showIOSGuide && openModals.setShowIOSGuide) {
        modalHistoryPushedRef.current['iosGuide'] = false;
        openModals.setShowIOSGuide(false);
        return;
      }

      // 2. If in Task Detail page, navigate back to Tasks list
      if (activeTaskId) {
        onCloseTask();
        return;
      }

      // 3. If in Selection Mode, exit selection mode
      if (isSelectionMode) {
        setIsSelectionMode(false);
        return;
      }

      // 4. If at root, prevent accidental app exit with double-back confirmation
      const now = Date.now();
      if (now - lastBackPressRef.current < 2500) {
        // User pressed back twice within 2.5s: allow natural exit
        setExitToast(null);
      } else {
        lastBackPressRef.current = now;
        setExitToast('Press back again to exit Ledgr');
        // Push state back to prevent immediate exit
        window.history.pushState({ rootGuard: true }, '');
        setTimeout(() => {
          setExitToast(null);
        }, 2500);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [
    activeTaskId,
    onCloseTask,
    hasAnyModalOpen,
    openModals,
    isSelectionMode,
    setIsSelectionMode,
  ]);

  const dismissExitToast = useCallback(() => {
    setExitToast(null);
  }, []);

  return {
    exitToast,
    dismissExitToast,
  };
}
