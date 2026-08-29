/**
 * High-performance Client-Side Image Compression & Optimization Utility
 * Prevents HTTP 413 Payload Too Large by scaling down and compressing
 * raw high-res images and tactical canvas thumbnails before persistence/cloud sync.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: 'image/jpeg' | 'image/webp' | 'image/png';
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1024,
  maxHeight: 768,
  quality: 0.8,
  mimeType: 'image/jpeg',
};

/**
 * Compresses an image File into a lightweight Base64 Data URL (JPEG/WebP).
 */
export const compressImageFile = async (
  file: File,
  options: CompressionOptions = {}
): Promise<string> => {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        return resolve('');
      }
      compressBase64Image(dataUrl, mergedOptions)
        .then(resolve)
        .catch(() => resolve(dataUrl)); // fallback to original on error
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

/**
 * Compresses an existing Base64 Data URL to fit within size & dimension bounds.
 */
export const compressBase64Image = async (
  dataUrl: string,
  options: CompressionOptions = {}
): Promise<string> => {
  if (!dataUrl || typeof dataUrl !== 'string') return dataUrl;
  
  // If not a raster data URL (e.g., SVG, URL, empty), return as is
  if (!dataUrl.startsWith('data:image/') || dataUrl.startsWith('data:image/svg+xml')) {
    return dataUrl;
  }

  // If already very small (< 40KB), skip heavy processing
  if (dataUrl.length < 50000 && !dataUrl.includes('image/png')) {
    return dataUrl;
  }

  const { maxWidth = 1024, maxHeight = 768, quality = 0.8, mimeType = 'image/jpeg' } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        let { width, height } = img;
        if (width <= 0 || height <= 0) {
          return resolve(dataUrl);
        }

        // Calculate scaled dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          return resolve(dataUrl);
        }

        // Draw with white background for JPEG compression
        if (mimeType === 'image/jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL(mimeType, quality);

        // Ensure we actually reduced the size, otherwise keep compressed
        resolve(compressed.length < dataUrl.length ? compressed : dataUrl);
      } catch (err) {
        console.warn('[ImageCompression] Canvas draw error, falling back:', err);
        resolve(dataUrl);
      }
    };

    img.onerror = () => {
      console.warn('[ImageCompression] Image load error, falling back to original');
      resolve(dataUrl);
    };

    img.src = dataUrl;
  });
};

/**
 * Optimizes HTMLCanvasElement output to a compressed JPEG/WebP data URL.
 */
export const compressCanvasToDataUrl = (
  canvas: HTMLCanvasElement,
  options: CompressionOptions = {}
): string => {
  const { maxWidth = 960, maxHeight = 640, quality = 0.8 } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  try {
    const { width, height } = canvas;
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      const scaledWidth = Math.round(width * ratio);
      const scaledHeight = Math.round(height * ratio);

      const offscreen = document.createElement('canvas');
      offscreen.width = scaledWidth;
      offscreen.height = scaledHeight;
      const offCtx = offscreen.getContext('2d');
      if (offCtx) {
        offCtx.fillStyle = '#FFFFFF';
        offCtx.fillRect(0, 0, scaledWidth, scaledHeight);
        offCtx.drawImage(canvas, 0, 0, scaledWidth, scaledHeight);
        return offscreen.toDataURL('image/jpeg', quality);
      }
    }
    return canvas.toDataURL('image/jpeg', quality);
  } catch (err) {
    console.warn('[ImageCompression] Canvas export fallback to standard JPEG:', err);
    try {
      return canvas.toDataURL('image/jpeg', quality);
    } catch {
      return canvas.toDataURL();
    }
  }
};

/**
 * Traverses an AppData payload and sanitizes/compresses heavy fields (designs, players, logo)
 * before sending to server or saving to cloud.
 */
export const sanitizeAndCompressPayload = async (payload: any): Promise<any> => {
  if (!payload || typeof payload !== 'object') return payload;

  const optimized = { ...payload };

  // 1. Sanitize & Compress Designs
  if (Array.isArray(optimized.designs) && optimized.designs.length > 0) {
    optimized.designs = await Promise.all(
      optimized.designs.map(async (design: any) => {
        if (!design || typeof design !== 'object') return design;
        const d = { ...design };

        // If previewImage is large (> 50KB or PNG)
        if (d.previewImage && typeof d.previewImage === 'string' && d.previewImage.length > 40000) {
          d.previewImage = await compressBase64Image(d.previewImage, {
            maxWidth: 800,
            maxHeight: 600,
            quality: 0.75,
            mimeType: 'image/jpeg',
          });
        }

        // Deduplicate diagramImage if it's the exact same as previewImage or oversized
        if (d.diagramImage && typeof d.diagramImage === 'string') {
          if (d.diagramImage === d.previewImage || d.diagramImage.length > 40000) {
            d.diagramImage = d.previewImage; // Point to same compressed string
          }
        }

        // Uploaded image
        if (d.uploadedImage && typeof d.uploadedImage === 'string' && d.uploadedImage.length > 40000) {
          d.uploadedImage = await compressBase64Image(d.uploadedImage, {
            maxWidth: 1024,
            maxHeight: 768,
            quality: 0.8,
            mimeType: 'image/jpeg',
          });
        }

        return d;
      })
    );
  }

  // 2. Sanitize App Logo
  if (optimized.appLogo && typeof optimized.appLogo === 'string' && optimized.appLogo.length > 50000) {
    optimized.appLogo = await compressBase64Image(optimized.appLogo, {
      maxWidth: 400,
      maxHeight: 400,
      quality: 0.85,
    });
  }

  // 3. Sanitize Player Images
  if (Array.isArray(optimized.players)) {
    optimized.players = await Promise.all(
      optimized.players.map(async (p: any) => {
        if (!p || typeof p !== 'object') return p;
        const player = { ...p };
        if (player.image && typeof player.image === 'string' && player.image.length > 50000) {
          player.image = await compressBase64Image(player.image, {
            maxWidth: 400,
            maxHeight: 400,
            quality: 0.8,
          });
        }
        return player;
      })
    );
  }

  return optimized;
};
