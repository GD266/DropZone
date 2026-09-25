import { useState, useCallback, useRef } from 'react';
import type { UploadFile, UploadSession } from '../types';
import { createShare, uploadFile } from '../lib/storage';
import { validateFile } from '../lib/fileUtils';

export function useUpload() {
  const [session, setSession] = useState<UploadSession | null>(null);
  const abortRef = useRef(false);
  const sessionRef = useRef<UploadSession | null>(null);

  const setSessionAndRef = useCallback((updater: React.SetStateAction<UploadSession | null>) => {
    setSession(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      sessionRef.current = next;
      return next;
    });
  }, []);

  const updateUpload = useCallback((id: string, updates: Partial<UploadFile>) => {
    setSessionAndRef(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        uploads: prev.uploads.map(u => u.id === id ? { ...u, ...updates } : u),
      };
    });
  }, [setSessionAndRef]);

  const uploadFiles = useCallback(async (files: File[]) => {
    abortRef.current = false;

    // Filter out duplicates based on current session
    const existingNames = new Set(sessionRef.current?.uploads.map(u => u.file.name) || []);
    const uniqueFiles = files.filter(f => !existingNames.has(f.name));

    if (uniqueFiles.length === 0) return;

    // Create or get share ID
    let shareId = sessionRef.current?.shareId;
    if (!shareId) {
      try {
        shareId = await createShare();
      } catch (err) {
        console.error('Failed to create share:', err);
        return;
      }
    }

    const newUploads: UploadFile[] = uniqueFiles.map(file => ({
      id: file.name + file.size, // Use name+size as unique ID
      file,
      status: 'pending' as const,
      progress: 0,
    }));

    setSessionAndRef(prev => ({
      shareId,
      uploads: [...(prev?.uploads || []), ...newUploads],
    }));

    // Track successfully uploaded files for cleanup
    const uploadedFileIds: string[] = [];

    for (const upload of newUploads) {
      if (abortRef.current) break;

      const validationError = validateFile(upload.file);
      if (validationError) {
        updateUpload(upload.id, { status: 'error', error: validationError });
        continue;
      }

      try {
        updateUpload(upload.id, { status: 'uploading', progress: 0 });

        const fileRecord = await uploadFile(upload.file, shareId!, (progress: number) => {
          updateUpload(upload.id, { progress });
        });

        uploadedFileIds.push(fileRecord.id);
        updateUpload(upload.id, {
          status: 'success',
          progress: 100,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        updateUpload(upload.id, { status: 'error', error: message });
      }
    }

    // If some files failed but share was created with no successful files,
    // we could clean up the empty share. For now, we keep it.
  }, [updateUpload, setSessionAndRef]);

  const clearAll = useCallback(() => {
    abortRef.current = true;
    setSessionAndRef(null);
  }, [setSessionAndRef]);

  const successfulUploads = session?.uploads.filter(u => u.status === 'success') || [];
  const activeUploads = session?.uploads.filter(u => u.status !== 'success') || [];

  return {
    session,
    uploads: session?.uploads || [],
    shareId: session?.shareId || null,
    successfulUploads,
    activeUploads,
    uploadFiles,
    clearAll,
  };
}
