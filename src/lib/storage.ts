import {
  getSupabaseClient,
  getSupabaseCredentials,
  STORAGE_BUCKET,
  isSupabaseConfigured,
} from './supabase';
import { createId } from './id';
import type { DbFile, ShareCollection, FileRecord } from '../types';

// ============ SHARED HELPERS ============

function abortError(): DOMException {
  return new DOMException('Upload cancelled', 'AbortError');
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

// ============ LOCAL STORAGE (IndexedDB) ============

const DB_NAME = 'dropzone_local_db';
const DB_VERSION = 1;
const FILES_STORE = 'files';
const SHARES_STORE = 'shares';

interface LocalStoredFile {
  id: string;
  shareId: string;
  name: string;
  size: number;
  type: string;
  data: ArrayBuffer;
  uploadedAt: string;
}

interface LocalShare {
  id: string;
  shareId: string;
  createdAt: string;
}

function openLocalDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('This browser does not support local storage. Configure Supabase to enable cloud sharing.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(FILES_STORE)) {
        const store = db.createObjectStore(FILES_STORE, { keyPath: 'id' });
        store.createIndex('shareId', 'shareId', { unique: false });
      }
      if (!db.objectStoreNames.contains(SHARES_STORE)) {
        const store = db.createObjectStore(SHARES_STORE, { keyPath: 'id' });
        store.createIndex('shareId', 'shareId', { unique: true });
      }
    };
  });
}

async function localCreateShare(): Promise<string> {
  const shareId = createId();
  const share: LocalShare = {
    id: createId(),
    shareId,
    createdAt: new Date().toISOString(),
  };
  const db = await openLocalDB();
  const tx = db.transaction(SHARES_STORE, 'readwrite');
  const store = tx.objectStore(SHARES_STORE);
  return new Promise((resolve, reject) => {
    const request = store.put(share);
    request.onerror = () => reject(new Error('Failed to create local share'));
    request.onsuccess = () => resolve(shareId);
  });
}

async function localGetShare(shareId: string): Promise<ShareCollection | null> {
  const db = await openLocalDB();

  const shareTx = db.transaction(SHARES_STORE, 'readonly');
  const shareStore = shareTx.objectStore(SHARES_STORE);
  const shareData = await new Promise<LocalShare | null>((resolve, reject) => {
    const request = shareStore.index('shareId').get(shareId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });

  if (!shareData) return null;

  const fileTx = db.transaction(FILES_STORE, 'readonly');
  const fileStore = fileTx.objectStore(FILES_STORE);
  const fileIndex = fileStore.index('shareId');
  const filesData = await new Promise<LocalStoredFile[]>((resolve, reject) => {
    const request = fileIndex.getAll(shareId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });

  const files: FileRecord[] = filesData.map(f => ({
    id: f.id,
    shareId: f.shareId,
    storagePath: '',
    name: f.name,
    size: f.size,
    type: f.type,
    uploadedAt: f.uploadedAt,
  }));

  return {
    id: shareData.id,
    shareId: shareData.shareId,
    createdAt: shareData.createdAt,
    files,
  };
}

async function localUploadFile(
  file: File,
  shareId: string,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal
): Promise<{ fileRecord: FileRecord; data: ArrayBuffer }> {
  const id = createId();

  const data = await new Promise<ArrayBuffer>((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }

    const reader = new FileReader();
    let lastProgress = -1;
    const cleanup = () => signal?.removeEventListener('abort', handleAbort);
    const handleAbort = () => {
      reader.abort();
      cleanup();
      reject(abortError());
    };

    reader.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 90);
        if (percent !== lastProgress) {
          lastProgress = percent;
          onProgress(percent);
        }
      }
    };
    reader.onerror = () => {
      cleanup();
      reject(new Error('Failed to read file'));
    };
    reader.onabort = () => {
      cleanup();
      reject(abortError());
    };
    reader.onload = () => {
      cleanup();
      onProgress?.(92);
      resolve(reader.result as ArrayBuffer);
    };

    signal?.addEventListener('abort', handleAbort, { once: true });
    reader.readAsArrayBuffer(file);
  });

  const storedFile: LocalStoredFile = {
    id,
    shareId,
    name: file.name,
    size: file.size,
    type: file.type,
    data,
    uploadedAt: new Date().toISOString(),
  };

  const db = await openLocalDB();
  const tx = db.transaction(FILES_STORE, 'readwrite');
  const store = tx.objectStore(FILES_STORE);

  await new Promise<void>((resolve, reject) => {
    const request = store.put(storedFile);
    request.onerror = () => reject(new Error('Failed to store file. The browser may be out of storage space.'));
    request.onsuccess = () => resolve();
  });

  onProgress?.(100);

  const fileRecord: FileRecord = {
    id,
    shareId,
    storagePath: '',
    name: file.name,
    size: file.size,
    type: file.type,
    uploadedAt: storedFile.uploadedAt,
  };

  return { fileRecord, data };
}

async function localGetFileData(fileId: string): Promise<{ file: FileRecord; data: ArrayBuffer } | null> {
  const db = await openLocalDB();
  const tx = db.transaction(FILES_STORE, 'readonly');
  const store = tx.objectStore(FILES_STORE);

  const stored = await new Promise<LocalStoredFile | null>((resolve, reject) => {
    const request = store.get(fileId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });

  if (!stored) return null;

  return {
    file: {
      id: stored.id,
      shareId: stored.shareId,
      storagePath: '',
      name: stored.name,
      size: stored.size,
      type: stored.type,
      uploadedAt: stored.uploadedAt,
    },
    data: stored.data,
  };
}

async function localDeleteShare(shareId: string): Promise<boolean> {
  const share = await localGetShare(shareId);
  if (!share) return false;

  const db = await openLocalDB();
  const tx = db.transaction([FILES_STORE, SHARES_STORE], 'readwrite');
  const filesStore = tx.objectStore(FILES_STORE);
  share.files.forEach(file => filesStore.delete(file.id));
  tx.objectStore(SHARES_STORE).delete(share.id);

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Failed to delete local transfer'));
    tx.onabort = () => reject(tx.error || new Error('Failed to delete local transfer'));
  });

  return true;
}

// ============ CLOUD STORAGE (Supabase) ============

function sanitizeFilename(filename: string): string {
  const sanitized = filename
    .replace(/[/\\]/g, '_')
    .replace(/\.\./g, '_')
    .replace(/[^\p{L}\p{N}\s._-]/gu, '_')
    .trim();

  return sanitized || 'file';
}

function getStoragePath(shareId: string, fileId: string, filename: string): string {
  return `shares/${shareId}/${fileId}/${sanitizeFilename(filename)}`;
}

function parseStorageError(status: number, body: string): string {
  let apiMessage = '';
  try {
    const parsed = JSON.parse(body) as { message?: string; error?: string };
    apiMessage = parsed.message || parsed.error || '';
  } catch {
    // The storage API can return plain text for some failures.
  }

  if (status === 413) {
    return 'This file is larger than the storage bucket allows. Increase the bucket limit or upload a smaller file.';
  }
  if (status === 401 || status === 403) {
    return `Storage rejected the upload. Check the Supabase storage policies for the ${STORAGE_BUCKET} bucket.`;
  }
  if (status === 404) {
    return `The ${STORAGE_BUCKET} storage bucket was not found. Create it in your Supabase project first.`;
  }

  return apiMessage || `Storage upload failed (HTTP ${status})`;
}

/**
 * Supabase's JS client uses fetch, which cannot report upload progress. Upload
 * through the Storage REST API with XHR so large files get real progress and
 * can be cancelled.
 */
function uploadToStorage(
  params: {
    url: string;
    anonKey: string;
    storagePath: string;
    file: File;
    onProgress?: (progress: number) => void;
    signal?: AbortSignal;
  }
): Promise<void> {
  const { url, anonKey, storagePath, file, onProgress, signal } = params;

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }

    const encodedPath = storagePath.split('/').map(encodeURIComponent).join('/');
    const endpoint = `${url.replace(/\/$/, '')}/storage/v1/object/${encodeURIComponent(STORAGE_BUCKET)}/${encodedPath}`;
    const xhr = new XMLHttpRequest();
    let lastProgress = -1;

    const cleanup = () => signal?.removeEventListener('abort', handleAbort);
    const handleAbort = () => xhr.abort();

    xhr.open('POST', endpoint);
    xhr.setRequestHeader('Authorization', `Bearer ${anonKey}`);
    xhr.setRequestHeader('apikey', anonKey);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.setRequestHeader('cache-control', '3600');
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        // Reserve the last 10% for metadata persistence.
        const percent = Math.max(1, Math.round((event.loaded / event.total) * 90));
        if (percent !== lastProgress) {
          lastProgress = percent;
          onProgress?.(percent);
        }
      }
    };

    xhr.onload = () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(92);
        resolve();
        return;
      }
      reject(new Error(parseStorageError(xhr.status, xhr.responseText)));
    };
    xhr.onerror = () => {
      cleanup();
      reject(new Error('Network error while uploading. Check your connection and try again.'));
    };
    xhr.ontimeout = () => {
      cleanup();
      reject(new Error('The upload timed out. Try a smaller file or a stronger connection.'));
    };
    xhr.onabort = () => {
      cleanup();
      reject(abortError());
    };

    signal?.addEventListener('abort', handleAbort, { once: true });
    xhr.send(file);
  });
}

async function cloudCreateShare(): Promise<string> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not available. Check your environment variables.');

  const shareId = createId();

  const { data, error } = await client
    .from('shares')
    .insert({ share_id: shareId })
    .select()
    .single();

  if (error) {
    console.error('[DropZone] Failed to create share:', error);
    throw new Error(
      error.message.includes('does not exist')
        ? 'The Supabase database is not set up. Run supabase/migrations/001_initial_schema.sql in the SQL Editor.'
        : 'Could not create the transfer. Check your Supabase connection and try again.'
    );
  }

  return data.share_id;
}

async function cloudGetShare(shareId: string): Promise<ShareCollection | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data: shareData, error: shareError } = await client
    .from('shares')
    .select('*')
    .eq('share_id', shareId)
    .maybeSingle();

  if (shareError) {
    console.error('[DropZone] Failed to load share:', shareError);
    throw new Error('Could not load this transfer. Check your connection and try again.');
  }

  if (!shareData) return null;

  const { data: filesData, error: filesError } = await client
    .from('files')
    .select('*')
    .eq('share_id', shareId)
    .order('created_at', { ascending: true });

  if (filesError) {
    console.error('[DropZone] Failed to fetch files:', filesError);
    throw new Error('Could not load the files in this transfer.');
  }

  const files: FileRecord[] = (filesData || []).map((f: DbFile) => ({
    id: f.id,
    shareId: f.share_id,
    storagePath: f.storage_path,
    name: f.original_name,
    size: f.size,
    type: f.mime_type || 'application/octet-stream',
    uploadedAt: f.created_at,
  }));

  return {
    id: shareData.id,
    shareId: shareData.share_id,
    createdAt: shareData.created_at,
    files,
  };
}

async function cloudUploadFile(
  file: File,
  shareId: string,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal
): Promise<FileRecord> {
  const client = getSupabaseClient();
  const credentials = getSupabaseCredentials();
  if (!client || !credentials) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then rebuild.');
  }

  const fileId = createId();
  const storagePath = getStoragePath(shareId, fileId, file.name);

  await uploadToStorage({
    url: credentials.url,
    anonKey: credentials.anonKey,
    storagePath,
    file,
    onProgress,
    signal,
  });

  const { data: fileData, error: dbError } = await client
    .from('files')
    .insert({
      share_id: shareId,
      storage_path: storagePath,
      original_name: file.name,
      mime_type: file.type || null,
      size: file.size,
    })
    .select()
    .single();

  if (dbError) {
    console.error('[DropZone] Database insert failed:', dbError);
    await client.storage.from(STORAGE_BUCKET).remove([storagePath]);
    throw new Error(
      dbError.message.includes('file_id')
        ? 'The Supabase files table has an outdated schema. Run supabase/migrations/001_initial_schema.sql instead of the older setup guide SQL.'
        : 'The file uploaded, but its metadata could not be saved. Please try again.'
    );
  }

  onProgress?.(100);

  return {
    id: fileData.id,
    shareId: fileData.share_id,
    storagePath: fileData.storage_path,
    name: fileData.original_name,
    size: fileData.size,
    type: fileData.mime_type || 'application/octet-stream',
    uploadedAt: fileData.created_at,
  };
}

async function cloudDeleteShare(shareId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not available');

  const { data: files, error: filesError } = await client
    .from('files')
    .select('storage_path')
    .eq('share_id', shareId);

  if (filesError) {
    throw new Error('Could not find the files for this transfer.');
  }

  const paths = (files || [])
    .map(file => file.storage_path)
    .filter((path): path is string => Boolean(path));

  for (let i = 0; i < paths.length; i += 100) {
    const batch = paths.slice(i, i + 100);
    const { error: removeError } = await client.storage.from(STORAGE_BUCKET).remove(batch);
    if (removeError) {
      // Keep deleting metadata even if a storage object is already gone.
      console.error('[DropZone] Failed to remove some storage objects:', removeError);
    }
  }

  const { error: deleteFilesError } = await client.from('files').delete().eq('share_id', shareId);
  if (deleteFilesError) throw new Error('Could not delete the file records for this transfer.');

  const { error: deleteShareError } = await client.from('shares').delete().eq('share_id', shareId);
  if (deleteShareError) throw new Error('Could not delete this transfer.');

  return true;
}

// ============ HYBRID API ============

export function getStorageMode(): 'cloud' | 'local' {
  return isSupabaseConfigured() ? 'cloud' : 'local';
}

export async function createShare(): Promise<string> {
  if (isSupabaseConfigured()) {
    return cloudCreateShare();
  }
  return localCreateShare();
}

export async function getShare(shareId: string): Promise<ShareCollection | null> {
  if (isSupabaseConfigured()) {
    return cloudGetShare(shareId);
  }
  return localGetShare(shareId);
}

export async function uploadFile(
  file: File,
  shareId: string,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal
): Promise<FileRecord> {
  if (isSupabaseConfigured()) {
    return cloudUploadFile(file, shareId, onProgress, signal);
  }
  const { fileRecord } = await localUploadFile(file, shareId, onProgress, signal);
  return fileRecord;
}

export async function deleteShare(shareId: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    return cloudDeleteShare(shareId);
  }
  return localDeleteShare(shareId);
}

export function getDownloadUrl(storagePath: string, downloadName?: string): string {
  if (isSupabaseConfigured() && storagePath) {
    const client = getSupabaseClient();
    if (client) {
      const { data } = client.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath, downloadName ? { download: downloadName } : undefined);
      return data.publicUrl;
    }
  }
  return '';
}

export async function getLocalFileBlob(fileId: string): Promise<{ blob: Blob; name: string; type: string } | null> {
  if (isSupabaseConfigured()) {
    return null;
  }

  const result = await localGetFileData(fileId);
  if (!result) return null;

  const blob = new Blob([result.data], { type: result.file.type || 'application/octet-stream' });
  return { blob, name: result.file.name, type: result.file.type };
}

export async function getFileBlob(storagePath: string): Promise<Blob> {
  if (!isSupabaseConfigured()) {
    throw new Error('Cloud storage not configured');
  }

  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not available');

  const { data, error } = await client.storage
    .from(STORAGE_BUCKET)
    .download(storagePath);

  if (error) {
    console.error('[DropZone] Failed to download file:', error);
    throw new Error('Failed to download file from storage');
  }

  return data;
}
