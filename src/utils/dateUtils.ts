/**
 * Date utilities for Brazilian date format (DD/MM/YYYY)
 * Provides automatic input masking, validation, and conversion for HTML5 date pickers.
 */

/**
 * Automatically masks an input string into DD/MM/YYYY format while the user types.
 * Allows digits only and inserts slashes at the correct positions.
 */
export function maskDateInput(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  // Keep only digits, maximum 8 digits (DDMMYYYY)
  const digits = str.replace(/\D/g, '').slice(0, 8);
  
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/**
 * Validates whether a given string is a valid DD/MM/YYYY date or empty.
 * Returns true if empty (cleared) or a genuine calendar date.
 */
export function isValidDateBR(val: any): boolean {
  if (val === null || val === undefined) return true;
  const str = String(val).trim();
  if (!str || str === '—' || str === '-') return true;
  const match = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return false;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;

  // Days per month considering leap years
  const daysInMonth = new Date(year, month, 0).getDate();
  return day >= 1 && day <= daysInMonth;
}

/**
 * Converts a DD/MM/YYYY string to HTML5 input[type=date] format YYYY-MM-DD
 */
export function dateBRToISO(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (!str) return '';
  // If already in ISO format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }
  const match = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return '';
  return `${match[3]}-${match[2]}-${match[1]}`;
}

/**
 * Converts an HTML5 input[type=date] format YYYY-MM-DD to DD/MM/YYYY
 */
export function dateISOToBR(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (!str) return '';
  // If already in DD/MM/YYYY format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    return str;
  }
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '';
  return `${match[3]}/${match[2]}/${match[1]}`;
}

