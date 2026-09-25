import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Download, ArrowLeft, AlertCircle, Loader2, Eye, Shield } from 'lucide-react';
import { getFile, createDownloadUrl, createPreviewUrl } from '../lib/storage';
import { formatFileSize, formatDate, getFileCategory } from '../lib/fileUtils';
import { FileIcon } from '../components/FileIcon';
import { Button } from '../components/Button';
import type { StoredFile } from '../types';

type PageState = 'loading' | 'ready' | 'error';

export function SharePage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<PageState>('loading');
  const [file, setFile] = useState<StoredFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    let previewUrlValue: string | null = null;
    let downloadUrlValue: string | null = null;

    async function loadFile() {
      if (!id) {
        setState('error');
        return;
      }

      try {
        const storedFile = await getFile(id);
        if (!storedFile) {
          setState('error');
          return;
        }

        setFile(storedFile);
        const category = getFileCategory(storedFile.type, storedFile.name);

        // Generate preview URL for previewable files
        if (['image', 'video', 'audio', 'pdf'].includes(category)) {
          previewUrlValue = createPreviewUrl(storedFile);
          setPreviewUrl(previewUrlValue);
        }

        // Generate download URL
        downloadUrlValue = createDownloadUrl(storedFile);
        setDownloadUrl(downloadUrlValue);

        setState('ready');
      } catch {
        setState('error');
      }
    }

    loadFile();

    return () => {
      if (previewUrlValue) URL.revokeObjectURL(previewUrlValue);
      if (downloadUrlValue) URL.revokeObjectURL(downloadUrlValue);
    };
  }, [id]);

  if (state === 'loading') {
    return (
      <div className="min-h-screen pt-14 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-accent" />
          <p className="text-sm text-text-muted">Loading file...</p>
        </div>
      </div>
    );
  }

  if (state === 'error' || !file) {
    return (
      <div className="min-h-screen pt-14 flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto px-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-error/10 mx-auto mb-5">
            <AlertCircle size={28} className="text-error" />
          </div>
          <h1 className="text-xl font-semibold text-text-primary mb-2">File not found</h1>
          <p className="text-sm text-text-muted mb-8 leading-relaxed">
            This file may have been removed, or the link you followed is invalid.
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

            {/* Download button */}
            {downloadUrl && (
              <a
                href={downloadUrl}
                download={file.name}
                className="block"
              >
                <Button variant="primary" size="lg" className="w-full">
                  <Download size={18} />
                  Download file
                </Button>
              </a>
            )}
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
