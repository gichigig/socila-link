/**
 * Utility functions for formatting media viewing durations and countdown timers.
 */

/**
 * Formats a duration in seconds into a friendly human-readable label.
 * e.g. 0 -> 'Forever'
 *      300 -> '5 mins'
 *      900 -> '15 mins'
 *      1800 -> '30 mins'
 *      3600 -> '1 hour'
 *      7200 -> '2 hours'
 *      21600 -> '6 hours'
 *      43200 -> '12 hours'
 *      86400 -> '24 hours'
 */
export function formatDuration(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return 'Forever';
  if (seconds < 60) return `${seconds}s`;

  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const remSec = seconds % 60;
    if (remSec > 0) return `${mins}m ${remSec}s`;
    return mins === 1 ? '1 min' : `${mins} mins`;
  }

  const hours = Math.floor(seconds / 3600);
  const remMins = Math.floor((seconds % 3600) / 60);
  if (hours < 24) {
    if (remMins > 0) return `${hours}h ${remMins}m`;
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }

  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  if (remHours > 0) return `${days}d ${remHours}h`;
  return days === 1 ? '24 hours' : `${days} days`;
}

/**
 * Formats remaining countdown time into digital timer format.
 * e.g. 45 -> '45s'
 *      300 -> '05:00'
 *      3599 -> '59:59'
 *      3665 -> '01:01:05'
 */
export function formatRemainingTime(seconds: number): string {
  if (seconds <= 0) return '0s';
  if (seconds < 60) return `${seconds}s`;

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Formats video playback length in standard video player format.
 * e.g. 15 -> '0:15'
 *      75 -> '1:15'
 *      3670 -> '1:01:10'
 */
export function formatVideoDuration(seconds?: number | null): string {
  if (!seconds || isNaN(seconds) || seconds <= 0) return '0:00';
  const totalSecs = Math.round(seconds);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Asynchronously extracts duration (in seconds) from a video File or URL in the browser.
 */
export function getVideoDuration(fileOrUrl: File | string): Promise<number> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      return resolve(0);
    }
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      const isFile = typeof fileOrUrl !== 'string';
      const url = isFile ? URL.createObjectURL(fileOrUrl) : fileOrUrl;
      video.src = url;

      const cleanup = () => {
        if (isFile) {
          try {
            URL.revokeObjectURL(url);
          } catch {
            // ignore
          }
        }
      };

      video.onloadedmetadata = () => {
        const dur = Math.round(video.duration || 0);
        cleanup();
        resolve(dur);
      };

      video.onerror = () => {
        cleanup();
        resolve(0);
      };

      // Timeout fallback after 4 seconds
      setTimeout(() => {
        cleanup();
        resolve(0);
      }, 4000);
    } catch {
      resolve(0);
    }
  });
}

