import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useConfig } from './useConfig';

interface UploadResult {
  success: boolean;
  url: string;
  name: string;
  error?: string;
}

export function useImageUpload() {
  const { config } = useConfig();
  const [isUploading, setIsUploading] = useState(false);

  const uploadImage = async (file: File, folder?: string): Promise<UploadResult | null> => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return null;
    }

    const maxMb = config.storage?.maxImageSizeMb ?? 2;
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`Image is too large. Maximum allowed size is ${maxMb} MB.`);
      return null;
    }

    setIsUploading(true);
    const toastId = toast.loading('Uploading to Hostinger...');
    
    const formData = new FormData();
    formData.append('file', file);
    if (folder) {
      formData.append('folder', folder);
    }

    try {
      const response = await fetch('/api/upload-ftp', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data: UploadResult = await response.json();

      if (data.success) {
        toast.dismiss(toastId);
        return data;
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (err: any) {
      console.error('Upload Error:', err);
      toast.error(err.message || 'Failed to connect to storage', { id: toastId });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadImage,
    isUploading
  };
}
