import { useState } from 'react';
import { ExternalLink, Link as LinkIcon, Package, Trash2, AlertTriangle, Cloud, HardDrive } from 'lucide-react';
import { getShareUrl } from '../lib/shareLink';
import { formatFileSize, formatRelativeTime } from '../lib/fileUtils';
import { Button } from './Button';
import { ShareActions } from './ShareActions';
import type { StorageMode } from '../types';

interface CollectionCardProps {
  shareId: string;
  fileCount: number;
  totalSize: number;
  createdAt?: string | null;
  storageMode: StorageMode;
  onViewSharePage: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}

export function CollectionCard({
  shareId,
  fileCount,
  totalSize,
  createdAt,
  storageMode,
  onViewSharePage,
  onDelete,
  isDeleting = false,
}: CollectionCardProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const shareUrl = getShareUrl(shareId);

  return (
    <div className="animate-fade-in border border-border rounded-lg bg-surface-1 overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-border bg-success/5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-success/10 shrink-0">
            <Package size={18} className="text-success" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary">
              {fileCount} {fileCount === 1 ? 'file' : 'files'} ready to share
            </p>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-text-muted">
              <span>{formatFileSize(totalSize)}</span>
              {createdAt && (
                <>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span>{formatRelativeTime(createdAt)}</span>
                </>
              )}
              <span className="w-1 h-1 rounded-full bg-border" />
              <span className="inline-flex items-center gap-1">
                {storageMode === 'cloud' ? <Cloud size={11} /> : <HardDrive size={11} />}
                {storageMode === 'cloud' ? 'Cloud' : 'This device'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 border-b border-border">
        <label className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2 block">
          Share link
        </label>
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-surface-2 border border-border min-w-0">
          <LinkIcon size={14} className="text-text-muted shrink-0" />
          <span className="text-sm text-text-primary truncate">{shareUrl}</span>
        </div>
        <ShareActions url={shareUrl} title={`${fileCount} ${fileCount === 1 ? 'file' : 'files'} on DropZone`} className="mt-3" />
      </div>

      <div className="px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" size="sm" onClick={onViewSharePage}>
            <Package size={14} />
            View transfer
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(shareUrl, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink size={14} />
            Open link
          </Button>

          {onDelete && !confirmingDelete && (
            <button
              onClick={() => setConfirmingDelete(true)}
              className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-text-muted hover:text-error hover:bg-error/10 transition-colors"
            >
              <Trash2 size={13} />
              Delete transfer
            </button>
          )}
        </div>

        {confirmingDelete && (
          <div className="mt-4 rounded-lg border border-error/20 bg-error/5 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle size={15} className="text-error shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium text-error">Delete this transfer?</p>
                <p className="text-xs text-text-muted mt-1">
                  The link will stop working and the files will be removed{storageMode === 'cloud' ? ' from the cloud' : ' from this device'}.
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <Button variant="danger" size="sm" onClick={onDelete} loading={isDeleting}>
                    <Trash2 size={13} />
                    Delete
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)} disabled={isDeleting}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
