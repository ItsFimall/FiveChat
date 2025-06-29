import { useState, useCallback, useMemo } from 'react';
import { message } from "antd";
import { useTranslations } from 'next-intl';

// Image compression utility
const compressImage = (file: File, maxWidth: number = 1024, quality: number = 0.8): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const compressedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        } else {
          resolve(file);
        }
      }, file.type, quality);
    };

    img.src = URL.createObjectURL(file);
  });
};

const useImageUpload = (maxImages: number = 5) => {
  const t = useTranslations('Chat');
  const [uploadedImages, setUploadedImages] = useState<Array<{ url: string; file: File; compressed?: boolean }>>([]);

  // Memoize total size calculation
  const totalSize = useMemo(() => {
    return uploadedImages.reduce((sum, img) => sum + img.file.size, 0);
  }, [uploadedImages]);

  const handleImageUpload = useCallback(async (file?: File, url?: string) => {
    if (file && url) {
      // 直接处理传入的文件
      if (file.size > 10 * 1024 * 1024) { // 10MB limit before compression
        message.warning(t('imageSizeLimit'));
        return;
      }
      if (!file.type.startsWith('image/')) {
        message.warning(t('mustBeImage'));
        return;
      }

      // Compress image if it's too large
      let processedFile = file;
      let compressed = false;

      if (file.size > 2 * 1024 * 1024) { // 2MB
        try {
          processedFile = await compressImage(file);
          compressed = true;
          message.success('图片已自动压缩以提高上传速度');
        } catch (error) {
          console.warn('Image compression failed, using original:', error);
        }
      }

      setUploadedImages(prev => [...prev, { url, file: processedFile, compressed }]);
      return;
    }

    // 原有的文件选择逻辑
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;

    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;

      const fileArray = Array.from(files);
      if (fileArray.length + uploadedImages.length > maxImages) {
        message.warning(t('maxImageCount', { maxImages: maxImages }));
        return;
      }

      // 验证文件大小和类型
      for (const file of fileArray) {
        if (file.size > 5 * 1024 * 1024) { // 5MB
          message.warning(t('imageSizeLimit'));
          return;
        }
        if (!file.type.startsWith('image/')) {
          message.warning(t('mustBeImage'));
          return;
        }
      }
      const newImages = fileArray.map(file => ({
        url: URL.createObjectURL(file),
        file
      }));
      setUploadedImages(prev => [...prev, ...newImages]);
    };
    input.click();
  }, [uploadedImages.length, maxImages, t]);

  const removeImage = useCallback((index: number) => {
    setUploadedImages(prev => {
      const imgToRemove = prev[index];
      if (imgToRemove.url.startsWith('blob:')) {
        URL.revokeObjectURL(imgToRemove.url);
      }
      return prev.filter((_, i) => i !== index);
      // return prev.filter((item) => item.url !== imgToRemove.url);
    });
  }, []);

  return { uploadedImages, maxImages, handleImageUpload, removeImage, setUploadedImages };
};

export default useImageUpload;