import { supabase, STORAGE_BUCKET } from './supabase';
import { v4 as uuidv4 } from 'uuid';
import type { DbShare, DbFile, ShareCollection, FileRecord } from '../types';

// ============ HELPER FUNCTIONS ============

function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts and special characters
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
  const shareId = uuidv4();
  
  const { data, error } = await supabase
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

export async function getShare(shareId: string): Promise<ShareCollection | null> {
  const { data: shareData, error: shareError } = await supabase
    .from('shares')
    .select('*')
    .eq('share_id', shareId)
    .single();
  
  if (shareError || !shareData) {
    return null;
  }
  
  // Get files for this share
  const { data: filesData, error: filesError } = await supabase
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

export async function deleteShare(shareId: string): Promise<void> {
  // Delete files from storage first
  const { data: filesData } = await supabase
    .from('files')
    .select('storage_path')
    .eq('share_id', shareId);
  
  if (filesData && filesData.length > 0) {
    const paths = filesData.map(f => f.storage_path);
    await supabase.storage.from(STORAGE_BUCKET).remove(paths);
  }
  
  // Delete share (cascade will delete file records)
  await supabase
    .from('shares')
    .delete()
    .eq('share_id', shareId);
}

// ============ FILE OPERATIONS ============

export async function uploadFile(
  file: File,
  shareId: string,
  onProgress?: (progress: number) => void
): Promise<FileRecord> {
  const fileId = uuidv4();
  const storagePath = getStoragePath(shareId, fileId, file.name);
  
  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
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
  
  // Create file record in database
  const { data: fileData, error: dbError } = await supabase
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
    // Cleanup: remove the uploaded file
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
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

export async function getFile(fileId: string): Promise<FileRecord | null> {
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
  const { data: fileData } = await supabase
    .from('files')
    .select('storage_path')
    .eq('id', fileId)
    .single();
  
  if (fileData) {
    // Delete from storage
    await supabase.storage.from(STORAGE_BUCKET).remove([fileData.storage_path]);
    
    // Delete from database
    await supabase
      .from('files')
      .delete()
      .eq('id', fileId);
  }
}

// ============ DOWNLOAD URL GENERATION ============

export function getDownloadUrl(storagePath: string): string {
  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);
  
  return data.publicUrl;
}

export async function getSignedDownloadUrl(
  storagePath: string,
  expiresIn: number = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, expiresIn);
  
  if (error) {
    console.error('Failed to create signed URL:', error);
    throw new Error('Failed to generate download URL');
  }
  
  return data.signedUrl;
}

// ============ ZIP DOWNLOAD HELPER ============

export async function getFileBlob(storagePath: string): Promise<Blob> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .download(storagePath);
  
  if (error) {
    console.error('Failed to download file:', error);
    throw new Error('Failed to download file from storage');
  }
  
  return data;
}
