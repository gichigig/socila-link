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

