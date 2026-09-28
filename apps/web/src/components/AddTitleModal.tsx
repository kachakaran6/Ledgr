import React, { useState, useEffect } from 'react';
import { FolderIcon, CheckCircle2Icon } from './icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { InlineSpinner } from './LoadingFeedback';
import type { Title, CreateTitleInput } from '@ledgr/shared';

interface AddTitleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateTitleInput) => Promise<void>;
  editingTitle?: Title | null;
}

export const AddTitleModal: React.FC<AddTitleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTitle,
}) => {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingTitle) {
      setName(editingTitle.name);
    } else {
      setName('');
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
        color: editingTitle?.color || 'var(--muted-foreground)',
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
            <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center text-foreground">
              <FolderIcon className="h-4 w-4" />
            </div>
            <DialogTitle className="font-heading font-medium">
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

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
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
              {isSubmitting ? (
                <>
                  <InlineSpinner size="xs" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2Icon className="h-3.5 w-3.5" />
                  <span>{editingTitle ? 'Update' : 'Create'}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
