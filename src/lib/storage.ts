import { getSupabaseClient, STORAGE_BUCKET, isSupabaseConfigured } from './supabase';
import { v4 as uuidv4 } from 'uuid';
import type { DbFile, ShareCollection, FileRecord } from '../types';

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

function ensureConfigured(): void {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'DropZone is not configured for cloud storage. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.'
    );
  }
}

// ============ SHARE OPERATIONS ============

export async function createShare(): Promise<string> {
  ensureConfigured();
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not available');
  
  const shareId = uuidv4();
  
  console.log('[DropZone] Creating share:', shareId);
  
  const { data, error } = await client
    .from('shares')
    .insert({ share_id: shareId })
    .select()
    .single();
  
  if (error) {
    console.error('[DropZone] Failed to create share:', error);
    throw new Error('Failed to create share');
  }
  
  console.log('[DropZone] Share created successfully:', shareId);
  return data.share_id;
}

export async function getShare(shareId: string): Promise<ShareCollection | null> {
  ensureConfigured();
  const client = getSupabaseClient();
  if (!client) return null;
  
  console.log('[DropZone] Fetching share:', shareId);
  
  const { data: shareData, error: shareError } = await client
    .from('shares')
    .select('*')
    .eq('share_id', shareId)
    .single();
  
  if (shareError || !shareData) {
    console.log('[DropZone] Share not found:', shareId);
    return null;
  }
  
  const { data: filesData, error: filesError } = await client
    .from('files')
    .select('*')
    .eq('share_id', shareId)
    .order('created_at', { ascending: true });
  
  if (filesError) {
    console.error('[DropZone] Failed to fetch files:', filesError);
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
  
  console.log('[DropZone] Share fetched:', shareId, 'with', files.length, 'files');
  
  return {
    id: shareData.id,
    shareId: shareData.share_id,
    createdAt: shareData.created_at,
    files,
  };
}

export async function deleteShare(shareId: string): Promise<void> {
  ensureConfigured();
  const client = getSupabaseClient();
  if (!client) return;
  
  console.log('[DropZone] Deleting share:', shareId);
  
  const { data: filesData } = await client
    .from('files')
    .select('storage_path')
    .eq('share_id', shareId);
  
  if (filesData && filesData.length > 0) {
    const paths = filesData.map((f: { storage_path: string }) => f.storage_path);
    await client.storage.from(STORAGE_BUCKET).remove(paths);
  }
  
  await client
    .from('shares')
    .delete()
    .eq('share_id', shareId);
  
  console.log('[DropZone] Share deleted:', shareId);
}

// ============ FILE OPERATIONS ============

export async function uploadFile(
  file: File,
  shareId: string,
  onProgress?: (progress: number) => void
): Promise<FileRecord> {
  ensureConfigured();
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not available');
  
  const fileId = uuidv4();
  const storagePath = getStoragePath(shareId, fileId, file.name);
  
  console.log('[DropZone] Uploading file:', file.name, 'to', storagePath);
  
  // Upload to Supabase Storage
  const { error: uploadError } = await client.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    });
  
  if (uploadError) {
    console.error('[DropZone] Storage upload failed:', uploadError);
    throw new Error('Failed to upload file to storage');
  }
  
  console.log('[DropZone] Storage upload successful:', storagePath);
  
  // Create file record in database
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
    // Cleanup: remove the uploaded file
    await client.storage.from(STORAGE_BUCKET).remove([storagePath]);
    throw new Error('Failed to save file metadata');
  }
  
  console.log('[DropZone] File metadata saved:', fileData.id);
  
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

export async function getFile(fileId: string): Promise<FileRecord | null> {
  ensureConfigured();
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

export async function getFileByShareAndId(
  shareId: string,
  fileId: string
): Promise<FileRecord | null> {
  ensureConfigured();
  const client = getSupabaseClient();
  if (!client) return null;
  
  const { data, error } = await client
    .from('files')
    .select('*')
    .eq('id', fileId)
    .eq('share_id', shareId)
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

export async function deleteFile(fileId: string): Promise<void> {
  ensureConfigured();
  const client = getSupabaseClient();
  if (!client) return;
  
  const { data: fileData } = await client
    .from('files')
    .select('storage_path')
    .eq('id', fileId)
    .single();
  
  if (fileData) {
    await client.storage.from(STORAGE_BUCKET).remove([fileData.storage_path]);
    await client
      .from('files')
      .delete()
      .eq('id', fileId);
  }
}

// ============ DOWNLOAD URL GENERATION ============

export function getDownloadUrl(storagePath: string): string {
  ensureConfigured();
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not available');
  
  const { data } = client.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);
  
  return data.publicUrl;
}

export async function getSignedDownloadUrl(
  storagePath: string,
  expiresIn: number = 3600
): Promise<string> {
  ensureConfigured();
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not available');
  
  const { data, error } = await client.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, expiresIn);
  
  if (error) {
    console.error('[DropZone] Failed to create signed URL:', error);
    throw new Error('Failed to generate download URL');
  }
  
  return data.signedUrl;
}

// ============ ZIP DOWNLOAD HELPER ============

export async function getFileBlob(storagePath: string): Promise<Blob> {
  ensureConfigured();
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not available');
  
  console.log('[DropZone] Downloading file from storage:', storagePath);
  
  const { data, error } = await client.storage
    .from(STORAGE_BUCKET)
    .download(storagePath);
  
  if (error) {
    console.error('[DropZone] Failed to download file:', error);
    throw new Error('Failed to download file from storage');
  }
  
  console.log('[DropZone] File downloaded successfully:', storagePath);
  return data;
}
