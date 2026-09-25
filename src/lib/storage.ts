import type { StoredFile, FileMetadata, ShareCollection } from '../types';
import { v4 as uuidv4 } from 'uuid';

const DB_NAME = 'dropzone_db';
const DB_VERSION = 2;
const FILES_STORE = 'files';
const SHARES_STORE = 'shares';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(FILES_STORE)) {
        const store = db.createObjectStore(FILES_STORE, { keyPath: 'id' });
        store.createIndex('shareId', 'shareId', { unique: false });
        store.createIndex('uploadedAt', 'uploadedAt', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(SHARES_STORE)) {
        db.createObjectStore(SHARES_STORE, { keyPath: 'id' });
      }
    };
  });
}

async function getTransaction(stores: string[], mode: IDBTransactionMode): Promise<IDBTransaction> {
  const db = await openDB();
  return db.transaction(stores, mode);
}

// ============ FILE OPERATIONS ============

export async function storeFile(file: File, shareId: string, onProgress?: (progress: number) => void): Promise<StoredFile> {
  const id = uuidv4();
  const data = await readFileAsArrayBuffer(file, onProgress);

  const storedFile: StoredFile = {
    id,
    shareId,
    name: file.name,
    size: file.size,
    type: file.type,
    data,
    uploadedAt: new Date().toISOString(),
  };

  const tx = await getTransaction([FILES_STORE], 'readwrite');
  const store = tx.objectStore(FILES_STORE);
  
  return new Promise((resolve, reject) => {
    const request = store.put(storedFile);
    request.onerror = () => reject(new Error('Failed to store file'));
    request.onsuccess = () => resolve(storedFile);
  });
}

export async function getFile(id: string): Promise<StoredFile | null> {
  const tx = await getTransaction([FILES_STORE], 'readonly');
  const store = tx.objectStore(FILES_STORE);
  
  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onerror = () => reject(new Error('Failed to retrieve file'));
    request.onsuccess = () => resolve(request.result || null);
  });
}

export async function getFileMetadata(id: string): Promise<FileMetadata | null> {
  const file = await getFile(id);
  if (!file) return null;
  return {
    id: file.id,
    shareId: file.shareId,
    name: file.name,
    size: file.size,
    type: file.type,
    uploadedAt: file.uploadedAt,
  };
}

export async function getFilesByShareId(shareId: string): Promise<StoredFile[]> {
  const tx = await getTransaction([FILES_STORE], 'readonly');
  const store = tx.objectStore(FILES_STORE);
  const index = store.index('shareId');
  
  return new Promise((resolve, reject) => {
    const request = index.getAll(shareId);
    request.onerror = () => reject(new Error('Failed to retrieve files'));
    request.onsuccess = () => resolve(request.result || []);
  });
}

export async function deleteFile(id: string): Promise<void> {
  const tx = await getTransaction([FILES_STORE], 'readwrite');
  const store = tx.objectStore(FILES_STORE);
  
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onerror = () => reject(new Error('Failed to delete file'));
    request.onsuccess = () => resolve();
  });
}

// ============ SHARE COLLECTION OPERATIONS ============

export async function createShareCollection(fileIds: string[]): Promise<ShareCollection> {
  const share: ShareCollection = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    fileIds,
  };

  const tx = await getTransaction([SHARES_STORE], 'readwrite');
  const store = tx.objectStore(SHARES_STORE);
  
  return new Promise((resolve, reject) => {
    const request = store.put(share);
    request.onerror = () => reject(new Error('Failed to create share'));
    request.onsuccess = () => resolve(share);
  });
}

export async function getShareCollection(id: string): Promise<ShareCollection | null> {
  const tx = await getTransaction([SHARES_STORE], 'readonly');
  const store = tx.objectStore(SHARES_STORE);
  
  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onerror = () => reject(new Error('Failed to retrieve share'));
    request.onsuccess = () => resolve(request.result || null);
  });
}

export async function getShareWithFiles(id: string): Promise<{ share: ShareCollection; files: StoredFile[] } | null> {
  const share = await getShareCollection(id);
  if (!share) return null;
  
  const files = await getFilesByShareId(id);
  return { share, files };
}

// ============ UTILITY FUNCTIONS ============

function readFileAsArrayBuffer(file: File, onProgress?: (progress: number) => void): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.readAsArrayBuffer(file);
  });
}

export function createDownloadUrl(file: StoredFile): string {
  const blob = new Blob([file.data], { type: file.type || 'application/octet-stream' });
  return URL.createObjectURL(blob);
}

export function createPreviewUrl(file: StoredFile): string {
  return createDownloadUrl(file);
}
