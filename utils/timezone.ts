/**
 * Format a date string from the database to Indian Standard Time (IST)
 */
export function formatDateToLocalTimezone(dateString: string): string {
  try {
    const date = new Date(dateString);
    
    // Use Asia/Kolkata timezone for proper IST display
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
}

/**
 * Get current user's timezone offset
 */
export function getUserTimezone(): string {
  const now = new Date();
  const offset = -now.getTimezoneOffset();
  const hours = Math.floor(Math.abs(offset) / 60);
  const minutes = Math.abs(offset) % 60;
  const sign = offset >= 0 ? '+' : '-';
  return `UTC${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
