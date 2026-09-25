import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { UploadFile } from '../types';
import { storeFile } from '../lib/storage';
import { validateFile } from '../lib/fileUtils';

export function useUpload() {
  const [uploads, setUploads] = useState<UploadFile[]>([]);
  const abortRef = useRef(false);
  const uploadsRef = useRef<UploadFile[]>([]);

  // Keep ref in sync
  const setUploadsAndRef = useCallback((updater: React.SetStateAction<UploadFile[]>) => {
    setUploads(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      uploadsRef.current = next;
      return next;
    });
  }, []);

  const updateUpload = useCallback((id: string, updates: Partial<UploadFile>) => {
    setUploadsAndRef(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
  }, [setUploadsAndRef]);

  const uploadFiles = useCallback(async (files: File[]) => {
    abortRef.current = false;

    // Filter out duplicates based on current state
    const existingNames = new Set(uploadsRef.current.map(u => u.file.name));
    const uniqueFiles = files.filter(f => !existingNames.has(f.name));

    if (uniqueFiles.length === 0) return;

    const newUploads: UploadFile[] = uniqueFiles.map(file => ({
      id: uuidv4(),
      file,
      status: 'pending' as const,
      progress: 0,
    }));

    setUploadsAndRef(prev => [...prev, ...newUploads]);

    for (const upload of newUploads) {
      if (abortRef.current) break;

      const validationError = validateFile(upload.file);
      if (validationError) {
        updateUpload(upload.id, { status: 'error', error: validationError });
        continue;
      }

      try {
        updateUpload(upload.id, { status: 'uploading', progress: 0 });

        const stored = await storeFile(upload.file, (progress) => {
          updateUpload(upload.id, { progress });
        });

        updateUpload(upload.id, {
          status: 'success',
          progress: 100,
          shareId: stored.id,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        updateUpload(upload.id, { status: 'error', error: message });
      }
    }
  }, [updateUpload, setUploadsAndRef]);

  const clearCompleted = useCallback(() => {
    setUploadsAndRef(prev => prev.filter(u => u.status !== 'success'));
  }, [setUploadsAndRef]);

  const clearAll = useCallback(() => {
    abortRef.current = true;
    setUploadsAndRef([]);
  }, [setUploadsAndRef]);

  return {
    uploads,
    uploadFiles,
    clearCompleted,
    clearAll,
  };
}
