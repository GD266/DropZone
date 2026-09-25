import type { StoredFile, FileMetadata } from '../types';
import { v4 as uuidv4 } from 'uuid';

const DB_NAME = 'dropzone_db';
const DB_VERSION = 1;
const STORE_NAME = 'files';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('uploadedAt', 'uploadedAt', { unique: false });
      }
    };
  });
}

async function getStore(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  const db = await openDB();
  return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
}

export async function storeFile(file: File, onProgress?: (progress: number) => void): Promise<StoredFile> {
  const id = uuidv4();
  const data = await readFileAsArrayBuffer(file, onProgress);

  const storedFile: StoredFile = {
    id,
    name: file.name,
    size: file.size,
    type: file.type,
    data,
    uploadedAt: new Date().toISOString(),
  };

  const store = await getStore('readwrite');
  await new Promise<void>((resolve, reject) => {
    const request = store.put(storedFile);
    request.onerror = () => reject(new Error('Failed to store file'));
    request.onsuccess = () => resolve();
  });

  return storedFile;
}

export async function getFile(id: string): Promise<StoredFile | null> {
  const store = await getStore('readonly');
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
    name: file.name,
    size: file.size,
    type: file.type,
    uploadedAt: file.uploadedAt,
  };
}

export async function deleteFile(id: string): Promise<void> {
  const store = await getStore('readwrite');
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onerror = () => reject(new Error('Failed to delete file'));
    request.onsuccess = () => resolve();
  });
}

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
