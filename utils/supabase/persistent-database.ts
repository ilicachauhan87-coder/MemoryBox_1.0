import { getSupabaseClient } from './client';
import { projectId } from './info';
import type { UserProfile, FamilyData } from './client';
import { normalizeNameFields, normalizeUserFromDatabase } from '../nameFieldNormalizer';

/**
 * Persistent Database Service
 * Uses Supabase for cross-device, cross-browser data persistence
 * Falls back to localStorage if Supabase is unavailable
 */
class PersistentDatabase {
  private supabase;
  private baseURL: string;
  private useSupabase: boolean = true;
  private isFigmaMakeEnvironment: boolean = false;
  
  constructor() {
    // Use singleton Supabase client to avoid multiple GoTrueClient instances
    this.supabase = getSupabaseClient();
    this.baseURL = `https://${projectId}.supabase.co/functions/v1/make-server-48a3bd07`;
    
    // Detect Figma Make environment
    this.isFigmaMakeEnvironment = this.detectFigmaMakeEnvironment();
    
    if (this.isFigmaMakeEnvironment) {
      console.log('🎨 MemoryBox: Running in Figma Make (Demo Mode)');
      console.log('📦 Using localStorage-only mode (Supabase unavailable)');
      console.log('ℹ️ To test with real database, deploy to production/Vercel');
    } else {
      console.log('🚀 MemoryBox: Database Service Initialized');
      console.log('💾 Supabase database integration active');
      console.log('✨ Data syncs across devices with localStorage fallback');
    }
  }
  
  /**
   * Detect if running in Figma Make environment
   * Figma Make blocks external network requests for security
   */
  private detectFigmaMakeEnvironment(): boolean {
    try {
      const url = window.location.href;
      const hostname = window.location.hostname;
      
      // Check for Figma Make specific URLs
      const isFigmaBlob = url.includes('blob:https://') && url.includes('figmaiframepreview.figma.site');
      const isFigmaDomain = hostname.includes('figma.com') || hostname.includes('figma.site');
      const hasFigmaPreview = url.includes('figmaiframepreview');
      
      return isFigmaBlob || hasFigmaPreview || (isFigmaDomain && url.includes('blob:'));
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Helper to check if error is a Figma Make fetch error
   */
  private isFigmaFetchError(error: any): boolean {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return (this.isFigmaMakeEnvironment || errorMsg.includes('Failed to fetch')) && 
           errorMsg.includes('TypeError');
  }
  
  /**
   * Helper to log Figma Make errors gracefully without alarming users
   */
  private logFigmaError(operation: string): void {
    if (this.isFigmaMakeEnvironment) {
      console.log(`🎨 Figma Make: ${operation} unavailable (demo mode) - using localStorage`);
    }
  }

  /**
   * Get current auth token
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      return session?.access_token || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate a valid UUID v4
   */
  private generateUUID(): string {
    // Use native crypto.randomUUID() if available (modern browsers)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    
    // Fallback: Generate UUID v4 manually
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * ✅ CRITICAL FIX: Validate UUID format
   * Returns false for demo users, invalid UUIDs, or non-UUID strings
   * This prevents "invalid input syntax for type uuid" errors
   */
  private isValidUUID(id: string | undefined | null): boolean {
    if (!id || typeof id !== 'string') return false;
    
    // Skip database operations for demo users
    if (id === 'demo-user' || id.startsWith('demo-')) {
      console.log('📦 Demo user detected - skipping database, using localStorage only');
      return false;
    }
    
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  /**
   * Fallback to localStorage
   */
  private getFromLocalStorage(key: string): any {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('❌ localStorage parse error:', error);
      return null;
    }
  }

  private saveToLocalStorage(key: string, data: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('❌ localStorage save error:', error);
      // If quota exceeded, try to clear old data
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('⚠️ localStorage quota exceeded - clearing old data');
        this.clearOldLocalStorageData();
        // Try one more time after clearing
        try {
          localStorage.setItem(key, JSON.stringify(data));
        } catch (retryError) {
          console.error('❌ localStorage save failed even after cleanup:', retryError);
        }
      }
    }
  }

  /**
   * Clear old localStorage data to free up space
   */
  private clearOldLocalStorageData(): void {
    try {
      const keysToRemove: string[] = [];
      
      // Find keys that look like old cached data
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.includes(':journals') ||
          key.includes(':home_visits') ||
          key.includes('JourneyProgress')
        )) {
          keysToRemove.push(key);
        }
      }
      
      // Remove old keys
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log('🗑️ Removed old localStorage key:', key);
      });
      
      console.log(`✅ Cleared ${keysToRemove.length} old localStorage items`);
    } catch (error) {
      console.error('❌ Failed to clear old localStorage data:', error);
    }
  }

  // ==================== AUTHENTICATION ====================

  async signUp(email: string, password: string, name: string, phone?: string): Promise<any> {
    try {
      console.log('📝 Creating account with Supabase Auth...');
      
      // 1. Create auth user
      const { data: authData, error: authError } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone
          }
        }
      });
      
      if (authError) throw authError;
      if (!authData.user) throw new Error('No user returned from signup');
      
      // 2. Create user profile in database (using 'users' table)
      const { data: profileData, error: profileError } = await this.supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: email,
          phone: phone || null,
          name: name,
          display_name: name,
          is_new_user: true,
          onboarding_completed: false,
          activity_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (profileError) {
        console.warn('⚠️ User profile creation warning:', profileError);
      }
      
      // 3. Sign in to get session
      const { data: signInData, error: signInError } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (signInError) throw signInError;
      
      const user = {
        id: authData.user.id,
        email: email,
        phone: phone,
        name: name,
        display_name: name,
        is_new_user: true,
        onboarding_completed: false,
        activity_count: 0,
        created_at: authData.user.created_at,
        updated_at: new Date().toISOString()
      };
      
      // Cache in localStorage
      this.saveToLocalStorage(`user:${user.id}:profile`, user);
      
      console.log('✅ Account created successfully');
      
      return {
        success: true,
        user: user,
        session: signInData.session
      };
      
    } catch (error) {
      console.error('❌ Signup error:', error);
      throw error;
    }
  }

  async signIn(email: string, password: string): Promise<any> {
    try {
      console.log('🔑 Signing in with Supabase Auth...');
      
      // 1. Authenticate
      const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (authError) throw authError;
      if (!authData.user) throw new Error('No user returned from signin');
      
      // 2. Load user profile from database (using 'users' table)
      const { data: profileData, error: profileError } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();
      
      let user: any;
      
      if (profileError || !profileData) {
        console.warn('⚠️ Profile not found in database, using auth data');
        // Fallback to localStorage
        user = this.getFromLocalStorage(`user:${authData.user.id}:profile`) || {
          id: authData.user.id,
          email: authData.user.email,
          created_at: authData.user.created_at
        };
      } else {
        // Use database profile
        user = {
          id: profileData.id,
          email: profileData.email,
          phone: profileData.phone,
          name: profileData.name,
          display_name: profileData.display_name,
          firstName: profileData.first_name,
          middleName: profileData.middle_name,
          lastName: profileData.last_name,
          gender: profileData.gender,
          date_of_birth: profileData.date_of_birth,
          photo_url: profileData.photo_url,
          family_id: profileData.family_id,
          family_name: profileData.family_name,
          is_new_user: profileData.is_new_user,
          onboarding_completed: profileData.onboarding_completed,
          marriage_date: profileData.marriage_date,
          marriage_anniversary: profileData.marriage_anniversary,
          spouse_id: profileData.spouse_id,
          activity_count: profileData.activity_count,
          created_at: profileData.created_at,
          updated_at: profileData.updated_at
        };
        
        // Cache in localStorage
        this.saveToLocalStorage(`user:${user.id}:profile`, user);
      }
      
      console.log('✅ Signed in successfully');
      
      return {
        success: true,
        user: user,
        session: authData.session
      };
      
    } catch (error) {
      console.error('❌ Sign in error:', error);
      throw error;
    }
  }

  async signOut(): Promise<{ success: boolean }> {
    try {
      await this.supabase.auth.signOut();
      console.log('✅ Signed out successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Sign out error:', error);
      return { success: false };
    }
  }

  async getSession(): Promise<{ user: UserProfile | null; session: any }> {
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      
      if (!session) {
        return { user: null, session: null };
      }
      
      // Try to load user profile from database (using 'users' table)
      const { data: profileData, error: profileError } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      let user: any;
      
      if (profileError || !profileData) {
        // Fallback to localStorage
        user = this.getFromLocalStorage(`user:${session.user.id}:profile`) || session.user;
      } else {
        user = {
          id: profileData.id,
          email: profileData.email,
          phone: profileData.phone,
          name: profileData.name,
          display_name: profileData.display_name,
          firstName: profileData.first_name,
          middleName: profileData.middle_name,
          lastName: profileData.last_name,
          gender: profileData.gender,
          date_of_birth: profileData.date_of_birth,
          photo_url: profileData.photo_url,
          family_id: profileData.family_id,
          family_name: profileData.family_name,
          is_new_user: profileData.is_new_user,
          onboarding_completed: profileData.onboarding_completed,
          marriage_date: profileData.marriage_date,
          marriage_anniversary: profileData.marriage_anniversary,
          spouse_id: profileData.spouse_id,
          activity_count: profileData.activity_count,
          created_at: profileData.created_at,
          updated_at: profileData.updated_at
        };
      }
      
      return {
        user: user,
        session: session
      };
      
    } catch (error) {
      console.error('❌ Get session error:', error);
      return { user: null, session: null };
    }
  }

  // ==================== USER PROFILE ====================

  async createUserProfile(userId: string, profileData: Partial<UserProfile>): Promise<UserProfile> {
    try {
      console.log('📝 Creating user profile in database...');
      
      const { data, error } = await this.supabase
        .from('users')
        .insert({
          id: userId,
          email: profileData.email,
          phone: profileData.phone || null,
          name: profileData.name,
          display_name: profileData.display_name || profileData.name,
          first_name: profileData.firstName,
          middle_name: profileData.middleName,
          last_name: profileData.lastName,
          gender: profileData.gender,
          date_of_birth: profileData.date_of_birth,
          photo_url: profileData.photo_url,
          family_id: profileData.family_id,
          family_name: profileData.family_name,
          is_new_user: profileData.is_new_user ?? true,
          onboarding_completed: profileData.onboarding_completed ?? false,
          activity_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const profile = this.mapDbProfileToUser(data);
      
      // Cache in localStorage
      this.saveToLocalStorage(`user:${userId}:profile`, profile);
      
      console.log('✅ Profile created in database');
      return profile;
      
    } catch (error) {
      console.warn('⚠️ Database create failed, using localStorage:', error);
      
      // Fallback to localStorage
      const profile = {
        id: userId,
        ...profileData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.saveToLocalStorage(`user:${userId}:profile`, profile);
      
      return profile as UserProfile;
    }
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    // ✅ CRITICAL FIX: Skip database for invalid UUIDs (including demo users)
    if (!this.isValidUUID(userId)) {
      console.log('📦 Invalid/demo user ID - using localStorage only');
      return this.getFromLocalStorage(`user:${userId}:profile`);
    }
    
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) throw error;
      
      // If no data found in database, fallback to localStorage
      if (!data) {
        console.log('⚠️ No profile found in database, using localStorage');
        return this.getFromLocalStorage(`user:${userId}:profile`);
      }
      
      // ✅ MIGRATION FIX: If database has name but missing first_name/last_name, update database
      if (data.name && (!data.first_name || !data.last_name)) {
        console.log('🔧 DATABASE MIGRATION: Detected missing first_name/last_name, updating database');
        const normalized = normalizeNameFields(data);
        
        // Update database with parsed name fields
        try {
          await this.supabase
            .from('users')
            .update({
              first_name: normalized.first_name,
              middle_name: normalized.middle_name,
              last_name: normalized.last_name,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);
          
          console.log('✅ Database updated with parsed name fields:', {
            first_name: normalized.first_name,
            last_name: normalized.last_name
          });
          
          // Update the data object so mapDbProfileToUser gets the new values
          data.first_name = normalized.first_name;
          data.middle_name = normalized.middle_name;
          data.last_name = normalized.last_name;
        } catch (updateError) {
          console.warn('⚠️ Failed to update database with parsed names:', updateError);
          // Non-fatal - continue with normalized data in memory
        }
      }
      
      const profile = this.mapDbProfileToUser(data);
      
      // Cache in localStorage
      this.saveToLocalStorage(`user:${userId}:profile`, profile);
      
      return profile;
      
    } catch (error) {
      if (this.isFigmaFetchError(error)) {
        this.logFigmaError('User profile fetch');
      } else {
        console.warn('⚠️ Database read failed, using localStorage:', error);
      }
      // Fallback to localStorage
      return this.getFromLocalStorage(`user:${userId}:profile`);
    }
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    // ✅ CRITICAL FIX: Skip database for invalid UUIDs (including demo users)
    if (!this.isValidUUID(userId)) {
      console.log('📦 Invalid/demo user ID - updating localStorage only');
      const existingProfile = this.getFromLocalStorage(`user:${userId}:profile`);
      const updatedProfile = {
        ...existingProfile,
        ...updates,
        updated_at: new Date().toISOString()
      };
      this.saveToLocalStorage(`user:${userId}:profile`, updatedProfile);
      return updatedProfile;
    }
    
    try {
      console.log('💾 Updating user profile in database...');
      
      // 🔧 DATABASE-FIRST FIX: Include ALL profile fields for complete sync
      const { data, error } = await this.supabase
        .from('users')
        .update({
          email: updates.email,
          phone: updates.phone,
          name: updates.name,
          display_name: updates.display_name,
          first_name: updates.firstName,
          middle_name: updates.middleName,
          last_name: updates.lastName,
          maiden_name: (updates as any).maidenName || (updates as any).maiden_name,
          gender: updates.gender,
          status: (updates as any).status || 'Living',
          date_of_birth: updates.date_of_birth || (updates as any).dateOfBirth,
          place_of_birth: (updates as any).place_of_birth || (updates as any).placeOfBirth || (updates as any).birthPlace,
          death_date: (updates as any).death_date || (updates as any).deathDate,
          death_place: (updates as any).death_place || (updates as any).deathPlace,
          bio: (updates as any).bio,
          location: (updates as any).location,
          photo_url: updates.photo_url || (updates as any).photo,
          photo_storage_path: (updates as any).photo_storage_path,
          family_id: updates.family_id,
          family_name: updates.family_name,
          is_new_user: updates.is_new_user,
          onboarding_completed: updates.onboarding_completed,
          marriage_date: updates.marriage_date,
          marriage_anniversary: updates.marriage_anniversary,
          spouse_id: updates.spouse_id,
          activity_count: updates.activity_count,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();
      
      if (error) throw error;
      
      const profile = this.mapDbProfileToUser(data);
      
      // Update localStorage cache
      this.saveToLocalStorage(`user:${userId}:profile`, profile);
      
      console.log('✅ Profile updated in database');
      return profile;
      
    } catch (error) {
      // ❌ DATABASE-FIRST: Do NOT fallback to localStorage
      // Database is the source of truth - if it fails, the operation fails
      console.error('❌ Database update FAILED - database-first mode cannot continue:', error);
      throw new Error(`Failed to update profile in database: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ==================== FAMILY DATA ====================

  async createFamily(familyData: { name: string; created_by: string }): Promise<FamilyData> {
    try {
      console.log('📝 Creating family in database...');
      
      const { data, error } = await this.supabase
        .from('families')
        .insert({
          name: familyData.name,
          created_by: familyData.created_by,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const family = {
        id: data.id,
        name: data.name,
        created_by: data.created_by,
        description: data.description,
        family_photo_url: data.family_photo_url,
        privacy_level: data.privacy_level,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
      
      // Cache in localStorage
      this.saveToLocalStorage(`family:${family.id}:data`, family);
      
      console.log('✅ Family created in database');
      return family;
      
    } catch (error) {
      console.warn('⚠️ Database create failed, using localStorage:', error);
      
      // Fallback to localStorage - use proper UUID
      const familyId = this.generateUUID();
      const family = {
        id: familyId,
        ...familyData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.saveToLocalStorage(`family:${family.id}:data`, family);
      
      console.log('💾 Family created in localStorage with UUID:', familyId);
      return family as FamilyData;
    }
  }

  async getFamily(familyId: string): Promise<FamilyData | null> {
    // ✅ CRITICAL FIX: Skip database for invalid UUIDs (including demo families)
    if (!this.isValidUUID(familyId)) {
      console.log('📦 Invalid/demo family ID - using localStorage only');
      return this.getFromLocalStorage(`family:${familyId}:data`);
    }
    
    try {
      const { data, error } = await this.supabase
        .from('families')
        .select('*')
        .eq('id', familyId)
        .maybeSingle();
      
      if (error) throw error;
      
      // If no data found in database, fallback to localStorage
      if (!data) {
        console.log('⚠️ No family found in database, using localStorage');
        return this.getFromLocalStorage(`family:${familyId}:data`);
      }
      
      const family = {
        id: data.id,
        name: data.name,
        created_by: data.created_by,
        description: data.description,
        family_photo_url: data.family_photo_url,
        privacy_level: data.privacy_level,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
      
      // Cache in localStorage
      this.saveToLocalStorage(`family:${familyId}:data`, family);
      
      return family;
      
    } catch (error) {
      if (this.isFigmaFetchError(error)) {
        this.logFigmaError('Family data fetch');
      } else {
        console.warn('⚠️ Database read failed, using localStorage:', error);
      }
      // Fallback to localStorage
      return this.getFromLocalStorage(`family:${familyId}:data`);
    }
  }

  // ==================== FAMILY TREE ====================

  async getFamilyTree(familyId: string): Promise<any> {
    // ✅ CRITICAL FIX: Skip database for invalid UUIDs (including demo families)
    if (!this.isValidUUID(familyId)) {
      console.log('📦 Invalid/demo family ID - using localStorage only');
      return this.getFromLocalStorage(`familyTree_${familyId}`) || { people: [], relationships: [] };
    }
    
    try {
      // 🔧 CRITICAL FIX: Load from localStorage FIRST to check if we have good data
      const localTree = this.getFromLocalStorage(`familyTree_${familyId}`);
      const localPeople = Array.isArray(localTree) ? localTree : localTree?.people || [];
      
      console.log('🔍 Loading family tree from database:', {
        familyId,
        localPeopleCount: localPeople.length,
        hasLocalData: !!localTree
      });
      
      // Load family tree from single 'family_trees' table
      const { data, error } = await this.supabase
        .from('family_trees')
        .select('tree_data')
        .eq('family_id', familyId)
        .maybeSingle();
      
      if (error) {
        console.error('❌ Database read error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      
      // If no data found in database, fallback to localStorage
      if (!data) {
        console.log('⚠️ No family tree found in database (query returned null):', {
          familyId,
          fallingBackToLocalStorage: true,
          localPeopleCount: localPeople.length
        });
        return localTree || { people: [], relationships: [] };
      }
      
      // tree_data is a JSONB column containing the entire tree structure
      const tree = data.tree_data;
      const dbPeople = Array.isArray(tree) ? tree : tree?.people || [];
      
      console.log('✅ Database query returned data:', {
        familyId,
        dbPeopleCount: dbPeople.length,
        localPeopleCount: localPeople.length,
        isArray: Array.isArray(tree),
        hasRelationships: !Array.isArray(tree) && Array.isArray(tree?.relationships)
      });
      
      // 🔧 AUTO-FIX: If database is empty but localStorage has data, restore from localStorage
      // This fixes cases where database save failed but localStorage succeeded
      // Skip auto-restore in Figma Make environment
      if (dbPeople.length === 0 && localPeople.length > 0 && !this.isFigmaMakeEnvironment) {
        console.warn('⚠️ [AUTO-FIX] Database has 0 people but localStorage has', localPeople.length, 'people');
        console.warn('   🔧 Auto-restoring from localStorage to database...');
        
        // Restore data to database in background (don't block the UI)
        this.saveFamilyTree(familyId, localTree, { retries: 3, showToast: false })
          .then(() => {
            console.log('✅ [AUTO-FIX] Successfully restored', localPeople.length, 'people to database!');
          })
          .catch((restoreError) => {
            console.error('❌ [AUTO-FIX] Failed to restore data to database:', restoreError);
            console.error('   Data is safe in localStorage, but manual fix may be needed');
          });
        
        // Return localStorage data immediately (don't wait for database restore)
        return localTree;
      }
      
      // Database has more recent data (or localStorage is empty) - use database
      // Cache in localStorage only if database has data
      if (dbPeople.length > 0) {
        this.saveToLocalStorage(`familyTree_${familyId}`, tree);
        console.log('   ✅ Database tree cached to localStorage (', dbPeople.length, 'people)');
      }
      
      return tree;
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // 🎨 FIGMA MAKE: Show friendly message instead of error
      if (this.isFigmaMakeEnvironment && errorMsg.includes('Failed to fetch')) {
        console.log('🎨 Figma Make: Network blocked (expected) - using localStorage');
        return this.getFromLocalStorage(`familyTree_${familyId}`) || { people: [], relationships: [] };
      }
      
      console.error('❌ Database read FAILED:', {
        familyId,
        error: errorMsg
      });
      // Fallback to localStorage
      return this.getFromLocalStorage(`familyTree_${familyId}`) || { people: [], relationships: [] };
    }
  }

  async saveFamilyTree(familyId: string, tree: any, options = { retries: 3, showToast: true }): Promise<void> {
    // 🔍 LOG EVERY SAVE ATTEMPT with timestamp
    const timestamp = new Date().toISOString();
    const peopleCount = Array.isArray(tree) ? tree.length : (tree?.people?.length || 0);
    console.log(`🔍 [${timestamp}] saveFamilyTree called:`, {
      familyId: familyId.substring(0, 8) + '...',
      peopleCount,
      caller: new Error().stack?.split('\n')[2]?.trim()
    });
    
    // 🎨 FIGMA MAKE: Skip database in Figma Make environment
    if (this.isFigmaMakeEnvironment) {
      console.log('🎨 Figma Make detected - saving to localStorage only (demo mode)');
      this.saveToLocalStorage(`familyTree_${familyId}`, tree);
      return;
    }
    
    // ✅ CRITICAL FIX: Skip database for invalid UUIDs (including demo families)
    if (!this.isValidUUID(familyId)) {
      console.log('📦 Invalid/demo family ID - saving to localStorage only');
      this.saveToLocalStorage(`familyTree_${familyId}`, tree);
      return;
    }
    
    let lastError: any;
    
    // 🔧 RETRY LOGIC: Try up to 3 times with exponential backoff
    for (let attempt = 1; attempt <= options.retries; attempt++) {
      try {
        console.log(`💾 Attempt ${attempt}/${options.retries}: Saving tree to database...`);
        
        // 🔍 DIAGNOSTIC: Log what we're about to save
        const peopleCount = Array.isArray(tree) ? tree.length : (tree?.people?.length || 0);
        console.log(`🔍 [SAVE DEBUG] Received tree data:`, {
          isArray: Array.isArray(tree),
          peopleCount,
          hasRelationships: tree?.relationships ? true : false,
          relationshipsCount: tree?.relationships?.length || 0,
          firstPersonName: Array.isArray(tree) ? tree[0]?.name : tree?.people?.[0]?.name
        });
        
        // 🔒 SAFEGUARD: Prevent empty tree saves (BLOCK ALL EMPTY SAVES!)
        if (peopleCount === 0) {
          console.error('🚨 [CRITICAL] Attempting to save EMPTY tree to database!');
          console.error('   This will OVERWRITE existing data!');
          console.error('   Tree structure:', JSON.stringify(tree, null, 2));
          console.error('   Called from:');
          console.trace('Stack trace:');
          
          // 🚫 ALWAYS BLOCK empty saves - there's NO valid reason to save empty tree
          // If user wants to delete all members, they should delete the family account instead
          console.error('❌ [BLOCKED] Refusing to save empty tree - data loss prevention!');
          console.error('   If you see this, there\'s a bug in the component calling saveFamilyTree');
          
          // Don't throw error - just refuse silently to avoid breaking UI
          // But log enough info to debug
          return;
        }
        
        // Normalize tree format (handle both array and object formats)
        let treeData = tree;
        if (Array.isArray(tree)) {
          // Convert old array format to new object format
          treeData = {
            people: tree,
            relationships: [],
            rootUserId: '',
            generationLimits: {}
          };
        }
        
        // Extract people count for logging
        const peopleArray = Array.isArray(treeData) ? treeData : (treeData?.people || []);
        
        // Upsert family tree (stores entire tree as JSONB in tree_data column)
        const { data, error } = await this.supabase
          .from('family_trees')
          .upsert({
            family_id: familyId,
            tree_data: treeData,
            updated_at: new Date().toISOString()
          }, { 
            onConflict: 'family_id' 
          })
          .select();
        
        if (error) throw error;
        
        // ✅ SUCCESS!
        console.log(`✅ Attempt ${attempt}: Tree saved to database successfully!`, {
          familyId,
          peopleCount: peopleArray.length,
          rowsAffected: data?.length || 0
        });
        
        // Cache in localStorage
        this.saveToLocalStorage(`familyTree_${familyId}`, tree);
        
        // Show success toast
        if (options.showToast) {
          import('sonner@2.0.3').then(({ toast }) => {
            if (attempt > 1) {
              // Show retry success
              toast.success(`✅ Synced to cloud after ${attempt} attempts!`);
            } else {
              // First attempt success - show confirmation once per session
              if (!sessionStorage.getItem('tree_sync_confirmed_session')) {
                toast.success('✅ Family tree synced to cloud!', { duration: 2000 });
                sessionStorage.setItem('tree_sync_confirmed_session', 'true');
              }
            }
          });
        }
        
        return; // Success - exit function
        
      } catch (error) {
        lastError = error;
        console.error(`❌ Attempt ${attempt} failed:`, error);
        
        // If not the last attempt, wait before retry (exponential backoff: 2s, 4s, 8s)
        if (attempt < options.retries) {
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // ❌ ALL RETRIES FAILED - This is a real error!
    console.error(`❌ All ${options.retries} attempts failed to save family tree!`);
    
    // Show error to user with retry option
    if (options.showToast) {
      import('sonner@2.0.3').then(({ toast }) => {
        toast.error('❌ Cannot sync to cloud', {
          duration: 10000,
          description: 'Please check your internet connection and try again.',
          action: {
            label: 'Retry Now',
            onClick: () => {
              // Manually retry
              this.saveFamilyTree(familyId, tree, { retries: 3, showToast: true });
            }
          }
        });
      });
    }
    
    // Track error for debugging
    import('../errorMonitoring').then(({ errorMonitoring }) => {
      errorMonitoring.logError('FamilyTreeSaveFailedAfterRetries', lastError, {
        familyId,
        peopleCount: tree.people?.length || 0,
        retriesAttempted: options.retries
      });
    }).catch(() => {
      console.warn('⚠️ Could not log error to monitoring service');
    });
    
    // ❌ DATABASE-FIRST: DO NOT save to localStorage if database fails!
    // This ensures user knows data is not persisted and can retry
    // Don't give false sense of security
    
    // Throw error to let caller know save failed
    throw new Error(`Failed to save family tree after ${options.retries} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
  }

  // ==================== MEMORIES ====================

  async getFamilyMemories(familyId: string, limit?: number): Promise<any[]> {
    console.log(`🔍 DatabaseService.getFamilyMemories called:`, {
      familyId,
      limit,
      isValidUUID: this.isValidUUID(familyId)
    });
    
    // ✅ CRITICAL FIX: Skip database for invalid UUIDs (including demo families)
    if (!this.isValidUUID(familyId)) {
      console.log(`📦 DatabaseService: Invalid/demo family ID "${familyId}" - using localStorage only`);
      const memories = this.getFromLocalStorage(`family:${familyId}:memories`) || [];
      console.log(`📦 DatabaseService: Found ${memories.length} memories in localStorage for family ${familyId}`);
      if (limit && limit > 0) {
        return memories.slice(0, limit);
      }
      return memories;
    }
    
    try {
      console.log(`🔍 DatabaseService: Querying Supabase 'memories' table for family_id: ${familyId}`);
      let query = this.supabase
        .from('memories')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });
      
      if (limit && limit > 0) {
        query = query.limit(limit);
      }
      
      const { data, error } = await query;
      
      if (error) {
        // 🎨 FIGMA MAKE: Suppress fetch errors in demo environment
        if (this.isFigmaFetchError(error)) {
          this.logFigmaError('Memories query');
          throw error; // Still throw to trigger localStorage fallback
        }
        console.error(`❌ DatabaseService: Supabase query error:`, error);
        throw error;
      }
      
      console.log(`✅ DatabaseService: Supabase returned ${data?.length || 0} memories for family ${familyId}`);
      
      const memories = (data || []).map((memory: any) => {
        // 🔍 DEBUG: Log what's in the raw database data
        if (memory.files && memory.files.length > 0) {
          console.log(`🔍 Database memory "${memory.title}" files:`, {
            filesCount: memory.files.length,
            firstFileType: memory.files[0]?.type,
            firstFileHasUrl: !!memory.files[0]?.url,
            firstFileUrl: memory.files[0]?.url ? memory.files[0].url.substring(0, 60) + '...' : 'MISSING',
            fullFiles: memory.files
          });
        } else {
          console.log(`⚠️ Database memory "${memory.title}" has no files array!`, {
            hasFileUrl: !!memory.file_url,
            file_url: memory.file_url,
            rawMemory: memory
          });
        }
        
        return {
          id: memory.id,
          title: memory.title,
          description: memory.description,
          memory_type: memory.memory_type,
          file_url: memory.file_url,
          thumbnail_url: memory.thumbnail_url,
          file_size: memory.file_size,
          duration: memory.duration,
          memory_date: memory.memory_date,
          location: memory.location,
          tags: memory.tags || [],
          people_ids: memory.people_ids || [],
          visibility: memory.visibility,
          is_pinned: memory.is_pinned,
          created_by: memory.created_by,
          // 🎬 CRITICAL FIX: Include files array when loading from database
          files: memory.files || [],
          // 🎯 JOURNEY FIX: Include journeyType for filtering
          journeyType: memory.journey_type || null,
          journey_type: memory.journey_type || null,
          // 🔥 PREGNANCY FIX: Include child_id for pregnancy journey editing
          child_id: memory.child_id || null,
          milestone_id: memory.milestone_id || null,
          milestone_title: memory.milestone_title || null,
          // Additional fields for compatibility
          people_involved: memory.people_involved || [],
          is_private: memory.is_private || false,
          emotionTags: memory.emotion_tags || [],
          type: memory.memory_type, // Alias for backward compatibility
          date: memory.memory_date,
          created_at: memory.created_at,
          updated_at: memory.updated_at
        };
      });
      
      // ✅ DATABASE-FIRST: No localStorage caching - database is source of truth
      // Removed localStorage caching to prevent page hangs from JSON.stringify on large base64 data
      
      return memories;
      
    } catch (error) {
      if (this.isFigmaFetchError(error)) {
        this.logFigmaError('Memories fetch');
      } else {
        console.warn('⚠️ Database read failed, using localStorage:', error);
      }
      // Fallback to localStorage
      const memories = this.getFromLocalStorage(`family:${familyId}:memories`) || [];
      
      if (limit && limit > 0) {
        return memories.slice(0, limit);
      }
      
      return memories;
    }
  }

  async addMemory(familyId: string, memoryData: any): Promise<any> {
    // ✅ CRITICAL FIX: Skip database for invalid UUIDs (including demo families)
    if (!this.isValidUUID(familyId)) {
      console.log('📦 Invalid/demo family ID - saving to localStorage only');
      const memoryId = this.generateUUID();
      const newMemory = {
        id: memoryId,
        ...memoryData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const memories = this.getFromLocalStorage(`family:${familyId}:memories`) || [];
      memories.push(newMemory);
      this.saveToLocalStorage(`family:${familyId}:memories`, memories);
      
      // Dispatch event to notify VaultPage to reload
      window.dispatchEvent(new CustomEvent('memoryAdded', { 
        detail: { memoryId: memoryId, familyId: familyId, memory: newMemory } 
      }));
      
      return {
        success: true,
        memory: newMemory
      };
    }
    
    try {
      console.log('💾 Saving memory to database...');
      
      // 🔍 DEBUG: Log the files array being saved
      if (memoryData.files && memoryData.files.length > 0) {
        console.log(`🔍 Saving ${memoryData.files.length} files to database:`, {
          firstFile: {
            name: memoryData.files[0].name,
            type: memoryData.files[0].type,
            hasUrl: !!memoryData.files[0].url,
            url: memoryData.files[0].url ? memoryData.files[0].url.substring(0, 60) + '...' : 'MISSING',
            size: memoryData.files[0].size
          },
          allFiles: memoryData.files
        });
      } else {
        console.warn('⚠️ No files array in memoryData!', memoryData);
      }
      
      // ✅ FIX: Validate and normalize memory_type to match database constraint
      const rawType = memoryData.memory_type || memoryData.type || 'photo';
      const validTypes = ['photo', 'video', 'audio', 'voice_note', 'text'];
      let normalizedType = rawType.toLowerCase();
      
      // Handle common variations
      if (normalizedType === 'voice-note' || normalizedType === 'voice') {
        normalizedType = 'voice_note';
      }
      
      // Ensure it's a valid type
      if (!validTypes.includes(normalizedType)) {
        console.warn(`⚠️ Invalid memory_type: ${rawType}, defaulting to 'photo'`);
        normalizedType = 'photo';
      }
      
      console.log(`✅ Memory type normalized: ${rawType} → ${normalizedType}`);
      
      const { data, error } = await this.supabase
        .from('memories')
        .insert({
          family_id: familyId,
          title: memoryData.title,
          description: memoryData.description,
          memory_type: normalizedType,
          file_url: memoryData.file_url || memoryData.url,
          thumbnail_url: memoryData.thumbnail_url || memoryData.thumbnailUrl,
          file_size: memoryData.file_size,
          duration: memoryData.duration,
          memory_date: memoryData.memory_date || memoryData.date,
          location: memoryData.location,
          tags: memoryData.tags || [],
          people_ids: memoryData.people_ids || memoryData.peopleIds || [],
          visibility: memoryData.visibility || 'family',
          is_pinned: memoryData.is_pinned || false,
          created_by: memoryData.created_by || memoryData.createdBy,
          // 🎬 CRITICAL FIX: Save files array for multimedia support
          files: memoryData.files || [],
          // 🎯 JOURNEY FIX: Save journeyType for filtering
          journey_type: memoryData.journeyType || memoryData.journey_type || null,
          // 👶 PREGNANCY FIX: Save child_id for pregnancy memories
          child_id: memoryData.childId || memoryData.child_id || null,
          // Additional fields for compatibility
          people_involved: memoryData.people_involved || [],
          is_private: memoryData.is_private || false,
          emotion_tags: memoryData.emotionTags || memoryData.emotion_tags || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const memory = {
        id: data.id,
        title: data.title,
        description: data.description,
        memory_type: data.memory_type,
        file_url: data.file_url,
        thumbnail_url: data.thumbnail_url,
        file_size: data.file_size,
        duration: data.duration,
        memory_date: data.memory_date,
        location: data.location,
        tags: data.tags,
        people_ids: data.people_ids,
        visibility: data.visibility,
        is_pinned: data.is_pinned,
        created_by: data.created_by,
        // 🎬 CRITICAL FIX: Include files array from database
        files: data.files || [],
        // 🎯 JOURNEY FIX: Include journeyType for filtering
        journeyType: data.journey_type || null,
        journey_type: data.journey_type || null,
        // Additional fields for compatibility
        people_involved: data.people_involved || [],
        is_private: data.is_private || false,
        emotionTags: data.emotion_tags || [],
        type: data.memory_type, // Alias for backward compatibility
        date: data.memory_date,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
      
      // ✅ DATABASE-FIRST: No localStorage caching - prevents page hang from JSON.stringify on large base64 data
      // VaultPage will load fresh data from database using DatabaseService.getFamilyMemories()
      
      // 🎉 Dispatch event to notify VaultPage to reload
      window.dispatchEvent(new CustomEvent('memoryAdded', { 
        detail: { memoryId: memory.id, familyId: familyId, memory: memory } 
      }));
      console.log('📡 Dispatched memoryAdded event');
      
      console.log('✅ Memory saved to database');
      
      return {
        success: true,
        memory: memory
      };
      
    } catch (error) {
      console.error('❌ Database save failed - DATABASE-FIRST mode, no localStorage fallback:', error);
      
      // ✅ DATABASE-FIRST: Don't fall back to localStorage
      // This prevents page hangs and ensures data consistency
      // If database fails, user should see error and retry
      
      return {
        success: false,
        error: error,
        message: 'Failed to save memory to database. Please check your internet connection and try again.'
      };
    }
  }

  async deleteMemory(familyId: string, memoryId: string): Promise<any> {
    try {
      const { error } = await this.supabase
        .from('memories')
        .delete()
        .eq('id', memoryId);
      
      if (error) throw error;
      
      // ✅ DATABASE-FIRST: No localStorage caching - prevents page hang
      // VaultPage will reload from database when needed
      
      console.log('✅ Memory deleted from database');
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ Database delete failed - DATABASE-FIRST mode, no localStorage fallback:', error);
      
      // ✅ DATABASE-FIRST: Don't fall back to localStorage
      
      return { 
        success: false,
        error: error,
        message: 'Failed to delete memory from database. Please check your internet connection and try again.'
      };
    }
  }

  async updateMemory(familyId: string, memoryId: string, memoryData: any): Promise<any> {
    try {
      console.log(`💾 Updating memory ${memoryId} in database...`);
      
      // ✅ FIX: Validate and normalize memory_type to match database constraint
      const rawType = memoryData.memory_type || memoryData.type || 'photo';
      const validTypes = ['photo', 'video', 'audio', 'voice_note', 'text'];
      let normalizedType = rawType.toLowerCase();
      
      // Handle common variations
      if (normalizedType === 'voice-note' || normalizedType === 'voice') {
        normalizedType = 'voice_note';
      }
      
      // Ensure it's a valid type
      if (!validTypes.includes(normalizedType)) {
        console.warn(`⚠️ Invalid memory_type: ${rawType}, defaulting to 'photo'`);
        normalizedType = 'photo';
      }
      
      console.log(`✅ Memory type normalized: ${rawType} → ${normalizedType}`);
      
      const { data, error } = await this.supabase
        .from('memories')
        .update({
          title: memoryData.title,
          description: memoryData.description,
          memory_type: normalizedType,
          file_url: memoryData.file_url || memoryData.url,
          thumbnail_url: memoryData.thumbnail_url || memoryData.thumbnailUrl,
          file_size: memoryData.file_size,
          duration: memoryData.duration,
          memory_date: memoryData.memory_date || memoryData.date,
          location: memoryData.location,
          tags: memoryData.tags || [],
          people_ids: memoryData.people_ids || memoryData.peopleIds || [],
          visibility: memoryData.visibility || 'family',
          is_pinned: memoryData.is_pinned || false,
          // 🎬 CRITICAL FIX: Update files array for multimedia support
          files: memoryData.files || [],
          // 🎯 JOURNEY FIX: Update journeyType
          journey_type: memoryData.journeyType || memoryData.journey_type || null,
          // Additional fields for compatibility
          people_involved: memoryData.people_involved || [],
          is_private: memoryData.is_private || false,
          emotion_tags: memoryData.emotionTags || memoryData.emotion_tags || [],
          updated_at: new Date().toISOString()
        })
        .eq('id', memoryId)
        .eq('family_id', familyId)
        .select()
        .single();
      
      if (error) throw error;
      
      const memory = {
        id: data.id,
        title: data.title,
        description: data.description,
        memory_type: data.memory_type,
        file_url: data.file_url,
        thumbnail_url: data.thumbnail_url,
        file_size: data.file_size,
        duration: data.duration,
        memory_date: data.memory_date,
        location: data.location,
        tags: data.tags,
        people_ids: data.people_ids,
        visibility: data.visibility,
        is_pinned: data.is_pinned,
        created_by: data.created_by,
        // 🎬 CRITICAL FIX: Include files array from database
        files: data.files || [],
        // 🎯 JOURNEY FIX: Include journeyType for filtering
        journeyType: data.journey_type || null,
        journey_type: data.journey_type || null,
        // Additional fields for compatibility
        people_involved: data.people_involved || [],
        is_private: data.is_private || false,
        emotionTags: data.emotion_tags || [],
        type: data.memory_type, // Alias for backward compatibility
        date: data.memory_date,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
      
      // ✅ DATABASE-FIRST: No localStorage caching - prevents page hang
      
      // 🎉 Dispatch event to notify VaultPage to reload
      window.dispatchEvent(new CustomEvent('memoryUpdated', { 
        detail: { memoryId: memory.id, familyId: familyId, memory: memory } 
      }));
      console.log('📡 Dispatched memoryUpdated event');
      
      console.log('✅ Memory updated in database');
      
      return {
        success: true,
        memory: memory
      };
      
    } catch (error) {
      console.error('❌ Database update failed - DATABASE-FIRST mode, no localStorage fallback:', error);
      
      return {
        success: false,
        error: error,
        message: 'Failed to update memory in database. Please check your internet connection and try again.'
      };
    }
  }

  // ==================== JOURNALS ====================

  async getJournals(userId: string): Promise<any[]> {
    // ✅ CRITICAL FIX: Skip database for invalid UUIDs (including demo users)
    if (!this.isValidUUID(userId)) {
      console.log('📦 Invalid/demo user ID - using localStorage only');
      return this.getFromLocalStorage(`user:${userId}:journals`) || [];
    }
    
    try {
      const { data, error } = await this.supabase
        .from('journals')
        .select('*')
        .eq('user_id', userId)
        .order('entry_date', { ascending: false });
      
      if (error) throw error;
      
      const journals = (data || []).map((entry: any) => ({
        id: entry.id,
        title: entry.title,
        content: entry.content,
        mood: entry.mood,
        is_private: entry.is_private,
        shared_with: entry.shared_with || [],
        entry_date: entry.entry_date,
        tags: entry.tags || [],
        created_at: entry.created_at,
        updated_at: entry.updated_at
      }));
      
      // Cache in localStorage
      this.saveToLocalStorage(`user:${userId}:journals`, journals);
      
      return journals;
      
    } catch (error) {
      if (this.isFigmaFetchError(error)) {
        this.logFigmaError('Journals fetch');
      } else {
        console.warn('⚠️ Database read failed, using localStorage:', error);
      }
      // Fallback to localStorage
      return this.getFromLocalStorage(`user:${userId}:journals`) || [];
    }
  }

  async saveJournals(userId: string, journals: any[]): Promise<void> {
    // ✅ CRITICAL FIX: Skip database for invalid UUIDs (including demo users)
    if (!this.isValidUUID(userId)) {
      console.log('📦 Invalid/demo user ID - saving to localStorage only');
      this.saveToLocalStorage(`user:${userId}:journals`, journals);
      return;
    }
    
    try {
      console.log('💾 Saving journals to database...');
      
      // Upsert all journals
      const journalsToUpsert = journals.map((journal: any) => ({
        id: journal.id,
        user_id: userId,
        title: journal.title,
        content: journal.content,
        mood: journal.mood,
        is_private: journal.is_private ?? true,
        shared_with: journal.shared_with || [],
        entry_date: journal.entry_date || journal.date,
        tags: journal.tags || [],
        updated_at: new Date().toISOString()
      }));
      
      const { error } = await this.supabase
        .from('journals')
        .upsert(journalsToUpsert, { onConflict: 'id' });
      
      if (error) throw error;
      
      // Update localStorage cache
      this.saveToLocalStorage(`user:${userId}:journals`, journals);
      
      console.log('✅ Journals saved to database');
      
    } catch (error) {
      console.warn('⚠️ Database save failed, using localStorage:', error);
      // Fallback to localStorage
      this.saveToLocalStorage(`user:${userId}:journals`, journals);
      console.log('💾 Journals saved to localStorage');
    }
  }

  // ==================== JOURNEYS ====================

  async getJourneyProgress(userId: string, journeyType: string): Promise<any> {
    // ✅ CRITICAL FIX: Skip database for invalid UUIDs (including demo users)
    if (!this.isValidUUID(userId)) {
      console.log('📦 Invalid/demo user ID - using localStorage only');
      return this.getFromLocalStorage(`${journeyType}JourneyProgress_${userId}`) || { milestones: [] };
    }
    
    try {
      const tableName = journeyType === 'couple' ? 'couple_journeys' : 'pregnancy_journeys';
      
      const { data, error } = await this.supabase
        .from(tableName)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const progress = {
        milestones: data || []
      };
      
      // Cache in localStorage
      this.saveToLocalStorage(`${journeyType}JourneyProgress_${userId}`, progress);
      
      return progress;
      
    } catch (error) {
      if (this.isFigmaFetchError(error)) {
        this.logFigmaError(`${journeyType} journey progress fetch`);
      } else {
        console.warn('⚠️ Database read failed, using localStorage:', error);
      }
      // Fallback to localStorage
      return this.getFromLocalStorage(`${journeyType}JourneyProgress_${userId}`) || { milestones: [] };
    }
  }

  async saveJourneyProgress(userId: string, journeyType: string, progress: any): Promise<void> {
    // ✅ CRITICAL FIX: Skip database for invalid UUIDs (including demo users)
    if (!this.isValidUUID(userId)) {
      console.log('📦 Invalid/demo user ID - saving to localStorage only');
      this.saveToLocalStorage(`${journeyType}JourneyProgress_${userId}`, progress);
      return;
    }
    
    try {
      console.log(`💾 Saving ${journeyType} journey to database...`);
      
      const tableName = journeyType === 'couple' ? 'couple_journeys' : 'pregnancy_journeys';
      
      // Upsert milestones
      if (progress.milestones && progress.milestones.length > 0) {
        const milestones = progress.milestones.map((milestone: any) => ({
          id: milestone.id,
          user_id: userId,
          partner_id: milestone.partner_id,
          milestone_type: milestone.milestone_type || milestone.type,
          milestone_date: milestone.milestone_date || milestone.date,
          week_number: milestone.week_number,
          title: milestone.title,
          description: milestone.description,
          photo_url: milestone.photo_url,
          is_completed: milestone.is_completed || milestone.completed || false,
          completed_at: milestone.completed_at,
          updated_at: new Date().toISOString()
        }));
        
        const { error } = await this.supabase
          .from(tableName)
          .upsert(milestones, { onConflict: 'id' });
        
        if (error) throw error;
      }
      
      // Update localStorage cache
      this.saveToLocalStorage(`${journeyType}JourneyProgress_${userId}`, progress);
      
      console.log(`✅ ${journeyType} journey saved to database`);
      
    } catch (error) {
      console.warn('⚠️ Database save failed, using localStorage:', error);
      // Fallback to localStorage
      this.saveToLocalStorage(`${journeyType}JourneyProgress_${userId}`, progress);
      console.log(`💾 ${journeyType} journey saved to localStorage`);
    }
  }

  // ==================== TIME CAPSULES ====================

  async getTimeCapsules(familyId: string): Promise<any[]> {
    // ✅ CRITICAL FIX: Skip database for invalid UUIDs (including demo families)
    if (!this.isValidUUID(familyId)) {
      console.log('📦 Invalid/demo family ID - using localStorage only');
      return this.getFromLocalStorage(`timeCapsules_${familyId}`) || [];
    }
    
    try {
      const { data, error } = await this.supabase
        .from('time_capsules')
        .select('*')
        .eq('family_id', familyId)
        .order('unlock_date', { ascending: true });
      
      if (error) throw error;
      
      const capsules = (data || []).map((capsule: any) => ({
        id: capsule.id,
        title: capsule.title,
        message: capsule.message,
        media_urls: capsule.media_urls || [],
        recipient_ids: capsule.recipient_ids || [],
        category: capsule.category || 'personal',
        unlock_date: capsule.unlock_date,
        is_unlocked: capsule.is_unlocked,
        unlocked_at: capsule.unlocked_at,
        created_by: capsule.user_id || capsule.created_by, // ✅ FIX: Map user_id to created_by for app compatibility
        created_at: capsule.created_at,
        updated_at: capsule.updated_at
      }));
      
      // Cache in localStorage
      this.saveToLocalStorage(`timeCapsules_${familyId}`, capsules);
      
      return capsules;
      
    } catch (error) {
      console.warn('⚠️ Database read failed, using localStorage:', error);
      // Fallback to localStorage
      return this.getFromLocalStorage(`timeCapsules_${familyId}`) || [];
    }
  }

  async saveTimeCapsules(familyId: string, capsules: any[]): Promise<void> {
    // ✅ CRITICAL FIX: Skip database for invalid UUIDs (including demo families)
    if (!this.isValidUUID(familyId)) {
      console.log('📦 Invalid/demo family ID - saving to localStorage only');
      this.saveToLocalStorage(`timeCapsules_${familyId}`, capsules);
      return;
    }
    
    try {
      console.log('💾 Saving time capsules to database...');
      
      // Upsert all capsules
      const capsulesToUpsert = capsules.map((capsule: any) => ({
        id: capsule.id,
        family_id: familyId,
        user_id: capsule.created_by || capsule.createdBy, // ✅ FIX: Database expects user_id, not created_by
        title: capsule.title,
        message: capsule.message,
        media_urls: capsule.media_urls || capsule.mediaUrls || [],
        recipient_ids: capsule.recipient_ids || capsule.recipientIds || [],
        category: capsule.category || 'personal',
        unlock_date: capsule.unlock_date || capsule.unlockDate,
        is_unlocked: capsule.is_unlocked || capsule.unlocked || false,
        unlocked_at: capsule.unlocked_at || capsule.unlockedAt,
        updated_at: new Date().toISOString()
      }));
      
      const { error } = await this.supabase
        .from('time_capsules')
        .upsert(capsulesToUpsert, { onConflict: 'id' });
      
      if (error) {
        console.error('❌ Time Capsules database save error:', error);
        console.error('   Error message:', error.message);
        console.error('   Error details:', error.details);
        console.error('   Capsules data:', JSON.stringify(capsulesToUpsert, null, 2));
        throw error;
      }
      
      // Update localStorage cache
      this.saveToLocalStorage(`timeCapsules_${familyId}`, capsules);
      
      console.log('✅ Time capsules saved to database');
      
    } catch (error) {
      console.warn('⚠️ Database save failed, using localStorage:', error);
      // Fallback to localStorage
      this.saveToLocalStorage(`timeCapsules_${familyId}`, capsules);
      console.log('💾 Time capsules saved to localStorage');
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Map database profile to app user format
   * ✅ CRITICAL FIX: Normalizes name fields (handles snake_case → camelCase and parses name if needed)
   */
  private mapDbProfileToUser(data: any): UserProfile {
    // Normalize name fields (handles missing first_name/last_name by parsing name)
    const normalizedNames = normalizeNameFields(data);
    
    return {
      id: data.id,
      email: data.email,
      phone: data.phone,
      name: normalizedNames.name,
      display_name: data.display_name,
      // Use normalized name fields (guaranteed to have values)
      firstName: normalizedNames.firstName,
      first_name: normalizedNames.firstName,
      middleName: normalizedNames.middleName,
      middle_name: normalizedNames.middleName,
      lastName: normalizedNames.lastName,
      last_name: normalizedNames.lastName,
      maidenName: data.maiden_name || '',
      maiden_name: data.maiden_name || '',
      gender: data.gender,
      status: data.status || 'Living',
      date_of_birth: data.date_of_birth,
      dateOfBirth: data.date_of_birth,
      place_of_birth: data.place_of_birth || '',
      placeOfBirth: data.place_of_birth || '',
      birthPlace: data.place_of_birth || '',
      deathDate: data.death_date || '',
      death_date: data.death_date || '',
      deathPlace: data.death_place || '',
      death_place: data.death_place || '',
      bio: data.bio || '',
      location: data.location || '',
      photo_url: data.photo_url,
      photo: data.photo_url,
      photo_storage_path: data.photo_storage_path || '',
      avatar: data.photo_url,
      profilePicture: data.photo_url,
      family_id: data.family_id,
      family_name: data.family_name,
      is_new_user: data.is_new_user,
      onboarding_completed: data.onboarding_completed,
      marriage_date: data.marriage_date,
      marriage_anniversary: data.marriage_anniversary,
      spouse_id: data.spouse_id,
      activity_count: data.activity_count,
      created_at: data.created_at,
      updated_at: data.updated_at
    } as UserProfile;
  }

  async testConnection(): Promise<any> {
    try {
      // Test Supabase connection with a simple query
      const { error } = await this.supabase
        .from('users')
        .select('count')
        .limit(1);
      
      if (error) throw error;
      
      return {
        success: true,
        status: 'connected',
        message: 'Connected to Supabase database',
        mode: 'database-sync'
      };
      
    } catch (error) {
      return {
        success: false,
        message: 'Using localStorage fallback mode',
        mode: 'local-only'
      };
    }
  }

  /**
   * Save user feedback to database
   * For MVP validation - emotional feedback tracking
   */
  async saveFeedback(feedbackData: any): Promise<{ success: boolean; error?: any }> {
    try {
      console.log('📝 Saving emotional feedback to database...');
      
      // Save to Supabase feedback table
      const { data, error } = await this.supabase
        .from('feedback')
        .insert({
          user_id: feedbackData.user_id,
          would_recommend: feedbackData.would_recommend,
          liked_most: feedbackData.liked_most,
          frustrating: feedbackData.frustrating,
          improvements: feedbackData.improvements,
          feel_connected: feedbackData.feel_connected,
          invite_family: feedbackData.invite_family,
          moment_to_preserve: feedbackData.moment_to_preserve,
          user_name: feedbackData.user_name,
          user_email: feedbackData.user_email,
          page_url: feedbackData.page_url,
          user_agent: feedbackData.user_agent,
          batch_no: feedbackData.batch_no || 1,
          submitted_at: feedbackData.submitted_at || new Date().toISOString()
        });

      if (error) throw error;

      // Also cache in localStorage
      const existingFeedback = JSON.parse(localStorage.getItem('app_feedback') || '[]');
      existingFeedback.push(feedbackData);
      localStorage.setItem('app_feedback', JSON.stringify(existingFeedback));

      console.log('✅ Emotional feedback saved to database');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Failed to save feedback to database:', error);
      
      // Fallback to localStorage only
      const existingFeedback = JSON.parse(localStorage.getItem('app_feedback') || '[]');
      existingFeedback.push(feedbackData);
      localStorage.setItem('app_feedback', JSON.stringify(existingFeedback));
      
      console.log('💾 Feedback saved to localStorage only');
      return { success: false, error };
    }
  }

  // ==================== JOURNAL ENTRIES ====================

  /**
   * ✅ DATABASE-FIRST: Get journal entries for user
   * Loads from database, caches in localStorage
   */
  async getJournalEntries(userId: string, familyId: string): Promise<any[]> {
    console.log(`🔍 DatabaseService.getJournalEntries called:`, {
      userId,
      familyId,
      isValidUUID: this.isValidUUID(userId) && this.isValidUUID(familyId)
    });
    
    // ✅ CRITICAL FIX: Skip database for invalid UUIDs (including demo users)
    if (!this.isValidUUID(userId) || !this.isValidUUID(familyId)) {
      console.log(`📦 DatabaseService: Invalid/demo user ID - using localStorage only`);
      const journals = this.getFromLocalStorage(`memorybox_journal_all`) || [];
      return journals.filter((j: any) => j.createdBy === userId);
    }
    
    try {
      console.log(`🔍 DatabaseService: Querying Supabase 'journals' table for user_id: ${userId}`);
      
      // Query database
      const { data, error } = await this.supabase
        .from('journals')
        .select('*')
        .eq('user_id', userId)
        .order('entry_date', { ascending: false });
      
      if (error) throw error;
      
      console.log(`✅ DatabaseService: Supabase returned ${data?.length || 0} journals for user ${userId}`);
      
      // Map database format to app format
      const journals = (data || []).map((journal: any) => ({
        id: journal.id,
        title: journal.title,
        content: journal.content,
        frequency: journal.frequency,
        date: journal.entry_date,
        moods: journal.moods || [],
        tags: journal.tags || [],
        createdAt: journal.created_at,
        updatedAt: journal.updated_at,
        createdBy: journal.user_id,
        isPrivate: journal.is_private,
        sharedWith: journal.shared_with || []
      }));
      
      // Cache in localStorage
      const allJournals = this.getFromLocalStorage(`memorybox_journal_all`) || [];
      const otherUserJournals = allJournals.filter((j: any) => j.createdBy !== userId);
      const combined = [...journals, ...otherUserJournals];
      this.saveToLocalStorage(`memorybox_journal_all`, combined);
      
      return journals;
      
    } catch (error) {
      console.warn('⚠️ Database read failed, using localStorage:', error);
      // Fallback to localStorage
      const journals = this.getFromLocalStorage(`memorybox_journal_all`) || [];
      return journals.filter((j: any) => j.createdBy === userId);
    }
  }

  /**
   * ✅ DATABASE-FIRST: Get journals shared with user
   */
  async getSharedJournals(userId: string): Promise<any[]> {
    // ✅ CRITICAL FIX: Skip database for invalid UUIDs (including demo users)
    if (!this.isValidUUID(userId)) {
      console.log(`📦 DatabaseService: Invalid/demo user ID - using localStorage only`);
      const journals = this.getFromLocalStorage(`memorybox_journal_all`) || [];
      return journals.filter((j: any) => 
        j.createdBy !== userId && 
        j.sharedWith?.includes(userId) &&
        !j.isPrivate
      );
    }
    
    try {
      // Query database for journals shared with this user
      const { data, error } = await this.supabase
        .from('journals')
        .select('*')
        .contains('shared_with', [userId])
        .eq('is_private', false)
        .order('entry_date', { ascending: false });
      
      if (error) throw error;
      
      // Map database format to app format
      const journals = (data || []).map((journal: any) => ({
        id: journal.id,
        title: journal.title,
        content: journal.content,
        frequency: journal.frequency,
        date: journal.entry_date,
        moods: journal.moods || [],
        tags: journal.tags || [],
        createdAt: journal.created_at,
        updatedAt: journal.updated_at,
        createdBy: journal.user_id,
        isPrivate: journal.is_private,
        sharedWith: journal.shared_with || []
      }));
      
      return journals;
      
    } catch (error) {
      console.warn('⚠️ Database read failed, using localStorage:', error);
      // Fallback to localStorage
      const journals = this.getFromLocalStorage(`memorybox_journal_all`) || [];
      return journals.filter((j: any) => 
        j.createdBy !== userId && 
        j.sharedWith?.includes(userId) &&
        !j.isPrivate
      );
    }
  }

  /**
   * ✅ DATABASE-FIRST: Create new journal entry
   */
  async createJournalEntry(userId: string, familyId: string, journalData: any): Promise<any> {
    // ✅ CRITICAL FIX: Skip database for invalid UUIDs (including demo users)
    if (!this.isValidUUID(userId) || !this.isValidUUID(familyId)) {
      console.log(`📦 DatabaseService: Invalid/demo user ID - saving to localStorage only`);
      const journal = {
        id: this.generateUUID(),
        ...journalData,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const journals = this.getFromLocalStorage(`memorybox_journal_all`) || [];
      journals.unshift(journal);
      this.saveToLocalStorage(`memorybox_journal_all`, journals);
      return journal;
    }
    
    try {
      console.log('💾 Saving journal entry to database...');
      
      // Save to database
      const { data, error } = await this.supabase
        .from('journals')
        .insert({
          user_id: userId,
          family_id: familyId,
          title: journalData.title,
          content: journalData.content,
          frequency: journalData.frequency,
          entry_date: journalData.date || new Date().toISOString().split('T')[0],
          moods: journalData.moods || [],
          tags: journalData.tags || [],
          is_private: journalData.isPrivate ?? true,
          shared_with: journalData.sharedWith || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Map to app format
      const journal = {
        id: data.id,
        title: data.title,
        content: data.content,
        frequency: data.frequency,
        date: data.entry_date,
        moods: data.moods || [],
        tags: data.tags || [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        createdBy: data.user_id,
        isPrivate: data.is_private,
        sharedWith: data.shared_with || []
      };
      
      // Update localStorage cache
      const journals = this.getFromLocalStorage(`memorybox_journal_all`) || [];
      journals.unshift(journal);
      this.saveToLocalStorage(`memorybox_journal_all`, journals);
      
      console.log('✅ Journal entry saved to database');
      return journal;
      
    } catch (error) {
      // ❌ DATABASE-FIRST: Do NOT fallback to localStorage
      console.error('❌ Database create FAILED - database-first mode cannot continue:', error);
      throw new Error(`Failed to create journal in database: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * ✅ DATABASE-FIRST: Update journal entry
   */
  async updateJournalEntry(journalId: string, userId: string, updates: any): Promise<any> {
    // ✅ CRITICAL FIX: Skip database for invalid UUIDs (including demo users)
    if (!this.isValidUUID(journalId) || !this.isValidUUID(userId)) {
      console.log(`📦 DatabaseService: Invalid/demo IDs - updating localStorage only`);
      const journals = this.getFromLocalStorage(`memorybox_journal_all`) || [];
      const updated = journals.map((j: any) => 
        j.id === journalId ? { ...j, ...updates, updatedAt: new Date().toISOString() } : j
      );
      this.saveToLocalStorage(`memorybox_journal_all`, updated);
      return updated.find((j: any) => j.id === journalId);
    }
    
    try {
      console.log('💾 Updating journal entry in database...');
      
      // Update in database
      const { data, error } = await this.supabase
        .from('journals')
        .update({
          title: updates.title,
          content: updates.content,
          frequency: updates.frequency,
          moods: updates.moods,
          tags: updates.tags,
          is_private: updates.isPrivate,
          shared_with: updates.sharedWith,
          updated_at: new Date().toISOString()
        })
        .eq('id', journalId)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      
      // Map to app format
      const journal = {
        id: data.id,
        title: data.title,
        content: data.content,
        frequency: data.frequency,
        date: data.entry_date,
        moods: data.moods || [],
        tags: data.tags || [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        createdBy: data.user_id,
        isPrivate: data.is_private,
        sharedWith: data.shared_with || []
      };
      
      // Update localStorage cache
      const journals = this.getFromLocalStorage(`memorybox_journal_all`) || [];
      const updated = journals.map((j: any) => j.id === journalId ? journal : j);
      this.saveToLocalStorage(`memorybox_journal_all`, updated);
      
      console.log('✅ Journal entry updated in database');
      return journal;
      
    } catch (error) {
      // ❌ DATABASE-FIRST: Do NOT fallback to localStorage
      console.error('❌ Database update FAILED - database-first mode cannot continue:', error);
      throw new Error(`Failed to update journal in database: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * ✅ DATABASE-FIRST: Delete journal entry
   */
  async deleteJournalEntry(journalId: string, userId: string): Promise<void> {
    // ✅ CRITICAL FIX: Skip database for invalid UUIDs (including demo users)
    if (!this.isValidUUID(journalId) || !this.isValidUUID(userId)) {
      console.log(`📦 DatabaseService: Invalid/demo IDs - deleting from localStorage only`);
      const journals = this.getFromLocalStorage(`memorybox_journal_all`) || [];
      const filtered = journals.filter((j: any) => j.id !== journalId);
      this.saveToLocalStorage(`memorybox_journal_all`, filtered);
      return;
    }
    
    try {
      console.log('💾 Deleting journal entry from database...');
      
      // Delete from database
      const { error } = await this.supabase
        .from('journals')
        .delete()
        .eq('id', journalId)
        .eq('user_id', userId);
      
      if (error) throw error;
      
      // Update localStorage cache
      const journals = this.getFromLocalStorage(`memorybox_journal_all`) || [];
      const filtered = journals.filter((j: any) => j.id !== journalId);
      this.saveToLocalStorage(`memorybox_journal_all`, filtered);
      
      console.log('✅ Journal entry deleted from database');
      
    } catch (error) {
      // ❌ DATABASE-FIRST: Do NOT fallback to localStorage
      console.error('❌ Database delete FAILED - database-first mode cannot continue:', error);
      throw new Error(`Failed to delete journal from database: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 📚 BOOK OF LIFE: Get book preferences for user
   */
  async getBookPreferences(userId: string): Promise<any[]> {
    // 🎨 FIGMA MAKE: Return empty array in demo mode
    if (this.isFigmaMakeEnvironment) {
      console.log('🎨 Figma Make: Book preferences unavailable (demo mode)');
      return [];
    }
    
    if (!this.isValidUUID(userId)) {
      console.log('📦 DatabaseService: Invalid/demo ID - no book preferences');
      return [];
    }

    try {
      const { data, error } = await this.supabase
        .from('user_book_preferences')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // 🎨 FIGMA MAKE: Suppress fetch errors in demo mode
      if (this.isFigmaMakeEnvironment || errorMsg.includes('Failed to fetch')) {
        console.log('🎨 Network unavailable - book preferences disabled');
        return [];
      }
      
      console.error('❌ Failed to load book preferences:', error);
      return [];
    }
  }

  /**
   * 📚 BOOK OF LIFE: Save/update book preference
   */
  async saveBookPreference(userId: string, preference: {
    journey_type: 'couple' | 'pregnancy';
    custom_title: string;
    child_id?: string | null; // NEW: Link to specific child for pregnancy books
  }): Promise<void> {
    if (!this.isValidUUID(userId)) {
      console.log('📦 DatabaseService: Invalid/demo ID - cannot save book preference');
      throw new Error('Invalid user ID');
    }

    try {
      const { error } = await this.supabase
        .from('user_book_preferences')
        .upsert({
          user_id: userId,
          journey_type: preference.journey_type,
          custom_title: preference.custom_title,
          child_id: preference.child_id || null, // NEW: Include child_id
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,journey_type,child_id' // NEW: Updated conflict resolution
        });

      if (error) throw error;
      console.log('✅ Book preference saved to database', preference.child_id ? `(child: ${preference.child_id})` : '');
    } catch (error) {
      console.error('❌ Failed to save book preference:', error);
      throw error;
    }
  }

  /**
   * 📚 BOOK OF LIFE: Update last opened timestamp
   */
  async updateBookLastOpened(userId: string, journeyType: 'couple' | 'pregnancy', childId?: string | null): Promise<void> {
    if (!this.isValidUUID(userId)) return;

    try {
      const { error } = await this.supabase
        .from('user_book_preferences')
        .upsert({
          user_id: userId,
          journey_type: journeyType,
          child_id: childId || null, // NEW: Include child_id
          last_opened_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,journey_type,child_id' // NEW: Updated conflict resolution
        });

      if (error) throw error;
    } catch (error) {
      console.error('❌ Failed to update last opened:', error);
      // Silent failure - not critical
    }
  }

  /**
   * 👶 Get children from family tree (for pregnancy book selection)
   * DATABASE-FIRST: Relies on database, shows error if RLS blocks
   */
  async getChildrenFromFamilyTree(familyId: string): Promise<Array<{
    id: string;
    name: string;
    date_of_birth?: string;
    gender?: string;
  }>> {
    console.log('🔍 [CHILD SELECTOR DEBUG] Starting getChildrenFromFamilyTree');
    console.log('🔍 [CHILD SELECTOR DEBUG] Received familyId:', familyId);
    
    if (!this.isValidUUID(familyId)) {
      console.log('❌ [CHILD SELECTOR DEBUG] Invalid family ID - no children');
      return [];
    }

    try {
      console.log('✅ [CHILD SELECTOR DEBUG] Family ID is valid UUID');
      console.log('👶 [CHILD SELECTOR DEBUG] Loading from database...');
      
      // DATABASE-FIRST: Load from database ONLY
      const { data, error } = await this.supabase
        .from('family_trees')
        .select('tree_data')
        .eq('family_id', familyId)
        .single();

      if (error) {
        console.error('❌ [CHILD SELECTOR DEBUG] Database error:', error.message);
        console.error('🚨 [DATABASE-FIRST] RLS policy may be blocking reads');
        console.error('🚨 [DATABASE-FIRST] Please run FIX_RLS_POLICY_DATABASE_FIRST.sql');
        throw error;
      }
      
      // Parse tree_data to extract children
      if (!data || !data.tree_data) {
        console.log('❌ [CHILD SELECTOR DEBUG] No family tree data in database');
        return [];
      }

      console.log('✅ [CHILD SELECTOR DEBUG] Got tree_data from database');
      
      const treeData = typeof data.tree_data === 'string' 
        ? JSON.parse(data.tree_data) 
        : data.tree_data;

      // Log what we got from database
      const dbPeopleCount = treeData.people?.length || 0;
      console.log(`📊 [CHILD SELECTOR DEBUG] Database has ${dbPeopleCount} people`);
      
      // ✅ DATABASE-FIRST: Return whatever database has (even if 0 people)
      // This is correct behavior - if database has no data, user needs to add family members
      return this.extractChildrenFromTreeData(treeData);
      
    } catch (error) {
      console.error('❌ [CHILD SELECTOR DEBUG] Failed to load children:', error);
      console.error('🚨 [DATABASE-FIRST] No localStorage fallback - fix RLS policy instead!');
      throw error;
    }
  }

  /**
   * Helper: Extract children from tree data
   */
  private extractChildrenFromTreeData(treeData: any): Array<{
    id: string;
    name: string;
    date_of_birth?: string;
    gender?: string;
  }> {
    console.log('🔍 [CHILD SELECTOR DEBUG] Extracting children from tree data...');
    console.log('🔍 [CHILD SELECTOR DEBUG] Tree structure:', {
      peopleCount: treeData.people?.length || 0,
      relationshipsCount: treeData.relationships?.length || 0,
      rootUserId: treeData.rootUserId,
      hasRootUserId: !!treeData.rootUserId
    });

    // Extract all people and relationships from the tree
    const people = treeData.people || [];
    const relationships = treeData.relationships || [];
    
    console.log('🔍 [CHILD SELECTOR DEBUG] People in tree:', people.length);
    console.log('🔍 [CHILD SELECTOR DEBUG] Relationships in tree:', relationships.length);
    
    // Log all people for debugging
    console.log('🔍 [CHILD SELECTOR DEBUG] All people:', people.map((p: any) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      isRoot: p.isRoot,
      generation: p.generation
    })));
    
    // Log all relationships for debugging
    console.log('🔍 [CHILD SELECTOR DEBUG] All relationships:', relationships.map((r: any) => ({
      type: r.type,
      from: r.from,
      to: r.to
    })));
    
    // Find the root user (the logged-in user)
    const rootUser = people.find((p: any) => p.isRoot === true || p.id === treeData.rootUserId);
    const rootUserId = rootUser?.id || treeData.rootUserId;
    
    console.log('🔍 [CHILD SELECTOR DEBUG] Root user:', rootUser ? {
      id: rootUser.id,
      firstName: rootUser.firstName,
      isRoot: rootUser.isRoot
    } : 'NOT FOUND');
    console.log('🔍 [CHILD SELECTOR DEBUG] Using rootUserId:', rootUserId);
    
    if (!rootUserId) {
      console.warn('❌ [CHILD SELECTOR DEBUG] No root user found in family tree');
      return [];
    }
    
    // Find all parent-child relationships where the root user is the parent
    const childRelationships = relationships.filter((rel: any) => 
      rel.type === 'parent-child' && rel.from === rootUserId
    );
    
    console.log('🔍 [CHILD SELECTOR DEBUG] Parent-child relationships for root user:', childRelationships.length);
    console.log('🔍 [CHILD SELECTOR DEBUG] Child relationship details:', childRelationships);
    
    // Get the child IDs from these relationships
    const childIds = childRelationships.map((rel: any) => rel.to);
    console.log('🔍 [CHILD SELECTOR DEBUG] Child IDs:', childIds);
    
    // Get the actual person objects for these children
    const children = people.filter((person: any) => childIds.includes(person.id));
    
    console.log(`✅ [CHILD SELECTOR DEBUG] Found ${children.length} children for root user`);
    console.log('✅ [CHILD SELECTOR DEBUG] Children details:', children.map((c: any) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      dateOfBirth: c.dateOfBirth,
      generation: c.generation
    })));
    
    // Return in expected format with full name
    const formattedChildren = children.map((child: any) => {
      const fullName = [child.firstName, child.middleName, child.lastName]
        .filter(Boolean)
        .join(' ') || 'Unnamed Child';
      
      return {
        id: child.id,
        name: fullName,
        date_of_birth: child.dateOfBirth || child.date_of_birth,
        gender: child.gender
      };
    });
    
    console.log('✅ [CHILD SELECTOR DEBUG] Formatted children:', formattedChildren);
    
    return formattedChildren;
  }

  /**
   * 👶 Link memory to child (for migration wizard)
   */
  async linkMemoryToChild(memoryId: string, childId: string): Promise<void> {
    if (!this.isValidUUID(memoryId) || !this.isValidUUID(childId)) {
      throw new Error('Invalid memory or child ID');
    }

    try {
      const { error } = await this.supabase
        .from('memories')
        .update({ child_id: childId })
        .eq('id', memoryId);

      if (error) throw error;
      console.log(`✅ Memory ${memoryId} linked to child ${childId}`);
    } catch (error) {
      console.error('❌ Failed to link memory to child:', error);
      throw error;
    }
  }
}

export const DatabaseService = new PersistentDatabase();
export default DatabaseService;
