/**
 * Utility for refreshing expired Supabase Storage URLs in memory files
 * 
 * PROBLEM: Supabase Storage public URLs expire after a certain time, causing blank thumbnails
 * SOLUTION: Generate fresh URLs from storage_path when loading memories
 * 
 * @module memoryUrlRefresh
 */

import { getSupabaseClient } from './supabase/client';

/**
 * Refreshes file URLs for a single memory
 * Generates fresh public URLs from Supabase Storage for all files with storage_path
 * 
 * @param memory - Memory object with files array
 * @returns Memory object with refreshed file URLs
 */
export const refreshMemoryFileUrls = async (memory: any): Promise<any> => {
  // Skip if no files
  if (!memory.files || memory.files.length === 0) {
    return memory;
  }
  
  try {
    const supabase = getSupabaseClient();
    const bucket = 'make-2544f7d4-memory-files';
    
    const filesWithFreshUrls = await Promise.all(
      memory.files.map(async (file: any) => {
        // Skip files without storage_path (might be old format with direct URL)
        if (!file.storage_path) {
          return file;
        }
        
        try {
          // Get fresh public URL from storage path
          const { data } = supabase.storage
            .from(bucket)
            .getPublicUrl(file.storage_path);
          
          if (data?.publicUrl) {
            return {
              ...file,
              url: data.publicUrl // Refresh URL with timestamp
            };
          }
          
          return file; // Return original if refresh fails
        } catch (error) {
          console.warn(`⚠️ Could not refresh URL for file:`, file.name, error);
          return file; // Return original on error
        }
      })
    );
    
    return { ...memory, files: filesWithFreshUrls };
  } catch (error) {
    console.warn(`⚠️ Could not refresh file URLs for memory "${memory.title}":`, error);
    return memory; // Return original memory on error
  }
};

/**
 * Refreshes file URLs for an array of memories
 * Processes all memories in parallel for better performance
 * 
 * @param memories - Array of memory objects
 * @returns Array of memories with refreshed file URLs
 */
export const refreshAllMemoryFileUrls = async (memories: any[]): Promise<any[]> => {
  if (!memories || memories.length === 0) {
    return memories;
  }
  
  try {
    return await Promise.all(
      memories.map(memory => refreshMemoryFileUrls(memory))
    );
  } catch (error) {
    console.error('❌ Failed to refresh memory file URLs:', error);
    return memories; // Return original on error
  }
};
