import { toast } from 'react-hot-toast';

/**
 * Uploads a file to Hostinger (via backend FTP proxy)
 * and returns the public URL.
 */
export async function uploadToHostinger(file: File, folder: string = 'creative_suite'): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  try {
    const response = await fetch('/api/upload-ftp', {
      method: 'POST',
      body: formData,
      // No Content-Type header - browser will set it with boundary
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Upload failed');
    }

    const data = await response.json();
    
    if (data.success && data.url) {
      return data.url;
    } else {
      throw new Error('No URL returned from storage engine');
    }
  } catch (error: any) {
    console.error('[Storage Engine] Upload failed:', error);
    toast.error(`Storage Error: ${error.message}`);
    throw error;
  }
}
