/**
 * Date Helper Utilities
 * Handles conversion between DD-MM-YYYY (user-facing) and YYYY-MM-DD (storage) formats
 */

/**
 * Format date from YYYY-MM-DD (storage format) to DD-MM-YYYY (display format)
 */
export const formatDateForDisplay = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    // Handle both formats
    if (dateString.includes('-')) {
      const parts = dateString.split('-');
      
      // If already in DD-MM-YYYY format
      if (parts[0].length === 2) {
        return dateString;
      }
      
      // Convert from YYYY-MM-DD to DD-MM-YYYY
      if (parts.length === 3 && parts[0].length === 4) {
        const [year, month, day] = parts;
        return `${day}-${month}-${year}`;
      }
    }
    
    return dateString;
  } catch (e) {
    console.error('Error formatting date for display:', e);
    return dateString;
  }
};

/**
 * Convert date from DD-MM-YYYY (display format) to YYYY-MM-DD (storage format)
 */
export const formatDateForStorage = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    // Remove any extra spaces
    const trimmed = dateString.trim();
    
    if (trimmed.includes('-')) {
      const parts = trimmed.split('-');
      
      // If already in YYYY-MM-DD format
      if (parts[0].length === 4) {
        return trimmed;
      }
      
      // Convert from DD-MM-YYYY to YYYY-MM-DD
      if (parts.length === 3 && parts[0].length <= 2) {
        const [day, month, year] = parts;
        // Pad day and month with leading zeros if needed
        const paddedDay = day.padStart(2, '0');
        const paddedMonth = month.padStart(2, '0');
        return `${year}-${paddedMonth}-${paddedDay}`;
      }
    }
    
    return trimmed;
  } catch (e) {
    console.error('Error formatting date for storage:', e);
    return dateString;
  }
};

/**
 * Validate DD-MM-YYYY format
 */
export const isValidDDMMYYYY = (dateString: string): boolean => {
  if (!dateString) return true; // Empty is valid (optional field)
  
  const ddmmyyyyPattern = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
  const match = dateString.match(ddmmyyyyPattern);
  
  if (!match) return false;
  
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  
  // Validate ranges
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > 2100) return false;
  
  // Check valid day for month
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day > daysInMonth) return false;
  
  return true;
};

/**
 * Get today's date in DD-MM-YYYY format
 */
export const getTodayDDMMYYYY = (): string => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * Convert Date object to DD-MM-YYYY string
 */
export const dateToDDMMYYYY = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * Parse DD-MM-YYYY string to Date object
 */
export const parseDDMMYYYY = (dateString: string): Date | null => {
  if (!dateString || !isValidDDMMYYYY(dateString)) return null;
  
  const [day, month, year] = dateString.split('-').map(num => parseInt(num, 10));
  return new Date(year, month - 1, day);
};

/**
 * Format input value as user types (adds dashes automatically)
 */
export const formatDateInput = (value: string): string => {
  // Remove all non-numeric characters
  const numbers = value.replace(/\D/g, '');
  
  // Format as DD-MM-YYYY
  if (numbers.length <= 2) {
    return numbers;
  } else if (numbers.length <= 4) {
    return `${numbers.slice(0, 2)}-${numbers.slice(2)}`;
  } else {
    return `${numbers.slice(0, 2)}-${numbers.slice(2, 4)}-${numbers.slice(4, 8)}`;
  }
};

/**
 * Get error message for invalid date
 */
export const getDateErrorMessage = (dateString: string): string | null => {
  if (!dateString) return null;
  
  if (!isValidDDMMYYYY(dateString)) {
    return 'Please enter a valid date in DD-MM-YYYY format (e.g., 15-03-1990)';
  }
  
  const date = parseDDMMYYYY(dateString);
  const today = new Date();
  
  if (date && date > today) {
    return 'Date cannot be in the future';
  }
  
  return null;
};
