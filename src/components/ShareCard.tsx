import { useState } from 'react';
import { Check, Copy, ExternalLink, Upload, Link } from 'lucide-react';
import type { UploadFile } from '../types';
import { getShareUrl } from '../lib/shareLink';
import { Button } from './Button';
import { FileIcon } from './FileIcon';
import { formatFileSize } from '../lib/fileUtils';

interface ShareCardProps {
  upload: UploadFile;
  onUploadAnother: () => void;
}

export function ShareCard({ upload, onUploadAnother }: ShareCardProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = upload.shareId ? getShareUrl(upload.shareId) : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = shareUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="animate-fade-in border border-border rounded-lg bg-surface-1 overflow-hidden">
      {/* Success header */}
      <div className="px-5 py-4 border-b border-border bg-success/5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-success/10">
            <Check size={16} className="text-success" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">Upload complete</p>
            <p className="text-xs text-text-muted">Your file is ready to share</p>
          </div>
        </div>
      </div>

      {/* File info */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <FileIcon type={upload.file.type} filename={upload.file.name} size={18} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text-primary truncate">{upload.file.name}</p>
            <p className="text-xs text-text-muted">{formatFileSize(upload.file.size)}</p>
          </div>
        </div>
      </div>

      {/* Share link */}
      <div className="px-5 py-4 border-b border-border">
        <label className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2 block">
          Share link
        </label>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-md bg-surface-2 border border-border">
            <Link size={14} className="text-text-muted shrink-0" />
            <span className="text-sm text-text-primary truncate">{shareUrl}</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopy}
            className="shrink-0"
          >
            {copied ? (
              <>
                <Check size={14} className="text-success" />
                Copied
              </>
            ) : (
              <>
                <Copy size={14} />
                Copy
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 py-4 flex items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => window.open(shareUrl, '_blank')}
        >
          <ExternalLink size={14} />
          Open link
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onUploadAnother}
        >
          <Upload size={14} />
          Upload another
        </Button>
      </div>
    </div>
  );
}
