import { useCallback, useRef, useState } from 'react';
import type { UploadFile, UploadSession } from '../types';
import { createShare, deleteShare, isAbortError, uploadFile } from '../lib/storage';
import { validateFile } from '../lib/fileUtils';
import { createId } from '../lib/id';

const MAX_CONCURRENT_UPLOADS = 3;

function fileFingerprint(file: File): string {
  return `${file.name}\u0000${file.size}\u0000${file.lastModified}`;
}

export function useUpload() {
  const [session, setSessionState] = useState<UploadSession | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const sessionRef = useRef<UploadSession | null>(null);
  const abortRef = useRef<AbortController>(new AbortController());
  const queueRef = useRef<UploadFile[]>([]);
  const activeCountRef = useRef(0);
  const sharePromiseRef = useRef<Promise<string> | null>(null);
  const generationRef = useRef(0);
  const processUploadRef = useRef<(upload: UploadFile) => Promise<void>>(async () => undefined);
  const pumpRef = useRef<() => void>(() => undefined);

  const setSession = useCallback((updater: React.SetStateAction<UploadSession | null>) => {
    // Keep the ref in sync immediately. Upload workers read it in the same tick
    // that a share is created, before React has committed the state update.
    const previous = sessionRef.current;
    const next = typeof updater === 'function' ? updater(previous) : updater;
    sessionRef.current = next;
    setSessionState(next);
  }, []);

  const updateUpload = useCallback((id: string, updates: Partial<UploadFile>) => {
    setSession(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        uploads: prev.uploads.map(upload => (upload.id === id ? { ...upload, ...updates } : upload)),
      };
    });
  }, [setSession]);

  const ensureShare = useCallback((): Promise<string> => {
    const currentShareId = sessionRef.current?.shareId;
    if (currentShareId) return Promise.resolve(currentShareId);
    if (sharePromiseRef.current) return sharePromiseRef.current;

    const generation = generationRef.current;
    setIsPreparing(true);

    const promise = createShare()
      .then(async shareId => {
        if (generationRef.current !== generation) {
          await deleteShare(shareId).catch(() => undefined);
          throw new Error('Transfer cancelled');
        }

        setSession(prev => {
          const createdAt = prev?.createdAt || new Date().toISOString();
          return {
            shareId,
            createdAt,
            uploads: prev?.uploads || [],
          };
        });
        return shareId;
      })
      .finally(() => {
        // A cancelled transfer can start a new share before this promise
        // settles. Only the current promise may clear the shared state.
        if (sharePromiseRef.current === promise) {
          sharePromiseRef.current = null;
          setIsPreparing(false);
        }
      });

    sharePromiseRef.current = promise;
    return promise;
  }, [setSession]);

  const processUpload = useCallback(async (upload: UploadFile) => {
    const shareId = sessionRef.current?.shareId;
    if (!shareId) {
      updateUpload(upload.id, { status: 'error', error: 'No transfer was created for this file.' });
      return;
    }

    if (abortRef.current.signal.aborted) return;

    updateUpload(upload.id, { status: 'uploading', progress: 1, error: undefined });

    try {
      await uploadFile(
        upload.file,
        shareId,
        progress => updateUpload(upload.id, { progress }),
        abortRef.current.signal
      );

      updateUpload(upload.id, { status: 'success', progress: 100, error: undefined });
    } catch (error) {
      if (isAbortError(error) || abortRef.current.signal.aborted) return;

      updateUpload(upload.id, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed. Please try again.',
      });
    }
  }, [updateUpload]);

  const pump = useCallback(() => {
    while (activeCountRef.current < MAX_CONCURRENT_UPLOADS && queueRef.current.length > 0) {
      const next = queueRef.current.shift();
      if (!next) break;

      activeCountRef.current += 1;
      void processUploadRef.current(next).finally(() => {
        activeCountRef.current -= 1;
        pumpRef.current();
      });
    }
  }, []);

  processUploadRef.current = processUpload;
  pumpRef.current = pump;

  const uploadFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    setGlobalError(null);

    if (abortRef.current.signal.aborted) {
      abortRef.current = new AbortController();
    }

    const activeFingerprints = new Set(
      (sessionRef.current?.uploads || [])
        .filter(upload => upload.status === 'pending' || upload.status === 'uploading')
        .map(upload => fileFingerprint(upload.file))
    );

    const uniqueFiles = files.filter(file => {
      const fingerprint = fileFingerprint(file);
      if (activeFingerprints.has(fingerprint)) return false;
      activeFingerprints.add(fingerprint);
      return true;
    });

    if (uniqueFiles.length === 0) {
      setGlobalError('Those files are already uploading. Wait for them to finish before selecting them again.');
      return;
    }

    let newUploads: UploadFile[];
    try {
      newUploads = uniqueFiles.map(file => {
        const validationError = validateFile(file);
        return {
          id: createId(),
          file,
          status: validationError ? 'error' : 'pending',
          progress: 0,
          error: validationError || undefined,
        };
      });
    } catch (error) {
      setGlobalError(
        error instanceof Error
          ? `Could not start the upload: ${error.message}`
          : 'Could not start the upload. Please try selecting the file again.'
      );
      return;
    }

    const validUploads = newUploads.filter(upload => upload.status === 'pending');
    const previousShareId = sessionRef.current?.shareId || '';

    setSession(prev => ({
      shareId: prev?.shareId || previousShareId,
      createdAt: prev?.createdAt || new Date().toISOString(),
      uploads: [...(prev?.uploads || []), ...newUploads],
    }));

    if (validUploads.length === 0) return;

    const generation = generationRef.current;
    queueRef.current.push(...validUploads);

    try {
      await ensureShare();
      if (generationRef.current !== generation) return;
      pumpRef.current();
    } catch (error) {
      if (generationRef.current !== generation) return;

      const validIds = new Set(validUploads.map(upload => upload.id));
      queueRef.current = queueRef.current.filter(upload => !validIds.has(upload.id));
      validUploads.forEach(upload => {
        updateUpload(upload.id, {
          status: 'error',
          progress: 0,
          error: error instanceof Error ? error.message : 'Could not create the transfer.',
        });
      });
      setGlobalError(error instanceof Error ? error.message : 'Could not create the transfer.');
    }
  }, [ensureShare, setSession, updateUpload]);

  const retryUpload = useCallback(async (id: string) => {
    const upload = sessionRef.current?.uploads.find(item => item.id === id);
    if (!upload || upload.status === 'uploading') return;

    const validationError = validateFile(upload.file);
    if (validationError) {
      updateUpload(id, { status: 'error', error: validationError });
      return;
    }

    setGlobalError(null);
    const generation = generationRef.current;

    try {
      await ensureShare();
      if (generationRef.current !== generation) return;

      updateUpload(id, { status: 'pending', progress: 0, error: undefined });
      queueRef.current.push({ ...upload, status: 'pending', progress: 0, error: undefined });
      pumpRef.current();
    } catch (error) {
      if (generationRef.current !== generation) return;
      setGlobalError(error instanceof Error ? error.message : 'Could not retry this file.');
    }
  }, [ensureShare, updateUpload]);

  const retryAllFailed = useCallback(async () => {
    const failed = (sessionRef.current?.uploads || []).filter(upload => upload.status === 'error' && !validateFile(upload.file));
    if (failed.length === 0) return;

    setGlobalError(null);
    const generation = generationRef.current;

    try {
      await ensureShare();
      if (generationRef.current !== generation) return;

      failed.forEach(upload => updateUpload(upload.id, { status: 'pending', progress: 0, error: undefined }));
      queueRef.current.push(...failed.map(upload => ({ ...upload, status: 'pending' as const, progress: 0, error: undefined })));
      pumpRef.current();
    } catch (error) {
      if (generationRef.current !== generation) return;
      setGlobalError(error instanceof Error ? error.message : 'Could not retry the failed files.');
    }
  }, [ensureShare, updateUpload]);

  const removeUpload = useCallback((id: string) => {
    const upload = sessionRef.current?.uploads.find(item => item.id === id);
    if (!upload || upload.status === 'uploading' || upload.status === 'success') return;

    queueRef.current = queueRef.current.filter(item => item.id !== id);
    setSession(prev => {
      if (!prev) return prev;
      return { ...prev, uploads: prev.uploads.filter(item => item.id !== id) };
    });
  }, [setSession]);

  const clearAll = useCallback(() => {
    generationRef.current += 1;
    abortRef.current.abort();
    abortRef.current = new AbortController();
    queueRef.current = [];
    activeCountRef.current = 0;
    sharePromiseRef.current = null;
    setSession(null);
    setGlobalError(null);
    setIsPreparing(false);
  }, [setSession]);

  const deleteCurrentShare = useCallback(async (): Promise<boolean> => {
    const shareId = sessionRef.current?.shareId;
    if (!shareId) {
      clearAll();
      return true;
    }

    setIsDeleting(true);
    setGlobalError(null);
    generationRef.current += 1;
    abortRef.current.abort();
    abortRef.current = new AbortController();
    queueRef.current = [];
    activeCountRef.current = 0;

    try {
      await deleteShare(shareId);
      setSession(null);
      return true;
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Could not delete this transfer.');
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [clearAll, setSession]);

  const uploads = session?.uploads || [];
  const successfulUploads = uploads.filter(upload => upload.status === 'success');
  const failedUploads = uploads.filter(upload => upload.status === 'error');
  const activeUploads = uploads.filter(upload => upload.status === 'pending' || upload.status === 'uploading');
  const totalSize = uploads.reduce((sum, upload) => sum + upload.file.size, 0);
  const uploadedSize = successfulUploads.reduce((sum, upload) => sum + upload.file.size, 0);
  const overallProgress = uploads.length === 0
    ? 0
    : Math.round(uploads.reduce((sum, upload) => sum + (upload.status === 'success' ? 100 : upload.progress), 0) / uploads.length);

  return {
    session,
    uploads,
    shareId: session?.shareId || null,
    createdAt: session?.createdAt || null,
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
    clearGlobalError: () => setGlobalError(null),
    isPreparing,
    isDeleting,
    isUploading: activeUploads.length > 0 || isPreparing,
    totalSize,
    uploadedSize,
    overallProgress,
  };
}
