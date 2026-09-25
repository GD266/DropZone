import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Download, ArrowLeft, AlertCircle, Loader2, Eye, Shield, Copy, Check, Package, FileDown } from 'lucide-react';
import { getFile, getShareWithFiles, createDownloadUrl, createPreviewUrl } from '../lib/storage';
import { formatFileSize, formatDate, getFileCategory } from '../lib/fileUtils';
import { getShareUrl, getFileUrl } from '../lib/shareLink';
import { createZipDownload, type ZipProgress } from '../lib/zipUtils';
import { FileIcon } from '../components/FileIcon';
import { Button } from '../components/Button';
import { useClipboard } from '../hooks/useClipboard';
import type { StoredFile, ShareCollection } from '../types';

type PageState = 'loading' | 'collection' | 'file' | 'error';

export function SharePage() {
  const { shareId, fileId } = useParams<{ shareId: string; fileId?: string }>();
  const [state, setState] = useState<PageState>('loading');
  const [share, setShare] = useState<ShareCollection | null>(null);
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [currentFile, setCurrentFile] = useState<StoredFile | null>(null);
  const [zipProgress, setZipProgress] = useState<ZipProgress | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const { copyToClipboard, isCopied } = useClipboard();

  useEffect(() => {
    async function loadData() {
      if (!shareId) {
        setState('error');
        return;
      }

      try {
        // If we have a fileId, load just that file
        if (fileId) {
          const file = await getFile(fileId);
          if (!file || file.shareId !== shareId) {
            setState('error');
            return;
          }
          setCurrentFile(file);
          setState('file');
          return;
        }

        // Otherwise load the collection
        const result = await getShareWithFiles(shareId);
        if (!result) {
          setState('error');
          return;
        }

        setShare(result.share);
        setFiles(result.files);
        setState('collection');
      } catch {
        setState('error');
      }
    }

    loadData();
  }, [shareId, fileId]);

  const handleDownloadAll = useCallback(async () => {
    if (!shareId || isDownloading) return;
    
    setIsDownloading(true);
    setZipProgress({ stage: 'preparing', message: 'Preparing ZIP...' });

    try {
      await createZipDownload(shareId, (progress) => {
        setZipProgress(progress);
      });
    } catch {
      setZipProgress({ stage: 'error', message: 'Failed to create ZIP' });
    } finally {
      setIsDownloading(false);
      setTimeout(() => setZipProgress(null), 3000);
    }
  }, [shareId, isDownloading]);

  const handleCopyCollectionLink = useCallback(async () => {
    if (!shareId) return;
    await copyToClipboard(getShareUrl(shareId), 'collection');
  }, [shareId, copyToClipboard]);

  const handleCopyFileLink = useCallback(async (fileId: string) => {
    if (!shareId) return;
    await copyToClipboard(getFileUrl(shareId, fileId), fileId);
  }, [shareId, copyToClipboard]);

  // Loading state
  if (state === 'loading') {
    return (
      <div className="min-h-screen pt-14 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-accent" />
          <p className="text-sm text-text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (state === 'error') {
    return (
      <div className="min-h-screen pt-14 flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto px-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-error/10 mx-auto mb-5">
            <AlertCircle size={28} className="text-error" />
          </div>
          <h1 className="text-xl font-semibold text-text-primary mb-2">Not found</h1>
          <p className="text-sm text-text-muted mb-8 leading-relaxed">
            This file or collection may have been removed, or the link is invalid.
          </p>
          <Link to="/">
            <Button variant="secondary" size="md">
              <ArrowLeft size={14} />
              Go to upload
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Single file view
  if (state === 'file' && currentFile) {
    return (
      <SingleFileView
        file={currentFile}
        onCopyLink={() => handleCopyFileLink(currentFile.id)}
        isCopied={isCopied(currentFile.id)}
      />
    );
  }

  // Collection view
  if (state === 'collection' && share && files.length > 0) {
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);

    return (
      <div className="min-h-screen pt-14">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 md:py-20">
          {/* Back link */}
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors mb-8 group"
          >
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
            Upload files
          </Link>

          {/* Collection header */}
          <div className="border border-border rounded-lg bg-surface-1 overflow-hidden mb-6">
            <div className="p-5 sm:p-6 border-b border-border">
              <div className="flex items-start gap-4 mb-5">
                <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-accent/10">
                  <Package size={22} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg font-semibold text-text-primary mb-1">
                    Your files are ready
                  </h1>
                  <p className="text-sm text-text-muted">
                    {files.length} {files.length === 1 ? 'file' : 'files'} · {formatFileSize(totalSize)}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={handleCopyCollectionLink}
                  className="flex-1"
                >
                  {isCopied('collection') ? (
                    <>
                      <Check size={16} className="text-success" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      Copy Share Link
                    </>
                  )}
                </Button>

                <Button
                  variant="primary"
                  size="md"
                  onClick={handleDownloadAll}
                  disabled={isDownloading}
                  className="flex-1"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {zipProgress?.message || 'Creating...'}
                    </>
                  ) : (
                    <>
                      <FileDown size={16} />
                      Download All
                    </>
                  )}
                </Button>
              </div>

              {/* ZIP progress */}
              {zipProgress && zipProgress.stage !== 'complete' && zipProgress.stage !== 'error' && (
                <div className="mt-4 p-3 rounded-md bg-surface-2 border border-border">
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <Loader2 size={14} className="animate-spin text-accent" />
                    <span>{zipProgress.message}</span>
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
                <div className="mt-4 p-3 rounded-md bg-success/5 border border-success/20">
                  <div className="flex items-center gap-2 text-sm text-success">
                    <Check size={14} />
                    <span>{zipProgress.message}</span>
                  </div>
                </div>
              )}

              {zipProgress?.stage === 'error' && (
                <div className="mt-4 p-3 rounded-md bg-error/5 border border-error/20">
                  <div className="flex items-center gap-2 text-sm text-error">
                    <AlertCircle size={14} />
                    <span>{zipProgress.message}</span>
                  </div>
                </div>
              )}
            </div>

            {/* File list */}
            <div className="divide-y divide-border">
              {files.map((file) => (
                <FileListItem
                  key={file.id}
                  file={file}
                  onCopyLink={() => handleCopyFileLink(file.id)}
                  isCopied={isCopied(file.id)}
                />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-center gap-2 mt-8">
            <Shield size={12} className="text-text-muted" />
            <p className="text-xs text-text-muted">
              Shared securely via DropZone
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Single file view component
function SingleFileView({ file, onCopyLink, isCopied }: { file: StoredFile; onCopyLink: () => void; isCopied: boolean }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    const category = getFileCategory(file.type, file.name);
    
    let pUrl: string | null = null;
    let dUrl: string | null = null;

    if (['image', 'video', 'audio', 'pdf'].includes(category)) {
      pUrl = createPreviewUrl(file);
      setPreviewUrl(pUrl);
    }

    dUrl = createDownloadUrl(file);
    setDownloadUrl(dUrl);

    return () => {
      if (pUrl) URL.revokeObjectURL(pUrl);
      if (dUrl) URL.revokeObjectURL(dUrl);
    };
  }, [file]);

  const category = getFileCategory(file.type, file.name);

  return (
    <div className="min-h-screen pt-14">
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-12 md:py-20">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors mb-8 group"
        >
          <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
          Upload files
        </Link>

        {/* File card */}
        <div className="border border-border rounded-lg bg-surface-1 overflow-hidden shadow-sm">
          {/* Preview area */}
          {previewUrl && (
            <div className="border-b border-border bg-surface-2 p-5">
              <FilePreview category={category} previewUrl={previewUrl} filename={file.name} />
            </div>
          )}

          {/* File info */}
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-4 mb-6">
              <FileIcon type={file.type} filename={file.name} size={24} />
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-semibold text-text-primary truncate leading-snug">
                  {file.name}
                </h1>
                <div className="flex items-center gap-2.5 mt-1.5">
                  <span className="text-sm text-text-secondary">
                    {formatFileSize(file.size)}
                  </span>
                  <span className="text-text-muted">·</span>
                  <span className="text-sm text-text-secondary">
                    {formatDate(file.uploadedAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-3">
              <Button
                variant="secondary"
                size="md"
                onClick={onCopyLink}
              >
                {isCopied ? (
                  <>
                    <Check size={16} className="text-success" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copy Link
                  </>
                )}
              </Button>

              {downloadUrl && (
                <a href={downloadUrl} download={file.name} className="block">
                  <Button variant="primary" size="lg" className="w-full">
                    <Download size={18} />
                    Download file
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 mt-8">
          <Shield size={12} className="text-text-muted" />
          <p className="text-xs text-text-muted">
            Shared securely via DropZone
          </p>
        </div>
      </div>
    </div>
  );
}

// File list item component
function FileListItem({ file, onCopyLink, isCopied }: { file: StoredFile; onCopyLink: () => void; isCopied: boolean }) {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = createDownloadUrl(file);
    setDownloadUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="p-4 sm:p-5 hover:bg-surface-2/50 transition-colors">
      <div className="flex items-start gap-3 mb-3">
        <FileIcon type={file.type} filename={file.name} size={20} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">
            {file.name}
          </p>
          <p className="text-xs text-text-muted mt-0.5">
            {formatFileSize(file.size)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-11">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCopyLink}
          className="flex-1 sm:flex-none"
        >
          {isCopied ? (
            <>
              <Check size={13} className="text-success" />
              Copied
            </>
          ) : (
            <>
              <Copy size={13} />
              Copy Link
            </>
          )}
        </Button>

        {downloadUrl && (
          <a href={downloadUrl} download={file.name}>
            <Button variant="secondary" size="sm">
              <Download size={13} />
              Download
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}

// File preview component
function FilePreview({ category, previewUrl, filename }: { category: string; previewUrl: string; filename: string }) {
  switch (category) {
    case 'image':
      return (
        <div className="flex items-center justify-center max-h-72 overflow-hidden rounded-lg bg-surface-3">
          <img
            src={previewUrl}
            alt={filename}
            className="max-w-full max-h-72 object-contain"
          />
        </div>
      );
    case 'video':
      return (
        <div className="flex items-center justify-center rounded-lg overflow-hidden bg-surface-3">
          <video
            src={previewUrl}
            controls
            className="max-w-full max-h-72"
          />
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
