import { getSupabaseClient } from './client';
import type { UserProfile, FamilyData } from './client';

/**
 * 🗄️ Supabase Storage Manager for Memory Files
 * Handles file uploads to Supabase Storage buckets with proper organization
 */

export interface UploadedFileMetadata {
  name: string;
  size: number;
  type: string;
  url: string;
  storage_path: string;
  compressed?: boolean;
  originalSize?: number;
}

export interface UploadProgressCallback {
  (progress: number, fileName: string): void;
}

/**
 * Upload a single file to Supabase Storage
 * @param file - The file to upload
 * @param user - Current user profile
 * @param family - Current family data
 * @param memoryId - Unique memory identifier
 * @param onProgress - Optional progress callback
 * @returns Metadata about the uploaded file
 */
export async function uploadMemoryFile(
  file: File | Blob,
  user: UserProfile,
  family: FamilyData | null,
  memoryId: string,
  onProgress?: UploadProgressCallback
): Promise<UploadedFileMetadata> {
  try {
    const supabase = getSupabaseClient();
    
    // Determine bucket based on file type
    const bucket = 'make-2544f7d4-memory-files'; // Main bucket for all memory files
    
    // Create organized path: family_id/user_id/memory_id/filename
    const familyId = user.family_id || family?.id || 'default';
    const fileName = file instanceof File ? file.name : `file_${Date.now()}.blob`;
    const fileExtension = fileName.split('.').pop() || 'bin';
    const timestamp = Date.now();
    const storagePath = `${familyId}/${user.id}/${memoryId}/${timestamp}_${fileName}`;
    
    console.log(`📤 Uploading file to Supabase Storage: ${storagePath}`);
    
    // Simulate progress (Supabase doesn't provide native upload progress)
    if (onProgress) {
      onProgress(10, fileName);
    }
    
    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'application/octet-stream'
      });
    
    if (error) {
      console.error('❌ Supabase upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }
    
    if (onProgress) {
      onProgress(90, fileName);
    }
    
    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(storagePath);
    
    if (onProgress) {
      onProgress(100, fileName);
    }
    
    console.log(`✅ File uploaded successfully: ${urlData.publicUrl}`);
    
    return {
      name: fileName,
      size: file.size,
      type: file.type || 'application/octet-stream',
      url: urlData.publicUrl,
      storage_path: storagePath,
      compressed: (file as any).compressed,
      originalSize: (file as any).originalSize
    };
    
  } catch (error: any) {
    console.error('❌ Error uploading file:', error);
    throw error;
  }
}

/**
 * Upload multiple files to Supabase Storage IN PARALLEL
 * @param files - Array of files to upload
 * @param user - Current user profile
 * @param family - Current family data
 * @param memoryId - Unique memory identifier
 * @param onProgress - Optional progress callback
 * @returns Array of uploaded file metadata
 */
export async function uploadMemoryFiles(
  files: (File | Blob)[],
  user: UserProfile,
  family: FamilyData | null,
  memoryId: string,
  onProgress?: UploadProgressCallback
): Promise<UploadedFileMetadata[]> {
  if (files.length === 0) return [];
  
  console.log(`🚀 Starting PARALLEL upload of ${files.length} files...`);
  
  // 🎯 OPTIMIZATION: Upload files in parallel with concurrency limit
  const CONCURRENT_UPLOADS = 3; // Upload 3 files at once
  const uploadedFiles: UploadedFileMetadata[] = [];
  let completedCount = 0;
  
  // Process files in batches to control concurrency
  for (let i = 0; i < files.length; i += CONCURRENT_UPLOADS) {
    const batch = files.slice(i, i + CONCURRENT_UPLOADS);
    const batchStartIndex = i;
    
    console.log(`📦 Uploading batch ${Math.floor(i / CONCURRENT_UPLOADS) + 1}/${Math.ceil(files.length / CONCURRENT_UPLOADS)} (${batch.length} files)...`);
    
    // Upload batch in parallel
    const batchPromises = batch.map(async (file, batchIndex) => {
      const globalIndex = batchStartIndex + batchIndex;
      const fileName = file instanceof File ? file.name : `file_${globalIndex}`;
      
      try {
        const metadata = await uploadMemoryFile(file, user, family, memoryId);
        
        // Update progress after each file completes
        completedCount++;
        if (onProgress) {
          const progress = Math.floor((completedCount / files.length) * 100);
          onProgress(progress, `${completedCount}/${files.length} files uploaded`);
        }
        
        console.log(`✅ [${completedCount}/${files.length}] Uploaded: ${fileName}`);
        return { success: true, metadata, fileName };
      } catch (error: any) {
        console.error(`❌ [${completedCount + 1}/${files.length}] Failed to upload ${fileName}:`, error);
        completedCount++;
        return { success: false, error, fileName };
      }
    });
    
    // Wait for batch to complete
    const batchResults = await Promise.all(batchPromises);
    
    // Collect successful uploads
    batchResults.forEach(result => {
      if (result.success && result.metadata) {
        uploadedFiles.push(result.metadata);
      }
    });
  }
  
  console.log(`🎉 Parallel upload complete: ${uploadedFiles.length}/${files.length} files uploaded successfully`);
  
  return uploadedFiles;
}

/**
 * Delete a file from Supabase Storage
 * @param storagePath - The storage path of the file to delete
 * @returns Success boolean
 */
export async function deleteMemoryFile(storagePath: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const bucket = 'make-2544f7d4-memory-files';
    
    console.log(`🗑️ Deleting file from Supabase Storage: ${storagePath}`);
    
    const { error } = await supabase.storage
      .from(bucket)
      .remove([storagePath]);
    
    if (error) {
      console.error('❌ Supabase delete error:', error);
      throw new Error(`Delete failed: ${error.message}`);
    }
    
    console.log(`✅ File deleted successfully: ${storagePath}`);
    return true;
    
  } catch (error: any) {
    console.error('❌ Error deleting file:', error);
    return false;
  }
}

/**
 * Delete multiple files from Supabase Storage
 * @param storagePaths - Array of storage paths to delete
 * @returns Number of successfully deleted files
 */
export async function deleteMemoryFiles(storagePaths: string[]): Promise<number> {
  try {
    const supabase = getSupabaseClient();
    const bucket = 'make-2544f7d4-memory-files';
    
    console.log(`🗑️ Deleting ${storagePaths.length} files from Supabase Storage`);
    
    const { error } = await supabase.storage
      .from(bucket)
      .remove(storagePaths);
    
    if (error) {
      console.error('❌ Supabase bulk delete error:', error);
      throw new Error(`Bulk delete failed: ${error.message}`);
    }
    
    console.log(`✅ ${storagePaths.length} files deleted successfully`);
    return storagePaths.length;
    
  } catch (error: any) {
    console.error('❌ Error deleting files:', error);
    return 0;
  }
}

/**
 * Get storage usage information for a user/family
 * @param userId - User ID
 * @param familyId - Family ID
 * @returns Storage usage information
 */
export async function getStorageUsage(userId: string, familyId: string): Promise<{
  fileCount: number;
  totalBytes: number;
  totalMB: string;
}> {
  try {
    const supabase = getSupabaseClient();
    const bucket = 'make-2544f7d4-memory-files';
    const basePath = `${familyId}/${userId}`;
    
    console.log(`📊 Checking storage usage for: ${basePath}`);
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(basePath, {
        limit: 1000,
        offset: 0
      });
    
    if (error) {
      console.error('❌ Error listing files:', error);
      return { fileCount: 0, totalBytes: 0, totalMB: '0.00' };
    }
    
    let totalBytes = 0;
    let fileCount = 0;
    
    if (data) {
      fileCount = data.length;
      totalBytes = data.reduce((sum, file) => sum + (file.metadata?.size || 0), 0);
    }
    
    const totalMB = (totalBytes / 1024 / 1024).toFixed(2);
    
    console.log(`📊 Storage usage: ${fileCount} files, ${totalMB}MB`);
    
    return {
      fileCount,
      totalBytes,
      totalMB
    };
    
  } catch (error: any) {
    console.error('❌ Error getting storage usage:', error);
    return { fileCount: 0, totalBytes: 0, totalMB: '0.00' };
  }
}

/**
 * Ensure the memories bucket exists and is properly configured
 * This should be called during app initialization or backend setup
 * 
 * NOTE: Frontend anon key may not have listBuckets permission.
 * Instead, we optimistically assume the bucket exists (created by backend)
 * and only warn if actual upload operations fail.
 */
export async function ensureMemoriesBucketExists(): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    
    // Try to list files in the bucket as a connectivity test
    // This works even with anon key if RLS policies are set up
    const { data, error } = await supabase.storage
      .from('make-2544f7d4-memory-files')
      .list('', { limit: 1 });
    
    if (error) {
      // Check if it's a "bucket not found" error
      if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
        console.warn('⚠️ Memory files bucket (make-2544f7d4-memory-files) not found.');
        console.warn('   Bucket should be created automatically by backend server.');
        console.warn('   If uploads fail, verify bucket exists in Supabase Dashboard.');
        return false;
      }
      
      // Other errors (like permission errors) are actually OK - bucket exists
      console.log('✅ Memory files bucket exists (make-2544f7d4-memory-files)');
      console.log('   Note: List permission denied is expected with anon key');
      return true;
    }
    
    // Successfully listed - bucket definitely exists
    console.log('✅ Memory files bucket verified (make-2544f7d4-memory-files)');
    return true;
    
  } catch (error: any) {
    // Assume bucket exists - backend should have created it
    console.log('ℹ️ Could not verify memory files bucket, assuming it exists');
    console.log('   Bucket: make-2544f7d4-memory-files');
    console.log('   Actual uploads will confirm bucket availability');
    return true; // Optimistic assumption
  }
}
