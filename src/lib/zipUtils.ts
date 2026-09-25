import JSZip from 'jszip';
import type { StoredFile } from '../types';
import { getFilesByShareId, getShareCollection } from './storage';

export interface ZipProgress {
  stage: 'preparing' | 'creating' | 'downloading' | 'complete' | 'error';
  message: string;
  percent?: number;
}

export async function createZipDownload(
  shareId: string,
  onProgress?: (progress: ZipProgress) => void
): Promise<void> {
  try {
    onProgress?.({ stage: 'preparing', message: 'Preparing ZIP...' });

    const share = await getShareCollection(shareId);
    if (!share) {
      throw new Error('Share collection not found');
    }

    const files = await getFilesByShareId(shareId);
    if (files.length === 0) {
      throw new Error('No files found in collection');
    }

    onProgress?.({ stage: 'creating', message: 'Creating archive...' });

    const zip = new JSZip();
    const folder = zip.folder(`DropZone-${shareId.slice(0, 8)}`);
    
    if (!folder) {
      throw new Error('Failed to create ZIP folder');
    }

    // Add each file to the ZIP
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      folder.file(file.name, file.data);
      
      // Update progress
      const percent = Math.round(((i + 1) / files.length) * 100);
      onProgress?.({ 
        stage: 'creating', 
        message: `Adding files... ${i + 1}/${files.length}`,
        percent 
      });
    }

    onProgress?.({ stage: 'downloading', message: 'Generating ZIP...' });

    // Generate the ZIP blob
    const blob = await zip.generateAsync(
      { 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      },
      (metadata) => {
        if (metadata.percent) {
          onProgress?.({ 
            stage: 'downloading', 
            message: `Compressing... ${Math.round(metadata.percent)}%`,
            percent: Math.round(metadata.percent)
          });
        }
      }
    );

    onProgress?.({ stage: 'downloading', message: 'Downloading...' });

    // Trigger download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DropZone-${shareId.slice(0, 8)}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onProgress?.({ stage: 'complete', message: '✓ Download started' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create ZIP';
    onProgress?.({ stage: 'error', message });
    throw error;
  }
}
