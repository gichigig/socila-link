/**
 * Detects whether a given URL, MIME type, or data URI represents a video.
 */
export function isVideoMedia(url?: string | null): boolean {
  if (!url) return false;
  const lower = url.toLowerCase().trim();

  // Data URIs
  if (lower.startsWith('data:video/')) return true;

  // Blob URLs from video selection
  if (lower.startsWith('blob:') && (lower.includes('video') || lower.includes('mp4') || lower.includes('mov'))) {
    return true;
  }

  // Extensions
  return (
    lower.endsWith('.mp4') ||
    lower.endsWith('.webm') ||
    lower.endsWith('.mov') ||
    lower.endsWith('.m4v') ||
    lower.endsWith('.ogg') ||
    lower.includes('.mp4?') ||
    lower.includes('.webm?') ||
    lower.includes('.mov?') ||
    lower.includes('/video/') ||
    lower.includes('video=true') ||
    lower.includes('content-type=video')
  );
}
