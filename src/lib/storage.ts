import { getSupabaseClient, STORAGE_BUCKET, isSupabaseConfigured } from './supabase';
import { v4 as uuidv4 } from 'uuid';
import type { DbShare, DbFile, ShareCollection, FileRecord } from '../types';

// ============ INDEXEDDB FALLBACK ============

const DB_NAME = 'dropzone_local_db';
const DB_VERSION = 2;
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
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;
      
      if (!db.objectStoreNames.contains(FILES_STORE)) {
        const store = db.createObjectStore(FILES_STORE, { keyPath: 'id' });
        store.createIndex('shareId', 'shareId', { unique: false });
      }
      if (!db.objectStoreNames.contains(SHARES_STORE)) {
        const store = db.createObjectStore(SHARES_STORE, { keyPath: 'id' });
        store.createIndex('shareId', 'shareId', { unique: true });
      } else if (oldVersion < 2) {
        // Upgrade from version 1: add shareId index to existing SHARES_STORE
        const request = event.target as IDBOpenDBRequest;
        const db = request.result;
        const tx = request.transaction;
        if (tx) {
          const shareStore = tx.objectStore(SHARES_STORE);
          if (!shareStore.indexNames.contains('shareId')) {
            shareStore.createIndex('shareId', 'shareId', { unique: true });
          }
        }
      }
    };
  });
}

async function localCreateShare(): Promise<string> {
  const shareId = uuidv4();
  const share: LocalShare = {
    id: uuidv4(),
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
  
  // Get share
  const shareTx = db.transaction(SHARES_STORE, 'readonly');
  const shareStore = shareTx.objectStore(SHARES_STORE);
  const shareData = await new Promise<LocalShare | null>((resolve, reject) => {
    const request = shareStore.index('shareId').get(shareId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
  
  if (!shareData) return null;
  
  // Get files
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
    storagePath: '', // Not used in local mode
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
  onProgress?: (progress: number) => void
): Promise<FileRecord & { data: ArrayBuffer }> {
  const id = uuidv4();
  
  // Read file data
  const data = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => resolve(reader.result as ArrayBuffer);
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
    request.onerror = () => reject(new Error('Failed to store file'));
    request.onsuccess = () => resolve();
  });
  
  return {
    id,
    shareId,
    storagePath: '',
    name: file.name,
    size: file.size,
    type: file.type,
    uploadedAt: storedFile.uploadedAt,
    data,
  };
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

// ============ HELPER FUNCTIONS ============

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[/\\]/g, '_')
    .replace(/\.\./g, '_')
    .replace(/[^\w\s.-]/g, '_')
    .trim();
}

function getStoragePath(shareId: string, fileId: string, filename: string): string {
  const safeName = sanitizeFilename(filename);
  return `shares/${shareId}/${fileId}/${safeName}`;
}

// ============ SHARE OPERATIONS ============

export async function createShare(): Promise<string> {
  if (isSupabaseConfigured()) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client not available');
    
    const shareId = uuidv4();
    const { data, error } = await client
      .from('shares')
      .insert({ share_id: shareId })
      .select()
      .single();
    
    if (error) {
      console.error('Failed to create share:', error);
      throw new Error('Failed to create share');
    }
    
    return data.share_id;
  }
  
  return localCreateShare();
}

export async function getShare(shareId: string): Promise<ShareCollection | null> {
  if (isSupabaseConfigured()) {
    const client = getSupabaseClient();
    if (!client) return null;
    
    const { data: shareData, error: shareError } = await client
      .from('shares')
      .select('*')
      .eq('share_id', shareId)
      .single();
    
    if (shareError || !shareData) {
      return null;
    }
    
    const { data: filesData, error: filesError } = await client
      .from('files')
      .select('*')
      .eq('share_id', shareId)
      .order('created_at', { ascending: true });
    
    if (filesError) {
      console.error('Failed to fetch files:', filesError);
      throw new Error('Failed to fetch files');
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
  
  return localGetShare(shareId);
}

// ============ FILE OPERATIONS ============

export async function uploadFile(
  file: File,
  shareId: string,
  onProgress?: (progress: number) => void
): Promise<FileRecord> {
  if (isSupabaseConfigured()) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client not available');
    
    const fileId = uuidv4();
    const storagePath = getStoragePath(shareId, fileId, file.name);
    
    const { error: uploadError } = await client.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'application/octet-stream',
      });
    
    if (uploadError) {
      console.error('Storage upload failed:', uploadError);
      throw new Error('Failed to upload file to storage');
    }
    
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
      console.error('Database insert failed:', dbError);
      await client.storage.from(STORAGE_BUCKET).remove([storagePath]);
      throw new Error('Failed to save file metadata');
    }
    
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
  
  // Local fallback
  const result = await localUploadFile(file, shareId, onProgress);
  const { data: _, ...fileRecord } = result;
  return fileRecord;
}

export async function getFile(fileId: string): Promise<FileRecord | null> {
  if (isSupabaseConfigured()) {
    const client = getSupabaseClient();
    if (!client) return null;
    
    const { data, error } = await client
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return {
      id: data.id,
      shareId: data.share_id,
      storagePath: data.storage_path,
      name: data.original_name,
      size: data.size,
      type: data.mime_type || 'application/octet-stream',
      uploadedAt: data.created_at,
    };
  }
  
  const result = await localGetFileData(fileId);
  return result?.file || null;
}

// ============ DOWNLOAD URL GENERATION ============

export function getDownloadUrl(storagePath: string, file?: FileRecord): string {
  if (isSupabaseConfigured() && storagePath) {
    const client = getSupabaseClient();
    if (client) {
      const { data } = client.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);
      return data.publicUrl;
    }
  }
  
  // For local files, we need to create a blob URL
  // This is handled separately via getLocalFileBlob
  return '';
}

export async function getLocalFileBlob(fileId: string): Promise<{ blob: Blob; name: string; type: string } | null> {
  if (isSupabaseConfigured()) {
    // For Supabase, use the public URL directly
    return null;
  }
  
  const result = await localGetFileData(fileId);
  if (!result) return null;
  
  const blob = new Blob([result.data], { type: result.file.type || 'application/octet-stream' });
  return { blob, name: result.file.name, type: result.file.type };
}

export async function getFileBlob(storagePath: string): Promise<Blob> {
  if (isSupabaseConfigured()) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client not available');
    
    const { data, error } = await client.storage
      .from(STORAGE_BUCKET)
      .download(storagePath);
    
    if (error) {
      console.error('Failed to download file:', error);
      throw new Error('Failed to download file from storage');
    }
    
    return data;
  }
  
  throw new Error('getFileBlob requires Supabase configuration');
}

// ============ STORAGE MODE ============

export function getStorageMode(): 'supabase' | 'local' {
  return isSupabaseConfigured() ? 'supabase' : 'local';
}
