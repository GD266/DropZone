// Database types matching Supabase schema
export interface DbShare {
  id: string;
  share_id: string;
  created_at: string;
}

export interface DbFile {
  id: string;
  share_id: string;
  storage_path: string;
  original_name: string;
  mime_type: string | null;
  size: number;
  created_at: string;
}

// Application types
export interface ShareCollection {
  id: string;
  shareId: string;
  createdAt: string;
  files: FileRecord[];
}

export interface FileRecord {
  id: string;
  shareId: string;
  storagePath: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export type FileCategory =
  | 'image'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'document'
  | 'archive'
  | 'code'
  | 'generic';

export type UploadStatus = 'pending' | 'uploading' | 'success' | 'error';

export interface UploadFile {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
}

export interface UploadSession {
  shareId: string;
  uploads: UploadFile[];
}

export interface ZipProgress {
  stage: 'preparing' | 'creating' | 'downloading' | 'complete' | 'error';
  message: string;
  percent?: number;
}
