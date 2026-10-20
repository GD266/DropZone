import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUpload } from '../hooks/useUpload';
import { useRecentShares } from '../hooks/useRecentShares';
import { DropZone } from '../components/DropZone';
import { FileCard } from '../components/FileCard';
import { CollectionCard } from '../components/CollectionCard';
import { RecentTransfers } from '../components/RecentTransfers';
import { Button } from '../components/Button';
import {
  Trash2,
  Sparkles,
  AlertCircle,
  X,
  RotateCw,
  Cloud,
  HardDrive,
  Link2,
  Download,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { getStorageMode } from '../lib/storage';
import { getPartialConfigurationError } from '../lib/supabase';
import { formatFileSize, MAX_FILE_SIZE, validateFile } from '../lib/fileUtils';
import { recordRecentShare, removeRecentShare } from '../lib/recentShares';

export function HomePage() {
  const navigate = useNavigate();
  const {
    shareId,
    createdAt,
    uploads,
    successfulUploads,
    failedUploads,
    activeUploads,
    uploadFiles,
    retryUpload,
    retryAllFailed,
    removeUpload,
    clearAll,
    deleteCurrentShare,
    globalError,
    clearGlobalError,
    isPreparing,
    isDeleting,
    isUploading,
    totalSize,
    uploadedSize,
    overallProgress,
  } = useUpload();
  const { recentShares, remove: removeRecent, clear: clearRecent } = useRecentShares();

  const storageMode = getStorageMode();
  const partialConfigError = getPartialConfigurationError();
  const recordedRef = useRef('');

  const hasCompleted = successfulUploads.length > 0;
  const hasFiles = uploads.length > 0;
  const successfulSize = successfulUploads.reduce((sum, upload) => sum + upload.file.size, 0);
  const retryableFailures = failedUploads.filter(upload => !validateFile(upload.file));
  const visibleUploads = uploads.filter(upload => upload.status !== 'success');

  useEffect(() => {
    if (!shareId || successfulUploads.length === 0) return;

    const key = `${shareId}:${successfulUploads.length}:${successfulSize}`;
    if (recordedRef.current === key) return;
    recordedRef.current = key;

    recordRecentShare({
      shareId,
      createdAt: createdAt || new Date().toISOString(),
      fileCount: successfulUploads.length,
      totalSize: successfulSize,
      fileNames: successfulUploads.map(upload => upload.file.name),
      mode: storageMode,
    });
  }, [shareId, createdAt, successfulUploads, successfulSize, storageMode]);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      const files = Array.from(event.clipboardData?.files || []);
      if (files.length > 0) {
        event.preventDefault();
        uploadFiles(files);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [uploadFiles]);

  const handleFilesSelected = useCallback((files: File[]) => {
    uploadFiles(files);
  }, [uploadFiles]);

  const handleViewSharePage = useCallback(() => {
    if (shareId) navigate(`/share/${shareId}`);
  }, [shareId, navigate]);

  const handleDelete = useCallback(async () => {
    const deletingShareId = shareId;
    const deleted = await deleteCurrentShare();
    if (deleted && deletingShareId) {
      removeRecentShare(deletingShareId);
      recordedRef.current = '';
    }
  }, [shareId, deleteCurrentShare]);

  return (
    <div className="min-h-screen pt-14">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-accent/[0.03] rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 py-12 md:py-20">
        {partialConfigError && (
          <div className="mb-6 p-3 rounded-lg bg-error/10 border border-error/20 flex items-start gap-2.5">
            <AlertCircle size={16} className="text-error shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-medium text-error">Cloud storage is partially configured</p>
              <p className="text-text-secondary mt-0.5">{partialConfigError}. Both values are required for cloud sharing.</p>
            </div>
          </div>
        )}

        {!partialConfigError && storageMode === 'local' && (
          <div className="mb-6 p-3 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-start gap-2.5">
            <HardDrive size={15} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-medium text-amber-400">Local mode — links work on this device only</p>
              <p className="text-text-secondary mt-0.5">
                Files stay in this browser. Add <span className="font-mono text-text-muted">VITE_SUPABASE_URL</span> and{' '}
                <span className="font-mono text-text-muted">VITE_SUPABASE_ANON_KEY</span> to enable cross-device links.
              </p>
            </div>
          </div>
        )}

        {!partialConfigError && storageMode === 'cloud' && !hasCompleted && (
          <div className="mb-6 p-3 rounded-lg bg-success/5 border border-success/15 flex items-center gap-2.5">
            <Cloud size={15} className="text-success" />
            <p className="text-xs text-text-secondary">
              <span className="font-medium text-success">Cloud mode</span> — links work on any device, anywhere.
            </p>
          </div>
        )}

        <div className="text-center mb-10 md:mb-14">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-2 border border-border text-xs text-text-muted mb-5">
            <Sparkles size={11} className="text-accent" />
            Fast, simple file sharing
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-text-primary mb-4 tracking-tight">
            Send files.{' '}
            <span className="bg-gradient-to-r from-accent to-accent-hover bg-clip-text text-transparent">
              One link.
            </span>
          </h1>
          <p className="text-text-secondary text-base sm:text-lg max-w-md mx-auto leading-relaxed">
            Upload from your laptop. Share the link. Anyone can download — no account needed.
          </p>
        </div>

        {globalError && (
          <div className="mb-6 p-4 rounded-lg bg-error/10 border border-error/20">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-error shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-error mb-1">Something went wrong</p>
                <p className="text-sm text-text-secondary break-words">{globalError}</p>
              </div>
              <button
                onClick={clearGlobalError}
                className="text-text-muted hover:text-text-primary transition-colors"
                aria-label="Dismiss error"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {!hasFiles && (
          <>
            <DropZone onFilesSelected={handleFilesSelected} />
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <Step icon={<Link2 size={16} />} title="One link" description="Every file in one share" />
              <Step
                icon={<Download size={16} />}
                title={storageMode === 'cloud' ? 'Any device' : 'This device'}
                description={storageMode === 'cloud' ? 'Cloud links open anywhere' : 'Local links stay in this browser'}
              />
              <Step icon={<ShieldCheck size={16} />} title="No account" description="No sign-up for anyone" />
            </div>
          </>
        )}

        {hasFiles && (
          <div className="space-y-4">
            {(activeUploads.length > 0 || isPreparing) && (
              <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Loader2 size={15} className="text-accent animate-spin shrink-0" />
                    <p className="text-sm font-medium text-text-primary truncate">
                      {isPreparing
                        ? 'Creating transfer...'
                        : `Uploading ${successfulUploads.length + activeUploads.length} ${successfulUploads.length + activeUploads.length === 1 ? 'file' : 'files'}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-text-muted tabular-nums">
                      {formatFileSize(uploadedSize)} / {formatFileSize(totalSize)}
                    </span>
                    <Button variant="ghost" size="sm" onClick={clearAll}>
                      Cancel
                    </Button>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-surface-3 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-300"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
                <p className="text-[11px] text-text-muted mt-1.5">{overallProgress}% complete</p>
              </div>
            )}

            {failedUploads.length > 0 && !isUploading && (
              <div className="flex items-center justify-between gap-3 px-1">
                <p className="text-xs text-text-muted">
                  {failedUploads.length} {failedUploads.length === 1 ? 'file needs' : 'files need'} attention
                </p>
                {retryableFailures.length > 0 && (
                  <Button variant="secondary" size="sm" onClick={retryAllFailed}>
                    <RotateCw size={13} />
                    Retry failed
                  </Button>
                )}
              </div>
            )}

            {visibleUploads.length > 0 && (
              <div className="space-y-2">
                {visibleUploads.map(upload => (
                  <div key={upload.id} className="animate-fade-in">
                    <FileCard upload={upload} onRetry={retryUpload} onRemove={removeUpload} />
                  </div>
                ))}
              </div>
            )}

            {hasCompleted && shareId && (
              <CollectionCard
                shareId={shareId}
                fileCount={successfulUploads.length}
                totalSize={successfulSize}
                createdAt={createdAt}
                storageMode={storageMode}
                onViewSharePage={handleViewSharePage}
                onDelete={handleDelete}
                isDeleting={isDeleting}
              />
            )}

            {hasCompleted && (
              <DropZone onFilesSelected={handleFilesSelected} compact />
            )}

            {!hasCompleted && !isUploading && (
              <div className="flex items-center justify-between gap-3 px-1">
                <p className="text-xs text-text-muted">No files uploaded yet.</p>
                <Button variant="ghost" size="sm" onClick={clearAll}>
                  <Trash2 size={13} />
                  Start over
                </Button>
              </div>
            )}
          </div>
        )}

        <RecentTransfers shares={recentShares} onRemove={removeRecent} onClear={clearRecent} />

        <div className="mt-16 md:mt-24 text-center">
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-text-muted">
            <span>No sign-up required</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span className="inline-flex items-center gap-1">
              {storageMode === 'cloud' ? <Cloud size={11} /> : <HardDrive size={11} />}
              {storageMode === 'cloud' ? 'Cloud storage' : 'Local storage'}
            </span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>Up to {formatFileSize(MAX_FILE_SIZE)} per file</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Step({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-1/60 px-3 py-4">
      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-accent/10 text-accent mx-auto mb-2">
        {icon}
      </div>
      <p className="text-xs font-medium text-text-primary">{title}</p>
      <p className="text-[11px] text-text-muted mt-0.5">{description}</p>
    </div>
  );
}
