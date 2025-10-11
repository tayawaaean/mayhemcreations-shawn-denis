/**
 * Date Formatting Utilities
 * Formats dates without timezone conversion issues
 */

/**
 * Format date with time (e.g., "Jan 11, 2025, 2:30 PM")
 */
export const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  
  try {
    // Extract date and time parts without timezone conversion
    const [datePart, timePart] = dateString.split('T');
    const [year, month, day] = datePart.split('-');
    
    // Month names
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = monthNames[parseInt(month) - 1];
    
    // If there's a time part, extract hour and minute
    if (timePart) {
      const [hourMinSec] = timePart.split('.');
      const [hour24, minute] = hourMinSec.split(':');
      const hour = parseInt(hour24);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      
      return `${monthName} ${parseInt(day)}, ${year}, ${hour12}:${minute} ${ampm}`;
    }
    
    return `${monthName} ${parseInt(day)}, ${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

/**
 * Format date only without time (e.g., "10/11/2025")
 */
export const formatDateOnly = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  
  try {
    const [datePart] = dateString.split('T');
    const [year, month, day] = datePart.split('-');
    return `${month}/${day}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

/**
 * Format date with short month name (e.g., "Jan 11, 2025")
 */
export const formatDateShort = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  
  try {
    const [datePart] = dateString.split('T');
    const [year, month, day] = datePart.split('-');
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = monthNames[parseInt(month) - 1];
    
    return `${monthName} ${parseInt(day)}, ${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

/**
 * Format date with full month name (e.g., "January 11, 2025")
 */
export const formatDateLong = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  
  try {
    const [datePart] = dateString.split('T');
    const [year, month, day] = datePart.split('-');
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[parseInt(month) - 1];
    
    return `${monthName} ${parseInt(day)}, ${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

/**
 * Format date for input fields (YYYY-MM-DD)
 */
export const formatDateForInput = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  
  try {
    const [datePart] = dateString.split('T');
    return datePart;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

/**
 * Get relative time (e.g., "2 hours ago", "3 days ago")
 */
export const getRelativeTime = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Unknown';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    if (diffDay < 30) {
      const weeks = Math.floor(diffDay / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    }
    if (diffDay < 365) {
      const months = Math.floor(diffDay / 30);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    }
    const years = Math.floor(diffDay / 365);
    return `${years} year${years > 1 ? 's' : ''} ago`;
  } catch (error) {
    console.error('Error calculating relative time:', error);
    return 'Unknown';
  }
};

