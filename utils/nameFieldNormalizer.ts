/**
 * Name Field Normalizer
 * Ensures consistent name handling across snake_case (database) and camelCase (frontend)
 */

export interface NameFields {
  name?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
}

export interface NormalizedNameFields {
  name: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
}

/**
 * Parse a full name into first, middle, and last name
 */
export function parseName(fullName: string): {
  firstName: string;
  middleName: string | null;
  lastName: string;
} {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { firstName: '', middleName: null, lastName: '' };
  }

  const parts = trimmed.split(/\s+/);
  
  if (parts.length === 1) {
    // Only one name provided
    return {
      firstName: parts[0],
      middleName: null,
      lastName: parts[0] // Fallback: use first name as last name
    };
  }
  
  if (parts.length === 2) {
    // First and last name
    return {
      firstName: parts[0],
      middleName: null,
      lastName: parts[1]
    };
  }
  
  // Three or more parts: first, middle(s), last
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(' '),
    lastName: parts[parts.length - 1]
  };
}

/**
 * Normalize name fields from database format to app format
 * Handles both snake_case and camelCase, and parses name if individual fields are missing
 */
export function normalizeNameFields(data: NameFields): NormalizedNameFields {
  // Priority 1: Use existing first_name/last_name if available
  let firstName = data.first_name || data.firstName;
  let middleName = data.middle_name || data.middleName || null;
  let lastName = data.last_name || data.lastName;
  
  // Priority 2: If missing, parse from name field
  if (!firstName || !lastName) {
    const name = data.name || '';
    if (name) {
      const parsed = parseName(name);
      firstName = firstName || parsed.firstName;
      middleName = middleName || parsed.middleName;
      lastName = lastName || parsed.lastName;
      
      console.log('🔧 Name field normalized:', {
        original: name,
        parsed: { firstName, middleName, lastName }
      });
    }
  }
  
  // Ensure we have values (fallback to empty string if still missing)
  const finalFirstName = firstName || '';
  const finalMiddleName = middleName || null;
  const finalLastName = lastName || '';
  const fullName = [finalFirstName, finalMiddleName, finalLastName]
    .filter(Boolean)
    .join(' ') || data.name || '';
  
  return {
    // Full name
    name: fullName,
    
    // Database format (snake_case)
    first_name: finalFirstName,
    middle_name: finalMiddleName,
    last_name: finalLastName,
    
    // App format (camelCase)
    firstName: finalFirstName,
    middleName: finalMiddleName,
    lastName: finalLastName
  };
}

/**
 * Convert database user object to app format with normalized names
 */
export function normalizeUserFromDatabase(dbUser: any): any {
  const normalized = normalizeNameFields(dbUser);
  
  return {
    ...dbUser,
    ...normalized
  };
}

/**
 * Prepare user data for database update (convert camelCase to snake_case)
 */
export function prepareUserForDatabase(userData: any): any {
  const updates: any = {};
  
  // Handle name fields
  if (userData.name !== undefined) {
    updates.name = userData.name;
  }
  
  if (userData.firstName !== undefined) {
    updates.first_name = userData.firstName;
  }
  
  if (userData.middleName !== undefined) {
    updates.middle_name = userData.middleName;
  }
  
  if (userData.lastName !== undefined) {
    updates.last_name = userData.lastName;
  }
  
  // If only camelCase provided, ensure snake_case is also set
  if (userData.firstName && !updates.first_name) {
    updates.first_name = userData.firstName;
  }
  
  if (userData.lastName && !updates.last_name) {
    updates.last_name = userData.lastName;
  }
  
  if (userData.middleName !== undefined && updates.middle_name === undefined) {
    updates.middle_name = userData.middleName;
  }
  
  return updates;
}
