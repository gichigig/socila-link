/**
 * Optimizes large device photos in the browser before upload to provide fast, reliable uploads.
 * Downsizes images to max 1440px and compresses to high-grade Web JPEG (0.82)
 * producing ultra-crisp ~200-400KB payloads that upload instantly.
 */
async function optimizeImageForUpload(file: File): Promise<{ base64: string; contentType: string }> {
  // If animated gif or video, read raw base64 directly
  if (file.type === 'image/gif' || file.type.startsWith('video/')) {
    const raw = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
    return { base64: raw, contentType: file.type };
  }

  return new Promise<{ base64: string; contentType: string }>((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX_DIM = 1440;
      let width = img.width;
      let height = img.height;

      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        // Fallback to FileReader if canvas context is unavailable
        const reader = new FileReader();
        reader.onload = () => resolve({ base64: reader.result as string, contentType: 'image/jpeg' });
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
        return;
      }

      // Draw background white for transparent PNGs converted to JPEG
      ctx.fillStyle = '#1A202C';
      ctx.fillRect(0, 0, width, height);

      ctx.drawImage(img, 0, 0, width, height);
      // High-grade JPEG compression (0.82) - perfect balance of sharpness and tiny payload
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
      resolve({ base64: compressedDataUrl, contentType: 'image/jpeg' });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      const reader = new FileReader();
      reader.onload = () => resolve({ base64: reader.result as string, contentType: 'image/jpeg' });
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Uploads an image or media file from the device to Cloudflare R2 via the SociLaLink API.
 */
export async function uploadMediaFile(
  file: File,
  folder: 'avatars' | 'photos' | 'posts' | 'stories' | 'messages' | 'general' = 'general'
): Promise<{ success: boolean; publicUrl: string; fileKey?: string; error?: string }> {
  try {
    // Validate file size (max 25MB raw file from camera or video)
    const MAX_SIZE_BYTES = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      return { success: false, publicUrl: '', error: 'File size exceeds maximum limit of 25MB' };
    }

    // Optimize photos or read video base64 directly
    const { base64: base64String, contentType } = await optimizeImageForUpload(file);

    // Sanity check: Ensure base64 payload is under 35MB
    if (base64String.length > 35 * 1024 * 1024) {
      return { success: false, publicUrl: '', error: 'Media file is too large for upload. Please select a file under 25MB.' };
    }

    const isVideo = contentType.startsWith('video/') || file.type.startsWith('video/');
    const defaultExt = isVideo ? (contentType === 'video/quicktime' ? '.mov' : contentType === 'video/webm' ? '.webm' : '.mp4') : '.jpg';
    const finalFileName = file.name || (isVideo ? `video${defaultExt}` : 'photo.jpg');

    const response = await fetch('/api/v1/storage/upload-base64', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folder,
        dataBase64: base64String,
        contentType,
        fileName: finalFileName,
      }),
    });

    let data: any = null;
    const responseText = await response.text();
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { error: responseText || `Upload failed with HTTP ${response.status}` };
    }

    if (!response.ok || !data?.success) {
      return {
        success: false,
        publicUrl: '',
        error: data?.error || (response.status === 413 ? 'Image file size too large for server.' : 'Failed to upload media to storage'),
      };
    }

    return {
      success: true,
      publicUrl: data.data.publicUrl,
      fileKey: data.data.fileKey,
    };
  } catch (err: any) {
    console.error('Upload Error:', err);
    return {
      success: false,
      publicUrl: '',
      error: err?.message || 'Network connection error during upload',
    };
  }
}

