// Helper functions for MemoryBox app

import type { UserProfile, FamilyData, Memory } from './supabase/client';

/**
 * Check if user is the demo user
 */
export function isDemoUser(user: UserProfile | null): boolean {
  if (!user) return false;
  return user.email === 'ilicachauhan87@gmail.com' || user.id === 'demo-user-ilica-chauhan';
}

/**
 * Check if user has valid profile and family data
 */
export function hasValidUserAndFamily(user: UserProfile | null, family: FamilyData | null): boolean {
  return !!user && !!family && validateFamilyAccess(user, family);
}

/**
 * Format a date as relative time (e.g., "2 hours ago", "3 days ago")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  if (diffWeeks < 4) return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`;
  if (diffMonths < 12) return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`;
  return `${diffYears} ${diffYears === 1 ? 'year' : 'years'} ago`;
}

/**
 * Validate family access for privacy
 */
export function validateFamilyAccess(user: UserProfile | null, family: FamilyData | null): boolean {
  if (!user || !family) return false;
  
  // Check if user belongs to this family
  return user.family_id === family.id || family.members?.includes(user.id);
}

/**
 * Get user's family memories from database (with localStorage fallback)
 * ✅ DATABASE-FIRST: Loads from Supabase database for real-time accuracy
 * @param user - User profile object
 * @param family - Family data object
 * @param limit - Maximum number of memories to return (optional)
 */
export async function getUserFamilyMemories(
  user: UserProfile | string, 
  family: FamilyData | string, 
  limit?: number
): Promise<Memory[]> {
  try {
    // Handle both old signature (userId, familyId) and new signature (user, family, limit)
    let familyId: string;
    
    if (typeof family === 'string') {
      familyId = family;
    } else {
      familyId = family.id;
    }
    
    console.log(`🔍 getUserFamilyMemories called with:`, {
      familyId,
      limit,
      familyIdType: typeof family,
      isValidUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(familyId)
    });
    
    // ✅ DATABASE-FIRST: Load from Supabase database for accurate real-time counts
    try {
      const { DatabaseService } = await import('./supabase/persistent-database');
      const memories = await DatabaseService.getFamilyMemories(familyId, limit);
      console.log(`✅ getUserFamilyMemories: Loaded ${memories.length} memories from database for family ${familyId}`);
      if (memories.length > 0) {
        console.log(`📋 getUserFamilyMemories: First memory:`, {
          id: memories[0].id,
          title: memories[0].title,
          type: memories[0].memory_type || memories[0].type,
          created_at: memories[0].created_at
        });
      }
      return memories;
    } catch (dbError) {
      console.warn('⚠️ getUserFamilyMemories: Database load failed, falling back to localStorage:', dbError);
      
      // Fallback to localStorage
      const memoriesKey = `family:${familyId}:memories`;
      const stored = localStorage.getItem(memoriesKey);
      
      if (!stored) {
        console.log(`📦 getUserFamilyMemories: No localStorage data found for key: ${memoriesKey}`);
        return [];
      }
      
      const memories = JSON.parse(stored);
      const memoryArray = Array.isArray(memories) ? memories : [];
      
      console.log(`📦 getUserFamilyMemories: Loaded ${memoryArray.length} memories from localStorage`);
      
      // Apply limit if specified
      if (limit && limit > 0) {
        return memoryArray.slice(0, limit);
      }
      
      return memoryArray;
    }
  } catch (error) {
    console.error('❌ getUserFamilyMemories: Failed to get family memories:', error);
    return [];
  }
}

/**
 * Get user's family members from family tree in localStorage
 * 🔧 FIX: Now reads from actual family tree storage, not just family metadata
 * This ensures stats update for BOTH wizard-added AND manually-added members
 */
export async function getUserFamilyMembers(userId: string, familyId: string): Promise<any[]> {
  try {
    // 🔧 CRITICAL FIX: Read from family tree storage (where actual people data is stored)
    const treeKey = `familyTree_${familyId}`;
    const stored = localStorage.getItem(treeKey);
    
    console.log(`📊 getUserFamilyMembers: Loading from ${treeKey}`);
    
    if (!stored) {
      console.log(`   ⚠️ No family tree found in storage`);
      return [];
    }
    
    const treeData = JSON.parse(stored);
    
    // 🔧 Handle both old format (array) and new format (object with people array)
    const peopleArray = Array.isArray(treeData) ? treeData : treeData.people || [];
    
    console.log(`   ✅ Found ${peopleArray.length} family members in tree`);
    
    // Return family member data with name, relationship, and other details
    return peopleArray.map((person: any) => ({
      id: person.id,
      name: person.name || 'Unnamed',
      firstName: person.firstName,
      lastName: person.lastName,
      relationship: person.relationship || person.role,
      generation: person.generation,
      isRoot: person.isRoot,
      avatar: person.photo || undefined
    })).filter((m: any) => m.name && m.name !== 'Unnamed'); // Only include members with names
  } catch (error) {
    console.error('❌ Failed to get family members:', error);
    return [];
  }
}

/**
 * Get family insights and statistics
 */
export async function getFamilyInsights(userId: string, familyId: string): Promise<{
  totalMemories: number;
  thisWeek: number;
  mostActive: string;
  favoriteType: string;
  connectionStrength: number;
}> {
  try {
    const memories = await getUserFamilyMemories(userId, familyId);
    
    // Calculate thisWeek
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const thisWeek = memories.filter(m => {
      const createdAt = new Date(m.created_at || m.createdAt);
      return createdAt >= oneWeekAgo;
    }).length;
    
    // Calculate favorite type
    const typeCounts: { [key: string]: number } = {};
    memories.forEach(m => {
      const type = m.type || m.format || 'photo';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    
    let favoriteType = 'Photos';
    let maxCount = 0;
    Object.entries(typeCounts).forEach(([type, count]) => {
      if (count > maxCount) {
        maxCount = count;
        favoriteType = type.charAt(0).toUpperCase() + type.slice(1) + 's';
      }
    });
    
    return {
      totalMemories: memories.length,
      thisWeek,
      mostActive: 'You',
      favoriteType,
      connectionStrength: Math.min(100, memories.length * 10)
    };
  } catch (error) {
    console.error('Failed to get family insights:', error);
    return {
      totalMemories: 0,
      thisWeek: 0,
      mostActive: 'You',
      favoriteType: 'Photos',
      connectionStrength: 0
    };
  }
}

/**
 * Get "Today in Family History" - a memory from this day in previous years
 */
export async function getTodayInFamilyHistory(userId: string, familyId: string): Promise<any | null> {
  try {
    const memories = await getUserFamilyMemories(userId, familyId);
    
    if (memories.length === 0) return null;
    
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();
    
    // Find memories from this day in previous years
    const historicalMemories = memories.filter(m => {
      const memoryDate = new Date(m.created_at || m.createdAt);
      return memoryDate.getMonth() === currentMonth && 
             memoryDate.getDate() === currentDay &&
             memoryDate.getFullYear() < today.getFullYear();
    });
    
    // Return the most recent historical memory
    if (historicalMemories.length > 0) {
      return historicalMemories.sort((a, b) => {
        const dateA = new Date(a.created_at || a.createdAt);
        const dateB = new Date(b.created_at || b.createdAt);
        return dateB.getTime() - dateA.getTime();
      })[0];
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get today in history:', error);
    return null;
  }
}

/**
 * Get recent family activity
 */
export async function getRecentActivity(userId: string, familyId: string): Promise<any[]> {
  try {
    const memories = await getUserFamilyMemories(userId, familyId);
    
    // Convert memories to activity format
    const activities = memories.map(m => ({
      id: m.id,
      type: m.type || m.format || 'photo',
      title: m.title || 'Untitled Memory',
      description: m.description || '',
      created_at: m.created_at || m.createdAt,
      uploaded_by: m.uploaded_by
    }));
    
    // Sort by date (newest first)
    activities.sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return dateB.getTime() - dateA.getTime();
    });
    
    return activities;
  } catch (error) {
    console.error('Failed to get recent activity:', error);
    return [];
  }
}

/**
 * Get memory statistics
 */
export async function getMemoryStatistics(userId: string, familyId: string): Promise<{
  total: number;
  byType: { [key: string]: number };
  thisMonth: number;
  thisYear: number;
}> {
  try {
    const memories = await getUserFamilyMemories(userId, familyId);
    
    const byType: { [key: string]: number } = {};
    let thisMonth = 0;
    let thisYear = 0;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    memories.forEach(m => {
      const type = m.type || m.format || 'photo';
      byType[type] = (byType[type] || 0) + 1;
      
      const memoryDate = new Date(m.created_at || m.createdAt);
      if (memoryDate.getMonth() === currentMonth && memoryDate.getFullYear() === currentYear) {
        thisMonth++;
      }
      if (memoryDate.getFullYear() === currentYear) {
        thisYear++;
      }
    });
    
    return {
      total: memories.length,
      byType,
      thisMonth,
      thisYear
    };
  } catch (error) {
    console.error('Failed to get memory statistics:', error);
    return {
      total: 0,
      byType: {},
      thisMonth: 0,
      thisYear: 0
    };
  }
}

/**
 * Get icon name for memory type
 */
export function getMemoryIcon(type: string): string {
  switch (type) {
    case 'photo': return 'camera';
    case 'video': return 'video';
    case 'voice': return 'mic';
    case 'text':
    case 'story': return 'file-text';
    default: return 'heart';
  }
}

/**
 * Get color for memory type
 */
export function getMemoryColor(type: string): string {
  switch (type) {
    case 'photo': return 'text-blue-600';
    case 'video': return 'text-purple-600';
    case 'voice': return 'text-green-600';
    case 'text':
    case 'story': return 'text-amber-600';
    default: return 'text-primary';
  }
}
