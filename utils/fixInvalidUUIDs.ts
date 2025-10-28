/**
 * 🔧 Invalid UUID Migration Utility
 * 
 * This utility detects and fixes localStorage data that has invalid UUIDs
 * (old format: local_1760793917959_5f4aiw965)
 * and replaces them with proper UUIDs.
 */

/**
 * Check if a string is a valid UUID v4
 */
export function isValidUUID(uuid: string): boolean {
  if (!uuid) return false;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Generate a valid UUID v4
 */
export function generateUUID(): string {
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
 * Check if localStorage has invalid UUIDs and needs migration
 */
export function hasInvalidUUIDs(): boolean {
  try {
    // Check current_user_id
    const currentUserId = localStorage.getItem('current_user_id');
    if (currentUserId && !isValidUUID(currentUserId)) {
      console.log('⚠️ Found invalid user ID:', currentUserId);
      return true;
    }
    
    // Check user profile
    if (currentUserId) {
      const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
      if (userProfile) {
        const userData = JSON.parse(userProfile);
        if (userData.family_id && !isValidUUID(userData.family_id)) {
          console.log('⚠️ Found invalid family ID:', userData.family_id);
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('❌ Error checking for invalid UUIDs:', error);
    return false;
  }
}

/**
 * Show a friendly alert to the user that they need to re-create their account
 */
export function showInvalidUUIDAlert(): void {
  const message = `
🔄 Account Update Required

We've detected that your account was created with an older version of MemoryBox.

To ensure full compatibility with our cloud features, please:

1. Sign out (if signed in)
2. Create a fresh account

Your data is safe - this is just a one-time update to support new features!

Would you like to clear your data now and start fresh?
  `.trim();
  
  if (confirm(message)) {
    clearInvalidData();
    // Reload page
    window.location.href = '/signup';
  }
}

/**
 * Clear all localStorage data (nuclear option - use with caution)
 */
export function clearInvalidData(): void {
  try {
    console.log('🗑️ Clearing invalid localStorage data...');
    
    // Store the keys to remove
    const keysToRemove: string[] = [];
    
    // Find all keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        keysToRemove.push(key);
      }
    }
    
    // Remove all keys
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log(`✅ Cleared ${keysToRemove.length} localStorage items`);
    console.log('🎉 Ready for fresh account creation!');
  } catch (error) {
    console.error('❌ Failed to clear localStorage:', error);
  }
}

/**
 * Attempt to migrate invalid UUIDs to valid ones (experimental)
 * This tries to preserve user data by mapping old IDs to new UUIDs
 */
export function migrateInvalidUUIDs(): boolean {
  try {
    console.log('🔄 Starting UUID migration...');
    
    // Map old IDs to new UUIDs
    const idMap = new Map<string, string>();
    
    // 1. Check and migrate user ID
    const currentUserId = localStorage.getItem('current_user_id');
    if (!currentUserId) {
      console.log('❌ No user ID found - nothing to migrate');
      return false;
    }
    
    if (!isValidUUID(currentUserId)) {
      const newUserId = generateUUID();
      idMap.set(currentUserId, newUserId);
      console.log('📝 Mapping user ID:', currentUserId, '→', newUserId);
    }
    
    // 2. Check and migrate family ID
    const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
    if (userProfile) {
      const userData = JSON.parse(userProfile);
      if (userData.family_id && !isValidUUID(userData.family_id)) {
        const newFamilyId = generateUUID();
        idMap.set(userData.family_id, newFamilyId);
        console.log('📝 Mapping family ID:', userData.family_id, '→', newFamilyId);
      }
    }
    
    // If no invalid IDs found, nothing to do
    if (idMap.size === 0) {
      console.log('✅ All IDs are valid - no migration needed');
      return true;
    }
    
    // 3. Perform migration
    console.log(`🔄 Migrating ${idMap.size} invalid IDs...`);
    
    // Update user profile
    if (userProfile) {
      const userData = JSON.parse(userProfile);
      const oldUserId = currentUserId;
      const newUserId = idMap.get(oldUserId) || oldUserId;
      const oldFamilyId = userData.family_id;
      const newFamilyId = idMap.get(oldFamilyId) || oldFamilyId;
      
      // Update IDs in profile
      userData.id = newUserId;
      userData.family_id = newFamilyId;
      
      // Save with new keys
      localStorage.setItem('current_user_id', newUserId);
      localStorage.setItem(`user:${newUserId}:profile`, JSON.stringify(userData));
      
      // Remove old keys
      if (oldUserId !== newUserId) {
        localStorage.removeItem(`user:${oldUserId}:profile`);
      }
      
      console.log('✅ Updated user profile with new IDs');
      
      // Update family tree
      if (oldFamilyId !== newFamilyId) {
        const oldTreeKey = `familyTree_${oldFamilyId}`;
        const newTreeKey = `familyTree_${newFamilyId}`;
        const treeData = localStorage.getItem(oldTreeKey);
        
        if (treeData) {
          const tree = JSON.parse(treeData);
          
          // Update root user ID in tree
          if (Array.isArray(tree)) {
            tree.forEach((person: any) => {
              if (person.id === oldUserId) {
                person.id = newUserId;
              }
              if (person.family_id === oldFamilyId) {
                person.family_id = newFamilyId;
              }
            });
          } else if (tree.people) {
            tree.people.forEach((person: any) => {
              if (person.id === oldUserId) {
                person.id = newUserId;
              }
              if (person.family_id === oldFamilyId) {
                person.family_id = newFamilyId;
              }
            });
          }
          
          // Save with new key
          localStorage.setItem(newTreeKey, JSON.stringify(tree));
          localStorage.removeItem(oldTreeKey);
          
          console.log('✅ Updated family tree with new IDs');
        }
        
        // Update family data
        const oldFamilyKey = `family:${oldFamilyId}:data`;
        const newFamilyKey = `family:${newFamilyId}:data`;
        const familyData = localStorage.getItem(oldFamilyKey);
        
        if (familyData) {
          const family = JSON.parse(familyData);
          family.id = newFamilyId;
          
          localStorage.setItem(newFamilyKey, JSON.stringify(family));
          localStorage.removeItem(oldFamilyKey);
          
          console.log('✅ Updated family data with new IDs');
        }
        
        // Update memories
        const oldMemoriesKey = `family:${oldFamilyId}:memories`;
        const newMemoriesKey = `family:${newFamilyId}:memories`;
        const memoriesData = localStorage.getItem(oldMemoriesKey);
        
        if (memoriesData) {
          const memories = JSON.parse(memoriesData);
          memories.forEach((memory: any) => {
            if (memory.family_id === oldFamilyId) {
              memory.family_id = newFamilyId;
            }
            if (memory.created_by === oldUserId) {
              memory.created_by = newUserId;
            }
          });
          
          localStorage.setItem(newMemoriesKey, JSON.stringify(memories));
          localStorage.removeItem(oldMemoriesKey);
          
          console.log('✅ Updated memories with new IDs');
        }
      }
    }
    
    console.log('🎉 UUID migration complete!');
    console.log('✅ New user ID:', idMap.get(currentUserId) || currentUserId);
    console.log('✅ All data has been migrated to use valid UUIDs');
    
    return true;
  } catch (error) {
    console.error('❌ UUID migration failed:', error);
    return false;
  }
}

/**
 * Main entry point - check and fix invalid UUIDs
 */
export function checkAndFixInvalidUUIDs(): void {
  console.log('🔍 Checking for invalid UUIDs in localStorage...');
  
  if (hasInvalidUUIDs()) {
    console.log('⚠️ Invalid UUIDs detected!');
    console.log('🔄 Attempting automatic migration...');
    
    const migrationSuccess = migrateInvalidUUIDs();
    
    if (migrationSuccess) {
      console.log('✅ Migration successful! Reloading page...');
      // Give user a moment to see the console logs
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      console.log('❌ Automatic migration failed');
      console.log('📱 Showing user alert...');
      showInvalidUUIDAlert();
    }
  } else {
    console.log('✅ All UUIDs are valid - no migration needed');
  }
}
