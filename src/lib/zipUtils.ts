import type { ZipProgress } from '../types';
import { getShare, getFileBlob, getLocalFileBlob, getStorageMode } from './storage';
import { getFileCategory } from './fileUtils';

// Media and archives are already compressed. Re-compressing them wastes CPU
// and makes large transfers feel slow, so store them as-is.
const STORE_CATEGORIES = new Set(['image', 'video', 'audio', 'pdf', 'archive']);

function uniqueEntryName(name: string, used: Set<string>): string {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }

  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const extension = dot > 0 ? name.slice(dot) : '';
  let index = 2;
  let candidate = `${base} (${index})${extension}`;

  while (used.has(candidate)) {
    index += 1;
    candidate = `${base} (${index})${extension}`;
  }

  used.add(candidate);
  return candidate;
}

export async function createZipDownload(
  shareId: string,
  onProgress?: (progress: ZipProgress) => void
): Promise<void> {
  try {
    onProgress?.({ stage: 'preparing', message: 'Loading transfer...' });

    const share = await getShare(shareId);
    if (!share) throw new Error('Share not found');
    if (share.files.length === 0) throw new Error('No files found in this transfer');

    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    const folderName = `DropZone-${shareId.slice(0, 8)}`;
    const folder = zip.folder(folderName);
    if (!folder) throw new Error('Failed to create ZIP folder');

    const storageMode = getStorageMode();
    const totalBytes = share.files.reduce((sum, file) => sum + file.size, 0) || 1;
    const usedNames = new Set<string>();
    let processedBytes = 0;
    let addedFiles = 0;

    for (let index = 0; index < share.files.length; index++) {
      const file = share.files[index];

      onProgress?.({
        stage: 'creating',
        message: `Downloading file ${index + 1}/${share.files.length}...`,
        percent: Math.round((processedBytes / totalBytes) * 50),
      });

      try {
        let blob: Blob;

        if (storageMode === 'cloud' && file.storagePath) {
          blob = await getFileBlob(file.storagePath);
        } else {
          const result = await getLocalFileBlob(file.id);
          if (!result) throw new Error(`File ${file.name} is no longer available`);
          blob = result.blob;
        }

        const category = getFileCategory(file.type, file.name);
        folder.file(uniqueEntryName(file.name, usedNames), blob, {
          compression: STORE_CATEGORIES.has(category) ? 'STORE' : 'DEFLATE',
        });
        addedFiles += 1;
      } catch (error) {
        console.error(`[DropZone] Failed to process file ${file.name}:`, error);
      }

      processedBytes += file.size;
      onProgress?.({
        stage: 'creating',
        message: `Adding files... ${index + 1}/${share.files.length}`,
        percent: Math.round((processedBytes / totalBytes) * 50),
      });
    }

    if (addedFiles === 0) {
      throw new Error('None of the files could be downloaded. Try the individual download buttons.');
    }

    onProgress?.({ stage: 'downloading', message: 'Compressing archive...', percent: 50 });

    const blob = await zip.generateAsync(
      {
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      },
      metadata => {
        if (metadata.percent) {
          onProgress?.({
            stage: 'downloading',
            message: `Compressing... ${Math.round(metadata.percent)}%`,
            percent: 50 + Math.round(metadata.percent * 0.5),
          });
        }
      }
    );

    onProgress?.({ stage: 'downloading', message: 'Starting download...', percent: 100 });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${folderName}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    onProgress?.({ stage: 'complete', message: 'Download started', percent: 100 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create ZIP';
    onProgress?.({ stage: 'error', message });
    throw error;
  }
}
