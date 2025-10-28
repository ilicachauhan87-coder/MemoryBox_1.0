/**
 * 🚀 Centralized Gender Normalization Utility
 * 
 * This utility ensures consistent gender capitalization across the entire app.
 * 
 * WHY THIS EXISTS:
 * - OnboardingPage form uses lowercase: "male", "female"
 * - FamilyTreeApp expects capitalized: "Male", "Female"
 * - ProfilePage, VaultPage, and other components need consistency
 * 
 * SINGLE SOURCE OF TRUTH:
 * - All gender values should be normalized to "Male" or "Female"
 * - Default fallback is "Female"
 * 
 * Usage:
 * ```typescript
 * import { normalizeGender, isValidGender } from './utils/genderHelpers';
 * 
 * const gender = normalizeGender("male"); // Returns "Male"
 * const isValid = isValidGender("Female"); // Returns true
 * ```
 */

/**
 * Valid gender types in the MemoryBox application
 */
export type Gender = 'Male' | 'Female';

/**
 * Normalizes a gender string to proper capitalization.
 * 
 * @param gender - The gender string to normalize (can be any case)
 * @returns Normalized gender as "Male" or "Female" (defaults to "Female" if invalid)
 * 
 * @example
 * normalizeGender("male") // Returns "Male"
 * normalizeGender("FEMALE") // Returns "Female"
 * normalizeGender("") // Returns "Female" (default)
 * normalizeGender(undefined) // Returns "Female" (default)
 */
export const normalizeGender = (gender: string | undefined | null): Gender => {
  // Handle null, undefined, or empty string
  if (!gender || gender.trim() === '') {
    return 'Female';
  }
  
  // Normalize to lowercase for comparison
  const lowerGender = gender.toLowerCase().trim();
  
  // Return properly capitalized version
  if (lowerGender === 'male') {
    return 'Male';
  }
  
  // Default to Female for any other value
  return 'Female';
};

/**
 * Checks if a gender value is valid (either "Male" or "Female")
 * 
 * @param gender - The gender string to validate
 * @returns true if gender is "Male" or "Female", false otherwise
 * 
 * @example
 * isValidGender("Male") // Returns true
 * isValidGender("male") // Returns false (not properly capitalized)
 * isValidGender("Other") // Returns false
 */
export const isValidGender = (gender: string | undefined | null): boolean => {
  return gender === 'Male' || gender === 'Female';
};

/**
 * Gets the opposite gender
 * 
 * @param gender - The current gender
 * @returns The opposite gender ("Male" returns "Female", "Female" returns "Male")
 * 
 * @example
 * getOppositeGender("Male") // Returns "Female"
 * getOppositeGender("Female") // Returns "Male"
 */
export const getOppositeGender = (gender: Gender): Gender => {
  return gender === 'Male' ? 'Female' : 'Male';
};

/**
 * Gets gender-specific pronouns
 * 
 * @param gender - The gender
 * @returns Object with subject, object, and possessive pronouns
 * 
 * @example
 * getGenderPronouns("Male") // Returns { subject: "he", object: "him", possessive: "his" }
 * getGenderPronouns("Female") // Returns { subject: "she", object: "her", possessive: "her" }
 */
export const getGenderPronouns = (gender: Gender): {
  subject: string;
  object: string;
  possessive: string;
} => {
  if (gender === 'Male') {
    return {
      subject: 'he',
      object: 'him',
      possessive: 'his'
    };
  }
  
  return {
    subject: 'she',
    object: 'her',
    possessive: 'her'
  };
};

/**
 * Gets gender-specific relationship term
 * 
 * @param gender - The gender
 * @param relationship - The relationship type
 * @returns Gender-specific relationship label
 * 
 * @example
 * getGenderSpecificRelationship("Male", "sibling") // Returns "Brother"
 * getGenderSpecificRelationship("Female", "child") // Returns "Daughter"
 */
export const getGenderSpecificRelationship = (
  gender: Gender,
  relationship: 'sibling' | 'parent' | 'child' | 'grandparent' | 'grandchild'
): string => {
  const maleTerms = {
    sibling: 'Brother',
    parent: 'Father',
    child: 'Son',
    grandparent: 'Grandfather',
    grandchild: 'Grandson'
  };
  
  const femaleTerms = {
    sibling: 'Sister',
    parent: 'Mother',
    child: 'Daughter',
    grandparent: 'Grandmother',
    grandchild: 'Granddaughter'
  };
  
  return gender === 'Male' ? maleTerms[relationship] : femaleTerms[relationship];
};
