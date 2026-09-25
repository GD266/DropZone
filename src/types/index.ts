export interface StoredFile {
  id: string;
  shareId: string;
  name: string;
  size: number;
  type: string;
  data: ArrayBuffer;
  uploadedAt: string;
}

export interface ShareCollection {
  id: string;
  createdAt: string;
  fileIds: string[];
}

export interface FileMetadata {
  id: string;
  shareId: string;
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
