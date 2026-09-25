import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUpload } from '../hooks/useUpload';
import { DropZone } from '../components/DropZone';
import { FileCard } from '../components/FileCard';
import { CollectionCard } from '../components/CollectionCard';
import { Button } from '../components/Button';
import { Trash2, Sparkles, AlertCircle, X } from 'lucide-react';
import { getStorageMode } from '../lib/storage';

export function HomePage() {
  const navigate = useNavigate();
  const { shareId, successfulUploads, activeUploads, uploadFiles, clearAll, globalError, clearGlobalError } = useUpload();
  const storageMode = getStorageMode();

  const handleFilesSelected = useCallback((files: File[]) => {
    console.log('[HomePage] FILES RECEIVED:', files.length, 'files');
    console.log('[HomePage] Calling uploadFiles');
    uploadFiles(files);
  }, [uploadFiles]);

  const handleViewSharePage = useCallback(() => {
    if (shareId) {
      navigate(`/share/${shareId}`);
    }
  }, [shareId, navigate]);

  const hasCompleted = successfulUploads.length > 0;
  const hasActive = activeUploads.length > 0;

  const totalSize = successfulUploads.reduce((sum, u) => sum + u.file.size, 0);

  return (
    <div className="min-h-screen pt-14">
      {/* Subtle background gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-accent/[0.02] rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 py-12 md:py-20">
        {/* Storage mode indicator */}
        {storageMode === 'local' && (
          <div className="mb-6 p-3 rounded-lg bg-amber-400/10 border border-amber-400/20">
            <p className="text-xs text-amber-400">
              <strong>Local storage mode:</strong> Files are stored in your browser. Share links work on this device only.
            </p>
          </div>
        )}

        {/* Hero */}
        <div className="text-center mb-10 md:mb-14">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-2 border border-border text-xs text-text-muted mb-5">
            <Sparkles size={11} className="text-accent" />
            Fast, simple file sharing
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-text-primary mb-4 tracking-tight">
            Share files.{' '}
            <span className="bg-gradient-to-r from-accent to-accent-hover bg-clip-text text-transparent">
              Simply.
            </span>
          </h1>
          <p className="text-text-secondary text-base sm:text-lg max-w-md mx-auto leading-relaxed">
            Upload files and get a shareable link in seconds.
          </p>
        </div>

        {/* Upload Zone */}
        {!hasCompleted && (
          <>
            {globalError && (
              <div className="mb-6 p-4 rounded-lg bg-error/10 border border-error/20">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-error shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-error mb-1">Upload failed</p>
                    <p className="text-sm text-text-secondary">{globalError}</p>
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
            <DropZone onFilesSelected={handleFilesSelected} />
          </>
        )}

        {/* Active uploads */}
        {hasActive && (
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-text-secondary">
                {hasCompleted ? 'Uploading more files...' : 'Uploading'}
              </h2>
              <Button variant="ghost" size="sm" onClick={clearAll}>
                <Trash2 size={13} />
                Clear all
              </Button>
            </div>
            {activeUploads.map(upload => (
              <div key={upload.id} className="animate-fade-in">
                <FileCard upload={upload} />
              </div>
            ))}
          </div>
        )}

        {/* Collection success card */}
        {hasCompleted && shareId && (
          <div className="mt-8">
            <CollectionCard
              shareId={shareId}
              fileCount={successfulUploads.length}
              totalSize={totalSize}
              onViewSharePage={handleViewSharePage}
            />
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 md:mt-24 text-center">
          <div className="flex items-center justify-center gap-4 text-xs text-text-muted">
            <span>No sign-up required</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>{storageMode === 'cloud' ? 'Cloud storage' : 'Local storage'}</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>Up to 100 MB per file</span>
          </div>
        </div>
      </div>
    </div>
  );
}
