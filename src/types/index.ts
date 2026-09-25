export interface StoredFile {
  id: string;
  name: string;
  size: number;
  type: string;
  data: ArrayBuffer;
  uploadedAt: string;
}

export interface FileMetadata {
  id: string;
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
  shareId?: string;
  error?: string;
}
