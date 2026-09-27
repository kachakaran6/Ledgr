import React from 'react';
import { KeyboardIcon } from './icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: '/', desc: 'Focus global search input' },
  { key: 'N', desc: 'Open Log Past Task sheet' },
  { key: 'E', desc: 'Toggle Selection & Export mode' },
  { key: 'T', desc: 'Toggle Dark / Light theme' },
  { key: 'Esc', desc: 'Close any open sheet or modal' },
  { key: '?', desc: 'Open this keyboard shortcuts reference' },
];

export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center text-primary">
              <KeyboardIcon className="h-4 w-4" />
            </div>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </div>
          <DialogDescription>
            Speed up your daily past work logging
          </DialogDescription>
        </DialogHeader>

        <div className="divide-y divide-border/60 pt-2">
          {SHORTCUTS.map((s) => (
            <div key={s.key} className="py-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{s.desc}</span>
              <kbd className="px-2 py-0.5 rounded-md bg-muted border border-border font-mono text-foreground font-semibold text-[11px]">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="w-full text-xs"
          >
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
