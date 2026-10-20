import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Download,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Eye,
  Shield,
  Copy,
  Check,
  Package,
  FileDown,
  Cloud,
  HardDrive,
  Search,
  RotateCw,
  Files,
} from 'lucide-react';
import { getShare, getDownloadUrl, getLocalFileBlob, getStorageMode } from '../lib/storage';
import { formatFileSize, formatDate, getFileCategory } from '../lib/fileUtils';
import { getShareUrl, getFileUrl } from '../lib/shareLink';
import { createZipDownload } from '../lib/zipUtils';
import { FileIcon } from '../components/FileIcon';
import { Button } from '../components/Button';
import { ShareActions } from '../components/ShareActions';
import { useClipboard } from '../hooks/useClipboard';
import type { ShareCollection, FileRecord, StorageMode, ZipProgress } from '../types';

type PageState = 'loading' | 'collection' | 'file' | 'empty' | 'error';

export function SharePage() {
  const { shareId, fileId } = useParams<{ shareId: string; fileId?: string }>();
  const [state, setState] = useState<PageState>('loading');
  const [share, setShare] = useState<ShareCollection | null>(null);
  const [currentFile, setCurrentFile] = useState<FileRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [zipProgress, setZipProgress] = useState<ZipProgress | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const storageMode = getStorageMode();

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (!shareId) {
        setState('error');
        setErrorMessage('This share link is missing an ID.');
        return;
      }

      setState('loading');
      setErrorMessage('');

      try {
        const shareData = await getShare(shareId);
        if (cancelled) return;

        if (!shareData) {
          setShare(null);
          setCurrentFile(null);
          setState('error');
          setErrorMessage(
            storageMode === 'local'
              ? 'This transfer is not in this browser. Local-only links only work on the device where they were created.'
              : 'This link is invalid or the transfer was deleted.'
          );
          return;
        }

        setShare(shareData);

        if (fileId) {
          const file = shareData.files.find(item => item.id === fileId);
          if (!file) {
            setCurrentFile(null);
            setState('error');
            setErrorMessage('That file is not part of this transfer.');
            return;
          }
          setCurrentFile(file);
          setState('file');
          return;
        }

        setCurrentFile(null);
        setState(shareData.files.length === 0 ? 'empty' : 'collection');
      } catch (error) {
        if (cancelled) return;
        setState('error');
        setErrorMessage(error instanceof Error ? error.message : 'Could not load this transfer.');
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [shareId, fileId, reloadToken, storageMode]);

  const handleDownloadAll = useCallback(async () => {
    if (!shareId || isDownloading) return;

    setIsDownloading(true);
    setZipProgress({ stage: 'preparing', message: 'Preparing ZIP...' });

    try {
      await createZipDownload(shareId, setZipProgress);
    } catch {
      setZipProgress({ stage: 'error', message: 'Could not create the ZIP. Try downloading files individually.' });
    } finally {
      setIsDownloading(false);
      setTimeout(() => setZipProgress(null), 4000);
    }
  }, [shareId, isDownloading]);

  const retry = () => setReloadToken(token => token + 1);

  if (state === 'loading') {
    return <LoadingState />;
  }

  if (state === 'error') {
    return (
      <ErrorState
        message={errorMessage}
        storageMode={storageMode}
        onRetry={retry}
      />
    );
  }

  if (state === 'empty' && share) {
    return (
      <EmptyState
        share={share}
        storageMode={storageMode}
        onRetry={retry}
      />
    );
  }

  if (state === 'file' && share && currentFile) {
    return (
      <SingleFileView
        share={share}
        file={currentFile}
        storageMode={storageMode}
      />
    );
  }

  if (state === 'collection' && share) {
    return (
      <CollectionView
        share={share}
        storageMode={storageMode}
        zipProgress={zipProgress}
        isDownloading={isDownloading}
        onDownloadAll={handleDownloadAll}
      />
    );
  }

  return null;
}

function CollectionView({
  share,
  storageMode,
  zipProgress,
  isDownloading,
  onDownloadAll,
}: {
  share: ShareCollection;
  storageMode: StorageMode;
  zipProgress: ZipProgress | null;
  isDownloading: boolean;
  onDownloadAll: () => void;
}) {
  const [query, setQuery] = useState('');
  const shareUrl = getShareUrl(share.shareId);
  const totalSize = share.files.reduce((sum, file) => sum + file.size, 0);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredFiles = normalizedQuery
    ? share.files.filter(file => file.name.toLowerCase().includes(normalizedQuery))
    : share.files;

  return (
    <div className="min-h-screen pt-14">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 md:py-20">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors mb-8 group"
        >
          <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
          Upload files
        </Link>

        {storageMode === 'local' && <LocalModeNotice />}

        <div className="border border-border rounded-lg bg-surface-1 overflow-hidden shadow-sm">
          <div className="p-5 sm:p-6 border-b border-border">
            <div className="flex items-start gap-4 mb-5">
              <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-accent/10 shrink-0">
                <Package size={22} className="text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-semibold text-text-primary mb-1">
                  Files shared with you
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-sm text-text-muted">
                  <span>{share.files.length} {share.files.length === 1 ? 'file' : 'files'}</span>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span>{formatFileSize(totalSize)}</span>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span>{formatDate(share.createdAt)}</span>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] shrink-0 ${
                storageMode === 'cloud'
                  ? 'border-success/20 bg-success/5 text-success'
                  : 'border-amber-400/20 bg-amber-400/5 text-amber-400'
              }`}>
                {storageMode === 'cloud' ? <Cloud size={11} /> : <HardDrive size={11} />}
                {storageMode === 'cloud' ? 'Cloud' : 'Local'}
              </span>
            </div>

            <ShareActions url={shareUrl} title={`${share.files.length} ${share.files.length === 1 ? 'file' : 'files'} on DropZone`} />

            <Button
              variant="primary"
              size="lg"
              onClick={onDownloadAll}
              disabled={isDownloading}
              className="w-full mt-3"
            >
              {isDownloading ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  {zipProgress?.message || 'Preparing download...'}
                </>
              ) : (
                <>
                  <FileDown size={17} />
                  Download all as ZIP
                </>
              )}
            </Button>

            {zipProgress && zipProgress.stage !== 'complete' && zipProgress.stage !== 'error' && (
              <div className="mt-3 rounded-md bg-surface-2 border border-border p-3">
                <div className="flex items-center justify-between gap-3 text-xs text-text-secondary">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={13} className="animate-spin text-accent" />
                    {zipProgress.message}
                  </span>
                  {zipProgress.percent !== undefined && (
                    <span className="tabular-nums text-text-muted">{zipProgress.percent}%</span>
                  )}
                </div>
                {zipProgress.percent !== undefined && (
                  <div className="mt-2 w-full h-1 bg-surface-3 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-300"
                      style={{ width: `${zipProgress.percent}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            {zipProgress?.stage === 'complete' && (
              <div className="mt-3 flex items-center gap-2 rounded-md bg-success/5 border border-success/20 p-3 text-sm text-success">
                <Check size={14} />
                {zipProgress.message}
              </div>
            )}

            {zipProgress?.stage === 'error' && (
              <div className="mt-3 flex items-center gap-2 rounded-md bg-error/5 border border-error/20 p-3 text-sm text-error">
                <AlertCircle size={14} />
                {zipProgress.message}
              </div>
            )}
          </div>

          {share.files.length > 4 && (
            <div className="px-4 sm:px-5 py-3 border-b border-border bg-surface-2/30">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="search"
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Find a file..."
                  className="w-full rounded-md border border-border bg-surface-1 pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40"
                />
              </div>
            </div>
          )}

          <div className="divide-y divide-border">
            {filteredFiles.map(file => (
              <FileListItem key={file.id} file={file} storageMode={storageMode} />
            ))}

            {filteredFiles.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-sm text-text-secondary">No files match “{query}”.</p>
                <button onClick={() => setQuery('')} className="text-xs text-accent hover:text-accent-hover mt-2">
                  Clear search
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mt-8 text-xs text-text-muted">
          <Shield size={12} />
          <span>No account needed. Download directly from this page.</span>
        </div>
      </div>
    </div>
  );
}

function FileListItem({ file, storageMode }: { file: FileRecord; storageMode: StorageMode }) {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const { copyToClipboard, isCopied } = useClipboard();
  const copied = isCopied(`file-${file.id}`);
  const fileUrl = getFileUrl(file.shareId, file.id);

  useEffect(() => {
    let objectUrl: string | null = null;
    setUnavailable(false);

    async function setupUrl() {
      if (storageMode === 'cloud' && file.storagePath) {
        setDownloadUrl(getDownloadUrl(file.storagePath, file.name));
        return;
      }

      const result = await getLocalFileBlob(file.id);
      if (!result) {
        setUnavailable(true);
        return;
      }

      objectUrl = URL.createObjectURL(result.blob);
      setDownloadUrl(objectUrl);
    }

    setupUrl();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file, storageMode]);

  return (
    <div className="p-4 sm:p-5 hover:bg-surface-2/40 transition-colors">
      <div className="flex items-start gap-3">
        <FileIcon type={file.type} filename={file.name} size={20} className="shrink-0" />

        <div className="flex-1 min-w-0">
          <Link
            to={`/share/${file.shareId}/file/${file.id}`}
            className="text-sm font-medium text-text-primary hover:text-accent transition-colors truncate block"
          >
            {file.name}
          </Link>
          <p className="text-xs text-text-muted mt-0.5">
            {formatFileSize(file.size)}
            <span className="mx-1.5">·</span>
            {formatDate(file.uploadedAt)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 ml-[52px]">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => copyToClipboard(fileUrl, `file-${file.id}`)}
          className="flex-1 sm:flex-none"
        >
          {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy link'}
        </Button>

        {downloadUrl ? (
          <a href={downloadUrl} download={file.name} className="flex-1 sm:flex-none">
            <Button variant="secondary" size="sm" className="w-full">
              <Download size={13} />
              Download
            </Button>
          </a>
        ) : (
          <Button variant="secondary" size="sm" disabled className="flex-1 sm:flex-none">
            <Download size={13} />
            {unavailable ? 'Unavailable' : 'Preparing...'}
          </Button>
        )}
      </div>
    </div>
  );
}

function SingleFileView({
  share,
  file,
  storageMode,
}: {
  share: ShareCollection;
  file: FileRecord;
  storageMode: StorageMode;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    setUnavailable(false);

    async function setupUrls() {
      if (storageMode === 'cloud' && file.storagePath) {
        setPreviewUrl(getDownloadUrl(file.storagePath));
        setDownloadUrl(getDownloadUrl(file.storagePath, file.name));
        return;
      }

      const result = await getLocalFileBlob(file.id);
      if (!result) {
        setUnavailable(true);
        return;
      }

      objectUrl = URL.createObjectURL(result.blob);
      setPreviewUrl(objectUrl);
      setDownloadUrl(objectUrl);
    }

    setupUrls();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file, storageMode]);

  const category = getFileCategory(file.type, file.name);
  const isPreviewable = ['image', 'video', 'audio', 'pdf'].includes(category);
  const fileUrl = getFileUrl(file.shareId, file.id);
  const backTo = share.files.length > 1 ? `/share/${share.shareId}` : '/';

  return (
    <div className="min-h-screen pt-14">
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-12 md:py-20">
        <Link
          to={backTo}
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors mb-8 group"
        >
          <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
          {share.files.length > 1 ? 'Back to all files' : 'Upload files'}
        </Link>

        {storageMode === 'local' && <LocalModeNotice />}

        <div className="border border-border rounded-lg bg-surface-1 overflow-hidden shadow-sm">
          {isPreviewable && previewUrl && (
            <div className="border-b border-border bg-surface-2 p-5">
              <FilePreview category={category} previewUrl={previewUrl} filename={file.name} />
            </div>
          )}

          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-4 mb-6">
              <FileIcon type={file.type} filename={file.name} size={24} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-semibold text-text-primary truncate leading-snug">
                  {file.name}
                </h1>
                <div className="flex flex-wrap items-center gap-2.5 mt-1.5 text-sm text-text-secondary">
                  <span>{formatFileSize(file.size)}</span>
                  <span className="text-text-muted">·</span>
                  <span>{formatDate(file.uploadedAt)}</span>
                </div>
              </div>
            </div>

            {unavailable && (
              <div className="mb-4 flex items-center gap-2 rounded-md bg-error/5 border border-error/20 p-3 text-xs text-error">
                <AlertCircle size={14} />
                This file is no longer available in this browser.
              </div>
            )}

            <ShareActions url={fileUrl} title={file.name} className="mb-3" />

            {downloadUrl ? (
              <a href={downloadUrl} download={file.name} className="block">
                <Button variant="primary" size="lg" className="w-full">
                  <Download size={18} />
                  Download file
                </Button>
              </a>
            ) : (
              <Button variant="primary" size="lg" className="w-full" disabled>
                <Download size={18} />
                {unavailable ? 'File unavailable' : 'Preparing download...'}
              </Button>
            )}
          </div>
        </div>

        {share.files.length > 1 && (
          <Link
            to={`/share/${share.shareId}`}
            className="mt-4 inline-flex items-center justify-center gap-2 w-full text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            <Files size={14} />
            View all {share.files.length} files in this transfer
          </Link>
        )}

        <div className="flex items-center justify-center gap-2 mt-8 text-xs text-text-muted">
          <Shield size={12} />
          <span>Shared via DropZone</span>
        </div>
      </div>
    </div>
  );
}

function FilePreview({ category, previewUrl, filename }: { category: string; previewUrl: string; filename: string }) {
  switch (category) {
    case 'image':
      return (
        <div className="flex items-center justify-center max-h-72 overflow-hidden rounded-lg bg-surface-3">
          <img src={previewUrl} alt={filename} className="max-w-full max-h-72 object-contain" />
        </div>
      );
    case 'video':
      return (
        <div className="flex items-center justify-center rounded-lg overflow-hidden bg-surface-3">
          <video src={previewUrl} controls className="max-w-full max-h-72" />
        </div>
      );
    case 'audio':
      return (
        <div className="flex items-center justify-center py-3">
          <audio src={previewUrl} controls className="w-full max-w-md" />
        </div>
      );
    case 'pdf':
      return (
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-400/10">
            <Eye size={18} className="text-red-400" />
          </div>
          <p className="text-xs text-text-muted">PDF document</p>
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent hover:text-accent-hover transition-colors"
          >
            Open in new tab →
          </a>
        </div>
      );
    default:
      return null;
  }
}

function LocalModeNotice() {
  return (
    <div className="mb-6 p-3 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-start gap-2.5">
      <HardDrive size={15} className="text-amber-400 shrink-0 mt-0.5" />
      <p className="text-xs text-text-secondary">
        <span className="font-medium text-amber-400">Local transfer.</span>{' '}
        These files live in this browser, so this link only works on this device.
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen pt-14 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={24} className="animate-spin text-accent" />
        <p className="text-sm text-text-muted">Loading transfer...</p>
      </div>
    </div>
  );
}

function ErrorState({ message, storageMode, onRetry }: { message: string; storageMode: StorageMode; onRetry: () => void }) {
  return (
    <div className="min-h-screen pt-14 flex items-center justify-center">
      <div className="text-center max-w-sm mx-auto px-4">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-error/10 mx-auto mb-5">
          <AlertCircle size={28} className="text-error" />
        </div>
        <h1 className="text-xl font-semibold text-text-primary mb-2">Transfer unavailable</h1>
        <p className="text-sm text-text-muted mb-3 leading-relaxed">{message}</p>
        {storageMode === 'local' && (
          <p className="text-xs text-text-muted mb-8 leading-relaxed">
            To share across devices, the sender needs to enable cloud storage with Supabase.
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-2 justify-center mt-6">
          <Button variant="secondary" size="md" onClick={onRetry}>
            <RotateCw size={14} />
            Try again
          </Button>
          <Link to="/">
            <Button variant="ghost" size="md" className="w-full">
              <ArrowLeft size={14} />
              Go to upload
            </Button>
          </Link>
        </div>
        <div className="flex items-center justify-center gap-2 mt-8 text-xs text-text-muted">
          <Shield size={12} />
          <span>Links are public by design</span>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ share, storageMode, onRetry }: { share: ShareCollection; storageMode: StorageMode; onRetry: () => void }) {
  return (
    <div className="min-h-screen pt-14 flex items-center justify-center">
      <div className="text-center max-w-sm mx-auto px-4">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-accent/10 mx-auto mb-5">
          <Package size={26} className="text-accent" />
        </div>
        <h1 className="text-xl font-semibold text-text-primary mb-2">No files yet</h1>
        <p className="text-sm text-text-muted mb-8 leading-relaxed">
          This transfer exists, but no files have finished uploading. If you just sent it, try again in a moment.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button variant="secondary" size="md" onClick={onRetry}>
            <RotateCw size={14} />
            Refresh
          </Button>
          <Link to="/">
            <Button variant="ghost" size="md" className="w-full">
              <ArrowLeft size={14} />
              Upload files
            </Button>
          </Link>
        </div>
        <p className="mt-6 text-xs text-text-muted">
          {storageMode === 'cloud' ? 'Cloud transfer' : 'Local transfer'}
        </p>
      </div>
    </div>
  );
}
