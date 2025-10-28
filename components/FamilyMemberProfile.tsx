import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Card, CardContent } from './ui/card';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { X, Save, Edit, Camera, User, Check, AlertCircle, Upload, Heart, Calendar, MapPin } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { validateEmail, validatePhone, formatPhone, validateDates, getValidationErrors } from '../utils/profileValidation';
import { uploadProfilePhoto, storePhotoLocally, refreshPhotoUrlIfNeeded } from '../utils/supabase/profileStorage';
import { profileSyncService, type SpouseInfo, type MarriageData } from '../utils/profileSyncService';
import { formatDateForDisplay, formatDateForStorage, isValidDDMMYYYY, formatDateInput, getDateErrorMessage } from '../utils/dateHelpers';
import { useRelationship } from '../utils/useRelationship';

interface InteractivePerson {
  id: string;
  firstName: string;
  lastName?: string;
  middleName?: string;
  maidenName?: string;
  gender: 'male' | 'female';
  status: 'alive' | 'deceased';
  generation: -2 | -1 | 0 | 1 | 2;
  profilePicture?: string;
  photo_storage_path?: string; // ✅ NEW: For Supabase Storage
  isRoot?: boolean;
  position: { x: number; y: number };
  gridSlot?: number;
  dateOfBirth?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  phone?: string;
  email?: string;
  location?: string; // 🔧 NEW: Current location field
  bio?: string;
}

interface FamilyMemberProfileProps {
  person: InteractivePerson;
  onClose: () => void;
  onSave: (updatedPerson: InteractivePerson, marriageData?: MarriageData) => void;
  isMobile?: boolean;
  familyId?: string; // For loading spouse and marriage data
}

export const FamilyMemberProfile: React.FC<FamilyMemberProfileProps> = ({
  person,
  onClose,
  onSave,
  isMobile = false,
  familyId
}) => {
  // 🧬 Get current user ID and find the root user in the tree
  const currentUserId = localStorage.getItem('current_user_id');
  const [rootPersonId, setRootPersonId] = useState<string | undefined>(undefined);
  
  // Find the root user's person ID in the family tree
  useEffect(() => {
    if (!currentUserId || !familyId) {
      console.log('❌ FamilyMemberProfile: Missing currentUserId or familyId');
      console.log('   currentUserId:', currentUserId);
      console.log('   familyId:', familyId);
      setRootPersonId(undefined);
      return;
    }

    // Load family tree to find root user's person ID
    const treeData = localStorage.getItem(`familyTree_${familyId}`);
    console.log('🔍 FamilyMemberProfile: Loading tree data for familyId:', familyId);
    console.log('   Tree data exists:', !!treeData);
    
    if (treeData) {
      try {
        const tree = JSON.parse(treeData);
        const people = Array.isArray(tree) ? tree : tree.people || [];
        
        console.log('📊 FamilyMemberProfile: Tree loaded');
        console.log('   Format:', Array.isArray(tree) ? 'Array' : 'Object');
        console.log('   Total people:', people.length);
        console.log('   All person IDs:', people.map((p: any) => ({ id: p.id, name: p.firstName, isRoot: p.isRoot })));
        
        // ✅ FIX 3: ENHANCED ROOT DETECTION with multiple fallback methods
        let rootPerson = null;
        
        // Method 1: isRoot flag
        rootPerson = people.find((p: any) => p.isRoot === true);
        console.log('   Method 1 (isRoot flag):', rootPerson ? `✅ Found ${rootPerson.firstName}` : '❌ Not found');
        
        // Method 2: Match user ID
        if (!rootPerson) {
          rootPerson = people.find((p: any) => p.id === currentUserId);
          console.log('   Method 2 (user ID):', rootPerson ? `✅ Found ${rootPerson.firstName}` : '❌ Not found');
        }
        
        // Method 3: Match email
        if (!rootPerson) {
          const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
          if (userProfile) {
            const userData = JSON.parse(userProfile);
            rootPerson = people.find((p: any) => p.email === userData.email);
            console.log('   Method 3 (email):', rootPerson ? `✅ Found ${rootPerson.firstName}` : '❌ Not found');
          }
        }
        
        // Method 4: First person in generation 0
        if (!rootPerson) {
          rootPerson = people.find((p: any) => p.generation === 0);
          console.log('   Method 4 (generation 0):', rootPerson ? `⚠️ Fallback to ${rootPerson.firstName}` : '❌ Not found');
        }
        
        if (rootPerson) {
          console.log('✅ Found root person:', rootPerson.firstName, 'ID:', rootPerson.id);
          
          // ✅ FIX 3: Auto-fix missing isRoot flag
          if (!rootPerson.isRoot) {
            console.log('🔧 Fixing missing isRoot flag on', rootPerson.firstName);
            rootPerson.isRoot = true;
            
            // Save back to storage
            const saveData = Array.isArray(tree) ? people : tree;
            if (Array.isArray(tree)) {
              localStorage.setItem(`familyTree_${familyId}`, JSON.stringify(people));
            } else {
              tree.people = people;
              localStorage.setItem(`familyTree_${familyId}`, JSON.stringify(tree));
            }
            console.log('✅ isRoot flag fixed and saved');
            
            // 🔧 CRITICAL FIX: Also sync tree to database for bidirectional sync
            (async () => {
              try {
                const { DatabaseService } = await import('../utils/supabase/persistent-database');
                await DatabaseService.saveFamilyTree(familyId, saveData);
                console.log('✅ isRoot fix synced: Tree → Database (bidirectional sync complete)');
              } catch (treeDbError) {
                console.warn('⚠️ Database tree sync failed (using localStorage only):', treeDbError);
                // Non-fatal - localStorage is the backup
              }
            })();
          }
          
          setRootPersonId(rootPerson.id);
        } else {
          console.error('❌ Could not find root person using ANY method!');
          console.error('   Available people:', people.map((p: any) => ({ id: p.id, name: p.firstName, generation: p.generation })));
        }
      } catch (error) {
        console.error('❌ Error loading family tree for relationship calc:', error);
      }
    } else {
      console.log('ℹ️ No tree data found in localStorage - this is normal for new users or before tree is created');
      console.log('   Family ID:', familyId);
      console.log('   Expected after: User completes onboarding and creates first family member');
    }
  }, [currentUserId, familyId]);
  
  // 🧬 Calculate relationship to current user (root person)
  const relationship = useRelationship(
    rootPersonId,
    person.id,
    rootPersonId
  );

  // 🔍 DEBUG: Log relationship calculation
  useEffect(() => {
    console.log('\n🧬 FamilyMemberProfile - Relationship Debug:');
    console.log('   Current User ID:', currentUserId);
    console.log('   Root Person ID (for calculation):', rootPersonId);
    console.log('   Person ID (viewing):', person.id);
    console.log('   Person Name:', person.firstName);
    console.log('   Person Is Root:', person.isRoot);
    
    // Check if engine is initialized
    const { relationshipEngine } = require('../utils/relationshipDerivationEngine');
    const isEngineReady = relationshipEngine.graph !== null;
    console.log('   🔧 Engine Status:', isEngineReady ? '✅ Initialized' : '❌ Not Initialized');
    
    if (isEngineReady) {
      const stats = relationshipEngine.getStats();
      console.log('   📊 Engine Stats:', stats);
      console.log('   🔍 People in graph:', Array.from(relationshipEngine.graph.nodes.keys()));
    }
    
    console.log('   🎯 Relationship Result:', relationship);
    if (relationship) {
      console.log('   ✅ Relationship found:', relationship.label);
      console.log('      Type:', relationship.type);
      console.log('      Lineage:', relationship.lineage);
      console.log('      Description:', relationship.description);
    } else {
      console.log('   ❌ No relationship calculated');
      console.log('   🔍 Troubleshooting:');
      if (!rootPersonId) {
        console.log('      ⚠️ Root person ID not found!');
      }
      if (!isEngineReady) {
        console.log('      ⚠️ Relationship engine not initialized!');
      }
      if (person.isRoot) {
        console.log('      ℹ️ This person is the root user (yourself)');
      }
    }
    console.log('\n');
  }, [currentUserId, rootPersonId, person.id, person.firstName, person.isRoot, relationship]);

  const [isEditMode, setIsEditMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [spouse, setSpouse] = useState<SpouseInfo | null>(null);
  const [marriageData, setMarriageData] = useState<MarriageData>({
    anniversaryDate: '',
    place: '',
    notes: ''
  });
  const [hasMarriageChanges, setHasMarriageChanges] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<InteractivePerson>(() => {
    // 🔍 DIAGNOSTIC: Log incoming person status
    console.log('🔍 FamilyMemberProfile Initial State - Person Status:', {
      personId: person.id,
      personName: person.name || person.firstName,
      isRoot: person.isRoot,
      rawStatus: person.status,
      statusType: typeof person.status,
      normalizedStatus: person.status?.toLowerCase()
    });
    
    // 🔧 CRITICAL FIX: For root user, ALWAYS force status to 'alive'
    // Don't rely on stored data which might be corrupted
    const currentUserId = localStorage.getItem('current_user_id');
    const isRootUser = person.isRoot === true || person.id === currentUserId;
    
    let finalStatus: 'alive' | 'deceased';
    if (isRootUser) {
      // Root user is ALWAYS alive (they're using the app!)
      finalStatus = 'alive';
      console.log('✅ Root user detected - FORCING status to alive (was:', person.status, ')');
    } else {
      // For other users, use stored status or default to alive
      finalStatus = (person.status?.toLowerCase() as 'alive' | 'deceased') || 'alive';
    }
    
    return {
      ...person,
      // Normalize gender to lowercase for consistency with select options
      gender: (person.gender?.toLowerCase() as 'male' | 'female') || 'male',
      // ✅ FIX: Use calculated final status
      status: finalStatus
    };
  });
  
  // Auto-save timer
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update form data when person changes
  useEffect(() => {
    console.log('🟡 FamilyMemberProfile useEffect: person prop changed, resetting formData:', {
      personId: person.id,
      firstName: person.firstName,
      dateOfBirth: person.dateOfBirth,
      deathDate: person.deathDate,
      rawStatus: person.status
    });
    
    // 🔧 CRITICAL FIX: For root user, ALWAYS force status to 'alive'
    const currentUserId = localStorage.getItem('current_user_id');
    const isRootUser = person.isRoot === true || person.id === currentUserId;
    
    let finalStatus: 'alive' | 'deceased';
    if (isRootUser) {
      // Root user is ALWAYS alive (they're using the app!)
      finalStatus = 'alive';
      console.log('✅ Root user detected in useEffect - FORCING status to alive (was:', person.status, ')');
    } else {
      // For other users, use stored status or default to alive
      finalStatus = (person.status?.toLowerCase() as 'alive' | 'deceased') || 'alive';
    }
    
    setFormData({
      ...person,
      // Normalize gender to lowercase for consistency with select options
      gender: (person.gender?.toLowerCase() as 'male' | 'female') || 'male',
      // ✅ FIX: Use calculated final status
      status: finalStatus
    });
  }, [person]);
  
  // Load spouse and marriage data
  useEffect(() => {
    if (person?.id && familyId) {
      loadSpouseAndMarriageData();
    }
  }, [person?.id, familyId]);
  
  // 🔧 AUTO-FIX: Correct root user status in stored tree if it's wrong
  useEffect(() => {
    const currentUserId = localStorage.getItem('current_user_id');
    const isRootUser = person.isRoot === true || person.id === currentUserId;
    
    // If this is the root user and their stored status is not 'alive', fix it immediately
    if (isRootUser && person.status !== 'alive' && familyId) {
      console.log('🔧 AUTO-FIX: Detected root user with incorrect status, correcting in tree...');
      console.log('   Current stored status:', person.status);
      console.log('   Correcting to: alive');
      
      // Create corrected data
      const correctedPerson = {
        ...person,
        status: 'alive' as const
      };
      
      // Save the correction immediately (without user interaction)
      onSave(correctedPerson, undefined);
      
      console.log('✅ Root user status auto-corrected and saved to tree');
    }
  }, [person.id, person.status, person.isRoot, familyId]);
  
  const loadSpouseAndMarriageData = async () => {
    if (!person?.id || !familyId) return;
    
    console.log('💍 Loading spouse and marriage data...');
    
    // Get spouse info
    const spouseInfo = profileSyncService.getSpouse(person.id, familyId);
    if (spouseInfo) {
      console.log('✅ Spouse loaded:', spouseInfo.firstName);
      setSpouse(spouseInfo);
    } else {
      console.log('ℹ️ No spouse found');
    }
    
    // Get marriage data
    const marriage = await profileSyncService.loadMarriageData(person.id, familyId);
    if (marriage) {
      console.log('✅ Marriage data loaded:', marriage);
      setMarriageData(marriage);
    } else {
      console.log('ℹ️ No marriage data found');
      // Reset marriage data if none found
      setMarriageData({
        anniversaryDate: '',
        place: '',
        notes: ''
      });
    }
  };

  // Debounced auto-save
  const debouncedSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    
    saveTimerRef.current = setTimeout(() => {
      if (hasChanges) {
        handleSave();
      }
    }, 2000); // Auto-save 2 seconds after user stops typing
  }, [hasChanges]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const updateField = useCallback((field: keyof InteractivePerson, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    
    // 🔧 FIX: Disable auto-save for ALL text input fields to prevent truncation
    // Only allow auto-save for simple dropdown/select fields
    // This ensures users can complete their entire input before saving
    const textInputFields = [
      'firstName', 'middleName', 'lastName', 'maidenName',
      'bio', 'phone', 'email', 'birthPlace', 'deathPlace'
    ];
    const shouldDisableAutoSave = textInputFields.includes(field);
    
    if (isEditMode && !shouldDisableAutoSave) {
      debouncedSave();
    }
  }, [isEditMode, debouncedSave]);

  const handleMarriageDataChange = (field: keyof MarriageData, value: string) => {
    setMarriageData(prev => ({ ...prev, [field]: value }));
    setHasMarriageChanges(true);
  };

  const handleSave = useCallback(async () => {
    console.log('💾 FamilyMemberProfile handleSave called');
    console.log('   📥 Current formData.dateOfBirth:', formData.dateOfBirth);
    console.log('   📥 Current formData.deathDate:', formData.deathDate);
    
    // ✅ IMPROVED FIX: Check for incomplete dates BEFORE attempting to save
    const dobStr = (formData.dateOfBirth || '').trim();
    const dodStr = (formData.deathDate || '').trim();
    
    // 🔧 SMART VALIDATION: Helper to check if date is valid in ANY format
    const isCompleteDate = (dateStr: string): boolean => {
      if (!dateStr) return true; // Empty is fine
      
      console.log('🔍 isCompleteDate - Checking:', dateStr);
      
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
    
    console.log('📅 Date validation:');
    console.log('   DOB:', dobStr || '(empty)');
    console.log('   Death Date:', dodStr || '(empty)');
    console.log('   Both will be normalized during save process below...');
    
    // Validate fields
    const errors = getValidationErrors({
      email: formData.email,
      phone: formData.phone,
      birthDate: formData.dateOfBirth,
      deathDate: formData.deathDate
    });
    
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }
    
    setIsSaving(true);
    
    // Format phone number and capitalize gender for consistency
    const capitalizedGender = formData.gender.charAt(0).toUpperCase() + formData.gender.slice(1);
    
    // 🔧 CRITICAL DATE FIX: Validate and normalize dates before saving
    // NEVER save incomplete or invalid dates - they cause data corruption!
    const normalizedDOB = (() => {
      if (!formData.dateOfBirth) return '';
      
      const dobStr = formData.dateOfBirth.trim();
      
      // 🔧 NEW FIX: Use regex pattern to detect display format (handles single/double digit days/months)
      // Pattern: D-M-YYYY or DD-MM-YYYY or D-MM-YYYY or DD-M-YYYY
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
    
    const normalizedDeathDate = (() => {
      if (!formData.deathDate) return '';
      
      const deathStr = formData.deathDate.trim();
      
      // 🔧 NEW FIX: Use regex pattern to detect display format (handles single/double digit days/months)
      const displayFormatPattern = /^\d{1,2}-\d{1,2}-\d{4}$/;
      const storageFormatPattern = /^\d{4}-\d{1,2}-\d{1,2}$/;
      
      // Check if it's in display format (D-M-YYYY or DD-MM-YYYY)
      if (displayFormatPattern.test(deathStr)) {
        // Validate before converting
        if (isValidDDMMYYYY(deathStr)) {
          const converted = formatDateForStorage(deathStr);
          console.log('✅ Death date normalized from display to storage:', deathStr, '→', converted);
          return converted;
        } else {
          console.warn('⚠️ Invalid death date format, not saving:', deathStr);
          return '';
        }
      }
      
      // Check if it's in storage format (YYYY-MM-DD)
      if (storageFormatPattern.test(deathStr)) {
        console.log('✅ Death date already in storage format:', deathStr);
        return deathStr; // Already in storage format
      }
      
      // 🔧 FIX: If it's incomplete, this should never happen because we validate above
      // But as a safety net, return empty string (the validation above prevents this)
      console.warn('⚠️ Incomplete death date found during normalization (should have been caught earlier):', deathStr);
      return '';
    })();
    
    // 🔧 CRITICAL FIX: For root user, ALWAYS ensure status is 'alive'
    const currentUserId = localStorage.getItem('current_user_id');
    const isRootUser = formData.isRoot === true || formData.id === currentUserId;
    const finalStatus = isRootUser ? 'alive' : formData.status;
    
    if (isRootUser && formData.status !== 'alive') {
      console.log('✅ CORRECTING root user status before save:', formData.status, '→ alive');
    }
    
    // 🔧 CRITICAL FIX: Preserve ALL field values exactly as they are (including empty strings)
    // NEVER convert empty strings to undefined because the ?? operator in parent will fall back to old data!
    const updatedData: InteractivePerson = {
      ...formData,
      gender: capitalizedGender as 'male' | 'female',
      // Format phone if it has content, otherwise keep it as-is (empty string or undefined)
      phone: formData.phone && formData.phone.trim() ? formatPhone(formData.phone) : formData.phone,
      // 🔧 FIX: Use normalized dates in storage format
      dateOfBirth: normalizedDOB,
      deathDate: normalizedDeathDate,
      // 🔧 FIX: Ensure root user status is always 'alive'
      status: finalStatus
    };
    
    console.log('📤 FamilyMemberProfile sending to parent:');
    console.log('   ✅ Normalized dateOfBirth:', normalizedDOB);
    console.log('   ✅ Normalized deathDate:', normalizedDeathDate);
    console.log('   📦 Full updatedData:', updatedData);
    
    // 🔧 CRITICAL FIX: Pass marriage data to parent so it can update the tree state
    // This prevents the tree state save from overwriting the marriage metadata
    const marriageDataToSave = (hasMarriageChanges && spouse) ? marriageData : undefined;
    
    // ✅ FIX: Make save synchronous and wait for completion before allowing close
    try {
      onSave(updatedData, marriageDataToSave);
      setHasChanges(false);
      setHasMarriageChanges(false);
      toast.success('Profile saved successfully!');
    } catch (error: any) {
      console.error('❌ Save failed:', error);
      toast.error('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  }, [formData, onSave, hasMarriageChanges, spouse, marriageData]);

  const handleClose = useCallback(() => {
    // ✅ FIX: Prevent close while saving (prevents page hang)
    if (isSaving || uploadingPhoto) {
      toast.info('Please wait for save to complete...');
      return;
    }
    
    if ((hasChanges || hasMarriageChanges) && isEditMode) {
      setShowUnsavedWarning(true);
    } else {
      onClose();
    }
  }, [hasChanges, hasMarriageChanges, isEditMode, isSaving, uploadingPhoto, onClose]);

  // ✅ FIX: Use Supabase Storage (like ProfilePage) instead of base64 localStorage
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setUploadingPhoto(true);
    const toastId = toast.loading('Uploading photo...');
    
    try {
      const currentUserId = localStorage.getItem('current_user_id');
      if (!currentUserId) {
        throw new Error('User not found');
      }
      
      // ✅ FIX: Try Supabase Storage first (prevents localStorage bloat and page hangs)
      // Pass BOTH the authenticated user ID (for RLS) and the family member ID (for organization)
      try {
        const metadata = await uploadProfilePhoto(file, person.id, currentUserId);
        
        // 🔒 Save both signed URL and storage path
        updateField('profilePicture', metadata.url);
        setFormData(prev => ({
          ...prev,
          profilePicture: metadata.url,
          photo_storage_path: metadata.storage_path
        }));
        
        toast.success('Photo uploaded successfully!', { id: toastId });
        console.log('✅ Photo uploaded to Supabase Storage');
        console.log('   Person ID:', person.id);
        console.log('   Authenticated User ID:', currentUserId);
        console.log('   Storage path:', metadata.storage_path);
        
      } catch (supabaseError: any) {
        // Fallback to localStorage (compressed) if Supabase unavailable
        console.warn('⚠️ Supabase upload failed, using localStorage:', supabaseError.message);
        
        const dataUrl = await storePhotoLocally(file, person.id);
        
        updateField('profilePicture', dataUrl);
        setFormData(prev => ({
          ...prev,
          profilePicture: dataUrl,
          photo_storage_path: '' // No storage path for localStorage
        }));
        
        toast.success('Photo saved (compressed)', { id: toastId });
        toast.info('Photo stored locally. For better performance, set up Supabase Storage.', { duration: 3000 });
      }
      
    } catch (error: any) {
      console.error('❌ Failed to upload photo:', error);
      toast.error(error.message || 'Failed to upload photo', { id: toastId });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleToggleEditMode = () => {
    if (isEditMode && (hasChanges || hasMarriageChanges)) {
      // Save before exiting edit mode
      handleSave();
    }
    setIsEditMode(!isEditMode);
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-[100]"
        onClick={handleClose}
      />
      
      {/* Profile Drawer/Modal */}
      <div 
        className={`fixed z-[101] bg-white shadow-2xl ${
          isMobile 
            ? 'inset-0' // Full-screen on mobile
            : 'top-0 right-0 bottom-0 w-[70%] max-w-2xl' // Drawer on desktop
        } flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 md:px-6 md:py-4 z-10 flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            {/* Profile Photo & Name */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {/* Photo */}
              <div className="relative flex-shrink-0">
                {formData.profilePicture ? (
                  <img
                    src={formData.profilePicture}
                    alt={formData.firstName}
                    className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-2xl md:text-3xl font-medium text-white ${
                    formData.gender === 'male' 
                      ? formData.status === 'deceased' ? 'bg-gray-400' : 'bg-blue-400'
                      : formData.status === 'deceased' ? 'bg-gray-400' : 'bg-pink-400'
                  }`}>
                    {formData.firstName.charAt(0)}
                  </div>
                )}
                
                {/* Upload Photo Button */}
                {isEditMode && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="absolute -bottom-1 -right-1 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-2 shadow-lg transition-colors disabled:opacity-50"
                    title="Upload photo"
                  >
                    {uploadingPhoto ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>
              
              {/* Name & Badges */}
              <div className="flex-1 min-w-0">
                {isEditMode ? (
                  <div className="space-y-1">
                    <Input
                      value={formData.firstName}
                      onChange={(e) => updateField('firstName', e.target.value)}
                      className="text-xl md:text-2xl font-medium p-1 h-auto border-b border-gray-300"
                      placeholder="First name"
                    />
                  </div>
                ) : (
                  <h2 className="text-xl md:text-2xl font-medium truncate">
                    {formData.firstName} {formData.lastName || ''}
                  </h2>
                )}
                
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {formData.isRoot && (
                    <Badge variant="default" className="text-sm bg-yellow-500 text-black font-semibold">
                      👤 You (Your Profile)
                    </Badge>
                  )}
                  
                  {/* 🧬 RELATIONSHIP BADGE - Prominently displayed! */}
                  {relationship && !formData.isRoot && relationship.label && (
                    <Badge variant="default" className="text-sm bg-violet text-white font-semibold px-3 py-1">
                      👥 {relationship.label}
                    </Badge>
                  )}
                  
                  {/* Show "Calculating..." if relationship engine is working */}
                  {!formData.isRoot && !relationship && rootPersonId && (
                    <Badge variant="outline" className="text-sm text-gray-500">
                      Calculating relationship...
                    </Badge>
                  )}
                  
                  <Badge 
                    variant={formData.status?.toLowerCase() === 'alive' ? 'default' : 'secondary'} 
                    className="text-xs"
                  >
                    {formData.status?.toLowerCase() === 'alive' ? '🟢 Living' : '🕊️ Deceased'}
                  </Badge>
                  
                  <Badge variant="outline" className="text-xs">
                    Generation {formData.generation}
                  </Badge>
                </div>
                
                {/* 🧬 RELATIONSHIP DESCRIPTION - Shows relationship context */}
                {relationship && !formData.isRoot && relationship.lineage && (
                  <div className="mt-2 p-2 bg-violet/10 rounded-md">
                    <p className="text-sm text-violet font-medium">
                      📍 {relationship.lineage === 'maternal' ? 'Maternal side' : relationship.lineage === 'paternal' ? 'Paternal side' : 'Family'} relationship
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {(hasChanges || hasMarriageChanges) && (
                <div className="flex items-center gap-1 text-xs text-orange-600">
                  {isSaving ? (
                    <>
                      <div className="w-3 h-3 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                      <span className="hidden md:inline">Saving...</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3" />
                      <span className="hidden md:inline">Unsaved</span>
                    </>
                  )}
                </div>
              )}
              
              <Button
                variant={isEditMode ? "default" : "outline"}
                size="sm"
                onClick={handleToggleEditMode}
                disabled={isSaving}
                className={`gap-1 ${isEditMode && (hasChanges || hasMarriageChanges) ? 'bg-green-600 hover:bg-green-700' : ''}`}
              >
                {isEditMode ? (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{(hasChanges || hasMarriageChanges) ? 'Save' : 'Done'}</span>
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4" />
                    <span className="hidden md:inline">Edit</span>
                  </>
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                disabled={isSaving || uploadingPhoto}
                className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
                title={isSaving || uploadingPhoto ? 'Saving in progress...' : 'Close'}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Name Change Warning for Root User */}
            {person.isRoot && isEditMode && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <AlertDescription className="text-amber-800 text-base">
                  <strong>Note:</strong> Name changes require manual save. Click the <strong>"Save"</strong> button after completing all name fields to prevent data loss.
                </AlertDescription>
              </Alert>
            )}
            
            {/* Personal Information */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* First Name */}
                  <div className="space-y-2">
                    <Label>First Name *</Label>
                    {isEditMode ? (
                      <Input
                        value={formData.firstName}
                        onChange={(e) => updateField('firstName', e.target.value)}
                        placeholder="Enter first name"
                      />
                    ) : (
                      <p className="text-gray-900">{formData.firstName || '—'}</p>
                    )}
                  </div>
                  
                  {/* Middle Name */}
                  <div className="space-y-2">
                    <Label>Middle Name</Label>
                    {isEditMode ? (
                      <Input
                        value={formData.middleName || ''}
                        onChange={(e) => updateField('middleName', e.target.value)}
                        placeholder="Enter middle name"
                      />
                    ) : (
                      <p className="text-gray-900">{formData.middleName || '—'}</p>
                    )}
                  </div>
                  
                  {/* Last Name */}
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    {isEditMode ? (
                      <Input
                        value={formData.lastName || ''}
                        onChange={(e) => updateField('lastName', e.target.value)}
                        placeholder="Enter last name"
                      />
                    ) : (
                      <p className="text-gray-900">{formData.lastName || '—'}</p>
                    )}
                  </div>
                  
                  {/* Maiden Name */}
                  <div className="space-y-2">
                    <Label>Maiden Name</Label>
                    {isEditMode ? (
                      <Input
                        value={formData.maidenName || ''}
                        onChange={(e) => updateField('maidenName', e.target.value)}
                        placeholder="Enter maiden name"
                      />
                    ) : (
                      <p className="text-gray-900">{formData.maidenName || '—'}</p>
                    )}
                  </div>
                  
                  {/* Gender */}
                  <div className="space-y-2">
                    <Label>Gender *</Label>
                    {isEditMode ? (
                      <select
                        value={formData.gender}
                        onChange={(e) => updateField('gender', e.target.value as 'male' | 'female')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    ) : (
                      <p className="text-gray-900 capitalize">{formData.gender}</p>
                    )}
                  </div>
                  
                  {/* Status (Alive/Deceased) */}
                  <div className="space-y-2">
                    <Label>Status *</Label>
                    {isEditMode ? (
                      <select
                        value={formData.status}
                        onChange={(e) => updateField('status', e.target.value as 'alive' | 'deceased')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="alive">Alive</option>
                        <option value="deceased">Deceased</option>
                      </select>
                    ) : (
                      <p className="text-gray-900 capitalize flex items-center gap-2">
                        {formData.status}
                        {formData.status === 'deceased' && <span className="text-base">🌸</span>}
                      </p>
                    )}
                  </div>
                  
                  {/* Birth Date */}
                  <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    {isEditMode ? (
                      <div>
                        <Input
                          type="text"
                          value={(() => {
                            const dob = formData.dateOfBirth || '';
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
                            updateField('dateOfBirth', formatted);
                          }}
                          onBlur={(e) => {
                            // ONLY on blur: validate and convert to storage format
                            const displayValue = e.target.value.trim();
                            
                            console.log('📅 DOB onBlur - User entered:', displayValue);
                            
                            if (!displayValue) {
                              // Empty is okay - just clear it
                              updateField('dateOfBirth', '');
                              console.log('   ✓ Cleared (empty field)');
                              return;
                            }
                            
                            // Check if it matches DD-MM-YYYY pattern (complete date)
                            if (isValidDDMMYYYY(displayValue)) {
                              const storageValue = formatDateForStorage(displayValue);
                              updateField('dateOfBirth', storageValue);
                              console.log('   ✓ Converted to storage format:', storageValue);
                            } else {
                              // Invalid or incomplete - keep as-is so user can continue editing
                              console.log('   ⚠️  Incomplete or invalid (keeping for user to fix)');
                            }
                          }}
                          placeholder="Type 8 digits: DDMMYYYY (e.g., 15031990)"
                          maxLength={10}
                        />
                        {(() => {
                          const dob = formData.dateOfBirth || '';
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
                      <p className="text-gray-900">
                        {formData.dateOfBirth ? formatDateForDisplay(formData.dateOfBirth) : '—'}
                      </p>
                    )}
                  </div>
                  
                  {/* Birth Place */}
                  <div className="space-y-2">
                    <Label>Place of Birth</Label>
                    {isEditMode ? (
                      <Input
                        value={formData.birthPlace || ''}
                        onChange={(e) => updateField('birthPlace', e.target.value)}
                        placeholder="City, State, Country"
                      />
                    ) : (
                      <p className="text-gray-900">{formData.birthPlace || '—'}</p>
                    )}
                  </div>
                  
                  {/* Death Date (if deceased) */}
                  {formData.status === 'deceased' && (
                    <>
                      <div className="space-y-2">
                        <Label>Date of Death</Label>
                        {isEditMode ? (
                          <div>
                            <Input
                              type="text"
                              value={(() => {
                                const dod = formData.deathDate || '';
                                // If it's in storage format (YYYY-MM-DD), convert to display format
                                if (dod.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
                                  return formatDateForDisplay(dod);
                                }
                                // Otherwise, show as-is (user is typing)
                                return dod;
                              })()}
                              onChange={(e) => {
                                // Just store exactly what user types - let them type freely
                                const input = e.target.value;
                                // Auto-format: add dashes as user types numbers
                                const formatted = formatDateInput(input);
                                updateField('deathDate', formatted);
                              }}
                              onBlur={(e) => {
                                // ONLY on blur: validate and convert to storage format
                                const displayValue = e.target.value.trim();
                                
                                console.log('📅 Death date onBlur - User entered:', displayValue);
                                
                                if (!displayValue) {
                                  // Empty is okay - just clear it
                                  updateField('deathDate', '');
                                  console.log('   ✓ Cleared (empty field)');
                                  return;
                                }
                                
                                // Check if it matches DD-MM-YYYY pattern (complete date)
                                if (isValidDDMMYYYY(displayValue)) {
                                  const storageValue = formatDateForStorage(displayValue);
                                  updateField('deathDate', storageValue);
                                  console.log('   ✓ Converted to storage format:', storageValue);
                                } else {
                                  // Invalid or incomplete - keep as-is so user can continue editing
                                  console.log('   ⚠️  Incomplete or invalid (keeping for user to fix)');
                                }
                              }}
                              placeholder="Type 8 digits: DDMMYYYY (e.g., 20122020)"
                              maxLength={10}
                            />
                            {(() => {
                              const dod = formData.deathDate || '';
                              // Only show error if date is in display format AND invalid
                              // Don't show error for storage format (YYYY-MM-DD) - that means it's already validated
                              const isStorageFormat = dod.match(/^\d{4}-\d{1,2}-\d{1,2}$/);
                              const isDisplayFormat = dod.match(/^\d{1,2}-\d{1,2}-\d{4}$/);
                              
                              if (isStorageFormat) {
                                // Already validated and in storage format - no error
                                return null;
                              }
                              
                              // ✅ NEW: Check if incomplete (user started typing but hasn't finished)
                              if (dod && dod.length > 0 && dod.length < 10) {
                                return (
                                  <p className="text-sm text-amber-600 mt-1 flex items-center gap-1">
                                    <span>⚠️</span>
                                    <span>Complete the date (need {10 - dod.length} more characters)</span>
                                  </p>
                                );
                              }
                              
                              if (isDisplayFormat && !isValidDDMMYYYY(dod)) {
                                // In display format but invalid date
                                return <p className="text-sm text-destructive mt-1">Please enter valid date (DD-MM-YYYY)</p>;
                              }
                              
                              return null;
                            })()}
                          </div>
                        ) : (
                          <p className="text-gray-900">
                            {formData.deathDate ? formatDateForDisplay(formData.deathDate) : '—'}
                          </p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Place of Death</Label>
                        {isEditMode ? (
                          <Input
                            value={formData.deathPlace || ''}
                            onChange={(e) => updateField('deathPlace', e.target.value)}
                            placeholder="City, State, Country"
                          />
                        ) : (
                          <p className="text-gray-900">{formData.deathPlace || '—'}</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Contact Information */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="text-lg font-medium">Contact Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Phone */}
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    {isEditMode ? (
                      <Input
                        type="tel"
                        value={formData.phone || ''}
                        onChange={(e) => updateField('phone', e.target.value)}
                        placeholder="+1 (555) 123-4567"
                      />
                    ) : (
                      <p className="text-gray-900">{formData.phone || '—'}</p>
                    )}
                  </div>
                  
                  {/* Email */}
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    {isEditMode ? (
                      <Input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => updateField('email', e.target.value)}
                        placeholder="name@example.com"
                      />
                    ) : (
                      <p className="text-gray-900">{formData.email || '—'}</p>
                    )}
                  </div>
                  
                  {/* 🔧 NEW FIELD: Current Location */}
                  <div className="space-y-2">
                    <Label>Current Location</Label>
                    {isEditMode ? (
                      <Input
                        value={formData.location || ''}
                        onChange={(e) => updateField('location', e.target.value)}
                        placeholder="City, State, Country"
                      />
                    ) : (
                      <p className="text-gray-900">{formData.location || '—'}</p>
                    )}
                  </div>
                </div>
                
                {/* 🔧 NEW FIELD: Bio (Full Width) */}
                <div className="space-y-2">
                  <Label>Bio / About</Label>
                  {isEditMode ? (
                    <Textarea
                      value={formData.bio || ''}
                      onChange={(e) => updateField('bio', e.target.value)}
                      placeholder="Share something about this person..."
                      rows={4}
                      className="resize-none"
                    />
                  ) : (
                    <p className="text-gray-900 whitespace-pre-wrap">{formData.bio || '—'}</p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* ✨ Spouse & Marriage Information */}
            {spouse && (
              <Card className="border-coral/30 bg-gradient-to-br from-coral/5 to-pink-50">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-coral" />
                    <h3 className="text-lg font-medium text-coral">Spouse & Marriage</h3>
                  </div>
                  
                  {/* Spouse Card */}
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-coral/10 to-pink-100 rounded-lg border border-coral/20">
                    <div className="w-12 h-12 rounded-full bg-coral/20 flex items-center justify-center overflow-hidden">
                      {spouse.photo ? (
                        <img src={spouse.photo} alt={spouse.firstName} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-coral" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Spouse</p>
                      <p className="font-medium text-gray-900">
                        {spouse.firstName} {spouse.lastName || ''}
                      </p>
                      <p className="text-sm text-gray-600">
                        {spouse.gender === 'Male' ? 'Husband' : 'Wife'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Marriage Anniversary */}
                  <div className="space-y-2">
                    <Label htmlFor="anniversary" className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-coral" />
                      Marriage Anniversary Date
                    </Label>
                    {isEditMode ? (
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
                          className="border-coral/30 focus:ring-coral"
                        />
                        {marriageData.anniversaryDate && !isValidDDMMYYYY(formatDateForDisplay(marriageData.anniversaryDate || '')) && (
                          <p className="text-sm text-destructive mt-1">Please enter date in DD-MM-YYYY format</p>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 bg-white rounded-lg border border-coral/20">
                        <p className="text-base font-medium text-gray-900">
                          {marriageData.anniversaryDate 
                            ? profileSyncService.formatDateForDisplay(marriageData.anniversaryDate)
                            : 'Not set'
                          }
                        </p>
                        {marriageData.anniversaryDate && (
                          <p className="text-sm text-coral mt-1">
                            🎉 {profileSyncService.getYearsMarried(marriageData.anniversaryDate)} years married
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Marriage Place */}
                  <div className="space-y-2">
                    <Label htmlFor="marriagePlace" className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-coral" />
                      Marriage Place
                    </Label>
                    {isEditMode ? (
                      <Input
                        id="marriagePlace"
                        value={marriageData.place || ''}
                        onChange={(e) => handleMarriageDataChange('place', e.target.value)}
                        placeholder="City, State, Country"
                        className="border-coral/30 focus:ring-coral"
                      />
                    ) : (
                      <p className="text-gray-900 p-3 bg-white rounded-lg border border-coral/20">
                        {marriageData.place || 'Not set'}
                      </p>
                    )}
                  </div>
                  
                  {/* Marriage Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="marriageNotes">Marriage Story / Notes</Label>
                    {isEditMode ? (
                      <Textarea
                        id="marriageNotes"
                        value={marriageData.notes || ''}
                        onChange={(e) => handleMarriageDataChange('notes', e.target.value)}
                        placeholder="Share your marriage story, how you met, special moments..."
                        rows={4}
                        className="border-coral/30 focus:ring-coral resize-y"
                      />
                    ) : (
                      <div className="p-3 bg-white rounded-lg border border-coral/20">
                        <p className="text-gray-900 text-sm whitespace-pre-wrap">
                          {marriageData.notes || 'No story added yet'}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Biography */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Biography</h3>
                  {formData.bio && (
                    <span className="text-xs text-gray-500">
                      {formData.bio.length}/1000 characters
                    </span>
                  )}
                </div>
                
                {isEditMode ? (
                  <Textarea
                    value={formData.bio || ''}
                    onChange={(e) => updateField('bio', e.target.value)}
                    placeholder="Write about this person's life, personality, memorable moments, and what makes them special..."
                    rows={6}
                    maxLength={1000}
                    className="resize-y min-h-[120px]"
                  />
                ) : (
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {formData.bio || 'No biography added yet.'}
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  Share stories, personality traits, memorable quotes, and what makes this person unique.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Unsaved Changes Warning Dialog */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 bg-black/70 z-[102] flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-lg font-medium">Unsaved Changes</h3>
              <p className="text-gray-600">
                You have unsaved changes. Do you want to save before closing?
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowUnsavedWarning(false);
                    setHasChanges(false);
                    setFormData(person); // Reset to original
                    onClose();
                  }}
                >
                  Discard
                </Button>
                <Button
                  variant="default"
                  onClick={() => {
                    setShowUnsavedWarning(false);
                    handleSave();
                    setTimeout(onClose, 400);
                  }}
                >
                  Save & Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};
