import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

// Type definitions for MemoryBox
export interface UserProfile {
  id: string;
  email: string;
  phone?: string;
  name?: string;
  display_name?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  gender?: string;
  date_of_birth?: string;
  photo_url?: string;
  family_id?: string;
  family_name?: string;
  is_new_user?: boolean;
  isNewUser?: boolean;
  onboarding_completed?: boolean;
  marriage_date?: string;
  marriage_anniversary?: string;
  spouse_id?: string;
  activity_count?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface MediaFile {
  file: File | Blob;
  preview: string;
  type: 'photo' | 'video' | 'audio' | 'text';
  name: string;
  size?: number;
  compressed?: boolean;
}

export interface FamilyData {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  members?: string[];
  [key: string]: any;
}

export interface Memory {
  id: string;
  title: string;
  description?: string;
  type?: 'photo' | 'video' | 'voice' | 'audio' | 'text';
  file_url?: string; // Legacy: single file URL (kept for backward compatibility)
  thumbnail_url?: string; // Legacy: single thumbnail URL
  files?: MediaFile[]; // 🎬 NEW: Multi-media support
  created_at: string;
  updated_at?: string;
  uploaded_by?: string;
  family_id?: string;
  people_involved?: string[];
  person_tags?: string[]; // Alternative field name for people
  location?: string;
  tags?: string[];
  category?: string; // Old field name for memory category
  memory_type?: string; // New field name for memory category (from MemoryUploadPage)
  [key: string]: any;
}

// Singleton Supabase client to avoid multiple instances
// Use globalThis to persist across hot reloads (works in both browser and Node.js)
const SUPABASE_CLIENT_KEY = Symbol.for('memorybox.supabase.client');

type SupabaseClientType = ReturnType<typeof createClient>;

interface GlobalWithSupabase {
  [SUPABASE_CLIENT_KEY]?: SupabaseClientType;
}

// Use globalThis which works in both browser and Node.js environments
const globalWithSupabase = globalThis as unknown as GlobalWithSupabase;

export const getSupabaseClient = (): SupabaseClientType => {
  // Check if client already exists in global scope
  if (!globalWithSupabase[SUPABASE_CLIENT_KEY]) {
    console.log('🔧 Creating new Supabase client instance');
    globalWithSupabase[SUPABASE_CLIENT_KEY] = createClient(
      `https://${projectId}.supabase.co`,
      publicAnonKey,
      {
        auth: {
          // Use a consistent storage key to avoid multiple auth instances
          storageKey: 'memorybox-auth-token',
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        }
      }
    );
  } else {
    console.log('♻️ Reusing existing Supabase client instance');
  }
  return globalWithSupabase[SUPABASE_CLIENT_KEY]!;
};

// Default export
export default getSupabaseClient;

// Also export a function to check if client exists (for debugging)
export const hasSupabaseClient = (): boolean => {
  const globalStore = globalThis as unknown as GlobalWithSupabase;
  return !!globalStore[SUPABASE_CLIENT_KEY];
};