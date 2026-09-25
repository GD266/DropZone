import { ExternalLink, Link, Package, Copy, Check } from 'lucide-react';
import { getShareUrl } from '../lib/shareLink';
import { Button } from './Button';
import { useClipboard } from '../hooks/useClipboard';

interface CollectionCardProps {
  shareId: string;
  fileCount: number;
  totalSize: number;
  onViewSharePage: () => void;
}

export function CollectionCard({ shareId, fileCount, totalSize, onViewSharePage }: CollectionCardProps) {
  const { copyToClipboard, isCopied } = useClipboard();
  const shareUrl = getShareUrl(shareId);

  const handleCopy = async () => {
    await copyToClipboard(shareUrl, 'collection');
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="animate-fade-in border border-border rounded-lg bg-surface-1 overflow-hidden">
      {/* Success header */}
      <div className="px-5 py-4 border-b border-border bg-success/5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-success/10">
            <Check size={18} className="text-success" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">
              {fileCount} {fileCount === 1 ? 'file' : 'files'} uploaded successfully
            </p>
            <p className="text-xs text-text-muted">
              {fileCount} {fileCount === 1 ? 'file' : 'files'} · {formatSize(totalSize)}
            </p>
          </div>
        </div>
      </div>

      {/* Share link */}
      <div className="px-5 py-4 border-b border-border">
        <label className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2 block">
          Share link
        </label>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-md bg-surface-2 border border-border min-w-0">
            <Link size={14} className="text-text-muted shrink-0" />
            <span className="text-sm text-text-primary truncate">{shareUrl}</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopy}
            className="shrink-0"
          >
            {isCopied('collection') ? (
              <>
                <Check size={14} className="text-success" />
                Copied
              </>
            ) : (
              <>
                <Copy size={14} />
                Copy Link
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 py-4 flex items-center gap-3">
        <Button
          variant="primary"
          size="sm"
          onClick={onViewSharePage}
        >
          <Package size={14} />
          View Share Page
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.open(shareUrl, '_blank')}
        >
          <ExternalLink size={14} />
          Open link
        </Button>
      </div>
    </div>
  );
}
