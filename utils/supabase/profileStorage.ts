import { getSupabaseClient } from './client';
import { compressImage, validateImageFile } from '../photoUpload';

/**
 * 📸 Profile Photo Storage Manager
 * Handles profile photo uploads to Supabase Storage to avoid localStorage quota issues
 * 
 * WHY THIS EXISTS:
 * - localStorage has a 5-10MB quota limit
 * - Base64 images inflate by ~33% (2MB photo = 2.7MB base64)
 * - Multiple photos quickly exceed quota causing QuotaExceededError
 * - Supabase Storage provides unlimited storage with proper URLs
 */

export interface ProfilePhotoMetadata {
  url: string;
  storage_path: string;
  size: number;
  width: number;
  height: number;
}

/**
 * Upload a profile photo to Supabase Storage
 * @param file - The image file to upload
 * @param personId - The family member's ID (can be root user or family member)
 * @param authenticatedUserId - The authenticated user's ID (for RLS policy)
 * @returns Metadata about the uploaded photo including public URL
 */
export async function uploadProfilePhoto(
  file: File,
  personId: string,
  authenticatedUserId: string
): Promise<ProfilePhotoMetadata> {
  try {
    // Validate file first
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    console.log('📸 Compressing profile photo before upload...');
    
    // Compress image to 800px max width, 85% quality
    const compressed = await compressImage(file, 800, 0.85);
    
    // If still too large (>500KB), compress more aggressively
    let finalDataUrl = compressed.dataUrl;
    let finalSize = compressed.size;
    
    if (compressed.size > 500 * 1024) {
      console.log('🗜️ Image still large, applying aggressive compression...');
      const recompressed = await compressImage(file, 600, 0.7);
      finalDataUrl = recompressed.dataUrl;
      finalSize = recompressed.size;
    }
    
    console.log(`✅ Compressed: ${file.size} bytes → ${Math.round(finalSize)} bytes (${Math.round((finalSize / file.size) * 100)}%)`);

    // Convert data URL to Blob for upload
    const blob = await (async () => {
      const base64Data = finalDataUrl.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      return new Blob([byteArray], { type: 'image/jpeg' });
    })();

    const supabase = getSupabaseClient();
    const bucket = 'make-2544f7d4-profile-photos';
    
    // 🔒 FIX: Store under authenticated user's folder to satisfy RLS policy
    // Path structure: {authenticatedUserId}/family/{personId}/{timestamp}.jpg
    // This allows the authenticated user to upload photos for all their family members
    const timestamp = Date.now();
    const fileExtension = 'jpg'; // Always save as JPG after compression
    const storagePath = `${authenticatedUserId}/family/${personId}/${timestamp}_profile.${fileExtension}`;
    
    console.log(`📤 Uploading to Supabase Storage: ${bucket}/${storagePath}`);
    console.log(`   Authenticated User ID: ${authenticatedUserId}`);
    console.log(`   Family Member ID: ${personId}`);
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(storagePath, blob, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/jpeg'
      });
    
    if (error) {
      console.error('❌ Supabase upload error:', error);
      
      // If bucket doesn't exist, provide helpful error
      if (error.message.includes('not found') || error.message.includes('does not exist')) {
        throw new Error(
          'Profile photos bucket not set up. The bucket "make-2544f7d4-profile-photos" should already exist in your Supabase Storage.'
        );
      }
      
      throw new Error(`Upload failed: ${error.message}`);
    }
    
    // 🔒 PRIVATE BUCKET: Use signed URL (valid for 1 year)
    // This is secure and works with private buckets
    const { data: urlData, error: urlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365); // 1 year expiry
    
    if (urlError || !urlData?.signedUrl) {
      console.error('❌ Failed to create signed URL:', urlError);
      throw new Error(`Failed to create signed URL: ${urlError?.message || 'Unknown error'}`);
    }
    
    console.log(`✅ Profile photo uploaded successfully with signed URL`);
    
    return {
      url: urlData.signedUrl,
      storage_path: storagePath,
      size: finalSize,
      width: compressed.width,
      height: compressed.height
    };
    
  } catch (error: any) {
    console.error('❌ Error uploading profile photo:', error);
    throw error;
  }
}

/**
 * Delete a profile photo from Supabase Storage
 * @param storagePath - The storage path of the photo to delete
 * @returns Success boolean
 */
export async function deleteProfilePhoto(storagePath: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const bucket = 'make-2544f7d4-profile-photos';
    
    console.log(`🗑️ Deleting profile photo: ${storagePath}`);
    
    const { error } = await supabase.storage
      .from(bucket)
      .remove([storagePath]);
    
    if (error) {
      console.error('❌ Delete error:', error);
      throw new Error(`Delete failed: ${error.message}`);
    }
    
    console.log(`✅ Profile photo deleted successfully`);
    return true;
    
  } catch (error: any) {
    console.error('❌ Error deleting profile photo:', error);
    return false;
  }
}

/**
 * FALLBACK MODE: Store compressed photo in localStorage (use only as last resort)
 * This compresses aggressively to fit within quota
 * 
 * @param file - The image file
 * @param userId - User ID
 * @returns Compressed data URL
 */
export async function storePhotoLocally(file: File, userId: string): Promise<string> {
  try {
    console.warn('⚠️ FALLBACK MODE: Storing photo in localStorage (Supabase unavailable)');
    
    // Validate file
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }
    
    // Compress VERY aggressively for localStorage (400px, 60% quality)
    const compressed = await compressImage(file, 400, 0.6);
    
    // Check if it fits (max 200KB for safety)
    if (compressed.size > 200 * 1024) {
      // Try even more aggressive compression
      const recompressed = await compressImage(file, 300, 0.5);
      if (recompressed.size > 200 * 1024) {
        throw new Error('Photo too large even after compression. Please use a smaller image.');
      }
      return recompressed.dataUrl;
    }
    
    console.log(`✅ Compressed for localStorage: ${Math.round(compressed.size / 1024)}KB`);
    return compressed.dataUrl;
    
  } catch (error: any) {
    console.error('❌ Error storing photo locally:', error);
    throw error;
  }
}

/**
 * Get a fresh signed URL for an existing photo
 * Use this to refresh expired URLs or load existing photos
 * @param storagePath - The storage path from ProfilePhotoMetadata
 * @returns Fresh signed URL (valid for 1 year)
 */
export async function getSignedPhotoUrl(storagePath: string): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    const bucket = 'make-2544f7d4-profile-photos';
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365); // 1 year expiry
    
    if (error || !data?.signedUrl) {
      console.error('❌ Failed to create signed URL:', error);
      return null;
    }
    
    return data.signedUrl;
  } catch (error: any) {
    console.error('❌ Error getting signed URL:', error);
    return null;
  }
}

/**
 * Check if a photo URL is a Supabase Storage URL (vs localStorage data URL)
 * @param url - The photo URL to check
 * @returns true if it's a Supabase Storage URL
 */
export function isSupabaseStorageUrl(url: string): boolean {
  return url.includes('supabase.co/storage/') || url.includes('supabase.co/object/');
}

/**
 * Refresh photo URL if it's a Supabase signed URL
 * This ensures photos always load even if the signed URL expired
 * @param currentUrl - The current photo URL
 * @param storagePath - The storage path from profile data
 * @returns Fresh URL (either refreshed signed URL or original if not needed)
 */
export async function refreshPhotoUrlIfNeeded(
  currentUrl: string | undefined,
  storagePath: string | undefined
): Promise<string | undefined> {
  // If no URL or no storage path, return as-is
  if (!currentUrl || !storagePath) {
    return currentUrl;
  }
  
  // If it's a localStorage data URL, no refresh needed
  if (currentUrl.startsWith('data:')) {
    return currentUrl;
  }
  
  // If it's a Supabase Storage URL, get a fresh signed URL
  if (isSupabaseStorageUrl(currentUrl)) {
    const freshUrl = await getSignedPhotoUrl(storagePath);
    return freshUrl || currentUrl; // Fall back to old URL if refresh fails
  }
  
  return currentUrl;
}

/**
 * Ensure the profile-photos bucket exists
 * Should be called during app initialization
 * 
 * NOTE: Frontend anon key may not have listBuckets permission.
 * Instead, we optimistically assume the bucket exists (created by backend)
 * and only warn if actual upload operations fail.
 */
export async function ensureProfilePhotosBucketExists(): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    
    // Try to list files in the bucket as a connectivity test
    const { data, error } = await supabase.storage
      .from('make-2544f7d4-profile-photos')
      .list('', { limit: 1 });
    
    if (error) {
      // Check if it's a "bucket not found" error
      if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
        console.warn('⚠️ Profile photos bucket (make-2544f7d4-profile-photos) not found.');
        console.warn('   Bucket should be created automatically by backend server.');
        console.warn('   If uploads fail, verify bucket exists in Supabase Dashboard.');
        return false;
      }
      
      // Other errors (like permission errors) are actually OK - bucket exists
      console.log('✅ Profile photos bucket exists (make-2544f7d4-profile-photos)');
      console.log('   Note: List permission denied is expected with anon key');
      return true;
    }
    
    // Successfully listed - bucket definitely exists
    console.log('✅ Profile photos bucket verified (make-2544f7d4-profile-photos)');
    return true;
    
  } catch (error: any) {
    // Assume bucket exists - backend should have created it
    console.log('ℹ️ Could not verify profile photos bucket, assuming it exists');
    console.log('   Bucket: make-2544f7d4-profile-photos');
    console.log('   Actual uploads will confirm bucket availability');
    return true; // Optimistic assumption
  }
}
