import JSZip from 'jszip';
import type { ZipProgress } from '../types';
import { getShare, getFileBlob, getLocalFileBlob, getStorageMode } from './storage';

export async function createZipDownload(
  shareId: string,
  onProgress?: (progress: ZipProgress) => void
): Promise<void> {
  try {
    onProgress?.({ stage: 'preparing', message: 'Preparing ZIP...' });

    const share = await getShare(shareId);
    if (!share) {
      throw new Error('Share not found');
    }

    if (share.files.length === 0) {
      throw new Error('No files found in collection');
    }

    onProgress?.({ stage: 'creating', message: 'Creating archive...' });

    const zip = new JSZip();
    const folder = zip.folder(`DropZone-${shareId.slice(0, 8)}`);
    
    if (!folder) {
      throw new Error('Failed to create ZIP folder');
    }

    const storageMode = getStorageMode();

    // Download and add each file to the ZIP
    for (let i = 0; i < share.files.length; i++) {
      const file = share.files[i];
      
      onProgress?.({ 
        stage: 'creating', 
        message: `Processing files... ${i + 1}/${share.files.length}`,
        percent: Math.round(((i + 1) / share.files.length) * 50)
      });

      try {
        let blob: Blob;
        
        if (storageMode === 'supabase' && file.storagePath) {
          blob = await getFileBlob(file.storagePath);
        } else {
          // Local mode
          const result = await getLocalFileBlob(file.id);
          if (!result) {
            throw new Error(`File ${file.name} not found in local storage`);
          }
          blob = result.blob;
        }
        
        folder.file(file.name, blob);
      } catch (err) {
        console.error(`Failed to process file ${file.name}:`, err);
        // Continue with other files
      }
      
      const percent = Math.round(((i + 1) / share.files.length) * 50);
      onProgress?.({ 
        stage: 'creating', 
        message: `Adding files... ${i + 1}/${share.files.length}`,
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
            percent: 50 + Math.round(metadata.percent * 0.5)
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
