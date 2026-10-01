import React from 'react';
import {
  DownloadCloudIcon,
  ShareIcon,
  SmartphoneIcon,
  CheckIcon,
  XIcon,
} from './icons';
import { Button } from './ui/button';

interface IOSInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IOSInstallGuideModal: React.FC<IOSInstallGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <SmartphoneIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Install Ledgr on iOS</h3>
              <p className="text-[11px] text-muted-foreground">Add to Home Screen</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3.5 text-xs text-muted-foreground">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/60">
            <div className="h-6 w-6 rounded-lg bg-background border border-border flex items-center justify-center text-foreground font-mono text-[11px] font-bold shrink-0">
              1
            </div>
            <div className="space-y-1">
              <p className="text-foreground font-medium flex items-center gap-1.5">
                Tap the <span className="inline-flex items-center gap-1 font-semibold text-primary"><ShareIcon className="h-3.5 w-3.5" /> Share</span> icon
              </p>
              <p className="text-[11px] text-muted-foreground">
                Located at the bottom bar of Safari (or top right on iPad).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/60">
            <div className="h-6 w-6 rounded-lg bg-background border border-border flex items-center justify-center text-foreground font-mono text-[11px] font-bold shrink-0">
              2
            </div>
            <div className="space-y-1">
              <p className="text-foreground font-medium">
                Scroll and tap <span className="font-semibold text-foreground">"Add to Home Screen"</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                This installs Ledgr as a standalone app with offline support.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/60">
            <div className="h-6 w-6 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shrink-0">
              <CheckIcon className="h-3.5 w-3.5" />
            </div>
            <div className="space-y-1">
              <p className="text-foreground font-medium">Tap <span className="font-semibold text-foreground">"Add"</span></p>
              <p className="text-[11px] text-muted-foreground">
                Launch Ledgr directly from your home screen anytime.
              </p>
            </div>
          </div>
        </div>

        <Button onClick={onClose} className="w-full text-xs font-semibold h-9" size="sm">
          Got it
        </Button>
      </div>
    </div>
  );
};

interface PWAInstallBannerProps {
  onInstall: () => void;
  onDismiss: () => void;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({
  onInstall,
  onDismiss,
}) => {
  return (
    <div className="bg-card/90 border-b border-border/80 px-4 py-2 text-xs flex items-center justify-between gap-3 animate-in slide-in-from-top-2">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
          <DownloadCloudIcon className="h-4 w-4" />
        </div>
        <div className="truncate">
          <span className="font-semibold text-foreground">Install Ledgr App</span>
          <span className="text-muted-foreground hidden sm:inline ml-1.5 text-[11px]">
            — Fast offline work logging & standalone window
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="default"
          size="sm"
          onClick={onInstall}
          className="h-7 text-xs px-2.5 gap-1.5 font-medium shadow-sm"
        >
          <DownloadCloudIcon className="h-3 w-3" />
          <span>Install</span>
        </Button>
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
          title="Dismiss banner"
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
