/**
 * Profile Sync Service
 * 
 * Centralized service for syncing profile data between:
 * - User profile (localStorage: user:{id}:profile)
 * - Family tree (localStorage: familyTree_{familyId})
 * - Marriage data (stored in relationship metadata)
 * 
 * Ensures ProfilePage and FamilyMemberProfile stay in sync
 */

export interface ProfileData {
  id: string;
  firstName: string;
  middleName?: string;
  lastName?: string;
  maidenName?: string;
  gender: 'Male' | 'Female';
  status: 'Living' | 'Deceased';
  dateOfBirth?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  phone?: string;
  email?: string;
  bio?: string;
  photo?: string;
}

export interface MarriageData {
  anniversaryDate?: string;
  place?: string;
  notes?: string;
}

export interface SpouseInfo {
  id: string;
  firstName: string;
  lastName?: string;
  gender: 'Male' | 'Female';
  photo?: string;
  email?: string;
}

class ProfileSyncService {
  /**
   * Save root user profile to BOTH user data and family tree
   * Ensures complete bidirectional sync
   */
  async saveRootUserProfile(
    userId: string,
    familyId: string,
    profileData: ProfileData,
    marriageData?: MarriageData
  ): Promise<void> {
    console.log('📝 ProfileSyncService: Saving root user profile...');
    
    // 1. Save to user profile (localStorage)
    const userProfile = localStorage.getItem(`user:${userId}:profile`);
    if (userProfile) {
      const userData = JSON.parse(userProfile);
      const fullName = [profileData.firstName, profileData.middleName, profileData.lastName]
        .filter(Boolean)
        .join(' ');
      
      const updatedUser = {
        ...userData,
        first_name: profileData.firstName,
        firstName: profileData.firstName,
        middle_name: profileData.middleName,
        middleName: profileData.middleName,
        last_name: profileData.lastName,
        lastName: profileData.lastName,
        maiden_name: profileData.maidenName,
        maidenName: profileData.maidenName,
        gender: profileData.gender,
        status: profileData.status,
        name: fullName,
        display_name: fullName,
        email: profileData.email,
        phone: profileData.phone,
        bio: profileData.bio,
        date_of_birth: profileData.dateOfBirth,
        dateOfBirth: profileData.dateOfBirth,
        place_of_birth: profileData.birthPlace,
        placeOfBirth: profileData.birthPlace,
        death_date: profileData.deathDate,
        deathDate: profileData.deathDate,
        death_place: profileData.deathPlace,
        deathPlace: profileData.deathPlace,
        photo: profileData.photo,
        avatar: profileData.photo,
        updated_at: new Date().toISOString()
      };
      
      localStorage.setItem(`user:${userId}:profile`, JSON.stringify(updatedUser));
      console.log('✅ Root user profile saved to localStorage');
    }
    
    // 2. Save to family tree
    const treeData = localStorage.getItem(`familyTree_${familyId}`);
    if (treeData) {
      try {
        const tree = JSON.parse(treeData);
        const personIndex = tree.people?.findIndex((p: any) => p.id === userId || p.isRoot) 
          ?? tree.findIndex((p: any) => p.id === userId || p.isRoot);
        
        // Handle both old format (array) and new format (object with people array)
        const people = tree.people || tree;
        const relationships = tree.relationships || [];
        
        if (personIndex !== -1) {
          const fullName = [profileData.firstName, profileData.middleName, profileData.lastName]
            .filter(Boolean)
            .join(' ');
          
          people[personIndex] = {
            ...people[personIndex],
            firstName: profileData.firstName,
            middleName: profileData.middleName,
            lastName: profileData.lastName,
            maidenName: profileData.maidenName,
            gender: profileData.gender.toLowerCase() as 'male' | 'female',
            status: profileData.status.toLowerCase() as 'alive' | 'deceased',
            name: fullName,
            bio: profileData.bio,
            dateOfBirth: profileData.dateOfBirth,
            birthPlace: profileData.birthPlace,
            deathDate: profileData.deathDate,
            deathPlace: profileData.deathPlace,
            phone: profileData.phone,
            email: profileData.email,
            profilePicture: profileData.photo,
            photo: profileData.photo,
            updated_at: new Date().toISOString()
          };
          
          // Save back in correct format
          if (tree.people) {
            localStorage.setItem(`familyTree_${familyId}`, JSON.stringify({
              people: people,
              relationships: relationships,
              rootUserId: tree.rootUserId,
              generationLimits: tree.generationLimits
            }));
          } else {
            localStorage.setItem(`familyTree_${familyId}`, JSON.stringify(people));
          }
          
          console.log('✅ Root user profile synced to family tree');
        }
      } catch (error) {
        console.error('❌ Failed to sync profile to tree:', error);
      }
    }
    
    // 3. Save marriage data to relationship object
    if (marriageData) {
      await this.saveMarriageData(userId, familyId, marriageData);
    }
  }
  
  /**
   * Save marriage data to relationship object
   * IMPORTANT: Saves bidirectionally - both spouses see the same data
   */
  async saveMarriageData(
    personId: string,
    familyId: string,
    marriageData: MarriageData
  ): Promise<void> {
    console.log('💍 ProfileSyncService: Saving marriage data...');
    console.log('   Person ID:', personId);
    console.log('   Family ID:', familyId);
    console.log('   Marriage data:', marriageData);
    
    const treeData = localStorage.getItem(`familyTree_${familyId}`);
    if (!treeData) {
      console.error('❌ No tree data found for family ID:', familyId);
      return;
    }
    
    try {
      const tree = JSON.parse(treeData);
      
      // Handle both old format (array) and new format (object)
      const relationships = tree.relationships || [];
      const people = tree.people || tree;
      
      console.log('   Found', relationships.length, 'relationships in tree');
      
      // Find spouse relationship
      const spouseRelIndex = relationships.findIndex((rel: any) => 
        rel.type === 'spouse' && 
        (rel.from === personId || rel.to === personId)
      );
      
      if (spouseRelIndex !== -1) {
        const spouseRel = relationships[spouseRelIndex];
        console.log('   Found spouse relationship:', {
          from: spouseRel.from,
          to: spouseRel.to,
          type: spouseRel.type
        });
        
        // Update relationship with marriage metadata
        relationships[spouseRelIndex] = {
          ...relationships[spouseRelIndex],
          marriageMetadata: {
            anniversaryDate: marriageData.anniversaryDate || '',
            marriagePlace: marriageData.place || '',
            notes: marriageData.notes || '',
            updated_at: new Date().toISOString()
          }
        };
        
        // Save back to tree - always use new format
        const treeToSave = tree.people ? {
          people: tree.people,
          relationships: relationships,
          rootUserId: tree.rootUserId,
          generationLimits: tree.generationLimits
        } : {
          people: people,
          relationships: relationships,
          rootUserId: tree.rootUserId,
          generationLimits: tree.generationLimits
        };
        
        localStorage.setItem(`familyTree_${familyId}`, JSON.stringify(treeToSave));
        console.log('✅ Marriage data saved to relationship');
        console.log('   Saved data:', relationships[spouseRelIndex].marriageMetadata);
      } else {
        console.log('⚠️ No spouse relationship found for person ID:', personId);
        console.log('   Available relationships:', relationships.map((r: any) => ({
          type: r.type,
          from: r.from,
          to: r.to
        })));
      }
    } catch (error) {
      console.error('❌ Failed to save marriage data:', error);
    }
  }
  
  /**
   * Load marriage data from relationship object
   * IMPORTANT: Works bidirectionally - both spouses see the same data
   */
  async loadMarriageData(
    personId: string,
    familyId: string
  ): Promise<MarriageData | null> {
    console.log('💍 ProfileSyncService: Loading marriage data...');
    console.log('   Person ID:', personId);
    console.log('   Family ID:', familyId);
    
    const treeData = localStorage.getItem(`familyTree_${familyId}`);
    if (!treeData) {
      console.log('   ⚠️ No tree data found');
      return null;
    }
    
    try {
      const tree = JSON.parse(treeData);
      const relationships = tree.relationships || [];
      
      console.log('   Found', relationships.length, 'relationships in tree');
      
      const spouseRel = relationships.find((rel: any) => 
        rel.type === 'spouse' && 
        (rel.from === personId || rel.to === personId)
      );
      
      if (spouseRel) {
        console.log('   Found spouse relationship:', {
          from: spouseRel.from,
          to: spouseRel.to,
          hasMetadata: !!spouseRel.marriageMetadata
        });
        
        if (spouseRel.marriageMetadata) {
          const marriageData = {
            anniversaryDate: spouseRel.marriageMetadata.anniversaryDate || '',
            place: spouseRel.marriageMetadata.marriagePlace || '',
            notes: spouseRel.marriageMetadata.notes || ''
          };
          console.log('   ✅ Loaded marriage data:', marriageData);
          return marriageData;
        } else {
          console.log('   ℹ️ Spouse relationship exists but no marriage metadata');
        }
      } else {
        console.log('   ℹ️ No spouse relationship found for this person');
      }
    } catch (error) {
      console.error('❌ Failed to load marriage data:', error);
    }
    
    return null;
  }
  
  /**
   * Get spouse of a person
   */
  getSpouse(personId: string, familyId: string): SpouseInfo | null {
    const treeData = localStorage.getItem(`familyTree_${familyId}`);
    if (!treeData) return null;
    
    try {
      const tree = JSON.parse(treeData);
      const relationships = tree.relationships || [];
      const people = tree.people || tree;
      
      const spouseRel = relationships.find((rel: any) => 
        rel.type === 'spouse' && 
        (rel.from === personId || rel.to === personId)
      );
      
      if (!spouseRel) return null;
      
      const spouseId = spouseRel.from === personId 
        ? spouseRel.to 
        : spouseRel.from;
      
      const spouse = people.find((p: any) => p.id === spouseId);
      
      if (spouse) {
        return {
          id: spouse.id,
          firstName: spouse.firstName || spouse.name?.split(' ')[0] || 'Unknown',
          lastName: spouse.lastName || spouse.name?.split(' ').slice(1).join(' '),
          gender: spouse.gender === 'male' ? 'Male' : 'Female',
          photo: spouse.profilePicture || spouse.photo,
          email: spouse.email
        };
      }
    } catch (error) {
      console.error('❌ Failed to get spouse:', error);
    }
    
    return null;
  }
  
  /**
   * Calculate years married from anniversary date
   */
  getYearsMarried(anniversaryDate: string): number {
    if (!anniversaryDate) return 0;
    
    try {
      const anniversary = new Date(anniversaryDate);
      const today = new Date();
      const years = today.getFullYear() - anniversary.getFullYear();
      
      // Check if anniversary has passed this year
      const hasPassedThisYear = 
        today.getMonth() > anniversary.getMonth() ||
        (today.getMonth() === anniversary.getMonth() && today.getDate() >= anniversary.getDate());
      
      return hasPassedThisYear ? years : years - 1;
    } catch (error) {
      console.error('❌ Failed to calculate years married:', error);
      return 0;
    }
  }
  
  /**
   * Format date for display (DD-MM-YYYY)
   */
  formatDateForDisplay(dateString: string): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}-${month}-${year}`;
    } catch (error) {
      return dateString;
    }
  }
}

export const profileSyncService = new ProfileSyncService();
