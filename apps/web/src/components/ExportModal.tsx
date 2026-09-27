import React, { useState } from 'react';
import {
  FileTextIcon,
  FileSpreadsheetIcon,
  FileCodeIcon,
  DownloadIcon,
  CheckCircle2Icon,
  FilterIcon,
} from './icons';
import { exportDocuments } from '../lib/export';
import { useAuth } from '../context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import type { Subtask, ExportFormat } from '@ledgr/shared';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtasks: Subtask[];
  selectedCount: number;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  subtasks,
  selectedCount,
}) => {
  const { user } = useAuth();
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    setIsSuccess(false);

    try {
      await exportDocuments({
        format,
        subtasks,
        userName: user?.name || user?.email || 'Technician',
        filenamePrefix: 'logpast-proof-of-work',
      });
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      alert('Failed to generate export document.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center text-primary">
              <DownloadIcon className="h-4 w-4" />
            </div>
            <DialogTitle>Export Proof of Work</DialogTitle>
          </div>
          <DialogDescription>
            Generate client-ready reports and spreadsheet audits
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Selected Data Summary */}
          <div className="p-3 rounded-lg bg-muted/60 border border-border flex items-center gap-3">
            <FilterIcon className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-foreground">
                {selectedCount > 0 ? `${selectedCount} Selected Records` : `${subtasks.length} Filtered Records`}
              </p>
              <p className="text-muted-foreground text-[11px]">
                Export respects your active filters and selections.
              </p>
            </div>
          </div>

          {/* Format Selection Cards */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-foreground">
              Select Output Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* PDF */}
              <button
                type="button"
                onClick={() => setFormat('pdf')}
                className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${
                  format === 'pdf'
                    ? 'bg-primary/10 border-primary text-primary shadow-xs'
                    : 'bg-card border-border text-foreground hover:bg-muted'
                }`}
              >
                <FileTextIcon className="h-5 w-5" />
                <div className="text-center">
                  <span className="block text-xs font-bold">PDF</span>
                  <span className="block text-[10px] text-muted-foreground">Print / Share</span>
                </div>
              </button>

              {/* Excel */}
              <button
                type="button"
                onClick={() => setFormat('xlsx')}
                className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${
                  format === 'xlsx'
                    ? 'bg-status-done/10 border-status-done text-status-done shadow-xs'
                    : 'bg-card border-border text-foreground hover:bg-muted'
                }`}
              >
                <FileSpreadsheetIcon className="h-5 w-5" />
                <div className="text-center">
                  <span className="block text-xs font-bold">Excel</span>
                  <span className="block text-[10px] text-muted-foreground">.xlsx Sheet</span>
                </div>
              </button>

              {/* CSV */}
              <button
                type="button"
                onClick={() => setFormat('csv')}
                className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${
                  format === 'csv'
                    ? 'bg-primary/10 border-primary text-primary shadow-xs'
                    : 'bg-card border-border text-foreground hover:bg-muted'
                }`}
              >
                <FileCodeIcon className="h-5 w-5" />
                <div className="text-center">
                  <span className="block text-xs font-bold">CSV</span>
                  <span className="block text-[10px] text-muted-foreground">Raw Data</span>
                </div>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
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
              type="button"
              variant="default"
              size="sm"
              onClick={handleExport}
              disabled={isExporting || subtasks.length === 0}
              className="text-xs gap-1.5 font-medium"
            >
              {isSuccess ? (
                <>
                  <CheckCircle2Icon className="h-3.5 w-3.5" />
                  <span>Downloaded!</span>
                </>
              ) : isExporting ? (
                <span>Generating...</span>
              ) : (
                <>
                  <DownloadIcon className="h-3.5 w-3.5" />
                  <span>Download {format.toUpperCase()}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
