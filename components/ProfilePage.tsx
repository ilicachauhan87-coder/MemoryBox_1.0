import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from 'sonner@2.0.3';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  FileText, 
  Camera,
  Shield, 
  Lock, 
  Eye,
  CheckCircle2,
  LogOut,
  ChevronLeft,
  Save,
  Heart
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useNavigate } from 'react-router-dom';
import { profileSyncService, type MarriageData, type SpouseInfo } from '../utils/profileSyncService';
import { formatDateForDisplay, formatDateForStorage, isValidDDMMYYYY, formatDateInput, getDateErrorMessage } from '../utils/dateHelpers';

interface ProfilePageProps {
  onBack?: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [spouse, setSpouse] = useState<SpouseInfo | null>(null);
  const [marriageData, setMarriageData] = useState<MarriageData>({
    anniversaryDate: '',
    place: '',
    notes: ''
  });
  const [profileData, setProfileData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    maiden_name: '',
    gender: '',
    status: 'Living', // DEFAULT: Living (root user is creating their own profile, so they must be alive)
    date_of_birth: '',
    place_of_birth: '',
    email: '',
    phone: '',
    location: '',
    bio: '',
    photo: '',
    photo_storage_path: '' // 🔒 PRIVATE BUCKET: Store path to refresh signed URLs
  });

  // Load user profile on mount and run migration for existing users
  useEffect(() => {
    loadUserProfile();
    migrateExistingUserData(); // Fire-and-forget async function
  }, []);
  
  // Listen for localStorage updates from sign-in normalization AND tree page updates
  useEffect(() => {
    console.log('👂 ProfilePage: Setting up storage event listeners...');
    
    const handleStorageUpdate = () => {
      console.log('🔄 ProfilePage: localStorage updated, reloading profile...');
      loadUserProfile();
    };

    const handleTreeUpdate = (event: any) => {
      console.log('📡 ProfilePage: Received familyTreeUpdated event from Tree page');
      console.log('   Event detail:', event.detail);
      if (event.detail?.source === 'profile-edit') {
        console.log('🔄 Tree page edited root user profile, reloading...');
        loadUserProfile();
      }
    };

    // 🔧 BIDIRECTIONAL SYNC FIX: Also reload when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('📱 ProfilePage visible again - reloading profile...');
        loadUserProfile();
      }
    };
    
    // Listen for custom storage events (from sign-in process)
    window.addEventListener('storage', handleStorageUpdate);
    window.addEventListener('userProfileUpdated', handleStorageUpdate);
    window.addEventListener('familyTreeUpdated', handleTreeUpdate);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    console.log('✅ ProfilePage: Event listeners registered (storage + userProfileUpdated + familyTreeUpdated + visibilitychange)');
    
    return () => {
      window.removeEventListener('storage', handleStorageUpdate);
      window.removeEventListener('userProfileUpdated', handleStorageUpdate);
      window.removeEventListener('familyTreeUpdated', handleTreeUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // Load spouse and marriage data when user is loaded
  useEffect(() => {
    if (currentUser && currentUser.family_id) {
      loadSpouseAndMarriageData();
    }
  }, [currentUser]);

  // Helper function to normalize gender (capitalize first letter for consistency)
  const normalizeGender = (gender: string): string => {
    if (!gender) return '';
    // Convert 'male' -> 'Male', 'female' -> 'Female', or keep as-is if already capitalized
    return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
  };

  // Helper function to normalize status (capitalize properly)
  const normalizeStatus = (status: string): string => {
    if (!status) return 'Living';
    const lower = status.toLowerCase();
    // Handle common variations
    if (lower === 'alive' || lower === 'living') return 'Living';
    if (lower === 'dead' || lower === 'deceased') return 'Deceased';
    // Capitalize first letter for other values
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  // Migration function for existing users - runs once on profile page load
  const migrateExistingUserData = async () => {
    const currentUserId = localStorage.getItem('current_user_id');
    if (!currentUserId) return;

    const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
    if (!userProfile) return;

    const userData = JSON.parse(userProfile);
    let needsUpdate = false;
    const updates: any = {};

    console.log('🔄 ProfilePage Migration - Checking existing user data...');

    // 1. Migrate status to "Living" if missing or set to "alive"
    const currentStatus = userData.status || '';
    const normalizedStatus = normalizeStatus(currentStatus);
    if (!currentStatus || currentStatus !== normalizedStatus) {
      updates.status = normalizedStatus;
      needsUpdate = true;
      console.log(`   ✅ Status migrated from "${currentStatus}" to "${normalizedStatus}"`);
    }

    // 2. Normalize gender if needed
    const currentGender = userData.gender || '';
    const normalizedGender = normalizeGender(currentGender);
    if (currentGender && currentGender !== normalizedGender) {
      updates.gender = normalizedGender;
      needsUpdate = true;
      console.log(`   ✅ Gender normalized from "${currentGender}" to "${normalizedGender}"`);
    }

    // 3. Update user profile if needed
    if (needsUpdate) {
      const updatedUser = {
        ...userData,
        ...updates,
        updated_at: new Date().toISOString()
      };
      localStorage.setItem(`user:${currentUserId}:profile`, JSON.stringify(updatedUser));
      console.log('   💾 User profile updated with migration changes');
    } else {
      console.log('   ℹ️ No migration needed - data already correct');
    }

    // 4. Sync with family tree if exists
    if (userData.family_id) {
      const treeData = localStorage.getItem(`familyTree_${userData.family_id}`);
      if (treeData) {
        try {
          const parsedTree = JSON.parse(treeData);
          // Handle both old format (array) and new format (object with people array)
          const tree = Array.isArray(parsedTree) ? parsedTree : parsedTree.people || [];
          const rootUserIndex = tree.findIndex((p: any) => 
            p.id === currentUserId || p.isRoot === true || p.email === userData.email
          );

          if (rootUserIndex !== -1) {
            let treeNeedsUpdate = false;
            const treeUpdates: any = {};

            // Migrate tree status
            const treeStatus = tree[rootUserIndex].status || '';
            const normalizedTreeStatus = normalizeStatus(treeStatus);
            if (!treeStatus || treeStatus !== normalizedTreeStatus) {
              treeUpdates.status = normalizedTreeStatus;
              treeNeedsUpdate = true;
              console.log(`   ✅ Tree status migrated from "${treeStatus}" to "${normalizedTreeStatus}"`);
            }

            // Migrate tree gender
            const treeGender = tree[rootUserIndex].gender || '';
            const normalizedTreeGender = normalizeGender(treeGender);
            if (treeGender && treeGender !== normalizedTreeGender) {
              treeUpdates.gender = normalizedTreeGender;
              treeNeedsUpdate = true;
              console.log(`   ✅ Tree gender normalized from "${treeGender}" to "${normalizedTreeGender}"`);
            }

            if (treeNeedsUpdate) {
              tree[rootUserIndex] = {
                ...tree[rootUserIndex],
                ...treeUpdates
              };
              // Save back in the same format we loaded
              const saveData = Array.isArray(parsedTree) ? tree : { people: tree, relationships: parsedTree.relationships || [] };
              localStorage.setItem(`familyTree_${userData.family_id}`, JSON.stringify(saveData));
              console.log('   💾 Family tree updated with migration changes');
              
              // 🔧 CRITICAL FIX: Also sync tree to database for bidirectional sync
              try {
                const { DatabaseService } = await import('../utils/supabase/persistent-database');
                await DatabaseService.saveFamilyTree(userData.family_id, saveData);
                console.log('   ✅ Migration sync: Tree → Database (bidirectional sync complete)');
              } catch (treeDbError) {
                console.warn('   ⚠️ Database tree sync failed (using localStorage only):', treeDbError);
                // Non-fatal - localStorage is the backup
              }
            }
          }
        } catch (e) {
          console.error('   ❌ Failed to migrate family tree data:', e);
        }
      }
    }

    console.log('🎉 ProfilePage Migration complete');
  };

  const loadSpouseAndMarriageData = async () => {
    if (!currentUser || !currentUser.family_id) return;
    
    console.log('💍 Loading spouse and marriage data...');
    
    // Get spouse info
    const spouseInfo = profileSyncService.getSpouse(currentUser.id, currentUser.family_id);
    if (spouseInfo) {
      setSpouse(spouseInfo);
      console.log('✅ Spouse loaded:', spouseInfo.firstName);
    } else {
      console.log('ℹ️ No spouse found');
    }
    
    // Get marriage data
    const marriage = await profileSyncService.loadMarriageData(currentUser.id, currentUser.family_id);
    if (marriage) {
      setMarriageData(marriage);
      console.log('✅ Marriage data loaded');
    } else {
      console.log('ℹ️ No marriage data found');
    }
  };

  const loadUserProfile = async () => {
    const currentUserId = localStorage.getItem('current_user_id');
    if (currentUserId) {
      const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
      if (userProfile) {
        const userData = JSON.parse(userProfile);
        
        // 🔍 DIAGNOSTIC: Check what data exists in localStorage
        console.log('🔍 ProfilePage loadUserProfile - Raw userData from localStorage:');
        console.log('   has_firstName:', !!userData.firstName);
        console.log('   firstName_value:', userData.firstName);
        console.log('   has_first_name:', !!userData.first_name);
        console.log('   first_name_value:', userData.first_name);
        console.log('   has_lastName:', !!userData.lastName);
        console.log('   lastName_value:', userData.lastName);
        console.log('   has_last_name:', !!userData.last_name);
        console.log('   last_name_value:', userData.last_name);
        console.log('   gender:', userData.gender);
        console.log('   email:', userData.email);
        console.log('   date_of_birth:', userData.date_of_birth);
        console.log('   dateOfBirth:', userData.dateOfBirth);
        
        setCurrentUser(userData);
        
        // Also check family tree for this user's profile
        console.log('🌳 Checking for family tree data...', {
          has_family_id: !!userData.family_id,
          family_id: userData.family_id
        });
        
        if (userData.family_id) {
          const treeData = localStorage.getItem(`familyTree_${userData.family_id}`);
          console.log('🌳 Tree data lookup result:', {
            has_treeData: !!treeData,
            storage_key: `familyTree_${userData.family_id}`
          });
          
          if (treeData) {
            try {
              const parsedTree = JSON.parse(treeData);
              // Handle both old format (array) and new format (object with people array)
              const tree = Array.isArray(parsedTree) ? parsedTree : parsedTree.people || [];
              const treeProfile = tree.find((p: any) => p.id === currentUserId || p.email === userData.email);
              
              if (treeProfile) {
                // Use tree profile data as the source of truth, with fallbacks
                // Normalize gender for consistency
                const gender = normalizeGender(treeProfile.gender || userData.gender || '');
                
                // DEBUG: Log gender values for troubleshooting
                console.log('🔍 ProfilePage Gender Debug:', {
                  treeGender: treeProfile.gender,
                  userGender: userData.gender,
                  normalizedGender: gender,
                  treeProfileId: treeProfile.id,
                  userId: currentUserId
                });
                
                // SYNC FIX: If user profile gender differs from tree gender, update tree immediately
                if (userData.gender && treeProfile.gender && 
                    normalizeGender(userData.gender) !== normalizeGender(treeProfile.gender)) {
                  console.warn('⚠️ Gender mismatch detected! User:', userData.gender, 'Tree:', treeProfile.gender);
                  console.log('🔄 Auto-syncing tree gender to match user profile...');
                  
                  // Update tree with correct gender from user profile
                  const treeIndex = tree.findIndex((p: any) => p.id === currentUserId || p.email === userData.email);
                  if (treeIndex !== -1) {
                    tree[treeIndex] = {
                      ...tree[treeIndex],
                      gender: normalizeGender(userData.gender)
                    };
                    // Save back in the same format we loaded
                    const saveData = Array.isArray(parsedTree) ? tree : { people: tree, relationships: parsedTree.relationships || [] };
                    localStorage.setItem(`familyTree_${userData.family_id}`, JSON.stringify(saveData));
                    console.log('✅ Tree gender synced:', normalizeGender(userData.gender));
                    
                    // 🔧 CRITICAL FIX: Also sync tree to database for bidirectional sync
                    try {
                      const { DatabaseService } = await import('../utils/supabase/persistent-database');
                      await DatabaseService.saveFamilyTree(userData.family_id, saveData);
                      console.log('✅ Gender sync: Tree → Database (bidirectional sync complete)');
                    } catch (treeDbError) {
                      console.warn('⚠️ Database tree sync failed (using localStorage only):', treeDbError);
                      // Non-fatal - localStorage is the backup
                    }
                  }
                }
                
                // 🔒 PRIVATE BUCKET: Refresh signed URL if needed
                const photoUrl = treeProfile.photo || userData.photo || userData.avatar || '';
                const photoStoragePath = treeProfile.photo_storage_path || userData.photo_storage_path || '';
                
                // Refresh signed URL asynchronously
                (async () => {
                  if (photoUrl && photoStoragePath) {
                    const { refreshPhotoUrlIfNeeded } = await import('../utils/supabase/profileStorage');
                    const freshUrl = await refreshPhotoUrlIfNeeded(photoUrl, photoStoragePath);
                    if (freshUrl && freshUrl !== photoUrl) {
                      console.log('🔄 Refreshed profile photo signed URL');
                      setProfileData(prev => ({ ...prev, photo: freshUrl }));
                    }
                  }
                })();
                
                // 🔧 BIDIRECTIONAL FIX: Check BOTH camelCase AND snake_case from tree
                const loadedProfileData = {
                  first_name: treeProfile.firstName || treeProfile.first_name || userData.firstName || userData.first_name || '',
                  middle_name: treeProfile.middleName || treeProfile.middle_name || userData.middleName || userData.middle_name || '',
                  last_name: treeProfile.lastName || treeProfile.last_name || userData.lastName || userData.last_name || '',
                  maiden_name: treeProfile.maidenName || treeProfile.maiden_name || userData.maidenName || userData.maiden_name || '',
                  gender: gender,
                  status: normalizeStatus(treeProfile.status || userData.status || ''),
                  date_of_birth: treeProfile.dateOfBirth || treeProfile.date_of_birth || userData.date_of_birth || userData.dateOfBirth || '',
                  place_of_birth: treeProfile.placeOfBirth || treeProfile.place_of_birth || treeProfile.birthPlace || userData.place_of_birth || userData.placeOfBirth || '',
                  email: treeProfile.email || userData.email || '',
                  phone: treeProfile.phone || userData.phone || '',
                  location: treeProfile.location || userData.location || '',
                  bio: treeProfile.bio || userData.bio || '',
                  photo: photoUrl,
                  photo_storage_path: photoStoragePath
                };
                
                // 🔍 DIAGNOSTIC: Log what we found in tree vs user profile
                console.log('📊 ProfilePage field mapping diagnostic:', {
                  maiden_name: {
                    tree_camelCase: treeProfile.maidenName,
                    tree_snake_case: treeProfile.maiden_name,
                    user_camelCase: userData.maidenName,
                    user_snake_case: userData.maiden_name,
                    final: loadedProfileData.maiden_name
                  },
                  phone: {
                    tree: treeProfile.phone,
                    user: userData.phone,
                    final: loadedProfileData.phone
                  },
                  location: {
                    tree: treeProfile.location,
                    user: userData.location,
                    final: loadedProfileData.location
                  },
                  bio: {
                    tree: treeProfile.bio,
                    user: userData.bio,
                    final: loadedProfileData.bio
                  },
                  place_of_birth: {
                    tree_placeOfBirth: treeProfile.placeOfBirth,
                    tree_place_of_birth: treeProfile.place_of_birth,
                    tree_birthPlace: treeProfile.birthPlace,
                    user_place_of_birth: userData.place_of_birth,
                    user_placeOfBirth: userData.placeOfBirth,
                    final: loadedProfileData.place_of_birth
                  }
                });
                
                console.log('✅ ProfilePage: Loading data from tree + user profile:', {
                  treeProfile_firstName: treeProfile.firstName,
                  userData_firstName: userData.firstName,
                  userData_first_name: userData.first_name,
                  final_first_name: loadedProfileData.first_name,
                  final_last_name: loadedProfileData.last_name,
                  final_gender: loadedProfileData.gender,
                  final_date_of_birth: loadedProfileData.date_of_birth
                });
                
                setProfileData(loadedProfileData);
                console.log('🎯 ProfilePage: setProfileData called with:', loadedProfileData);
                console.log('✅ Loaded profile from family tree for root user');
              } else {
                // Fallback to user data only
                // Normalize gender for consistency
                const gender = normalizeGender(userData.gender || '');
                
                // 🔒 PRIVATE BUCKET: Refresh signed URL if needed
                const photoUrl = userData.photo || userData.avatar || '';
                const photoStoragePath = userData.photo_storage_path || '';
                
                // Refresh signed URL asynchronously
                (async () => {
                  if (photoUrl && photoStoragePath) {
                    const { refreshPhotoUrlIfNeeded } = await import('../utils/supabase/profileStorage');
                    const freshUrl = await refreshPhotoUrlIfNeeded(photoUrl, photoStoragePath);
                    if (freshUrl && freshUrl !== photoUrl) {
                      console.log('🔄 Refreshed profile photo signed URL');
                      setProfileData(prev => ({ ...prev, photo: freshUrl }));
                    }
                  }
                })();
                
                const loadedProfileData = {
                  first_name: userData.firstName || userData.first_name || '',
                  middle_name: userData.middleName || userData.middle_name || '',
                  last_name: userData.lastName || userData.last_name || '',
                  maiden_name: userData.maidenName || userData.maiden_name || '',
                  gender: gender,
                  status: normalizeStatus(userData.status || ''),
                  date_of_birth: userData.date_of_birth || userData.dateOfBirth || '',
                  place_of_birth: userData.place_of_birth || userData.placeOfBirth || userData.birthPlace || '',
                  email: userData.email || '',
                  phone: userData.phone || '',
                  location: userData.location || '',
                  bio: userData.bio || '',
                  photo: photoUrl,
                  photo_storage_path: photoStoragePath
                };
                
                console.log('✅ ProfilePage: Loading data from user profile (no tree match):', {
                  userData_firstName: userData.firstName,
                  userData_first_name: userData.first_name,
                  final_first_name: loadedProfileData.first_name,
                  final_last_name: loadedProfileData.last_name,
                  final_gender: loadedProfileData.gender,
                  final_maiden_name: loadedProfileData.maiden_name,
                  final_phone: loadedProfileData.phone,
                  final_location: loadedProfileData.location,
                  final_bio: loadedProfileData.bio,
                  final_place_of_birth: loadedProfileData.place_of_birth
                });
                
                setProfileData(loadedProfileData);
                console.log('🎯 ProfilePage: setProfileData called with:', loadedProfileData);
              }
            } catch (e) {
              console.error('Failed to parse family tree data:', e);
            }
          } else {
            // Has family_id but no tree data yet - use user data only
            console.log('📋 Family ID exists but no tree data found - loading from user profile');
            const gender = normalizeGender(userData.gender || '');
            
            const loadedProfileData = {
              first_name: userData.firstName || userData.first_name || '',
              middle_name: userData.middleName || userData.middle_name || '',
              last_name: userData.lastName || userData.last_name || '',
              maiden_name: userData.maidenName || userData.maiden_name || '',
              gender: gender,
              status: normalizeStatus(userData.status || ''),
              date_of_birth: userData.date_of_birth || userData.dateOfBirth || '',
              place_of_birth: userData.place_of_birth || userData.placeOfBirth || userData.birthPlace || '',
              email: userData.email || '',
              phone: userData.phone || '',
              location: userData.location || '',
              bio: userData.bio || '',
              photo: userData.photo || userData.avatar || ''
            };
            
            console.log('✅ ProfilePage: Loading data from user profile (has family_id but no tree yet):', {
              userData_firstName: userData.firstName,
              userData_first_name: userData.first_name,
              final_first_name: loadedProfileData.first_name,
              final_last_name: loadedProfileData.last_name,
              final_gender: loadedProfileData.gender,
              final_maiden_name: loadedProfileData.maiden_name,
              final_phone: loadedProfileData.phone,
              final_location: loadedProfileData.location,
              final_bio: loadedProfileData.bio,
              final_place_of_birth: loadedProfileData.place_of_birth
            });
            
            setProfileData(loadedProfileData);
            console.log('🎯 ProfilePage: setProfileData called with:', loadedProfileData);
          }
        } else {
          // No family tree, use user data only
          // Normalize gender for consistency
          const gender = normalizeGender(userData.gender || '');
          
          const loadedProfileData = {
            first_name: userData.firstName || userData.first_name || '',
            middle_name: userData.middleName || userData.middle_name || '',
            last_name: userData.lastName || userData.last_name || '',
            maiden_name: userData.maidenName || userData.maiden_name || '',
            gender: gender,
            status: normalizeStatus(userData.status || ''),
            date_of_birth: userData.date_of_birth || userData.dateOfBirth || '',
            place_of_birth: userData.place_of_birth || userData.placeOfBirth || userData.birthPlace || '',
            email: userData.email || '',
            phone: userData.phone || '',
            location: userData.location || '',
            bio: userData.bio || '',
            photo: userData.photo || userData.avatar || ''
          };
          
          console.log('✅ ProfilePage: Loading data from user profile (no family tree):', {
            userData_firstName: userData.firstName,
            userData_first_name: userData.first_name,
            final_first_name: loadedProfileData.first_name,
            final_last_name: loadedProfileData.last_name,
            final_gender: loadedProfileData.gender,
            final_maiden_name: loadedProfileData.maiden_name,
            final_phone: loadedProfileData.phone,
            final_location: loadedProfileData.location,
            final_bio: loadedProfileData.bio,
            final_place_of_birth: loadedProfileData.place_of_birth
          });
          
          setProfileData(loadedProfileData);
          console.log('🎯 ProfilePage: setProfileData called with:', loadedProfileData);
        }
      }
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleMarriageDataChange = (field: keyof MarriageData, value: string) => {
    setMarriageData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 🔧 FIX: Handle photo upload with Supabase Storage to avoid localStorage quota issues
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show loading toast
    const toastId = toast.loading('Uploading photo...');

    try {
      const currentUserId = localStorage.getItem('current_user_id');
      if (!currentUserId) {
        throw new Error('User not found');
      }

      // Try to upload to Supabase Storage first (best option)
      try {
        const { uploadProfilePhoto } = await import('../utils/supabase/profileStorage');
        // For root user, personId and authenticatedUserId are the same
        const metadata = await uploadProfilePhoto(file, currentUserId, currentUserId);
        
        // 🔒 PRIVATE BUCKET: Save both signed URL and storage path
        setProfileData(prev => ({
          ...prev,
          photo: metadata.url, // Signed URL (valid for 1 year)
          photo_storage_path: metadata.storage_path // Path to refresh URL later
        }));
        
        toast.success('Photo uploaded successfully!', { id: toastId });
        console.log('✅ Photo uploaded to Supabase Storage (private bucket with signed URL)');
        console.log('   Storage path:', metadata.storage_path);
        
      } catch (supabaseError: any) {
        // Supabase upload failed - fall back to compressed localStorage
        console.warn('⚠️ Supabase upload failed, using localStorage fallback:', supabaseError.message);
        
        const { storePhotoLocally } = await import('../utils/supabase/profileStorage');
        const dataUrl = await storePhotoLocally(file, currentUserId);
        
        setProfileData(prev => ({
          ...prev,
          photo: dataUrl,
          photo_storage_path: '' // No storage path for localStorage photos
        }));
        
        toast.success('Photo saved (compressed)', { id: toastId });
        toast.info('Note: Photo stored locally. For better performance, set up Supabase Storage.', { duration: 5000 });
        console.log('✅ Photo compressed and stored in localStorage');
      }
      
    } catch (error: any) {
      console.error('❌ Failed to upload photo:', error);
      toast.error(error.message || 'Failed to upload photo', { id: toastId });
    }
  };

  const handleSaveProfile = async () => {
    // ✅ IMPROVED FIX: Check for incomplete dates BEFORE attempting to save
    const dobStr = (profileData.date_of_birth || '').trim();
    
    // 🔧 SMART VALIDATION: Helper to check if date is valid in ANY format
    const isCompleteDate = (dateStr: string): boolean => {
      if (!dateStr) return true; // Empty is fine
      
      console.log('🔍 ProfilePage isCompleteDate - Checking:', dateStr);
      
      // Check if it's valid DD-MM-YYYY format
      const isValidDisplay = isValidDDMMYYYY(dateStr);
      console.log('   DD-MM-YYYY validation result:', isValidDisplay);
      if (isValidDisplay) {
        return true;
      }
      
      // Check if it's valid YYYY-M-D or YYYY-MM-DD format (storage format)
      // This handles old data that might not have zero padding
      const storagePattern = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
      const match = dateStr.match(storagePattern);
      console.log('   Storage format match:', match ? 'YES' : 'NO');
      
      if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const day = parseInt(match[3], 10);
        
        console.log('   Parsed:', { year, month, day });
        
        // Validate ranges
        if (month < 1 || month > 12) {
          console.log('   ❌ Invalid month');
          return false;
        }
        if (day < 1 || day > 31) {
          console.log('   ❌ Invalid day');
          return false;
        }
        if (year < 1900 || year > 2100) {
          console.log('   ❌ Invalid year');
          return false;
        }
        
        // Check if valid day for month
        const daysInMonth = new Date(year, month, 0).getDate();
        if (day > daysInMonth) {
          console.log('   ❌ Day exceeds days in month');
          return false;
        }
        
        console.log('   ✅ Valid storage format date');
        return true;
      }
      
      console.log('   ❌ Not a recognized format');
      return false; // Not a recognized format
    };
    
    // ✅ MARRIAGE ANNIVERSARY APPROACH: No auto-clear, just normalize valid dates
    // Incomplete dates will be normalized to empty string automatically below
    // This matches exactly how marriage anniversary field works - no validation here
    
    console.log('📅 ProfilePage date validation:');
    console.log('   DOB:', dobStr || '(empty)');
    console.log('   Will be normalized during save process below...');
    
    setIsSaving(true);

    try {
      const currentUserId = localStorage.getItem('current_user_id');
      if (!currentUserId || !currentUser) {
        toast.error('User not found');
        setIsSaving(false);
        return;
      }

      // Construct full name from first, middle, last
      const fullName = [profileData.first_name, profileData.middle_name, profileData.last_name]
        .filter(Boolean)
        .join(' ');

      // 🔧 CRITICAL DATE FIX: Validate and normalize date before saving
      // NEVER save incomplete or invalid dates - they cause data corruption!
      const normalizedDOB = (() => {
        if (!profileData.date_of_birth) return '';
        
        const dobStr = profileData.date_of_birth.trim();
        
        // 🔧 NEW FIX: Use regex pattern to detect display format (handles single/double digit days/months)
        const displayFormatPattern = /^\d{1,2}-\d{1,2}-\d{4}$/;
        const storageFormatPattern = /^\d{4}-\d{1,2}-\d{1,2}$/;
        
        // Check if it's in display format (D-M-YYYY or DD-MM-YYYY)
        if (displayFormatPattern.test(dobStr)) {
          // Validate before converting
          if (isValidDDMMYYYY(dobStr)) {
            const converted = formatDateForStorage(dobStr);
            console.log('✅ DOB normalized from display to storage:', dobStr, '→', converted);
            return converted;
          } else {
            console.warn('⚠️ Invalid DOB format, not saving:', dobStr);
            return ''; // Don't save invalid dates!
          }
        }
        
        // Check if it's in storage format (YYYY-MM-DD)
        if (storageFormatPattern.test(dobStr)) {
          console.log('✅ DOB already in storage format:', dobStr);
          return dobStr; // Already in storage format
        }
        
        // 🔧 FIX: If it's incomplete, this should never happen because we validate above
        // But as a safety net, return empty string (the validation above prevents this)
        console.warn('⚠️ Incomplete DOB found during normalization (should have been caught earlier):', dobStr);
        return '';
      })();

      // Update user profile in localStorage
      const updatedUser = {
        ...currentUser,
        first_name: profileData.first_name,
        firstName: profileData.first_name,
        middle_name: profileData.middle_name,
        middleName: profileData.middle_name,
        last_name: profileData.last_name,
        lastName: profileData.last_name,
        maiden_name: profileData.maiden_name,
        maidenName: profileData.maiden_name,
        gender: profileData.gender,
        status: profileData.status,
        display_name: fullName,
        name: fullName,
        email: profileData.email,
        phone: profileData.phone,
        bio: profileData.bio,
        date_of_birth: normalizedDOB,  // 🔧 FIX: Use normalized date
        dateOfBirth: normalizedDOB,    // 🔧 FIX: Use normalized date
        place_of_birth: profileData.place_of_birth,
        placeOfBirth: profileData.place_of_birth,
        location: profileData.location,
        photo: profileData.photo,
        photo_storage_path: profileData.photo_storage_path, // 🔒 PRIVATE BUCKET: Save storage path
        avatar: profileData.photo,
        updated_at: new Date().toISOString()
      };

      localStorage.setItem(`user:${currentUserId}:profile`, JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);

      // 🔧 DATABASE-FIRST FIX: Save to Supabase database
      try {
        const { DatabaseService } = await import('../utils/supabase/persistent-database');
        await DatabaseService.updateUserProfile(currentUserId, updatedUser);
        console.log('✅ Profile saved to database');
      } catch (dbError) {
        // ❌ DATABASE-FIRST: If database fails, the operation fails
        console.error('❌ Database save failed:', dbError);
        setIsSaving(false);
        toast.error(`Failed to save profile: ${dbError instanceof Error ? dbError.message : 'Please check your internet connection.'}`);
        return; // Don't proceed if database save fails
      }

      // Sync with family tree if exists (ONLY for root user)
      if (currentUser.family_id) {
        const treeData = localStorage.getItem(`familyTree_${currentUser.family_id}`);
        if (treeData) {
          try {
            const parsedTree = JSON.parse(treeData);
            // Handle both old format (array) and new format (object with people array)
            const tree = Array.isArray(parsedTree) ? parsedTree : parsedTree.people || [];
            console.log('🔄 PROFILE PAGE - Syncing root user to tree...');
            console.log('   Tree has', tree.length, 'people before sync');
            
            const profileIndex = tree.findIndex((p: any) => p.id === currentUserId || p.email === currentUser.email);
            
            if (profileIndex !== -1) {
              // CRITICAL: Preserve ALL existing fields using spread operator
              // 🔧 FIX: COMPLETE SYNC - Always update all profile fields from ProfilePage to Tree
              tree[profileIndex] = {
                ...tree[profileIndex],  // Keep ALL existing data (relationships, gridSlot, position, etc.)
                firstName: profileData.first_name,
                middleName: profileData.middle_name || '',
                lastName: profileData.last_name || '',
                maidenName: profileData.maiden_name || '',
                gender: profileData.gender,
                status: profileData.status,
                name: fullName,
                bio: profileData.bio || '',
                dateOfBirth: normalizedDOB || '',
                placeOfBirth: profileData.place_of_birth || '',
                birthPlace: profileData.place_of_birth || '',
                deathDate: profileData.status === 'Deceased' ? (currentUser.death_date || currentUser.deathDate || '') : '',
                deathPlace: profileData.status === 'Deceased' ? (currentUser.death_place || currentUser.deathPlace || '') : '',
                location: profileData.location || '',
                phone: profileData.phone || '',
                photo: profileData.photo || '',
                photo_storage_path: profileData.photo_storage_path || '', // 🔒 PRIVATE BUCKET: Sync storage path
                profilePicture: profileData.photo || '',
                email: profileData.email || '',
                updated_at: new Date().toISOString()
              };

              // Save updated tree in the same format we loaded it
              const saveData = Array.isArray(parsedTree) ? tree : { people: tree, relationships: parsedTree.relationships || [] };
              localStorage.setItem(`familyTree_${currentUser.family_id}`, JSON.stringify(saveData));
              console.log('✅ Root user profile synced: Profile → Tree (localStorage)');
              console.log('   Tree still has', tree.length, 'people (ALL PRESERVED)');
              console.log('   Updated name:', fullName);
              console.log('   Updated gender:', profileData.gender);
              
              // 🔧 CRITICAL FIX: Also sync tree to database for bidirectional sync
              try {
                const { DatabaseService } = await import('../utils/supabase/persistent-database');
                await DatabaseService.saveFamilyTree(currentUser.family_id, saveData);
                console.log('✅ Root user profile synced: Profile → Tree → Database');
              } catch (treeDbError) {
                // ❌ DATABASE-FIRST: If tree sync fails, warn but don't block (tree might not exist yet)
                console.error('❌ Database tree sync failed:', treeDbError);
                toast.warning('Profile saved, but tree sync failed. Tree may not reflect changes immediately.');
              }
              
              // 🔧 BIDIRECTIONAL SYNC FIX: Dispatch events to notify tree page
              console.log('📡 ProfilePage: Dispatching events to notify Tree page of changes...');
              window.dispatchEvent(new CustomEvent('familyTreeUpdated', {
                detail: { source: 'profile-page', personId: currentUserId }
              }));
              window.dispatchEvent(new CustomEvent('userProfileUpdated', {
                detail: { userId: currentUserId, source: 'profile-page' }
              }));
              console.log('✅ Events dispatched: familyTreeUpdated + userProfileUpdated');
              
            } else {
              console.warn('⚠️ Root user not found in tree - cannot sync');
            }
          } catch (e) {
            console.error('❌ Failed to sync with family tree:', e);
          }
        } else {
          console.log('ℹ️ No tree data found - skipping sync');
        }
      }

      // 🆕 ENHANCED: Save marriage data using sync service
      if (currentUser.family_id && spouse) {
        await profileSyncService.saveMarriageData(
          currentUser.id,
          currentUser.family_id,
          marriageData
        );
        console.log('✅ Marriage data saved via sync service');
      }

      // 🎉 Check if profile is now complete and celebrate!
      const isProfileComplete = profileData.first_name && 
                               profileData.last_name && 
                               profileData.gender && 
                               normalizedDOB && 
                               profileData.photo;
      
      if (isProfileComplete) {
        const { celebrateProfileComplete } = await import('../utils/confettiService');
        celebrateProfileComplete();
      }
      
      toast.success('✅ Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = () => {
    // Clear user session
    localStorage.removeItem('current_user_id');
    toast.success('👋 Signed out successfully!');
    navigate('/');
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getFullName = () => {
    return [profileData.first_name, profileData.middle_name, profileData.last_name]
      .filter(Boolean)
      .join(' ') || 'Your Name';
  };

  // Format date from YYYY-MM-DD to DD-MM-YYYY for display
  const formatDateForDisplay = (dateString: string): string => {
    if (!dateString) return '';
    try {
      const [year, month, day] = dateString.split('-');
      if (year && month && day) {
        return `${day}-${month}-${year}`;
      }
      return dateString;
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-background vibrant-texture pb-24 sm:pb-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Page Title */}
        <div className="text-center space-y-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary">My Profile</h1>
            <p className="text-base sm:text-lg text-muted-foreground mt-0.5">Manage your account</p>
          </div>

          <div className="flex items-center justify-center gap-2">
            {!isEditing ? (
              <Button
                onClick={() => setIsEditing(true)}
                className="bg-gradient-to-br from-primary to-secondary text-primary-foreground hover:opacity-90 h-11 sm:h-12 px-5 sm:px-6"
              >
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                <span className="hidden sm:inline">Edit Profile</span>
                <span className="sm:hidden">Edit</span>
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    loadUserProfile();
                  }}
                  className="h-11 sm:h-12 px-4 sm:px-5"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="bg-gradient-to-br from-aqua to-teal-600 text-white hover:opacity-90 h-11 sm:h-12 px-4 sm:px-6"
                >
                  <Save className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Profile Photo & Basic Info */}
        <Card className="memory-card">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
              <div className="relative">
                <Avatar className="h-28 w-28 sm:h-32 sm:w-32 border-4 border-primary/20">
                  <AvatarImage src={profileData.photo} alt={getFullName()} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-3xl sm:text-4xl text-white">
                    {getInitials(getFullName())}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <label className="absolute bottom-0 right-0 bg-aqua hover:bg-aqua/90 text-white rounded-full p-2.5 sm:p-3 cursor-pointer shadow-lg transition-all">
                    <Camera className="h-5 w-5 sm:h-6 sm:w-6" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <div className="flex-1 text-center sm:text-left w-full">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                  {getFullName()}
                </h2>
                <p className="text-lg sm:text-xl text-muted-foreground mb-2">
                  {profileData.email}
                </p>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  {profileData.gender && (
                    <div className="inline-flex items-center gap-1.5 bg-gradient-to-br from-violet/20 to-primary/20 px-3 py-1.5 rounded-full">
                      <span className="text-base sm:text-lg font-medium text-primary">
                        {profileData.gender}
                      </span>
                    </div>
                  )}
                  {profileData.status && (
                    <div className="inline-flex items-center gap-1.5 bg-gradient-to-br from-aqua/20 to-teal-500/20 px-3 py-1.5 rounded-full">
                      <span className="text-base sm:text-lg font-medium text-aqua">
                        {profileData.status}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="memory-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl sm:text-3xl">
              <User className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
              Personal Information
            </CardTitle>
            <CardDescription className="text-base sm:text-lg">
              Your personal details exactly as they appear in the family tree
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 sm:space-y-6">
            {/* First Name */}
            <div className="space-y-2.5">
              <Label htmlFor="first_name" className="text-lg sm:text-xl flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                First Name *
              </Label>
              <Input
                id="first_name"
                value={profileData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                disabled={!isEditing}
                placeholder="Enter your first name"
                className="h-12 sm:h-14 text-lg sm:text-xl"
              />
            </div>

            {/* Middle Name */}
            <div className="space-y-2.5">
              <Label htmlFor="middle_name" className="text-lg sm:text-xl flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                Middle Name
              </Label>
              <Input
                id="middle_name"
                value={profileData.middle_name}
                onChange={(e) => handleInputChange('middle_name', e.target.value)}
                disabled={!isEditing}
                placeholder="Enter your middle name (optional)"
                className="h-12 sm:h-14 text-lg sm:text-xl"
              />
            </div>

            {/* Last Name */}
            <div className="space-y-2.5">
              <Label htmlFor="last_name" className="text-lg sm:text-xl flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Last Name *
              </Label>
              <Input
                id="last_name"
                value={profileData.last_name}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
                disabled={!isEditing}
                placeholder="Enter your last name"
                className="h-12 sm:h-14 text-lg sm:text-xl"
              />
            </div>

            {/* Maiden Name */}
            <div className="space-y-2.5">
              <Label htmlFor="maiden_name" className="text-lg sm:text-xl flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                Maiden Name
              </Label>
              <Input
                id="maiden_name"
                value={profileData.maiden_name}
                onChange={(e) => handleInputChange('maiden_name', e.target.value)}
                disabled={!isEditing}
                placeholder="Enter maiden name (if applicable)"
                className="h-12 sm:h-14 text-lg sm:text-xl"
              />
            </div>

            {/* Gender */}
            <div className="space-y-2.5">
              <Label htmlFor="gender" className="text-lg sm:text-xl flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Gender *
              </Label>
              <Select
                value={profileData.gender}
                onValueChange={(value) => handleInputChange('gender', value)}
                disabled={!isEditing}
              >
                <SelectTrigger className="h-12 sm:h-14 text-lg sm:text-xl">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male" className="text-lg sm:text-xl">Male</SelectItem>
                  <SelectItem value="Female" className="text-lg sm:text-xl">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2.5">
              <Label htmlFor="status" className="text-lg sm:text-xl flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                Status *
              </Label>
              <Select
                value={profileData.status}
                onValueChange={(value) => handleInputChange('status', value)}
                disabled={!isEditing}
              >
                <SelectTrigger className="h-12 sm:h-14 text-lg sm:text-xl">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Living" className="text-lg sm:text-xl">Living</SelectItem>
                  <SelectItem value="Deceased" className="text-lg sm:text-xl">Deceased</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator className="my-6" />

            {/* Date of Birth */}
            <div className="space-y-2.5">
              <Label htmlFor="dob" className="text-lg sm:text-xl flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Date of Birth (DOB)
              </Label>
              {isEditing ? (
                <div>
                  <Input
                    id="dob"
                    type="text"
                    value={(() => {
                      const dob = profileData.date_of_birth || '';
                      // If it's in storage format (YYYY-MM-DD), convert to display format
                      if (dob.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
                        return formatDateForDisplay(dob);
                      }
                      // Otherwise, show as-is (user is typing)
                      return dob;
                    })()}
                    onChange={(e) => {
                      // Just store exactly what user types - let them type freely
                      const input = e.target.value;
                      // Auto-format: add dashes as user types numbers
                      const formatted = formatDateInput(input);
                      handleInputChange('date_of_birth', formatted);
                    }}
                    onBlur={(e) => {
                      // ONLY on blur: validate and convert to storage format
                      const displayValue = e.target.value.trim();
                      
                      console.log('📅 DOB onBlur - User entered:', displayValue);
                      
                      if (!displayValue) {
                        // Empty is okay - just clear it
                        handleInputChange('date_of_birth', '');
                        console.log('   ✓ Cleared (empty field)');
                        return;
                      }
                      
                      // Check if it matches DD-MM-YYYY pattern (complete date)
                      if (isValidDDMMYYYY(displayValue)) {
                        const storageValue = formatDateForStorage(displayValue);
                        handleInputChange('date_of_birth', storageValue);
                        console.log('   ✓ Converted to storage format:', storageValue);
                      } else {
                        // Invalid or incomplete - keep as-is so user can continue editing
                        console.log('   ⚠️  Incomplete or invalid (keeping for user to fix)');
                      }
                    }}
                    placeholder="Type 8 digits: DDMMYYYY (e.g., 15031990)"
                    maxLength={10}
                    className="h-12 sm:h-14 text-lg sm:text-xl"
                  />
                  {(() => {
                    const dob = profileData.date_of_birth || '';
                    // Only show error if date is in display format AND invalid
                    // Don't show error for storage format (YYYY-MM-DD) - that means it's already validated
                    const isStorageFormat = dob.match(/^\d{4}-\d{1,2}-\d{1,2}$/);
                    const isDisplayFormat = dob.match(/^\d{1,2}-\d{1,2}-\d{4}$/);
                    
                    if (isStorageFormat) {
                      // Already validated and in storage format - no error
                      return null;
                    }
                    
                    // ✅ NEW: Check if incomplete (user started typing but hasn't finished)
                    if (dob && dob.length > 0 && dob.length < 10) {
                      return (
                        <p className="text-sm text-amber-600 mt-1 flex items-center gap-1">
                          <span>⚠️</span>
                          <span>Complete the date (need {10 - dob.length} more characters)</span>
                        </p>
                      );
                    }
                    
                    if (isDisplayFormat && !isValidDDMMYYYY(dob)) {
                      // In display format but invalid date
                      return <p className="text-sm text-destructive mt-1">Please enter valid date (DD-MM-YYYY)</p>;
                    }
                    
                    return null;
                  })()}
                </div>
              ) : (
                <div className="h-12 sm:h-14 px-3 py-2 bg-muted/50 rounded-lg border border-input flex items-center">
                  <span className="text-lg sm:text-xl text-foreground">
                    {profileData.date_of_birth ? formatDateForDisplay(profileData.date_of_birth) : 'Not set'}
                  </span>
                </div>
              )}
            </div>

            {/* Place of Birth */}
            <div className="space-y-2.5">
              <Label htmlFor="pob" className="text-lg sm:text-xl flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Place of Birth (POB)
              </Label>
              <Input
                id="pob"
                value={profileData.place_of_birth}
                onChange={(e) => handleInputChange('place_of_birth', e.target.value)}
                disabled={!isEditing}
                placeholder="City, State, Country"
                className="h-12 sm:h-14 text-lg sm:text-xl"
              />
            </div>

            <Separator className="my-6" />

            <h3 className="text-xl sm:text-2xl font-semibold text-foreground flex items-center gap-2">
              <Mail className="h-6 w-6 text-primary" />
              Contact Information
            </h3>

            {/* Email */}
            <div className="space-y-2.5">
              <Label htmlFor="email" className="text-lg sm:text-xl flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={profileData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={!isEditing}
                placeholder="your.email@example.com"
                className="h-12 sm:h-14 text-lg sm:text-xl"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2.5">
              <Label htmlFor="phone" className="text-lg sm:text-xl flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                value={profileData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                disabled={!isEditing}
                placeholder="+91 98765 43210"
                className="h-12 sm:h-14 text-lg sm:text-xl"
              />
            </div>

            {/* Current Location */}
            <div className="space-y-2.5">
              <Label htmlFor="location" className="text-lg sm:text-xl flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Current Location
              </Label>
              <Input
                id="location"
                value={profileData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                disabled={!isEditing}
                placeholder="City, State, Country"
                className="h-12 sm:h-14 text-lg sm:text-xl"
              />
            </div>

            <Separator className="my-6" />

            {/* Biography */}
            <div className="space-y-2.5">
              <Label htmlFor="bio" className="text-lg sm:text-xl flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Biography
              </Label>
              <Textarea
                id="bio"
                value={profileData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                disabled={!isEditing}
                placeholder="Tell us about yourself... Share your story, interests, and memories."
                rows={6}
                className="text-lg sm:text-xl resize-y"
                maxLength={1000}
              />
              <p className="text-sm sm:text-base text-muted-foreground">
                {profileData.bio.length}/1000 characters
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ✨ NEW SECTION: Marriage Information */}
        {spouse && (
          <Card className="memory-card border-coral/30 bg-gradient-to-br from-coral/5 to-pink-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl sm:text-3xl text-coral">
                <Heart className="h-7 w-7 sm:h-8 sm:w-8" />
                Marriage Information
              </CardTitle>
              <CardDescription className="text-base sm:text-lg text-pink-800">
                Your spouse and marriage details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 sm:space-y-6">
              {/* Spouse Card */}
              <div className="flex items-center gap-4 p-4 sm:p-5 bg-gradient-to-br from-coral/10 to-pink-100 rounded-lg border-2 border-coral/20">
                <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 border-coral">
                  <AvatarImage src={spouse.photo} alt={spouse.firstName} />
                  <AvatarFallback className="bg-coral text-white text-xl sm:text-2xl">
                    {getInitials(spouse.firstName + ' ' + (spouse.lastName || ''))}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm sm:text-base text-muted-foreground mb-1">Spouse</p>
                  <h3 className="text-xl sm:text-2xl font-semibold text-foreground">
                    {spouse.firstName} {spouse.lastName || ''}
                  </h3>
                  <p className="text-base sm:text-lg text-muted-foreground">
                    {spouse.gender === 'Male' ? 'Husband' : 'Wife'}
                  </p>
                </div>
              </div>

              {/* Marriage Anniversary */}
              <div className="space-y-2.5">
                <Label htmlFor="anniversary" className="text-lg sm:text-xl flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-coral" />
                  Marriage Anniversary Date
                </Label>
                {isEditing ? (
                  <div>
                    <Input
                      id="anniversary"
                      type="text"
                      value={formatDateForDisplay(marriageData.anniversaryDate || '')}
                      onChange={(e) => {
                        const formatted = formatDateInput(e.target.value);
                        handleMarriageDataChange('anniversaryDate', formatted);
                      }}
                      onBlur={(e) => {
                        // Convert to storage format on blur
                        const displayValue = e.target.value;
                        if (displayValue && isValidDDMMYYYY(displayValue)) {
                          const storageValue = formatDateForStorage(displayValue);
                          handleMarriageDataChange('anniversaryDate', storageValue);
                        }
                      }}
                      placeholder="DD-MM-YYYY (e.g., 15-06-2015)"
                      maxLength={10}
                      className="h-12 sm:h-14 text-lg sm:text-xl"
                    />
                    {marriageData.anniversaryDate && !isValidDDMMYYYY(formatDateForDisplay(marriageData.anniversaryDate || '')) && (
                      <p className="text-sm text-destructive mt-1">Please enter date in DD-MM-YYYY format</p>
                    )}
                  </div>
                ) : (
                  <div className="p-4 sm:p-5 bg-white rounded-lg border border-coral/20">
                    <p className="text-lg sm:text-xl font-medium text-foreground">
                      {marriageData.anniversaryDate 
                        ? profileSyncService.formatDateForDisplay(marriageData.anniversaryDate)
                        : 'Not set'
                      }
                    </p>
                    {marriageData.anniversaryDate && (
                      <p className="text-base sm:text-lg text-coral mt-2">
                        🎉 {profileSyncService.getYearsMarried(marriageData.anniversaryDate)} years married
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Marriage Place */}
              <div className="space-y-2.5">
                <Label htmlFor="marriage-place" className="text-lg sm:text-xl flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-coral" />
                  Marriage Place
                </Label>
                <Input
                  id="marriage-place"
                  value={marriageData.place || ''}
                  onChange={(e) => handleMarriageDataChange('place', e.target.value)}
                  disabled={!isEditing}
                  placeholder="City, State, Country"
                  className="h-12 sm:h-14 text-lg sm:text-xl"
                />
              </div>

              {/* Marriage Notes */}
              <div className="space-y-2.5">
                <Label htmlFor="marriage-notes" className="text-lg sm:text-xl flex items-center gap-2">
                  <FileText className="h-5 w-5 text-coral" />
                  Marriage Story (Optional)
                </Label>
                <Textarea
                  id="marriage-notes"
                  value={marriageData.notes || ''}
                  onChange={(e) => handleMarriageDataChange('notes', e.target.value)}
                  disabled={!isEditing}
                  placeholder="Share your marriage story, how you met, special memories..."
                  rows={4}
                  className="text-lg sm:text-xl resize-none"
                  maxLength={500}
                />
                <p className="text-sm sm:text-base text-muted-foreground">
                  {(marriageData.notes || '').length}/500 characters
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security & Privacy */}
        <Card className="memory-card border-aqua/30 bg-gradient-to-br from-aqua/5 to-teal-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl sm:text-3xl text-aqua">
              <Shield className="h-7 w-7 sm:h-8 sm:w-8" />
              Security & Privacy
            </CardTitle>
            <CardDescription className="text-base sm:text-lg text-teal-800">
              Your data is safe with us
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-5">
            <Alert className="border-aqua/30 bg-white">
              <CheckCircle2 className="h-6 w-6 text-aqua" />
              <AlertDescription className="text-base sm:text-lg text-foreground ml-2">
                <strong className="block mb-2">End-to-End Privacy</strong>
                Your memories and family data are stored locally on your device and are never shared without your explicit permission.
              </AlertDescription>
            </Alert>

            <Alert className="border-aqua/30 bg-white">
              <Lock className="h-6 w-6 text-aqua" />
              <AlertDescription className="text-base sm:text-lg text-foreground ml-2">
                <strong className="block mb-2">Complete Data Control</strong>
                You have full control over your data. You can edit, delete, or export your information at any time.
              </AlertDescription>
            </Alert>

            <Alert className="border-aqua/30 bg-white">
              <Eye className="h-6 w-6 text-aqua" />
              <AlertDescription className="text-base sm:text-lg text-foreground ml-2">
                <strong className="block mb-2">Family-Only Sharing</strong>
                Your memories are only visible to family members you explicitly invite. No third parties have access to your content.
              </AlertDescription>
            </Alert>

            <div className="bg-white rounded-lg p-4 sm:p-5 border border-aqua/20">
              <h4 className="text-lg sm:text-xl font-semibold text-foreground mb-2 sm:mb-3">
                How We Protect Your Data:
              </h4>
              <ul className="space-y-2 text-base sm:text-lg text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-aqua mt-1 flex-shrink-0" />
                  <span>All data is encrypted and stored securely</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-aqua mt-1 flex-shrink-0" />
                  <span>No advertisements or third-party tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-aqua mt-1 flex-shrink-0" />
                  <span>Regular security updates and backups</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-aqua mt-1 flex-shrink-0" />
                  <span>Compliant with data protection regulations</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Admin Dashboard Access (Only visible for admin email) */}
        {currentUser?.email?.toLowerCase() === 'ilicachauhan87@gmail.com' && (
          <Card className="memory-card border-violet/30 bg-gradient-to-br from-violet/5 to-purple-50">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
                <div className="text-center sm:text-left">
                  <h3 className="text-xl sm:text-2xl font-semibold text-violet mb-2">
                    🔐 Admin Dashboard
                  </h3>
                  <p className="text-base sm:text-lg text-muted-foreground">
                    View MVP validation metrics and user feedback
                  </p>
                </div>
                <Button
                  onClick={() => navigate('/admin/dashboard')}
                  className="h-12 sm:h-14 px-6 sm:px-8 text-lg sm:text-xl w-full sm:w-auto bg-violet hover:bg-violet/90"
                >
                  <Shield className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                  Open Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sign Out */}
        <Card className="memory-card border-destructive/30 bg-gradient-to-br from-destructive/5 to-red-50">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
              <div className="text-center sm:text-left">
                <h3 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">
                  Sign Out of MemoryBox
                </h3>
                <p className="text-base sm:text-lg text-muted-foreground">
                  You can always sign back in anytime
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={handleSignOut}
                className="h-12 sm:h-14 px-6 sm:px-8 text-lg sm:text-xl w-full sm:w-auto"
              >
                <LogOut className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sync Notice */}
        <div className="text-center py-4">
          <p className="text-base sm:text-lg text-muted-foreground">
            ✨ Changes sync automatically with your family tree profile
          </p>
        </div>
      </div>
    </div>
  );
};
