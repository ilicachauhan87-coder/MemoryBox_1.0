/**
 * 🛡️ Profile Recovery Service
 * Handles localStorage corruption detection and recovery from Supabase
 * 
 * WHY THIS EXISTS:
 * - localStorage writes can be interrupted (user force-exits, browser crashes)
 * - Interrupted writes corrupt the JSON data
 * - Corrupted data causes "No account found" errors
 * - Supabase is the source of truth, localStorage is just a cache
 * 
 * ARCHITECTURE:
 * - Supabase = Source of Truth (persistent, reliable)
 * - localStorage = Performance Cache (fast, but can corrupt)
 * - Auto-recovery from Supabase when corruption detected
 */

import { DatabaseService } from './supabase/persistent-database';

export interface RecoveryResult {
  recovered: boolean;
  source: 'localStorage' | 'supabase' | 'none';
  error?: string;
}

/**
 * Detect if localStorage data is corrupted
 * @param key - The localStorage key to check
 * @returns true if data is corrupted or invalid
 */
export function isLocalStorageCorrupted(key: string): boolean {
  try {
    const data = localStorage.getItem(key);
    if (!data) return false; // Missing data is not corruption
    
    // Try to parse JSON
    JSON.parse(data);
    return false; // Valid JSON
  } catch (error) {
    console.error(`❌ Corrupted localStorage detected at key: ${key}`, error);
    return true;
  }
}

/**
 * Safely get data from localStorage with fallback to Supabase
 * @param key - The localStorage key
 * @param userId - User ID for Supabase fallback
 * @returns Parsed data or null
 */
export async function safeGetFromLocalStorage<T>(
  key: string,
  userId?: string
): Promise<{ data: T | null; source: 'localStorage' | 'supabase' | 'none' }> {
  try {
    // Step 1: Try localStorage first (fastest)
    const localData = localStorage.getItem(key);
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        console.log(`✅ Loaded from localStorage: ${key}`);
        return { data: parsed, source: 'localStorage' };
      } catch (parseError) {
        console.error(`❌ localStorage corrupted for key: ${key}`);
        console.error('   Parse error:', parseError);
        console.error('   Raw data length:', localData.length);
        console.error('   First 100 chars:', localData.substring(0, 100));
        
        // Remove corrupted data
        localStorage.removeItem(key);
        console.log('   🗑️ Removed corrupted data');
      }
    }
    
    // Step 2: If localStorage failed, try Supabase recovery
    if (userId) {
      console.log(`🔄 Attempting Supabase recovery for: ${key}`);
      
      try {
        // Determine what to fetch based on key
        let supabaseData: any = null;
        
        if (key.includes(':profile')) {
          supabaseData = await DatabaseService.getProfile(userId);
        } else if (key.includes('familyTree_')) {
          const match = key.match(/familyTree_(.+)/);
          if (match) {
            const familyId = match[1];
            supabaseData = await DatabaseService.getFamilyTree(familyId);
          }
        }
        
        if (supabaseData) {
          // Restore to localStorage
          localStorage.setItem(key, JSON.stringify(supabaseData));
          console.log(`✅ Recovered from Supabase and restored to localStorage`);
          return { data: supabaseData, source: 'supabase' };
        }
      } catch (supabaseError) {
        console.error('❌ Supabase recovery failed:', supabaseError);
      }
    }
    
    // Step 3: No data available
    console.log(`ℹ️ No data found for: ${key}`);
    return { data: null, source: 'none' };
    
  } catch (error) {
    console.error('❌ Critical error in safeGetFromLocalStorage:', error);
    return { data: null, source: 'none' };
  }
}

/**
 * Safely save data to localStorage with atomic writes
 * @param key - The localStorage key
 * @param data - The data to save
 * @returns Success boolean
 */
export function safeSaveToLocalStorage(key: string, data: any): boolean {
  try {
    // Create backup of existing data
    const existingData = localStorage.getItem(key);
    const backupKey = `${key}_backup`;
    
    if (existingData) {
      localStorage.setItem(backupKey, existingData);
    }
    
    // Attempt save
    const jsonString = JSON.stringify(data);
    localStorage.setItem(key, jsonString);
    
    // Verify write
    const verification = localStorage.getItem(key);
    if (verification === jsonString) {
      // Success - remove backup
      localStorage.removeItem(backupKey);
      return true;
    } else {
      throw new Error('Write verification failed');
    }
    
  } catch (error) {
    console.error(`❌ Failed to save to localStorage: ${key}`, error);
    
    // Attempt rollback from backup
    const backupKey = `${key}_backup`;
    const backup = localStorage.getItem(backupKey);
    if (backup) {
      try {
        localStorage.setItem(key, backup);
        console.log('✅ Rolled back to backup');
      } catch (rollbackError) {
        console.error('❌ Rollback failed:', rollbackError);
      }
    }
    
    return false;
  }
}

/**
 * Recover user profile from Supabase when localStorage is corrupted
 * @param email - User's email address
 * @returns Recovery result
 */
export async function recoverUserProfile(email: string): Promise<RecoveryResult> {
  try {
    console.log('🔄 Attempting profile recovery for:', email);
    
    // Try to get profile from Supabase
    const profile = await DatabaseService.getProfileByEmail(email);
    
    if (profile) {
      // Restore profile to localStorage
      const profileKey = `user:${profile.id}:profile`;
      const saved = safeSaveToLocalStorage(profileKey, profile);
      
      if (saved) {
        // Also set current_user_id
        localStorage.setItem('current_user_id', profile.id);
        
        console.log('✅ Profile recovered successfully from Supabase');
        return {
          recovered: true,
          source: 'supabase'
        };
      } else {
        throw new Error('Failed to save recovered profile to localStorage');
      }
    } else {
      return {
        recovered: false,
        source: 'none',
        error: 'Profile not found in Supabase'
      };
    }
    
  } catch (error: any) {
    console.error('❌ Profile recovery failed:', error);
    return {
      recovered: false,
      source: 'none',
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Check localStorage health and auto-recover if needed
 * Should be called on app startup
 */
export async function checkAndRecoverLocalStorage(): Promise<void> {
  try {
    console.log('🔍 Checking localStorage health...');
    
    const currentUserId = localStorage.getItem('current_user_id');
    if (!currentUserId) {
      console.log('ℹ️ No user logged in, skipping recovery check');
      return;
    }
    
    const profileKey = `user:${currentUserId}:profile`;
    
    // Check if profile is corrupted
    if (isLocalStorageCorrupted(profileKey)) {
      console.warn('⚠️ Corrupted profile detected, attempting recovery...');
      
      // Try to get email from another source or ask user
      // For now, we'll attempt recovery without email (using user ID)
      const { data, source } = await safeGetFromLocalStorage(profileKey, currentUserId);
      
      if (data && source === 'supabase') {
        console.log('✅ Profile auto-recovered from Supabase');
        toast.success('Profile recovered successfully!');
      } else {
        console.error('❌ Auto-recovery failed');
        toast.error('Failed to recover profile. Please sign in again.');
        // Clear corrupted data
        localStorage.clear();
      }
    } else {
      console.log('✅ localStorage health check passed');
    }
    
  } catch (error) {
    console.error('❌ Health check failed:', error);
  }
}
