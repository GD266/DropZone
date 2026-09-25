import { useState, useCallback, useRef } from 'react';
import type { UploadFile, UploadSession } from '../types';
import { createShare, uploadFile } from '../lib/storage';
import { validateFile } from '../lib/fileUtils';

export function useUpload() {
  const [session, setSession] = useState<UploadSession | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
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
    console.log('[useUpload] UPLOAD_HANDLER_STARTED with', files.length, 'files');
    abortRef.current = false;

    // Filter out duplicates based on current session
    const existingNames = new Set(sessionRef.current?.uploads.map(u => u.file.name) || []);
    const uniqueFiles = files.filter(f => !existingNames.has(f.name));
    console.log('[useUpload] Unique files after dedup:', uniqueFiles.length);

    if (uniqueFiles.length === 0) {
      console.log('[useUpload] No unique files, returning early');
      return;
    }

    // Create or get share ID
    let shareId = sessionRef.current?.shareId;
    console.log('[useUpload] Current shareId:', shareId);
    
    if (!shareId) {
      console.log('[useUpload] No existing shareId, creating new share...');
      try {
        shareId = await createShare();
        console.log('[useUpload] Share created successfully:', shareId);
      } catch (err) {
        console.error('[useUpload] FAILED TO CREATE SHARE:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to create share';
        console.error('[useUpload] Error details:', errorMessage);
        setGlobalError(errorMessage);
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

    console.log('[useUpload] Starting upload loop for', newUploads.length, 'files');
    
    for (const upload of newUploads) {
      console.log('[useUpload] Processing file:', upload.file.name);
      
      if (abortRef.current) {
        console.log('[useUpload] Upload aborted');
        break;
      }

      const validationError = validateFile(upload.file);
      if (validationError) {
        console.error('[useUpload] File validation failed:', validationError);
        updateUpload(upload.id, { status: 'error', error: validationError });
        continue;
      }
      
      console.log('[useUpload] File validation passed');

      try {
        console.log('[useUpload] Setting status to uploading');
        updateUpload(upload.id, { status: 'uploading', progress: 0 });

        console.log('[useUpload] Calling uploadFile for:', upload.file.name);
        const fileRecord = await uploadFile(upload.file, shareId!, (progress: number) => {
          updateUpload(upload.id, { progress });
        });

        console.log('[useUpload] File uploaded successfully:', fileRecord.id);
        uploadedFileIds.push(fileRecord.id);
        updateUpload(upload.id, {
          status: 'success',
          progress: 100,
        });
      } catch (err) {
        console.error('[useUpload] UPLOAD FAILED:', err);
        console.error('[useUpload] Error details:', err instanceof Error ? err.message : String(err));
        const message = err instanceof Error ? err.message : 'Upload failed';
        updateUpload(upload.id, { status: 'error', error: message });
      }
    }
    
    console.log('[useUpload] Upload loop complete');

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
    globalError,
    clearGlobalError: () => setGlobalError(null),
  };
}
