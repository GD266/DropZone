import { useState, useRef, useCallback } from 'react';
import { Upload, UploadCloud } from 'lucide-react';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export function DropZone({ onFilesSelected, disabled = false }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
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
    console.log('[DropZone] FILE INPUT CHANGE FIRED');
    const files = Array.from(e.target.files || []);
    console.log('[DropZone] Selected files:', files);
    console.log('[DropZone] File count:', files.length);
    
    if (files.length > 0) {
      console.log('[DropZone] First file:', files[0]);
      console.log('[DropZone] Calling onFilesSelected with', files.length, 'files');
      onFilesSelected(files);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFilesSelected]);

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
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* Glow effect when dragging */}
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

      <div className="mt-5 flex items-center gap-3 text-xs text-text-muted">
        <span className="px-2 py-0.5 rounded bg-surface-2 border border-border">Multiple files</span>
        <span className="px-2 py-0.5 rounded bg-surface-2 border border-border">Up to 100 MB</span>
      </div>
    </div>
  );
}
