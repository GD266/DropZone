import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, QrCode, Share2, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from './Button';
import { useClipboard } from '../hooks/useClipboard';

interface ShareActionsProps {
  url: string;
  title?: string;
  className?: string;
}

export function ShareActions({ url, title = 'DropZone transfer', className = '' }: ShareActionsProps) {
  const { copyToClipboard, isCopied } = useClipboard();
  const [showQr, setShowQr] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const copied = isCopied('share-actions');

  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  const handleNativeShare = async () => {
    if (!navigator.share) return;

    try {
      await navigator.share({
        title,
        text: 'Files shared with DropZone',
        url,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      await copyToClipboard(url, 'share-actions');
    }
  };

  return (
    <>
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        <Button
          variant="secondary"
          size="md"
          onClick={() => copyToClipboard(url, 'share-actions')}
          className="flex-1 sm:flex-none"
        >
          {copied ? <Check size={15} className="text-success" /> : <Copy size={15} />}
          {copied ? 'Copied' : 'Copy link'}
        </Button>

        {canNativeShare && (
          <Button variant="secondary" size="md" onClick={handleNativeShare}>
            <Share2 size={15} />
            Share
          </Button>
        )}

        <Button
          variant="ghost"
          size="md"
          onClick={() => setShowQr(true)}
          aria-label="Show QR code for this link"
        >
          <QrCode size={16} />
          QR code
        </Button>
      </div>

      {showQr && createPortal(
        <QrCodeDialog url={url} title={title} onClose={() => setShowQr(false)} />,
        document.body
      )}
    </>
  );
}

function QrCodeDialog({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const { copyToClipboard, isCopied } = useClipboard();
  const copied = isCopied('qr-dialog');

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-dialog-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface-1 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 id="qr-dialog-title" className="text-base font-semibold text-text-primary">
              Scan to open
            </h2>
            <p className="text-xs text-text-muted mt-1">{title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
            aria-label="Close QR code"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center justify-center rounded-lg bg-white p-4 mx-auto w-fit">
          <QRCodeSVG value={url} size={220} level="M" bgColor="#ffffff" fgColor="#09090b" />
        </div>

        <p className="mt-4 text-xs text-text-muted text-center break-all leading-relaxed">{url}</p>

        <Button
          variant="secondary"
          size="md"
          onClick={() => copyToClipboard(url, 'qr-dialog')}
          className="w-full mt-4"
        >
          {copied ? <Check size={15} className="text-success" /> : <Copy size={15} />}
          {copied ? 'Copied' : 'Copy link'}
        </Button>
      </div>
    </div>
  );
}
