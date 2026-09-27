import React, { useState, useEffect } from 'react';
import { FolderIcon, CheckCircle2Icon } from './icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import type { Title, CreateTitleInput } from '@ledgr/shared';

interface AddTitleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateTitleInput) => Promise<void>;
  editingTitle?: Title | null;
}

const COLOR_PALETTE = [
  '#0d9488', // teal (primary)
  '#059669', // emerald
  '#2563eb', // blue
  '#7c3aed', // violet
  '#d97706', // amber
  '#e11d48', // rose
  '#0891b2', // cyan
  '#475569', // slate
];

export const AddTitleModal: React.FC<AddTitleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTitle,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#0d9488');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingTitle) {
      setName(editingTitle.name);
      setColor(editingTitle.color || '#0d9488');
    } else {
      setName('');
      setColor('#0d9488');
    }
    setError(null);
  }, [editingTitle, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Title name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        color,
        icon: 'folder',
        sort_order: 0,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save title');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center text-primary">
              <FolderIcon className="h-4 w-4" />
            </div>
            <DialogTitle>
              {editingTitle ? 'Edit Title Category' : 'Create New Title'}
            </DialogTitle>
          </div>
          <DialogDescription>
            Categorize and group your work log entries
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && <p className="text-xs text-destructive font-medium">{error}</p>}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Title Name
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Garage Workshop, Client Alpha"
              autoFocus
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Color Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Category Color
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-6 w-6 rounded-full transition-transform ${
                    color === c ? 'scale-125 ring-2 ring-primary ring-offset-2' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={isSubmitting}
              className="text-xs gap-1.5 font-medium"
            >
              <CheckCircle2Icon className="h-3.5 w-3.5" />
              <span>{isSubmitting ? 'Saving...' : editingTitle ? 'Update' : 'Create'}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
