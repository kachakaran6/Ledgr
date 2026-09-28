import React, { useState } from 'react';
import {
  FileTextIcon,
  FileSpreadsheetIcon,
  FileCodeIcon,
  DownloadIcon,
  CheckCircle2Icon,
  FilterIcon,
  AlertCircleIcon,
} from './icons';
import { exportDocuments } from '../lib/export';
import { useAuth } from '../context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { InlineSpinner } from './LoadingFeedback';
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSlowToast, setShowSlowToast] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    setIsSuccess(false);
    setErrorMsg(null);
    setShowSlowToast(false);

    // After 1.5s show a progress toast so the user knows it's working
    const slowTimer = setTimeout(() => {
      setShowSlowToast(true);
    }, 1500);

    try {
      await exportDocuments({
        format,
        subtasks,
        userName: user?.name || user?.email || 'Technician',
        filenamePrefix: 'ledgr-proof-of-work',
        // Pass explicit subtask IDs so server re-verifies ownership
        subtaskIds: subtasks.map(s => s.id),
      });
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1400);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Export failed — please try again.';
      setErrorMsg(msg);
    } finally {
      clearTimeout(slowTimer);
      setShowSlowToast(false);
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    if (!isExporting) {
      setErrorMsg(null);
      setIsSuccess(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center text-foreground">
              <DownloadIcon className="h-4 w-4" />
            </div>
            <DialogTitle className="font-heading font-medium">Export Proof of Work</DialogTitle>
          </div>
          <DialogDescription>
            Generate client-ready reports and spreadsheet audits
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Selected Data Summary */}
          <div className="p-3 rounded-lg bg-muted/60 border border-border flex items-center gap-3">
            <FilterIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-foreground font-mono tabular-nums">
                {selectedCount > 0 ? `${selectedCount} Selected Records` : `${subtasks.length} Filtered Records`}
              </p>
              <p className="text-muted-foreground text-[11px]">
                Export includes only your verified entries.
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
                onClick={() => { setFormat('pdf'); setErrorMsg(null); }}
                className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${
                  format === 'pdf'
                    ? 'bg-muted border-foreground/40 text-foreground ring-1 ring-border shadow-xs'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
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
                onClick={() => { setFormat('xlsx'); setErrorMsg(null); }}
                className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${
                  format === 'xlsx'
                    ? 'bg-muted border-foreground/40 text-foreground ring-1 ring-border shadow-xs'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
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
                onClick={() => { setFormat('csv'); setErrorMsg(null); }}
                className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${
                  format === 'csv'
                    ? 'bg-muted border-foreground/40 text-foreground ring-1 ring-border shadow-xs'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
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

          {/* Progress toast (shown after 1.5s) */}
          {showSlowToast && (
            <div className="p-2.5 rounded-lg bg-muted/80 border border-border text-xs text-foreground flex items-center gap-2 animate-in fade-in">
              <InlineSpinner size="xs" />
              <span>
                {format === 'pdf' ? 'Rendering document layout & embedding fonts...' :
                 format === 'xlsx' ? 'Building spreadsheet with native types...' :
                 'Preparing CSV export...'}
              </span>
            </div>
          )}

          {/* Error message */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-2 animate-in fade-in">
              <AlertCircleIcon className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isExporting}
              onClick={handleClose}
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
                <>
                  <InlineSpinner size="xs" />
                  <span>Generating...</span>
                </>
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
