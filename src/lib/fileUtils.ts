import type { FileCategory } from '../types';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff'];
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'avi', 'mov', 'mkv', 'flv', 'wmv'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'wma', 'm4a'];
const DOCUMENT_EXTENSIONS = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'odt', 'ods', 'odp'];
const ARCHIVE_EXTENSIONS = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'];
const CODE_EXTENSIONS = ['js', 'ts', 'jsx', 'tsx', 'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'css', 'html', 'json', 'xml', 'yaml', 'yml', 'md', 'sql', 'sh', 'bash'];

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

export function getFileCategory(type: string, filename: string): FileCategory {
  const ext = getFileExtension(filename);

  if (type.startsWith('image/') || IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (type.startsWith('video/') || VIDEO_EXTENSIONS.includes(ext)) return 'video';
  if (type.startsWith('audio/') || AUDIO_EXTENSIONS.includes(ext)) return 'audio';
  if (type === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (DOCUMENT_EXTENSIONS.includes(ext)) return 'document';
  if (ARCHIVE_EXTENSIONS.includes(ext)) return 'archive';
  if (CODE_EXTENSIONS.includes(ext)) return 'code';

  return 'generic';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getFileLabel(category: FileCategory): string {
  const labels: Record<FileCategory, string> = {
    image: 'Image',
    video: 'Video',
    audio: 'Audio',
    pdf: 'PDF Document',
    document: 'Document',
    archive: 'Archive',
    code: 'Code File',
    generic: 'File',
  };
  return labels[category];
}

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export function validateFile(file: File): string | null {
  if (file.size === 0) {
    return 'File is empty';
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File is too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}`;
  }
  return null;
}
