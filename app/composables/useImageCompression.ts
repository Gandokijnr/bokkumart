interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  type?: 'image/webp' | 'image/jpeg' | 'image/png';
}

/**
 * Client-side image compression utility
 * Resizes and compresses images before upload for faster page loads
 * and reduced storage costs
 */
export function useImageCompression() {
  /**
   * Compress an image file
   * @param file - The original image file
   * @param options - Compression options
   * @returns Promise<Blob> - The compressed image as a Blob
   */
  async function compressImage(
    file: File,
    options: CompressionOptions = {}
  ): Promise<Blob> {
    const {
      maxWidth = 800,
      maxHeight = 800,
      quality = 0.85,
      type = 'image/webp',
    } = options;

    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      img.onload = () => {
        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // Set canvas size
        canvas.width = width;
        canvas.height = height;

        // Use better quality scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          },
          type,
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      // Load image from file
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Get compressed image as data URL for preview
   */
  async function compressToDataURL(
    file: File,
    options: CompressionOptions = {}
  ): Promise<string> {
    const blob = await compressImage(file, options);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Compress multiple images
   */
  async function compressMultiple(
    files: File[],
    options: CompressionOptions = {}
  ): Promise<Blob[]> {
    return Promise.all(files.map(file => compressImage(file, options)));
  }

  return {
    compressImage,
    compressToDataURL,
    compressMultiple,
  };
}
