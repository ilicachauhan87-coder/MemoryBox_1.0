/**
 * Family Member Sync Service
 * 
 * Centralized service to load and sync family members from the family tree
 * to all components that need family member lists (Add Memory, Journeys, Journal, Time Capsules).
 * 
 * This ensures consistent data across all features and provides real-time updates
 * when family members are added via wizards or manual additions.
 */

import { DatabaseService } from './supabase/persistent-database';

export interface FamilyMember {
  id: string;
  name: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  relationship?: string;
  role?: string;
  avatar?: string;
  photo?: string;
  gender?: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
}

// Event name for family tree updates
export const FAMILY_TREE_UPDATED_EVENT = 'familyTreeUpdated';

/**
 * Load all family members from the family tree
 * Handles both old format (array) and new format (object with people array)
 */
export async function loadFamilyMembers(
  familyId: string,
  options: {
    excludeCurrentUser?: boolean;
    currentUserId?: string;
    includeRootUser?: boolean;
  } = {}
): Promise<FamilyMember[]> {
  const {
    excludeCurrentUser = false,
    currentUserId = '',
    includeRootUser = true
  } = options;

  console.log('🔄 FamilyMemberSyncService: Loading family members');
  console.log('   Family ID:', familyId);
  console.log('   Exclude current user:', excludeCurrentUser);
  console.log('   Current user ID:', currentUserId);
  console.log('   Include root user:', includeRootUser);

  try {
    // Try to load from Supabase first
    let parsedTree: any = null;
    try {
      parsedTree = await DatabaseService.getFamilyTree(familyId);
      console.log('   ✅ Loaded from Supabase');
    } catch (error) {
      console.log('   ⚠️ Supabase unavailable, falling back to localStorage');
    }

    // Fallback to localStorage
    if (!parsedTree) {
      const treeData = localStorage.getItem(`familyTree_${familyId}`);
      if (treeData) {
        try {
          parsedTree = JSON.parse(treeData);
          console.log('   ✅ Loaded from localStorage');
        } catch (parseError) {
          console.error('   ❌ Failed to parse family tree data from localStorage:', parseError);
          return [];
        }
      }
    }

    if (!parsedTree) {
      console.log('   ⚠️ No family tree data found');
      return [];
    }

    // 🔧 CRITICAL FIX: Handle both old format (array) and new format (object with people array)
    let peopleArray: any[] = [];
    
    if (Array.isArray(parsedTree)) {
      // Old format: direct array of people
      peopleArray = parsedTree;
      console.log('   📦 Format: Old (array)');
    } else if (parsedTree && typeof parsedTree === 'object') {
      // New format: object with people property
      if (Array.isArray(parsedTree.people)) {
        peopleArray = parsedTree.people;
        console.log('   📦 Format: New (object with people array)');
      } else {
        console.error('   ❌ Invalid tree format: object without people array', parsedTree);
        return [];
      }
    } else {
      console.error('   ❌ Invalid tree format: not an array or object', parsedTree);
      return [];
    }
    
    console.log('   📊 Found', peopleArray.length, 'people in tree');

    // Convert tree data to family member format
    let members = peopleArray
      .filter((person: any) => {
        // Must have a name
        if (!person.name && !person.firstName) return false;
        
        // Filter out current user if requested
        if (excludeCurrentUser && currentUserId && person.id === currentUserId) {
          return false;
        }
        
        // Filter out root user if requested
        if (!includeRootUser && person.isRoot === true) {
          return false;
        }
        
        return true;
      })
      .map((person: any) => ({
        id: person.id,
        name: person.name || `${person.firstName || ''} ${person.lastName || ''}`.trim(),
        firstName: person.firstName,
        middleName: person.middleName,
        lastName: person.lastName,
        relationship: person.relationship || person.role || 'Family Member',
        role: person.role,
        avatar: person.photo || person.avatar,
        photo: person.photo,
        gender: person.gender,
        dateOfBirth: person.dateOfBirth,
        email: person.email,
        phone: person.phone
      }));

    console.log('   ✅ Loaded', members.length, 'family members');
    console.log('   📋 Members:', members.map(m => m.name).join(', '));

    return members;
  } catch (error) {
    console.error('❌ FamilyMemberSyncService: Error loading family members:', error);
    return [];
  }
}

/**
 * Emit event when family tree is updated
 * This allows all components to listen and refresh their family member lists
 */
export function notifyFamilyTreeUpdate(familyId: string, source: string = 'unknown') {
  console.log('📢 FamilyMemberSyncService: Broadcasting family tree update');
  console.log('   Family ID:', familyId);
  console.log('   Source:', source);
  
  const event = new CustomEvent(FAMILY_TREE_UPDATED_EVENT, {
    detail: { familyId, source, timestamp: Date.now() }
  });
  window.dispatchEvent(event);
  
  console.log('   ✅ Event dispatched');
}

/**
 * Hook to listen for family tree updates
 * Returns a cleanup function
 */
export function onFamilyTreeUpdate(callback: (detail: any) => void): () => void {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent;
    console.log('🔔 FamilyMemberSyncService: Family tree update received');
    callback(customEvent.detail);
  };

  window.addEventListener(FAMILY_TREE_UPDATED_EVENT, handler);
  console.log('👂 FamilyMemberSyncService: Listener registered');

  // Return cleanup function
  return () => {
    window.removeEventListener(FAMILY_TREE_UPDATED_EVENT, handler);
    console.log('🔕 FamilyMemberSyncService: Listener removed');
  };
}

/**
 * Subscribe to family member updates with automatic state update
 */
export function useFamilyMemberSync(
  familyId: string | undefined,
  currentUserId: string | undefined,
  setState: (members: FamilyMember[]) => void,
  options: {
    excludeCurrentUser?: boolean;
    includeRootUser?: boolean;
  } = {}
): () => void {
  const {
    excludeCurrentUser = false,
    includeRootUser = true
  } = options;

  console.log('🔗 FamilyMemberSyncService: Setting up sync');
  console.log('   Family ID:', familyId);
  console.log('   Current user ID:', currentUserId);

  // Initial load
  if (familyId) {
    loadFamilyMembers(familyId, {
      excludeCurrentUser,
      currentUserId: currentUserId || '',
      includeRootUser
    }).then(members => {
      console.log('   ✅ Initial load complete:', members.length, 'members');
      setState(members);
    });
  }

  // Listen for updates
  const cleanup = onFamilyTreeUpdate((detail) => {
    console.log('   🔄 Tree update detected, reloading members');
    if (familyId && detail.familyId === familyId) {
      loadFamilyMembers(familyId, {
        excludeCurrentUser,
        currentUserId: currentUserId || '',
        includeRootUser
      }).then(members => {
        console.log('   ✅ Reload complete:', members.length, 'members');
        setState(members);
      });
    }
  });

  return cleanup;
}

/**
 * Get the display name for a family member
 */
export function getFamilyMemberDisplayName(member: FamilyMember): string {
  if (member.name) return member.name;
  
  const parts = [member.firstName, member.middleName, member.lastName].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  
  return 'Unknown';
}

/**
 * Get the initials for a family member
 */
export function getFamilyMemberInitials(member: FamilyMember): string {
  const displayName = getFamilyMemberDisplayName(member);
  const parts = displayName.split(' ').filter(Boolean);
  
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
