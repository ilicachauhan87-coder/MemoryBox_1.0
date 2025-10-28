/**
 * Photo compression and upload utilities
 * Compresses images before storing to save space
 */

export interface CompressedImage {
  dataUrl: string;
  size: number;
  width: number;
  height: number;
}

/**
 * Compress an image file to specified max width and quality
 */
export const compressImage = async (
  file: File,
  maxWidth: number = 800,
  quality: number = 0.85
): Promise<CompressedImage> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        // Create canvas for compression
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        
        // Calculate size
        const base64Length = dataUrl.split(',')[1].length;
        const sizeInBytes = (base64Length * 3) / 4;
        
        resolve({
          dataUrl,
          size: sizeInBytes,
          width,
          height
        });
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Validate image file before upload
 */
export const validateImageFile = (file: File): { isValid: boolean; error?: string } => {
  // Check file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return { isValid: false, error: 'Only JPG, PNG, and WebP images are allowed' };
  }
  
  // ✅ FIX: Removed 5MB pre-compression limit
  // Let compression handle any reasonable size (up to 50MB)
  // Compression will reduce even 15MB photos to ~300-500KB
  const maxSize = 50 * 1024 * 1024; // 50MB (reasonable browser limit)
  if (file.size > maxSize) {
    return { isValid: false, error: 'Image must be smaller than 50MB. Please choose a smaller photo.' };
  }
  
  return { isValid: true };
};

/**
 * Compress and prepare image for profile photo (800px max)
 */
export const prepareProfilePhoto = async (file: File): Promise<string> => {
  const validation = validateImageFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }
  
  const compressed = await compressImage(file, 800, 0.85);
  
  // Check compressed size (should be under 2MB)
  if (compressed.size > 2 * 1024 * 1024) {
    // Compress more aggressively
    const recompressed = await compressImage(file, 800, 0.7);
    return recompressed.dataUrl;
  }
  
  return compressed.dataUrl;
};

/**
 * Generate thumbnail from image (400px max)
 */
export const generateThumbnail = async (file: File): Promise<string> => {
  const compressed = await compressImage(file, 400, 0.75);
  return compressed.dataUrl;
};
