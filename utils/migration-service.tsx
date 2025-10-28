import { getSupabaseClient } from './supabase/client';
import { projectId } from './supabase/info';

/**
 * Migration Service
 * Migrates data from localStorage to Supabase for persistent cross-device storage
 */

class MigrationService {
  private supabase;
  private baseURL: string;

  constructor() {
    // Use singleton Supabase client to avoid multiple GoTrueClient instances
    this.supabase = getSupabaseClient();
    this.baseURL = `https://${projectId}.supabase.co/functions/v1/make-server-48a3bd07`;
  }

  /**
   * Check if migration has already been completed
   */
  private isMigrationCompleted(): boolean {
    return localStorage.getItem('memorybox_migration_completed') === 'true';
  }

  /**
   * Mark migration as completed
   */
  private markMigrationCompleted(): void {
    localStorage.setItem('memorybox_migration_completed', 'true');
    localStorage.setItem('memorybox_migration_date', new Date().toISOString());
  }

  /**
   * Get current user's auth token
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      return session?.access_token || null;
    } catch (error) {
      console.error('❌ Failed to get auth token:', error);
      return null;
    }
  }

  /**
   * Make authenticated request to server
   */
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.getAuthToken();
    
    const fullUrl = `${this.baseURL}${endpoint}`;
    
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    return response;
  }

  /**
   * Migrate user profile data
   */
  private async migrateUserProfile(userId: string): Promise<boolean> {
    try {
      const profileKey = `user:${userId}:profile`;
      const profileData = localStorage.getItem(profileKey);
      
      if (!profileData) {
        console.log('ℹ️ No user profile to migrate');
        return true;
      }
      
      const profile = JSON.parse(profileData);
      
      console.log('📤 Migrating user profile...');
      
      const response = await this.makeRequest(`/users/${userId}/profile`, {
        method: 'PUT',
        body: JSON.stringify(profile)
      });
      
      const result = await response.json();
      
      console.log('✅ User profile migrated successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to migrate user profile:', error);
      return false;
    }
  }

  /**
   * ✅ FIX 2: Ensure root user has isRoot flag during migration
   */
  private migrateRootUser(people: any[], currentUserId: string): any[] {
    // Find root user by various methods
    let rootIndex = people.findIndex(p => p.isRoot === true);
    
    if (rootIndex === -1) {
      // Try finding by user ID
      rootIndex = people.findIndex(p => p.id === currentUserId);
      console.log('   🔍 Searching for root by user ID:', rootIndex >= 0 ? '✅ Found' : '❌ Not found');
    }
    
    if (rootIndex === -1) {
      // Try finding by email
      const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
      if (userProfile) {
        const userData = JSON.parse(userProfile);
        rootIndex = people.findIndex(p => p.email === userData.email);
        console.log('   🔍 Searching for root by email:', rootIndex >= 0 ? '✅ Found' : '❌ Not found');
      }
    }
    
    if (rootIndex === -1) {
      // Assume first person in generation 0 is root
      rootIndex = people.findIndex(p => p.generation === 0);
      console.log('   🔍 Fallback: Using first person in generation 0:', rootIndex >= 0 ? '⚠️ Found' : '❌ Not found');
    }
    
    // Set isRoot flag
    if (rootIndex >= 0) {
      people[rootIndex].isRoot = true;
      console.log('   ✅ Migration: Set root flag on', people[rootIndex].firstName);
    } else {
      console.warn('   ⚠️ Migration: Could not find root user to set flag');
    }
    
    return people;
  }

  /**
   * Migrate family tree data
   */
  private async migrateFamilyTree(familyId: string): Promise<boolean> {
    try {
      const treeKey = `familyTree_${familyId}`;
      const treeData = localStorage.getItem(treeKey);
      
      if (!treeData) {
        console.log('ℹ️ No family tree to migrate');
        return true;
      }
      
      const tree = JSON.parse(treeData);
      
      // Handle both old format (array) and new format (object with people/relationships)
      let peopleArray = Array.isArray(tree) ? tree : tree.people || [];
      const memberCount = peopleArray.length;
      
      console.log(`📤 Migrating family tree (${memberCount} members)...`);
      
      // ✅ FIX 2: Ensure root user has isRoot flag
      const currentUserId = localStorage.getItem('current_user_id');
      if (currentUserId && peopleArray.length > 0) {
        console.log('   🔧 Checking root user flag during migration...');
        peopleArray = this.migrateRootUser(peopleArray, currentUserId);
        
        // Update tree with fixed people array
        if (Array.isArray(tree)) {
          localStorage.setItem(treeKey, JSON.stringify(peopleArray));
        } else {
          tree.people = peopleArray;
          localStorage.setItem(treeKey, JSON.stringify(tree));
        }
      }
      
      const response = await this.makeRequest(`/families/${familyId}/tree`, {
        method: 'POST',
        body: JSON.stringify({ tree: Array.isArray(tree) ? peopleArray : tree })
      });
      
      const result = await response.json();
      
      console.log('✅ Family tree migrated successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to migrate family tree:', error);
      return false;
    }
  }

  /**
   * Migrate memories data
   */
  private async migrateMemories(familyId: string): Promise<boolean> {
    try {
      const memoriesKey = `family:${familyId}:memories`;
      const memoriesData = localStorage.getItem(memoriesKey);
      
      if (!memoriesData) {
        console.log('ℹ️ No memories to migrate');
        return true;
      }
      
      const memories = JSON.parse(memoriesData);
      
      console.log(`📤 Migrating memories (${memories.length} items)...`);
      
      // Get existing memories from server
      const existingResponse = await this.makeRequest(`/families/${familyId}/memories`);
      const existingData = await existingResponse.json();
      const existingMemories = existingData.memories || [];
      
      // Merge with localStorage memories (avoid duplicates)
      const existingIds = new Set(existingMemories.map((m: any) => m.id));
      const newMemories = memories.filter((m: any) => !existingIds.has(m.id));
      
      // Add each new memory
      for (const memory of newMemories) {
        try {
          await this.makeRequest(`/families/${familyId}/memories`, {
            method: 'POST',
            body: JSON.stringify(memory)
          });
        } catch (error) {
          console.warn(`⚠️ Failed to migrate memory ${memory.id}:`, error);
        }
      }
      
      console.log(`✅ Migrated ${newMemories.length} new memories`);
      return true;
      
    } catch (error) {
      console.error('❌ Failed to migrate memories:', error);
      return false;
    }
  }

  /**
   * Migrate journal entries
   */
  private async migrateJournals(userId: string): Promise<boolean> {
    try {
      // Check various possible journal storage keys
      const possibleKeys = [
        `journals_${userId}`,
        `user:${userId}:journals`,
        'memorybox_journals'
      ];
      
      let journalsData = null;
      
      for (const key of possibleKeys) {
        const data = localStorage.getItem(key);
        if (data) {
          journalsData = data;
          break;
        }
      }
      
      if (!journalsData) {
        console.log('ℹ️ No journals to migrate');
        return true;
      }
      
      const journals = JSON.parse(journalsData);
      
      console.log(`📤 Migrating journals (${journals.length} entries)...`);
      
      const response = await this.makeRequest(`/users/${userId}/journals`, {
        method: 'POST',
        body: JSON.stringify({ journals })
      });
      
      const result = await response.json();
      
      console.log('✅ Journals migrated successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to migrate journals:', error);
      return false;
    }
  }

  /**
   * Migrate journey progress (couple, pregnancy, etc.)
   */
  private async migrateJourneys(userId: string): Promise<boolean> {
    try {
      const journeyTypes = ['couple', 'pregnancy'];
      
      for (const journeyType of journeyTypes) {
        const journeyKey = `${journeyType}JourneyProgress_${userId}`;
        const journeyData = localStorage.getItem(journeyKey);
        
        if (journeyData) {
          const progress = JSON.parse(journeyData);
          
          console.log(`📤 Migrating ${journeyType} journey progress...`);
          
          await this.makeRequest(`/users/${userId}/journeys/${journeyType}`, {
            method: 'POST',
            body: JSON.stringify({ progress })
          });
          
          console.log(`✅ ${journeyType} journey migrated successfully`);
        }
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ Failed to migrate journeys:', error);
      return false;
    }
  }

  /**
   * Migrate time capsules
   */
  private async migrateTimeCapsules(familyId: string): Promise<boolean> {
    try {
      const capsulesKey = `timeCapsules_${familyId}`;
      const capsulesData = localStorage.getItem(capsulesKey);
      
      if (!capsulesData) {
        console.log('ℹ️ No time capsules to migrate');
        return true;
      }
      
      const capsules = JSON.parse(capsulesData);
      
      console.log(`📤 Migrating time capsules (${capsules.length} items)...`);
      
      const response = await this.makeRequest(`/families/${familyId}/capsules`, {
        method: 'POST',
        body: JSON.stringify({ capsules })
      });
      
      const result = await response.json();
      
      console.log('✅ Time capsules migrated successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to migrate time capsules:', error);
      return false;
    }
  }

  /**
   * Main migration function
   * Migrates all user data from localStorage to Supabase
   */
  async migrateAllData(): Promise<{ success: boolean; message: string }> {
    // Check if migration already completed
    if (this.isMigrationCompleted()) {
      console.log('✅ Migration already completed');
      return {
        success: true,
        message: 'Migration already completed'
      };
    }

    try {
      // Get current user ID
      const currentUserId = localStorage.getItem('current_user_id');
      
      if (!currentUserId) {
        console.log('ℹ️ No user logged in - skipping migration');
        return {
          success: true,
          message: 'No user logged in'
        };
      }
      
      // Get user profile to find family ID
      const profileData = localStorage.getItem(`user:${currentUserId}:profile`);
      
      if (!profileData) {
        console.log('ℹ️ No user profile found - skipping migration');
        return {
          success: true,
          message: 'No user profile found'
        };
      }
      
      const profile = JSON.parse(profileData);
      const familyId = profile.family_id;
      
      console.log('🚀 Starting data migration...');
      console.log(`   User: ${profile.name} (${currentUserId})`);
      console.log(`   Family: ${familyId}`);
      
      // Migrate all data types
      const results = {
        profile: await this.migrateUserProfile(currentUserId),
        tree: await this.migrateFamilyTree(familyId),
        memories: await this.migrateMemories(familyId),
        journals: await this.migrateJournals(currentUserId),
        journeys: await this.migrateJourneys(currentUserId),
        capsules: await this.migrateTimeCapsules(familyId)
      };
      
      // Check if all migrations succeeded
      const allSuccess = Object.values(results).every(r => r === true);
      
      if (allSuccess) {
        this.markMigrationCompleted();
        console.log('✅ All data migrated successfully!');
        console.log('🎉 Your data is now persistent across all devices');
        
        return {
          success: true,
          message: 'All data migrated successfully! Your memories are now safe and accessible from any device.'
        };
      } else {
        console.warn('⚠️ Some migrations failed:', results);
        
        return {
          success: false,
          message: 'Some data could not be migrated. Your data is still safe in local storage.'
        };
      }
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      
      return {
        success: false,
        message: 'Migration failed. Your data remains safe in local storage.'
      };
    }
  }

  /**
   * Reset migration status (for testing/debugging)
   */
  resetMigration(): void {
    localStorage.removeItem('memorybox_migration_completed');
    localStorage.removeItem('memorybox_migration_date');
    console.log('🔄 Migration status reset');
  }
}

export const migrationService = new MigrationService();
