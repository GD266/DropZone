import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { UploadFile, UploadSession } from '../types';
import { storeFile, createShareCollection } from '../lib/storage';
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
      shareId = uuidv4();
    }

    const newUploads: UploadFile[] = uniqueFiles.map(file => ({
      id: uuidv4(),
      file,
      status: 'pending' as const,
      progress: 0,
    }));

    setSessionAndRef(prev => ({
      shareId,
      uploads: [...(prev?.uploads || []), ...newUploads],
    }));

    const storedFileIds: string[] = [];

    for (const upload of newUploads) {
      if (abortRef.current) break;

      const validationError = validateFile(upload.file);
      if (validationError) {
        updateUpload(upload.id, { status: 'error', error: validationError });
        continue;
      }

      try {
        updateUpload(upload.id, { status: 'uploading', progress: 0 });

        const stored = await storeFile(upload.file, shareId!, (progress) => {
          updateUpload(upload.id, { progress });
        });

        storedFileIds.push(stored.id);
        updateUpload(upload.id, {
          status: 'success',
          progress: 100,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        updateUpload(upload.id, { status: 'error', error: message });
      }
    }

    // Create share collection after all files are stored
    if (storedFileIds.length > 0) {
      try {
        await createShareCollection(storedFileIds);
      } catch {
        // Collection creation failed but files are still stored
      }
    }
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
