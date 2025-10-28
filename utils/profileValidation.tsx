/**
 * Profile field validation utilities
 */

export const validateEmail = (email: string): boolean => {
  if (!email) return true; // Optional field
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  if (!phone) return true; // Optional field
  // Allow various formats: +1234567890, (123) 456-7890, 123-456-7890, etc.
  const phoneRegex = /^[\d\s\-\(\)\+]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
};

export const formatPhone = (phone: string): string => {
  if (!phone) return '';
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Format as: (123) 456-7890 for US/Canada
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  
  // Return as-is if doesn't match expected format
  return phone;
};

export const validateDates = (birthDate?: string, deathDate?: string): { isValid: boolean; error?: string } => {
  if (!birthDate && !deathDate) return { isValid: true };
  
  if (birthDate && deathDate) {
    const birth = new Date(birthDate);
    const death = new Date(deathDate);
    
    if (death < birth) {
      return { isValid: false, error: 'Death date cannot be before birth date' };
    }
  }
  
  // Check if birth date is not in the future
  if (birthDate) {
    const birth = new Date(birthDate);
    const now = new Date();
    if (birth > now) {
      return { isValid: false, error: 'Birth date cannot be in the future' };
    }
  }
  
  return { isValid: true };
};

export const getValidationErrors = (data: {
  email?: string;
  phone?: string;
  birthDate?: string;
  deathDate?: string;
}): string[] => {
  const errors: string[] = [];
  
  if (data.email && !validateEmail(data.email)) {
    errors.push('Invalid email format');
  }
  
  if (data.phone && !validatePhone(data.phone)) {
    errors.push('Invalid phone number (must be at least 10 digits)');
  }
  
  const dateValidation = validateDates(data.birthDate, data.deathDate);
  if (!dateValidation.isValid) {
    errors.push(dateValidation.error!);
  }
  
  return errors;
};
