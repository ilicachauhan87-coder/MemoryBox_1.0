/**
 * 🗑️ DATABASE RESET UTILITY
 * 
 * Use this ONLY for testing/development to completely reset all user data
 * 
 * WARNING: This will delete ALL data from:
 * - Supabase database (users, memories, family trees)
 * - localStorage
 * - sessionStorage
 * - Auth sessions
 * 
 * Usage:
 * 1. Import this function
 * 2. Call resetAllData() from browser console or a debug page
 * 3. Confirm the deletion
 */

import { getSupabaseClient } from './supabase/client';
import { projectId } from './supabase/info';

/**
 * Delete all data from Supabase database
 */
export async function deleteAllSupabaseData(): Promise<void> {
  const supabase = getSupabaseClient();
  
  console.log('🗑️ Starting Supabase data deletion...');
  
  try {
    // Get current session to verify admin access
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error('❌ Not authenticated! Please sign in first.');
      return;
    }
    
    // Delete all memories
    console.log('🗑️ Deleting all memories...');
    const { error: memoriesError } = await supabase
      .from('memories')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (memoriesError) {
      console.error('❌ Error deleting memories:', memoriesError);
    } else {
      console.log('✅ All memories deleted');
    }
    
    // Delete all family trees
    console.log('🗑️ Deleting all family trees...');
    const { error: treesError } = await supabase
      .from('family_trees')
      .delete()
      .neq('family_id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (treesError) {
      console.error('❌ Error deleting family trees:', treesError);
    } else {
      console.log('✅ All family trees deleted');
    }
    
    // Delete all users (this should cascade to auth.users via trigger)
    console.log('🗑️ Deleting all users...');
    const { error: usersError } = await supabase
      .from('users')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (usersError) {
      console.error('❌ Error deleting users:', usersError);
    } else {
      console.log('✅ All users deleted');
    }
    
    console.log('✅ Supabase data deletion complete!');
    
  } catch (error) {
    console.error('❌ Critical error during Supabase deletion:', error);
  }
}

/**
 * Clear all browser storage
 */
export function clearAllBrowserStorage(): void {
  console.log('🗑️ Clearing browser storage...');
  
  try {
    // Clear localStorage
    const localStorageKeys = Object.keys(localStorage);
    console.log(`   Clearing ${localStorageKeys.length} localStorage keys...`);
    localStorage.clear();
    
    // Clear sessionStorage
    const sessionStorageKeys = Object.keys(sessionStorage);
    console.log(`   Clearing ${sessionStorageKeys.length} sessionStorage keys...`);
    sessionStorage.clear();
    
    // Clear IndexedDB
    if ('indexedDB' in window) {
      indexedDB.databases().then(dbs => {
        console.log(`   Clearing ${dbs.length} IndexedDB databases...`);
        dbs.forEach(db => {
          if (db.name) {
            indexedDB.deleteDatabase(db.name);
          }
        });
      });
    }
    
    console.log('✅ Browser storage cleared!');
    
  } catch (error) {
    console.error('❌ Error clearing browser storage:', error);
  }
}

/**
 * Sign out current user
 */
export async function signOutCurrentUser(): Promise<void> {
  const supabase = getSupabaseClient();
  
  console.log('🚪 Signing out current user...');
  
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('❌ Error signing out:', error);
    } else {
      console.log('✅ User signed out');
    }
  } catch (error) {
    console.error('❌ Critical error during sign out:', error);
  }
}

/**
 * MASTER RESET FUNCTION
 * Deletes everything and signs out
 */
export async function resetAllData(): Promise<void> {
  console.log('');
  console.log('🗑️ ========================================');
  console.log('🗑️ COMPLETE DATABASE RESET');
  console.log('🗑️ ========================================');
  console.log('');
  
  const confirmMessage = 
    '⚠️ WARNING: This will DELETE ALL DATA!\n\n' +
    'This includes:\n' +
    '- All user accounts\n' +
    '- All family trees\n' +
    '- All memories\n' +
    '- All browser storage\n\n' +
    'Type "DELETE ALL DATA" to confirm:';
  
  const confirmation = prompt(confirmMessage);
  
  if (confirmation !== 'DELETE ALL DATA') {
    console.log('❌ Reset cancelled - confirmation failed');
    return;
  }
  
  console.log('✅ Confirmation received - starting reset...');
  console.log('');
  
  // Step 1: Delete Supabase data
  await deleteAllSupabaseData();
  console.log('');
  
  // Step 2: Sign out
  await signOutCurrentUser();
  console.log('');
  
  // Step 3: Clear browser storage
  clearAllBrowserStorage();
  console.log('');
  
  console.log('🗑️ ========================================');
  console.log('✅ COMPLETE RESET FINISHED!');
  console.log('🗑️ ========================================');
  console.log('');
  console.log('Reloading page in 3 seconds...');
  
  setTimeout(() => {
    window.location.href = '/';
  }, 3000);
}

/**
 * Quick reset for development
 * Use this from browser console:
 * 
 * import('./utils/resetDatabase').then(m => m.quickReset())
 */
export async function quickReset(): Promise<void> {
  clearAllBrowserStorage();
  await signOutCurrentUser();
  console.log('✅ Quick reset complete - page will reload');
  setTimeout(() => window.location.href = '/', 1000);
}

// Make functions available globally for console access
if (typeof window !== 'undefined') {
  (window as any).resetAllData = resetAllData;
  (window as any).quickReset = quickReset;
  (window as any).deleteAllSupabaseData = deleteAllSupabaseData;
  (window as any).clearAllBrowserStorage = clearAllBrowserStorage;
}
