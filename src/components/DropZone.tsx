import { useState, useRef, useCallback } from 'react';
import { Upload, UploadCloud, Plus } from 'lucide-react';
import { formatFileSize, MAX_FILE_SIZE } from '../lib/fileUtils';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function DropZone({ onFilesSelected, disabled = false, compact = false }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragCounterRef.current = 0;

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFilesSelected(files);
    }
  }, [onFilesSelected, disabled]);

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Copy the FileList before resetting the input. Clearing the input first
    // lets the user select the same file again even if the handler throws.
    const files = Array.from(e.target.files || []);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (files.length > 0) {
      onFilesSelected(files);
    }
  }, [onFilesSelected]);

  const input = (
    <input
      ref={fileInputRef}
      type="file"
      multiple
      onChange={handleFileChange}
      className="hidden"
      aria-hidden="true"
    />
  );

  if (compact) {
    return (
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-label="Add more files by clicking or dragging"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        className={`
          flex items-center justify-center gap-3 w-full px-4 py-5
          border border-dashed rounded-lg cursor-pointer transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-accent/40 focus:ring-offset-2 focus:ring-offset-surface-0
          ${isDragOver
            ? 'border-accent bg-accent/[0.05] text-accent'
            : 'border-border hover:border-border-hover hover:bg-surface-2/40 text-text-secondary hover:text-text-primary'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
        `}
      >
        {input}
        <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${isDragOver ? 'bg-accent/10' : 'bg-surface-2'}`}>
          {isDragOver ? <UploadCloud size={17} /> : <Plus size={17} />}
        </div>
        <div className="text-left">
          <p className="text-sm font-medium">{isDragOver ? 'Drop files to add them' : 'Add more files'}</p>
          <p className="text-xs text-text-muted">Drop anywhere or click to browse</p>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label="Upload files by clicking or dragging"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className={`
        relative flex flex-col items-center justify-center
        w-full min-h-[260px] sm:min-h-[280px] md:min-h-[320px]
        border-2 border-dashed rounded-lg
        cursor-pointer transition-all duration-200 ease-out
        focus:outline-none focus:ring-2 focus:ring-accent/40 focus:ring-offset-2 focus:ring-offset-surface-0
        group
        ${isDragOver
          ? 'border-accent bg-accent/[0.04] scale-[1.01]'
          : 'border-border hover:border-border-hover hover:bg-surface-2/40'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
      `}
    >
      {input}

      {isDragOver && (
        <div className="absolute inset-0 rounded-lg bg-accent/[0.03] animate-pulse-border pointer-events-none" />
      )}

      <div className={`
        flex items-center justify-center w-14 h-14 rounded-xl mb-5
        transition-all duration-200
        ${isDragOver
          ? 'bg-accent/10 text-accent scale-110'
          : 'bg-surface-2 text-text-muted group-hover:bg-surface-3 group-hover:text-text-secondary'
        }
      `}>
        {isDragOver ? <UploadCloud size={26} /> : <Upload size={26} />}
      </div>

      <p className={`text-base font-medium mb-1.5 transition-colors duration-200 ${
        isDragOver ? 'text-accent' : 'text-text-primary'
      }`}>
        {isDragOver ? 'Drop files here' : 'Drag & drop files here'}
      </p>
      <p className="text-sm text-text-muted">
        or{' '}
        <span className="text-accent/80 group-hover:text-accent transition-colors underline underline-offset-2 decoration-accent/20 group-hover:decoration-accent/40">
          browse from your computer
        </span>
      </p>
      <p className="text-xs text-text-muted mt-2">You can also paste files with Ctrl+V</p>

      <div className="mt-5 flex items-center gap-3 text-xs text-text-muted">
        <span className="px-2 py-0.5 rounded bg-surface-2 border border-border">Multiple files</span>
        <span className="px-2 py-0.5 rounded bg-surface-2 border border-border">Up to {formatFileSize(MAX_FILE_SIZE)} each</span>
      </div>
    </div>
  );
}
