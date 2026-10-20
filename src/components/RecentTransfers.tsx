import { Check, Clock, Cloud, Copy, ExternalLink, HardDrive, Trash2, X } from 'lucide-react';
import type { RecentShare } from '../types';
import { formatFileSize, formatRelativeTime } from '../lib/fileUtils';
import { getShareUrl } from '../lib/shareLink';
import { useClipboard } from '../hooks/useClipboard';
import { Button } from './Button';

interface RecentTransfersProps {
  shares: RecentShare[];
  onRemove: (shareId: string) => void;
  onClear: () => void;
}

export function RecentTransfers({ shares, onRemove, onClear }: RecentTransfersProps) {
  const { copyToClipboard, isCopied } = useClipboard();

  if (shares.length === 0) return null;

  return (
    <section className="mt-16">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Recent transfers</h2>
          <p className="text-xs text-text-muted mt-0.5">Links you created on this device.</p>
        </div>
        <button
          onClick={onClear}
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-error transition-colors"
        >
          <Trash2 size={12} />
          Clear history
        </button>
      </div>

      <div className="border border-border rounded-lg bg-surface-1 divide-y divide-border overflow-hidden">
        {shares.map((share) => {
          const url = getShareUrl(share.shareId);
          const copied = isCopied(`recent-${share.shareId}`);
          const names = share.fileNames.slice(0, 2).join(', ');
          const extra = share.fileNames.length > 2 ? ` +${share.fileNames.length - 2} more` : '';

          return (
            <div key={share.shareId} className="p-4 flex items-center gap-3 hover:bg-surface-2/40 transition-colors">
              <div className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${
                share.mode === 'cloud' ? 'bg-accent/10 text-accent' : 'bg-amber-400/10 text-amber-400'
              }`}>
                {share.mode === 'cloud' ? <Cloud size={17} /> : <HardDrive size={17} />}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {names || `${share.fileCount} ${share.fileCount === 1 ? 'file' : 'files'}`}
                  {extra && <span className="text-text-muted">{extra}</span>}
                </p>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-text-muted">
                  <span>{share.fileCount} {share.fileCount === 1 ? 'file' : 'files'}</span>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span>{formatFileSize(share.totalSize)}</span>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span className="inline-flex items-center gap-1">
                    <Clock size={10} />
                    {formatRelativeTime(share.createdAt)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(url, `recent-${share.shareId}`)}
                  aria-label="Copy link"
                >
                  {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                  <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
                </Button>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
                  aria-label="Open transfer"
                >
                  <ExternalLink size={13} />
                  <span className="hidden sm:inline">Open</span>
                </a>
                <button
                  onClick={() => onRemove(share.shareId)}
                  className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
                  aria-label="Remove from history"
                  title="Remove from history"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
