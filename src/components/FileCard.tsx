import { Check, AlertCircle, RotateCw, X } from 'lucide-react';
import type { UploadFile } from '../types';
import { FileIcon } from './FileIcon';
import { ProgressBar } from './ProgressBar';
import { formatFileSize, validateFile } from '../lib/fileUtils';

interface FileCardProps {
  upload: UploadFile;
  onRetry?: (id: string) => void;
  onRemove?: (id: string) => void;
}

export function FileCard({ upload, onRetry, onRemove }: FileCardProps) {
  const { id, file, status, progress, error } = upload;
  const canRemove = status !== 'uploading' && status !== 'success';
  const canRetry = status === 'error' && !validateFile(file);

  return (
    <div className={`
      flex items-center gap-3 p-3 rounded-lg border transition-all duration-200
      ${status === 'success' ? 'border-success/20 bg-success/5' : ''}
      ${status === 'error' ? 'border-error/20 bg-error/5' : ''}
      ${status === 'uploading' ? 'border-accent/20 bg-accent/5' : ''}
      ${status === 'pending' ? 'border-border bg-surface-2' : ''}
    `}>
      <FileIcon type={file.type} filename={file.name} size={18} className="shrink-0" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-text-primary truncate">
            {file.name}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            <StatusBadge status={status} />
            {canRetry && onRetry && (
              <button
                onClick={() => onRetry(id)}
                className="p-1 rounded text-text-muted hover:text-accent hover:bg-accent/10 transition-colors"
                aria-label={`Retry ${file.name}`}
                title="Retry upload"
              >
                <RotateCw size={13} />
              </button>
            )}
            {canRemove && onRemove && (
              <button
                onClick={() => onRemove(id)}
                className="p-1 rounded text-text-muted hover:text-error hover:bg-error/10 transition-colors"
                aria-label={`Remove ${file.name}`}
                title="Remove from list"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-text-muted">
            {formatFileSize(file.size)}
          </span>
          {status === 'uploading' && (
            <span className="text-xs text-accent">{progress}%</span>
          )}
        </div>

        {status === 'uploading' && (
          <ProgressBar progress={progress} className="mt-2" />
        )}

        {status === 'error' && error && (
          <p className="text-xs text-error mt-1">{error}</p>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: UploadFile['status'] }) {
  switch (status) {
    case 'pending':
      return (
        <span className="text-xs text-text-muted shrink-0">Waiting</span>
      );
    case 'uploading':
      return (
        <span className="text-xs text-accent font-medium shrink-0">Uploading...</span>
      );
    case 'success':
      return (
        <span className="flex items-center gap-1 text-xs text-success font-medium shrink-0">
          <Check size={12} />
          Done
        </span>
      );
    case 'error':
      return (
        <span className="flex items-center gap-1 text-xs text-error font-medium shrink-0">
          <AlertCircle size={12} />
          Failed
        </span>
      );
  }
}
