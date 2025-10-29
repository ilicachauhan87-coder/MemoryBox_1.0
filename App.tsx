import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DataMigrationWrapper } from './components/DataMigrationWrapper';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ScrollToTop } from './components/ScrollToTop';
import { toast } from 'sonner@2.0.3';
import { Toaster } from './components/ui/sonner';
import { Button } from './components/ui/button';
import { DatabaseService } from './utils/supabase/persistent-database';
import { useInitializeRelationshipEngine } from './utils/useRelationship';
import { normalizeGender } from './utils/genderHelpers';
import { errorMonitoring } from './utils/errorMonitoring';
import { analytics } from './utils/analytics';
import { FeedbackWidget } from './components/FeedbackWidget';
import { metricsService } from './utils/metricsService';

// 🚀 Lazy load all route components for better performance
const SignInPage = lazy(() => import('./components/SignInPage').then(m => ({ default: m.SignInPage })));
const NewUserHomePage = lazy(() => import('./components/NewUserHomePage').then(m => ({ default: m.NewUserHomePage })));
const ReturningUserHomePage = lazy(() => import('./components/ReturningUserHomePage').then(m => ({ default: m.ReturningUserHomePage })));
const BottomNavigation = lazy(() => import('./components/BottomNavigation').then(m => ({ default: m.BottomNavigation })));
const FamilyTreeApp = lazy(() => import('./components/FamilyTreeApp').then(m => ({ default: m.FamilyTreeApp })));
const VaultPage = lazy(() => import('./components/VaultPage').then(m => ({ default: m.VaultPage })));
const MemoryUploadPage = lazy(() => import('./components/MemoryUploadPage').then(m => ({ default: m.MemoryUploadPage })));
const JournalPage = lazy(() => import('./components/JournalPage').then(m => ({ default: m.JournalPage })));
const JourneySelectionPage = lazy(() => import('./components/JourneySelectionPage').then(m => ({ default: m.JourneySelectionPage })));
const CoupleJourneyPage = lazy(() => import('./components/CoupleJourneyPage').then(m => ({ default: m.CoupleJourneyPage })));
const PregnancyJourneyPage = lazy(() => import('./components/PregnancyJourneyPage').then(m => ({ default: m.PregnancyJourneyPage })));
const TimeCapsulesPage = lazy(() => import('./components/TimeCapsulesPage').then(m => ({ default: m.TimeCapsulesPage })));
const InviteFamilyMemberPage = lazy(() => import('./components/InviteFamilyMemberPage').then(m => ({ default: m.InviteFamilyMemberPage })));
const ProfilePage = lazy(() => import('./components/ProfilePage').then(m => ({ default: m.ProfilePage })));
const OnboardingPage = lazy(() => import('./components/OnboardingPage').then(m => ({ default: m.OnboardingPage })));
const TopNavigationBar = lazy(() => import('./components/TopNavigationBar').then(m => ({ default: m.TopNavigationBar })));
const FamilyWallPage = lazy(() => import('./components/FamilyWallPage').then(m => ({ default: m.FamilyWallPage })));
const HomeHeaderMockups = lazy(() => import('./components/HomeHeaderMockups').then(m => ({ default: m.HomeHeaderMockups })));
const DebugResetPage = lazy(() => import('./components/DebugResetPage').then(m => ({ default: m.DebugResetPage })));
const AdminDashboardPage = lazy(() => import('./components/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen bg-cream flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-violet mx-auto mb-4"></div>
      <p className="text-ink text-lg">Loading...</p>
    </div>
  </div>
);

// ✅ DATABASE-FIRST FIX: Helper function to check if user has completed nuclear family setup
const hasCompletedNuclearFamily = async (familyId: string): Promise<boolean> => {
  try {
    // 🔧 FIX #3: Query database FIRST (not localStorage)
    console.log('🔍 Checking nuclear family completion from database...');
    const treeData = await DatabaseService.getFamilyTree(familyId);
    
    if (!treeData) {
      console.log('⚠️ No tree data found in database');
      return false;
    }
    
    // Handle both old format (array) and new format (object with people array)
    const peopleArray = Array.isArray(treeData) ? treeData : treeData.people || [];
    
    if (peopleArray.length === 0) {
      console.log('⚠️ Tree is empty');
      return false;
    }
    
    // Count nodes by generation (excluding root user who appears by default)
    const generationCounts: { [key: number]: number } = {};
    peopleArray.forEach((person: any) => {
      const gen = person.generation || 0;
      generationCounts[gen] = (generationCounts[gen] || 0) + 1;
    });
    
    const gen0Count = generationCounts[0] || 0;
    const genPlus1Count = generationCounts[1] || 0;
    const genMinus1Count = generationCounts[-1] || 0;
    
    console.log('📊 hasCompletedNuclearFamily (from database) - Generation counts:', {
      'Gen-1 (Parents)': genMinus1Count,
      'Gen0 (User)': gen0Count,
      'Gen+1 (Children)': genPlus1Count
    });
    
    // Criteria: At least 2 nodes in Gen0 AND (Gen+1 OR Gen-1)
    // Gen0 includes user + spouse, Gen-1 includes parents, Gen+1 includes children
    const hasGen0 = gen0Count >= 2; // User + spouse/sibling
    const hasGen1 = genPlus1Count >= 2; // At least 2 children
    const hasGenMinus1 = genMinus1Count >= 2; // Both parents
    
    const familyStructureComplete = hasGen0 && (hasGen1 || hasGenMinus1);
    
    console.log('📊 hasCompletedNuclearFamily (from database) - Structure check:', {
      hasGen0,
      hasGen1,
      hasGenMinus1,
      familyStructureComplete,
      reasoning: !familyStructureComplete ? 
        'Only root user exists or insufficient family members' : 
        'Nuclear family structure verified'
    });
    
    return familyStructureComplete;
  } catch (error) {
    console.error('❌ Failed to check nuclear family from database:', error);
    return false;
  }
};

// ✅ DATABASE-FIRST FIX: Helper function to determine correct home route based on user status
const getHomeRoute = async (): Promise<string> => {
  try {
    const currentUserId = localStorage.getItem('current_user_id');
    if (!currentUserId) return '/app';
    
    // Use cached profile for initial check (profile is synced from database)
    const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
    if (!userProfile) return '/app';
    
    const userData = JSON.parse(userProfile);
    
    // Check if user is new - they must meet BOTH criteria to graduate:
    // 1. At least 5-6 memories
    // 2. Nuclear family complete (via wizard OR manual with 2+ nodes in Gen0 AND Gen+1/Gen-1)
    if ((userData.is_new_user || userData.isNewUser) && userData.family_id) {
      // 🔧 FIX #2: Query database for memory count (not localStorage)
      console.log('🔍 Checking graduation criteria from database...');
      const memories = await DatabaseService.getFamilyMemories(userData.family_id);
      const memoryCount = memories.length;
      
      // 🔧 FIX #3: Check nuclear family from database (now async)
      const familyComplete = await hasCompletedNuclearFamily(userData.family_id);
      
      console.log('🏠 Home route decision criteria (from database):');
      console.log('   Memories:', memoryCount, '/ 5 required');
      console.log('   Nuclear family:', familyComplete ? '✅ Complete' : '❌ Incomplete');
      
      // User must have BOTH 5+ memories AND completed nuclear family to graduate
      const hasEnoughMemories = memoryCount >= 5;
      const canGraduate = hasEnoughMemories && familyComplete;
      
      if (!canGraduate) {
        console.log('📍 Routing to /home (New User) - needs:', 
          !hasEnoughMemories ? `${5 - memoryCount} more memories` : '',
          !familyComplete ? 'nuclear family' : ''
        );
        return '/home';
      }
      
      console.log('🎓 User has graduated! Routing to /app (Returning User)');
    }
  } catch (error) {
    console.error('❌ Failed to determine home route from database:', error);
    // Fallback to new user home on error
    return '/home';
  }
  
  // User has graduated or is not a new user
  return '/app';
};

// Placeholder component for routes not yet implemented
const RoutePlaceholder = ({ routeName }: { routeName: string }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentPage, setCurrentPage] = useState('home');
  const [unreadCount, setUnreadCount] = useState(0);

  // Update current page based on route
  useEffect(() => {
    const routeToPage: { [key: string]: string } = {
      '/vault': 'vault',
      '/upload': 'upload-memory',
      '/tree': 'family-tree',
      '/profile': 'profile'
    };
    setCurrentPage(routeToPage[location.pathname] || 'home');
  }, [location]);

  // ✅ DATABASE-FIRST FIX: Get unread count for vault badge from database
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const currentUserId = localStorage.getItem('current_user_id');
        if (!currentUserId) return;
        
        const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
        if (!userProfile) return;
        
        const userData = JSON.parse(userProfile);
        if (!userData.family_id) return;
        
        // 🔧 FIX #2: Query database for memories (not localStorage)
        console.log('🔍 Loading unread count from database...');
        const memories = await DatabaseService.getFamilyMemories(userData.family_id);
        
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const recentCount = memories.filter((m: any) => {
          const memoryDate = new Date(m.created_at || m.createdAt);
          return memoryDate >= oneWeekAgo;
        }).length;
        
        setUnreadCount(recentCount);
        console.log(`📊 Unread count from database: ${recentCount}`);
      } catch (error) {
        console.error('❌ Failed to load unread count from database:', error);
        setUnreadCount(0); // Default to 0 on error
      }
    };
    
    loadUnreadCount();
  }, []);

  const handleNavigate = async (page: string) => {
    // Help is handled via dialog on home pages, not a route
    if (page === 'help') {
      console.log('ℹ️ Help is accessed via dialog on home pages');
      return;
    }
    
    // 🔧 FIX #3: getHomeRoute is now async
    const homeRoute = page === 'home' ? await getHomeRoute() : '/home';
    
    const pageRoutes: { [key: string]: string} = {
      'home': homeRoute,
      'vault': '/vault',
      'upload-memory': '/upload',
      'family-tree': '/tree',
      'profile': '/profile',
      'family-wall': '/wall',
      'journey-selection': '/journey',
      'journal': '/journal',
      'invite-family-member': '/invite',
      'time-capsules': '/capsules'
    };
    navigate(pageRoutes[page] || getHomeRoute());
  };
  
  return (
    <>
      <div className="flex items-center justify-center min-h-screen bg-background vibrant-texture pb-20">
        <div className="text-center p-8 max-w-md">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🚀</span>
          </div>
          <h1 className="text-3xl font-bold text-primary mb-4">{routeName}</h1>
          <p className="text-muted-foreground mb-6">
            This feature is coming soon. We're working hard to bring you the best experience!
          </p>
          <button 
            onClick={() => navigate(-1)}
            className="text-primary hover:underline font-medium"
          >
            ← Go Back
          </button>
        </div>
      </div>
      <BottomNavigation 
        currentPage={currentPage}
        onNavigate={handleNavigate}
        unreadCount={unreadCount}
      />
    </>
  );
};

// Wrapper component to handle sign-in navigation
const SignInWrapper = ({ mode }: { mode: 'signup' | 'signin' }) => {
  const navigate = useNavigate();

  const handleSignIn = async (userData: any) => {
    console.log('🔐 User signed in:', userData);
    console.log('📊 DATABASE STATE CHECK:');
    console.log('   Email:', userData.email);
    console.log('   onboarding_completed (from DB):', userData.onboarding_completed);
    console.log('   first_name (from DB):', userData.first_name || '❌ NULL');
    console.log('   last_name (from DB):', userData.last_name || '❌ NULL');
    console.log('   gender (from DB):', userData.gender || '❌ NULL');
    console.log('   date_of_birth (from DB):', userData.date_of_birth || '❌ NULL');
    console.log('   family_id (from DB):', userData.family_id || '❌ NULL');
    
    // Store user data in localStorage for immediate access
    localStorage.setItem('current_user_id', userData.id);
    
    // ✅ CRITICAL FIX: Parse name if first_name/last_name missing from database
    // This handles legacy data where name exists but not parsed fields
    let parsedFirstName = userData.first_name || userData.firstName;
    let parsedLastName = userData.last_name || userData.lastName;
    let parsedMiddleName = userData.middle_name || userData.middleName;
    
    // If database has name but missing first_name/last_name, parse it now
    if (userData.name && (!parsedFirstName || !parsedLastName)) {
      console.log('📝 Parsing name because first_name/last_name missing:', userData.name);
      const nameParts = userData.name.trim().split(/\s+/);
      if (!parsedFirstName) parsedFirstName = nameParts[0] || '';
      if (!parsedLastName) parsedLastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
      if (!parsedMiddleName) parsedMiddleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';
      console.log('   → firstName:', parsedFirstName);
      console.log('   → lastName:', parsedLastName);
    }
    
    // ✅ DATABASE-FIRST FIX: Trust database data (from public.users table)
    // Map snake_case fields from database to camelCase for backward compatibility
    const normalizedData = {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      phone: userData.phone,
      family_id: userData.family_id,
      
      // ✅ Map database fields (snake_case) to app fields (camelCase) with parsing fallback
      onboarding_completed: userData.onboarding_completed ?? false,
      firstName: parsedFirstName,  // Use parsed value
      middleName: parsedMiddleName,
      lastName: parsedLastName,
      gender: userData.gender,
      date_of_birth: userData.date_of_birth,
      display_name: userData.display_name,
      
      // Other fields
      is_new_user: userData.is_new_user ?? userData.isNewUser ?? true,
      activity_count: userData.activity_count || 0,
      created_at: userData.created_at,
      updated_at: new Date().toISOString(),
      photo_url: userData.photo_url,
      status: userData.status
    };
    
    console.log('✅ Normalized database data (snake_case → camelCase):');
    console.log('   onboarding_completed:', normalizedData.onboarding_completed);
    console.log('   firstName (from first_name):', normalizedData.firstName || '❌ MISSING');
    console.log('   lastName (from last_name):', normalizedData.lastName || '❌ MISSING');
    console.log('   gender:', normalizedData.gender || '❌ MISSING');
    console.log('   date_of_birth:', normalizedData.date_of_birth || '❌ MISSING');
    
    // ✅ INFERENCE LOGIC: If user has all required onboarding fields, mark as completed
    // This handles edge cases where onboarding_completed flag might be missing
    const hasRequiredOnboardingFields = !!(
      normalizedData.firstName &&     // Parsed from name during onboarding
      normalizedData.lastName &&      // Parsed from name during onboarding
      normalizedData.gender &&        // Required in onboarding form
      normalizedData.date_of_birth && // Required in onboarding form
      normalizedData.family_id        // Family created during signup/onboarding
    );
    
    console.log('🔍 Checking onboarding completion from required fields:');
    console.log('   firstName:', normalizedData.firstName || '❌ MISSING');
    console.log('   lastName:', normalizedData.lastName || '❌ MISSING');
    console.log('   gender:', normalizedData.gender || '❌ MISSING');
    console.log('   date_of_birth:', normalizedData.date_of_birth || '❌ MISSING');
    console.log('   family_id:', normalizedData.family_id || '❌ MISSING');
    console.log('   → hasRequiredOnboardingFields:', hasRequiredOnboardingFields);
    
    // ✅ If we parsed name fields and database is missing them, save to database
    if (parsedFirstName && parsedLastName && !userData.first_name && !userData.last_name) {
      console.log('💾 Saving parsed name fields to database...');
      try {
        await DatabaseService.updateUserProfile(userData.id, {
          first_name: parsedFirstName,
          last_name: parsedLastName,
          middle_name: parsedMiddleName || null,
          updated_at: new Date().toISOString()
        });
        console.log('✅ DATABASE-FIRST: Saved parsed name fields to database');
      } catch (error) {
        console.error('⚠️ Failed to save name fields to database:', error);
      }
    }
    
    // Cache to localStorage (database is source of truth, this is cache)
    localStorage.setItem(`user:${userData.id}:profile`, JSON.stringify(normalizedData));
    console.log('💾 Cached database profile to localStorage');
    
    // 🆕 CRITICAL: Initialize user activity tracking for admin dashboard
    try {
      await metricsService.initializeUserActivity(
        userData.id,
        userData.email || '',
        1 // batch_no - default to 1 for all users
      );
      console.log('✅ User activity tracking initialized for admin dashboard');
    } catch (error) {
      console.error('⚠️ Failed to initialize user activity tracking (non-critical):', error);
      // Don't block user - this is for metrics only
    }
    
    // Notify ProfilePage that user data has been updated
    console.log('📢 Dispatching userProfileUpdated event to notify ProfilePage...');
    window.dispatchEvent(new Event('userProfileUpdated'));
    console.log('✅ userProfileUpdated event dispatched');
    
    // ✅ ROUTING LOGIC: Check onboarding status
    const hasCompletedOnboarding = 
      normalizedData.onboarding_completed === true || 
      hasRequiredOnboardingFields;  // ← Fallback: infer from data
    
    console.log('📊 Sign-in routing decision:');
    console.log('   Database onboarding_completed flag:', userData.onboarding_completed);
    console.log('   Has all required fields:', hasRequiredOnboardingFields);
    console.log('   → Final hasCompletedOnboarding:', hasCompletedOnboarding);
    console.log('   is_new_user:', normalizedData.is_new_user);
    
    // Route based on onboarding completion
    if (!hasCompletedOnboarding) {
      console.log('🆕 User has NOT completed onboarding → /onboarding');
      navigate('/onboarding');
    } else {
      // User has completed onboarding - use smart routing
      const homeRoute = getHomeRoute();
      console.log('👤 User HAS completed onboarding → smart routing');
      console.log('   getHomeRoute() returned:', homeRoute);
      console.log('   This checks graduation criteria (5+ memories + nuclear family)');
      navigate(homeRoute);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  return <SignInPage onSignIn={handleSignIn} onBack={handleBack} mode={mode} />;
};

// Wrapper component for OnboardingPage
const OnboardingPageWrapper = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUserFromDatabase = async () => {
      // Get current user ID
      const currentUserId = localStorage.getItem('current_user_id');
      if (!currentUserId) {
        navigate('/signin');
        setIsLoading(false);
        return;
      }
      
      try {
        // ✅ DATABASE-FIRST: Fetch fresh data from database (not cache!)
        const userData = await DatabaseService.getUserProfile(currentUserId);
        
        if (!userData) {
          console.log('⚠️ No user profile found, redirecting to sign in');
          navigate('/signin');
          setIsLoading(false);
          return;
        }
        
        console.log('✅ OnboardingPageWrapper: Loaded fresh data from database:', {
          onboarding_completed: userData.onboarding_completed,
          first_name: userData.first_name || userData.firstName,
          gender: userData.gender
        });
        
        // Map snake_case to camelCase for backward compatibility
        const normalizedUser = {
          ...userData,
          firstName: userData.first_name || userData.firstName,
          lastName: userData.last_name || userData.lastName,
          middleName: userData.middle_name || userData.middleName
        };
        
        setUser(normalizedUser);
        
        // ✅ FIX: If onboarding already completed, use smart routing
        if (normalizedUser.onboarding_completed) {
          console.log('⏩ Onboarding already completed (from database), using smart routing');
          const homeRoute = getHomeRoute();
          console.log('   getHomeRoute() returned:', homeRoute);
          navigate(homeRoute);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('❌ Failed to load user profile from database:', error);
        // Fallback to localStorage as last resort
        const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
        if (userProfile) {
          const userData = JSON.parse(userProfile);
          setUser(userData);
        } else {
          navigate('/signin');
        }
        setIsLoading(false);
      }
    };
    
    loadUserFromDatabase();
  }, [navigate]);

  const handleComplete = async (profileData: { name: string; gender: 'male' | 'female'; date_of_birth: string }) => {
    if (!user) return;

    console.log('✅ Onboarding completed with data:', profileData);

    // Parse name into first, middle, last
    const nameParts = profileData.name.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
    const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';

    // 🔧 FIX BUG #3: Use centralized gender normalization utility
    // This ensures consistent capitalization across the entire app
    const normalizedGender = normalizeGender(profileData.gender);
    
    // ✅ DATABASE-FIRST: Save to database first (primary storage)
    const profileUpdate = {
      name: profileData.name,
      display_name: profileData.name,
      first_name: firstName,  // Use snake_case for database
      middle_name: middleName,
      last_name: lastName,
      gender: normalizedGender,
      date_of_birth: profileData.date_of_birth,
      onboarding_completed: true,
      is_new_user: true, // Keep as new user until graduation criteria met
      updated_at: new Date().toISOString()
    };
    
    try {
      await DatabaseService.updateUserProfile(user.id, profileUpdate);
      console.log('✅ DATABASE-FIRST: Onboarding data saved to database');
      console.log('   onboarding_completed: true');
      console.log('   first_name:', firstName);
      console.log('   last_name:', lastName);
      console.log('   gender:', normalizedGender);
    } catch (error) {
      console.error('❌ Failed to save onboarding data to database:', error);
      toast.error('Failed to save profile. Please try again.');
      return;
    }
    
    // Cache to localStorage (database is source of truth)
    const updatedUser = {
      ...user,
      ...profileUpdate,
      // Map back to camelCase for frontend
      firstName: firstName,
      middleName: middleName,
      lastName: lastName
    };
    
    localStorage.setItem(`user:${user.id}:profile`, JSON.stringify(updatedUser));
    console.log('💾 Cached onboarding data to localStorage');

    // 4. 🔧 CRITICAL FIX: Update root user in family tree WITHOUT overwriting wizard changes
    if (user.family_id) {
      const treeKey = `familyTree_${user.family_id}`;
      
      // ALWAYS load from localStorage first (wizard saves here)
      const existingTreeData = localStorage.getItem(treeKey);
      let parsedData = existingTreeData ? JSON.parse(existingTreeData) : [];
      
      // 🔧 FIX: Handle both old format (array) and new format (object with people array)
      let treeData: any[];
      let treeRelationships: any[] = [];
      let treeMetadata: any = {};
      
      if (Array.isArray(parsedData)) {
        // Old format: just array of people
        treeData = parsedData;
        console.log('📦 OnboardingPage - Loading tree from localStorage (old array format)');
      } else if (parsedData && typeof parsedData === 'object' && parsedData.people) {
        // New format: object with people, relationships, etc.
        treeData = parsedData.people || [];
        treeRelationships = parsedData.relationships || [];
        treeMetadata = {
          rootUserId: parsedData.rootUserId,
          generationLimits: parsedData.generationLimits
        };
        console.log('📦 OnboardingPage - Loading tree from localStorage (new object format)');
      } else {
        // Invalid or empty data
        treeData = [];
        console.log('📦 OnboardingPage - No existing tree found, creating new');
      }
      
      console.log('   Tree has', treeData.length, 'people (including wizard additions)');
      console.log('   Tree has', treeRelationships.length, 'relationships');
      
      // Check if root user already exists in tree
      const rootUserIndex = treeData.findIndex((person: any) => 
        person.id === user.id || person.isRoot === true
      );

      // CRITICAL: Match FamilyTreeApp.tsx GRID_CONFIG exactly
      const centerSlot = 89; // Center of 177 total slots
      const gridX = 200 + (centerSlot * 100) + 50; // = 200 + 8900 + 50 = 9150
      const gridY = 450; // GENERATION_Y_POSITIONS['0']
      
      console.log('📍 OnboardingPage - Root user position calculation:');
      console.log('   Center slot:', centerSlot);
      console.log('   Calculated X:', gridX);
      console.log('   Calculated Y:', gridY);

      // Create root user data with ONLY the fields we want to update
      const rootUserUpdates = {
        name: profileData.name,
        firstName: firstName,
        middleName: middleName || undefined,
        lastName: lastName || undefined,
        gender: normalizedGender, // Use normalized gender from helper
        dateOfBirth: profileData.date_of_birth,
        email: user.email,
        phone: user.phone || undefined
      };

      if (rootUserIndex >= 0) {
        // 🔧 FIX: Preserve ALL existing data, only update specific fields
        treeData[rootUserIndex] = {
          ...treeData[rootUserIndex],  // Keep ALL existing data (relationships, etc.)
          ...rootUserUpdates,          // Update only name/gender/DOB
          id: user.id,                 // Ensure ID stays same
          status: 'alive',             // Ensure status
          generation: 0,               // Ensure generation
          isRoot: true,                // Ensure root flag
          gridSlot: centerSlot,        // Ensure position
          position: { x: gridX, y: gridY }
        };
        console.log('📝 Updated root user in tree (preserved', Object.keys(treeData[rootUserIndex]).length, 'fields)');
      } else {
        // Add new root user (only if doesn't exist)
        treeData.push({
          id: user.id,
          name: profileData.name,
          firstName: firstName,
          middleName: middleName || undefined,
          lastName: lastName || undefined,
          gender: normalizedGender,
          status: 'alive',
          generation: 0,
          isRoot: true,
          dateOfBirth: profileData.date_of_birth,
          email: user.email,
          phone: user.phone || undefined,
          photo: undefined,
          gridSlot: centerSlot,
          position: { x: gridX, y: gridY }
        });
        console.log('➕ Added root user to family tree');
      }
      
      // ✅ DATABASE-FIRST FIX: Save to database FIRST, then cache to localStorage
      let dataToSave: any;
      if (Array.isArray(parsedData)) {
        // Save in old format (array)
        dataToSave = treeData;
      } else {
        // Save in new format (object)
        dataToSave = {
          people: treeData,
          relationships: treeRelationships,
          rootUserId: treeMetadata.rootUserId || user.id,
          generationLimits: treeMetadata.generationLimits || {
            '-2': { current: 0, max: 4 },
            '-1': { current: 0, max: 20 },
            '0': { current: 0, max: 78 },
            '1': { current: 0, max: 42 },
            '2': { current: 0, max: 18 }
          }
        };
      }
      
      // 🔧 FIX #1: Save to DATABASE FIRST with auto-retry
      try {
        console.log('💾 Saving family tree to database (database-first)...');
        await DatabaseService.saveFamilyTree(user.family_id, dataToSave);
        console.log('✅ Family tree saved to database successfully');
        
        // Only cache to localStorage AFTER successful database save
        localStorage.setItem(treeKey, JSON.stringify(dataToSave));
        console.log('💾 Cached family tree to localStorage after successful DB save');
      } catch (error) {
        // ❌ DO NOT save to localStorage if database fails
        console.error('❌ Failed to save family tree to database:', error);
        toast.error('Failed to save family tree. Please check your connection and try again.', {
          duration: 5000
        });
        throw error; // Propagate error - don't continue
      }
    }

    toast.success('🎉 Profile setup complete! Welcome to MemoryBox!');
    
    // ✅ FIX: Use smart routing after onboarding completion (now async)
    setTimeout(async () => {
      const homeRoute = await getHomeRoute();
      console.log('🎓 Onboarding complete! Smart routing to:', homeRoute);
      navigate(homeRoute);
    }, 1000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet mx-auto mb-4"></div>
          <p className="text-ink">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <OnboardingPage user={user} onComplete={handleComplete} />;
};

// Wrapper component for NewUserHomePage
const NewUserHomeWrapper = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState('home');

  useEffect(() => {
    const loadUserFromDatabase = async () => {
      const currentUserId = localStorage.getItem('current_user_id');
      if (!currentUserId) {
        navigate('/signin');
        return;
      }
      
      try {
        // ✅ DATABASE-FIRST: Fetch fresh data from database (not cache!)
        const userData = await DatabaseService.getUserProfile(currentUserId);
        
        if (!userData) {
          console.log('⚠️ No user profile found, redirecting to sign in');
          navigate('/signin');
          return;
        }
        
        console.log('✅ NewUserHomeWrapper: Loaded fresh data from database:', {
          onboarding_completed: userData.onboarding_completed,
          first_name: userData.first_name || userData.firstName,
          is_new_user: userData.is_new_user
        });
        
        // Map snake_case to camelCase for backward compatibility
        const normalizedUser = {
          ...userData,
          firstName: userData.first_name || userData.firstName,
          lastName: userData.last_name || userData.lastName,
          middleName: userData.middle_name || userData.middleName
        };
        
        setUser(normalizedUser);
        
        // Cache to localStorage for other components
        localStorage.setItem(`user:${currentUserId}:profile`, JSON.stringify(normalizedUser));
        
        // If user is new and hasn't completed onboarding, redirect to onboarding
        if ((normalizedUser.is_new_user || normalizedUser.isNewUser) && !normalizedUser.onboarding_completed) {
          console.log('⚠️ New user has not completed onboarding (from database), redirecting...');
          navigate('/onboarding');
          return;
        }
        
        // 🎉 NEW: Welcome confetti for first 5 visits to home page
        if ((normalizedUser.is_new_user || normalizedUser.isNewUser) && normalizedUser.onboarding_completed) {
          const visitCountKey = `user:${currentUserId}:home_visits`;
          const visitCountData = localStorage.getItem(visitCountKey);
          const visitCount = visitCountData ? parseInt(visitCountData, 10) : 0;
          
          console.log(`🏠 New user home visit count: ${visitCount + 1}`);
          
          // Show confetti for first 5 visits
          if (visitCount < 5) {
            // Delay confetti slightly to let page render
            setTimeout(() => {
              import('./utils/confettiService').then(({ celebrateGeneral }) => {
                celebrateGeneral('🎉 Welcome back to MemoryBox!');
                console.log(`🎊 Welcome confetti triggered (visit ${visitCount + 1}/5)`);
              });
            }, 500);
            
            // Increment visit count
            localStorage.setItem(visitCountKey, String(visitCount + 1));
          } else if (visitCount === 5) {
            // On 6th visit, just log that confetti period is over
            console.log('✅ Welcome confetti period completed (5 visits)');
            localStorage.setItem(visitCountKey, String(visitCount + 1));
          }
        }
        
        // 🎂 Check if today is user's birthday
        if (normalizedUser.date_of_birth) {
          const today = new Date();
          const dob = new Date(normalizedUser.date_of_birth);
          if (today.getMonth() === dob.getMonth() && today.getDate() === dob.getDate()) {
            import('./utils/confettiService').then(({ celebrateBirthday }) => {
              celebrateBirthday();
            });
          }
        }
        
        // 💕 Check if today is user's anniversary
        if (normalizedUser.family_id && normalizedUser.marriage_anniversary) {
          const today = new Date();
          const anniversary = new Date(normalizedUser.marriage_anniversary);
          if (today.getMonth() === anniversary.getMonth() && today.getDate() === anniversary.getDate()) {
            import('./utils/confettiService').then(({ celebrateAnniversary }) => {
              celebrateAnniversary();
            });
          }
        }
      } catch (error) {
        console.error('❌ Failed to load user profile from database:', error);
        // Fallback to localStorage as last resort
        const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
        if (userProfile) {
          const userData = JSON.parse(userProfile);
          setUser(userData);
        } else {
          navigate('/signin');
        }
      }
    };
    
    loadUserFromDatabase();
  }, [navigate]);

  // 🎉 NEW: Listen for memoryAdded event to trigger page refresh
  useEffect(() => {
    const handleMemoryAdded = () => {
      console.log('📡 NewUserHomeWrapper: Received memoryAdded event - will trigger page refresh on next navigation');
      // The home page will reload data on next mount via its useEffect
    };

    window.addEventListener('memoryAdded', handleMemoryAdded);
    return () => window.removeEventListener('memoryAdded', handleMemoryAdded);
  }, []);

  // Update current page based on route
  useEffect(() => {
    const routeToPage: { [key: string]: string } = {
      '/home': 'home',
      '/vault': 'vault',
      '/upload': 'upload-memory',
      '/tree': 'family-tree',
      '/profile': 'profile'
    };
    setCurrentPage(routeToPage[location.pathname] || 'home');
  }, [location]);

  const handleNavigate = (page: string) => {
    console.log(`📍 NewUserHomeWrapper - Navigation request to: ${page}`);
    
    // Help is handled via dialog on home pages, not a route
    if (page === 'help') {
      console.log('ℹ️ Help is accessed via dialog on home pages');
      return;
    }
    
    // Map page names to routes
    const pageRoutes: { [key: string]: string } = {
      'home': '/home',
      'vault': '/vault',
      'upload-memory': '/upload',
      'family-tree': '/tree',
      'profile': '/profile',
      'family-wall': '/wall',
      'journey-selection': '/journey',
      'journal': '/journal',
      'invite-family-member': '/invite',
      'time-capsules': '/capsules'
    };

    const route = pageRoutes[page] || '/home';
    console.log(`📍 Navigating to route: ${route}`);
    navigate(route);
  };

  const handleCompleteOnboarding = (data?: any) => {
    console.log('✅ Onboarding complete:', data);
    navigate('/app');
  };

  return (
    <>
      <TopNavigationBar 
        user={user}
        onNavigate={handleNavigate}
      />
      <div className="pt-16">
        <NewUserHomePage 
          onNavigate={handleNavigate}
          user={user}
          onCompleteOnboarding={handleCompleteOnboarding}
        />
      </div>
      <BottomNavigation 
        currentPage={currentPage}
        onNavigate={handleNavigate}
        unreadCount={0}
      />
    </>
  );
};

// Wrapper component for FamilyTreeManager
const FamilyTreeWrapper = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentPage, setCurrentPage] = useState('family-tree');
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSyncComplete, setIsSyncComplete] = useState(false);
  const [familyTreeData, setFamilyTreeData] = useState<any>(null);
  const [isLoadingTree, setIsLoadingTree] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 🔍 DEBUG: Log whenever component mounts/unmounts
  useEffect(() => {
    console.log('🌳 FamilyTreeWrapper MOUNTED at route:', location.pathname);
    return () => {
      console.log('🌳 FamilyTreeWrapper UNMOUNTED');
    };
  }, [location.pathname]);

  // Update current page based on route
  useEffect(() => {
    const routeToPage: { [key: string]: string } = {
      '/app': 'home',
      '/vault': 'vault',
      '/upload': 'upload-memory',
      '/tree': 'family-tree',
      '/profile': 'profile'
    };
    setCurrentPage(routeToPage[location.pathname] || 'family-tree');
  }, [location]);

  // 🔧 NEW: Load family tree data for relationship engine
  useEffect(() => {
    const loadFamilyTree = async () => {
      try {
        const currentUserId = localStorage.getItem('current_user_id');
        if (!currentUserId) {
          console.warn('⚠️ No current user ID found');
          setIsLoadingTree(false);
          return;
        }

        const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
        if (!userProfile) {
          console.warn('⚠️ No user profile found');
          setIsLoadingTree(false);
          return;
        }

        const userData = JSON.parse(userProfile);
        console.log('🔄 Loading tree from database to sync profile changes...');
        console.log('📊 User:', userData.email, 'Family ID:', userData.family_id);
        
        if (!userData.family_id) {
          console.error('❌ No family_id found for user!');
          setHasError(true);
          setErrorMessage('Your account is missing a family ID. Please contact support.');
          setIsLoadingTree(false);
          return;
        }

        try {
          // 🔧 BIDIRECTIONAL SYNC FIX: Always load from database first to get latest profile changes
          console.log('💾 Loading tree from database (not cache)...');
          const treeData = await DatabaseService.getFamilyTree(userData.family_id);
          
          // 🔧 FIX: Normalize format - handle both old (array) and new (object) formats
          let normalizedData = treeData;
          if (Array.isArray(treeData)) {
            // Old format: Convert array to new object format
            normalizedData = {
              people: treeData,
              relationships: [],
              rootUserId: userData.id || '',
              generationLimits: {}
            };
            console.log('📦 Converted old array format to new object format');
          } else if (treeData && typeof treeData === 'object') {
            // New format: Use as-is
            normalizedData = treeData;
          } else {
            // Invalid or empty data
            normalizedData = {
              people: [],
              relationships: [],
              rootUserId: userData.id || '',
              generationLimits: {}
            };
          }
          
          console.log('✅ Tree loaded from database with', normalizedData.people?.length || 0, 'people');
          
          // 🔧 SYNC FIX: Also update localStorage cache with latest database data
          localStorage.setItem(`familyTree_${userData.family_id}`, JSON.stringify(normalizedData));
          console.log('💾 Updated localStorage cache with database data');
          
          setFamilyTreeData(normalizedData);
          console.log('✅ FamilyTreeWrapper: Family tree loaded from database (synced with profile changes)');
        } catch (error) {
          console.log('⚠️ Database load failed, trying localStorage...');
          // Fallback to localStorage
          const localTreeData = localStorage.getItem(`familyTree_${userData.family_id}`);
          if (localTreeData) {
            try {
              const parsedTree = JSON.parse(localTreeData);
              
              // 🔧 FIX: Normalize format - handle both old (array) and new (object) formats
              let normalizedData = parsedTree;
              if (Array.isArray(parsedTree)) {
                // Old format: Convert array to new object format
                normalizedData = {
                  people: parsedTree,
                  relationships: [],
                  rootUserId: userData.id || '',
                  generationLimits: {}
                };
                console.log('📦 Converted old array format to new object format (from localStorage)');
              } else if (parsedTree && typeof parsedTree === 'object') {
                // New format: Use as-is
                normalizedData = parsedTree;
              } else {
                // Invalid or empty data
                normalizedData = {
                  people: [],
                  relationships: [],
                  rootUserId: userData.id || '',
                  generationLimits: {}
                };
              }
              
              console.log('✅ Tree loaded from localStorage with', normalizedData.people?.length || 0, 'people');
              setFamilyTreeData(normalizedData);
              console.log('✅ FamilyTreeWrapper: Family tree loaded from localStorage for relationship engine');
            } catch (parseError) {
              console.error('❌ Failed to parse family tree data:', parseError);
              setHasError(true);
              setErrorMessage('Family tree data is corrupted. Please try refreshing the page.');
              // Set empty data structure on parse error
              setFamilyTreeData({
                people: [],
                relationships: [],
                rootUserId: userData.id || '',
                generationLimits: {}
              });
            }
          } else {
            console.log('ℹ️ No tree data found - this is normal for new users');
            // No tree data yet - this is fine for brand new users
            setFamilyTreeData({
              people: [],
              relationships: [],
              rootUserId: userData.id || '',
              generationLimits: {}
            });
          }
        }
      } catch (outerError) {
        console.error('❌ Critical error in loadFamilyTree:', outerError);
        setHasError(true);
        setErrorMessage(`Failed to load family tree: ${outerError.message}`);
      } finally {
        setIsLoadingTree(false);
      }
    };

    loadFamilyTree();
  }, []);
  
  // 🔧 CRITICAL FIX: Listen for family tree updates and reload tree data
  // This ensures relationship engine recalculates when gender or other properties change
  useEffect(() => {
    const handleTreeUpdate = async (event: any) => {
      console.log('📡 FamilyTreeWrapper: Received familyTreeUpdated event', event.detail);
      console.log('🔄 Reloading tree data to refresh relationship engine...');
      
      const currentUserId = localStorage.getItem('current_user_id');
      if (!currentUserId) return;

      const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
      if (!userProfile) return;

      const userData = JSON.parse(userProfile);
      if (!userData.family_id) return;

      // Reload tree from localStorage (where FamilyTreeApp just saved it)
      const localTreeData = localStorage.getItem(`familyTree_${userData.family_id}`);
      if (localTreeData) {
        try {
          const parsedTree = JSON.parse(localTreeData);
          
          // Normalize format
          let normalizedData = parsedTree;
          if (Array.isArray(parsedTree)) {
            normalizedData = {
              people: parsedTree,
              relationships: [],
              rootUserId: userData.id || '',
              generationLimits: {}
            };
          } else if (parsedTree && typeof parsedTree === 'object') {
            normalizedData = parsedTree;
          } else {
            normalizedData = {
              people: [],
              relationships: [],
              rootUserId: userData.id || '',
              generationLimits: {}
            };
          }
          
          setFamilyTreeData(normalizedData);
          console.log('✅ FamilyTreeWrapper: Tree data reloaded - relationship engine will reinitialize');
        } catch (e) {
          console.error('❌ Failed to reload tree data:', e);
        }
      }
    };

    window.addEventListener('familyTreeUpdated', handleTreeUpdate);
    return () => window.removeEventListener('familyTreeUpdated', handleTreeUpdate);
  }, []);

  // 🔧 BIDIRECTIONAL SYNC FIX: Reload tree when user navigates to tree page (e.g., from Profile Page)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        console.log('👀 Tree page visible - reloading from database for bidirectional sync...');
        
        const currentUserId = localStorage.getItem('current_user_id');
        if (!currentUserId) return;

        const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
        if (!userProfile) return;

        const userData = JSON.parse(userProfile);
        if (!userData.family_id) return;

        try {
          // 🔧 CRITICAL: Load from database to get latest profile updates
          const treeData = await DatabaseService.getFamilyTree(userData.family_id);
          
          // Normalize format
          let normalizedData = treeData;
          if (Array.isArray(treeData)) {
            normalizedData = {
              people: treeData,
              relationships: [],
              rootUserId: userData.id || '',
              generationLimits: {}
            };
          } else if (treeData && typeof treeData === 'object') {
            normalizedData = treeData;
          } else {
            normalizedData = {
              people: [],
              relationships: [],
              rootUserId: userData.id || '',
              generationLimits: {}
            };
          }
          
          // Update localStorage cache
          localStorage.setItem(`familyTree_${userData.family_id}`, JSON.stringify(normalizedData));
          
          setFamilyTreeData(normalizedData);
          console.log('✅ Tree reloaded from database (profile changes synced)');
        } catch (error) {
          console.warn('⚠️ Database reload failed:', error);
          // Fallback to localStorage (already cached)
        }
      }
    };

    // Listen for page visibility changes (tab switching, navigation)
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also listen for custom navigation events
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, []);

  // 🚀 INITIALIZE RELATIONSHIP ENGINE with family tree data
  const isRelationshipEngineReady = useInitializeRelationshipEngine(
    familyTreeData,
    [familyTreeData] // Re-initialize when tree changes
  );

  // Log when relationship engine is ready
  useEffect(() => {
    if (isRelationshipEngineReady && familyTreeData) {
      // Now familyTreeData is always normalized to object format
      const peopleCount = familyTreeData?.people?.length || 0;
      const relationshipCount = familyTreeData?.relationships?.length || 0;
      console.log('✅ 🧬 Relationship Engine Initialized with', peopleCount, 'people and', relationshipCount, 'relationships');
      console.log('   Now all family relationships will be automatically calculated!');
    }
  }, [isRelationshipEngineReady, familyTreeData]);

  // 🔧 CRITICAL FIX: Sync root user gender BEFORE rendering tree
  useEffect(() => {
    const syncGender = async () => {
      try {
        console.log('🚀 ========== FAMILY TREE WRAPPER INITIALIZATION ==========');
        const currentUserId = localStorage.getItem('current_user_id');
        console.log('🔍 Step 1: Check current user ID:', currentUserId);
        
        if (!currentUserId) {
          console.error('❌ CRITICAL: No current user ID found!');
          console.error('   This means user is not logged in');
          console.error('   ProtectedRoute should have caught this');
          setIsSyncComplete(true);
          return;
        }

        console.log('🔍 Step 2: Load user profile from localStorage');
        const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
        if (!userProfile) {
          console.error('❌ CRITICAL: No user profile found!');
          console.error('   localStorage key searched:', `user:${currentUserId}:profile`);
          console.error('   Available localStorage keys:', Object.keys(localStorage).filter(k => k.includes('user')));
          setHasError(true);
          setErrorMessage('User profile not found. Please sign in again.');
          setIsSyncComplete(true);
          return;
        }

        let userData;
        try {
          userData = JSON.parse(userProfile);
        } catch (parseError) {
          console.error('❌ CRITICAL: Failed to parse user profile JSON!');
          console.error('   Raw profile data:', userProfile);
          console.error('   Parse error:', parseError);
          setHasError(true);
          setErrorMessage('User profile is corrupted. Please sign in again.');
          setIsSyncComplete(true);
          return;
        }

        console.log('✅ Step 3: User profile loaded successfully');
        console.log('   📊 Profile data:', {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          gender: userData.gender,
          family_id: userData.family_id,
          onboarding_completed: userData.onboarding_completed,
          is_new_user: userData.is_new_user
        });
        
        console.log('🔍 Step 4: Set user state for TopNavigationBar');
        setUser(userData);
        
        console.log('🔍 Step 5: Validate family_id');
        if (!userData.family_id) {
          console.error('❌ CRITICAL: User has no family_id in profile!');
          console.error('   This should NEVER happen for users who completed onboarding');
          console.error('   Full user data:', JSON.stringify(userData, null, 2));
          setHasError(true);
          setErrorMessage('Your account is missing a family ID. Please complete onboarding again.');
          setIsSyncComplete(true);
          return;
        }
        
        console.log('✅ Step 5 passed: family_id present:', userData.family_id);

      // 🔧 FIX BUG #3: Gender normalization now uses centralized utility
      // (imported at top of file)

      // GRID_CONFIG constants (must match FamilyTreeApp.tsx)
      const GRID_CONFIG = {
        LEFT_MARGIN: 200,
        NODE_WIDTH: 100
      };
      const GENERATION_Y = 450; // Generation 0
      const CENTER_SLOT = 89; // Center of 177 slots

      // 🔧 CRITICAL FIX: Smart data source selection
      // Priority: localStorage > Database (localStorage is source of truth in Figma Make)
      // This prevents database corruption from overwriting good localStorage data
      
      let treeFromSource: any = null;
      let sourceUsed: string = '';
      
      // STEP 1: Check localStorage FIRST (most reliable in Figma Make)
      const localStorageTree = localStorage.getItem(`familyTree_${userData.family_id}`);
      if (localStorageTree) {
        try {
          const parsedLocal = JSON.parse(localStorageTree);
          const localPeople = Array.isArray(parsedLocal) ? parsedLocal : parsedLocal.people || [];
          if (localPeople.length > 0) {
            treeFromSource = parsedLocal;
            sourceUsed = 'localStorage';
            console.log('✅ Using localStorage as source (has', localPeople.length, 'people)');
          }
        } catch (e) {
          console.log('⚠️ Failed to parse localStorage tree');
        }
      }
      
      // STEP 2: If localStorage is empty, try database
      if (!treeFromSource) {
        try {
          const dbTree = await DatabaseService.getFamilyTree(userData.family_id);
          const dbPeople = Array.isArray(dbTree) ? dbTree : dbTree?.people || [];
          if (dbPeople.length > 0) {
            treeFromSource = dbTree;
            sourceUsed = 'database';
            console.log('✅ Using database as source (has', dbPeople.length, 'people)');
          } else {
            console.log('⚠️ Database has no people, will skip sync');
          }
        } catch (dbError) {
          console.log('⚠️ Database read failed, will skip sync');
        }
      }
      
      // STEP 3: Only sync if we have valid data from EITHER source
      if (treeFromSource) {
        try {
          // Handle both old format (array) and new format (object with people array)
          const tree = Array.isArray(treeFromSource) ? treeFromSource : treeFromSource?.people || [];
          
          if (tree && tree.length > 0) {
            const rootUserIndex = tree.findIndex((p: any) => 
              p.id === currentUserId || p.isRoot === true || p.email === userData.email
            );

            if (rootUserIndex !== -1) {
              const treeGender = tree[rootUserIndex].gender;
              const profileGender = userData.gender;
              const currentPosition = tree[rootUserIndex].position;
              
              console.log('🔍 FamilyTreeWrapper - Root User Sync:');
              console.log('   Data source:', sourceUsed);
              console.log('   User ID:', currentUserId);
              console.log('   Profile gender (source of truth):', profileGender);
              console.log('   Tree gender (before sync):', treeGender);
              console.log('   Current position:', currentPosition);
              
              // Calculate correct position
              const correctX = GRID_CONFIG.LEFT_MARGIN + (CENTER_SLOT * GRID_CONFIG.NODE_WIDTH) + (GRID_CONFIG.NODE_WIDTH / 2);
              const correctY = GENERATION_Y;
              
              console.log('   Correct position should be: { x:', correctX, ', y:', correctY, '}');
              
              // Check if position needs fixing
              const needsPositionFix = currentPosition.x !== correctX || currentPosition.y !== correctY;
              if (needsPositionFix) {
                console.log('   ⚠️ Position mismatch detected!');
                console.log('   🔧 Fixing position from', currentPosition, 'to { x:', correctX, ', y:', correctY, '}');
              }
              
              // ALWAYS update tree to match profile (profile is source of truth)
              const normalizedProfileGender = normalizeGender(profileGender || 'Female');
              tree[rootUserIndex] = {
                ...tree[rootUserIndex],
                gender: normalizedProfileGender,
                position: { x: correctX, y: correctY }, // Fix position
                gridSlot: CENTER_SLOT // Fix grid slot
              };
              
              // Save back in the original format (if it was an object, save as object)
              const saveData = Array.isArray(treeFromSource) ? tree : { people: tree, relationships: treeFromSource?.relationships || [] };
              
              // 🔧 CRITICAL: Save to BOTH localStorage AND database
              // localStorage is saved FIRST (source of truth)
              if (Array.isArray(treeFromSource)) {
                localStorage.setItem(`familyTree_${userData.family_id}`, JSON.stringify(tree));
              } else {
                localStorage.setItem(`familyTree_${userData.family_id}`, JSON.stringify(saveData));
              }
              console.log('   ✅ Saved to localStorage');
              
              // Then try to sync to database (may fail, that's OK)
              try {
                await DatabaseService.saveFamilyTree(userData.family_id, saveData);
                console.log('   ✅ Synced to database');
              } catch (dbSaveError) {
                console.log('   ⚠️ Database save failed (expected) - localStorage is source of truth');
              }
              
              console.log('   ✅ Tree gender synced to:', normalizedProfileGender);
              console.log('   ✅ Tree position synced to: { x:', correctX, ', y:', correctY, '}');
              
              if (treeGender !== normalizedProfileGender) {
                console.log('   🔄 Gender updated from', treeGender, 'to', normalizedProfileGender);
              }
              if (needsPositionFix) {
                console.log('   🔄 Position corrected');
              }
            } else {
              console.log('   ⚠️ Root user not found in tree');
            }
          }
        } catch (syncError) {
          console.error('❌ Error during tree sync:', syncError);
        }
      } else {
        console.log('ℹ️ No tree data found in localStorage or database - this is normal for brand new users');
      }
      

    } catch (error) {
      console.error('❌ Critical error in syncGender:', error);
      setHasError(true);
      setErrorMessage(`Failed to sync user data: ${error.message}`);
    } finally {
      setIsSyncComplete(true);
    }
  };

    syncGender();
  }, []); // Run only once on mount

  // ✅ DATABASE-FIRST FIX: Get unread count for vault badge from database (FamilyTreeWrapper)
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const currentUserId = localStorage.getItem('current_user_id');
        if (!currentUserId) return;
        
        const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
        if (!userProfile) return;
        
        const userData = JSON.parse(userProfile);
        if (!userData.family_id) return;
        
        // 🔧 FIX #2: Query database for memories (not localStorage)
        console.log('🔍 Loading unread count from database (FamilyTreeWrapper)...');
        const memories = await DatabaseService.getFamilyMemories(userData.family_id);
        
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const recentCount = memories.filter((m: any) => {
          const memoryDate = new Date(m.created_at || m.createdAt);
          return memoryDate >= oneWeekAgo;
        }).length;
        
        setUnreadCount(recentCount);
        console.log(`📊 Unread count from database (FamilyTreeWrapper): ${recentCount}`);
      } catch (error) {
        console.error('❌ Failed to load unread count from database (FamilyTreeWrapper):', error);
        setUnreadCount(0);
      }
    };
    
    loadUnreadCount();
  }, []);

  const handleNavigate = async (page: string) => {
    console.log(`📍 FamilyTreeWrapper - Navigation request to: ${page}`);
    
    // Help is handled via dialog on home pages, not a route
    if (page === 'help') {
      console.log('ℹ️ Help is accessed via dialog on home pages');
      return;
    }
    
    // 🔧 FIX #3: getHomeRoute is now async
    const homeRoute = page === 'home' ? await getHomeRoute() : '/home';
    
    const pageRoutes: { [key: string]: string } = {
      'home': homeRoute,
      'vault': '/vault',
      'upload-memory': '/upload',
      'family-tree': '/tree',
      'profile': '/profile',
      'family-wall': '/wall',
      'journey-selection': '/journey',
      'journal': '/journal',
      'invite-family-member': '/invite',
      'time-capsules': '/capsules'
    };

    const route = pageRoutes[page] || '/tree';
    console.log(`📍 Navigating to route: ${route}`);
    navigate(route);
  };

  const handleBack = () => {
    navigate(getHomeRoute());
  };

  // 🔧 CRITICAL FIX: Add error state UI
  if (hasError) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="memory-card p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl mb-3">Unable to Load Family Tree</h2>
          <p className="text-muted-foreground mb-4">{errorMessage}</p>
          <Button 
            onClick={() => {
              console.log('🔄 User clicked retry - reloading page...');
              window.location.reload();
            }}
            className="vibrant-button text-white"
          >
            Retry
          </Button>
          <Button 
            onClick={() => {
              console.log('🏠 User going back to home...');
              navigate('/home');
            }}
            variant="outline"
            className="mt-3 w-full"
          >
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  // 🔧 CRITICAL FIX: Wait for ALL required state (sync, tree, AND user) before rendering
  if (!isSyncComplete || isLoadingTree || !user) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet mx-auto mb-4"></div>
          <p className="text-ink">
            {!isSyncComplete ? 'Syncing family tree...' : 
             !user ? 'Loading user profile...' :
             'Initializing relationship engine...'}
          </p>
          {isRelationshipEngineReady && (
            <p className="text-sm text-muted-foreground mt-2">
              ✨ Relationship calculator ready!
            </p>
          )}
        </div>
      </div>
    );
  }

  // 🔧 SAFETY CHECK: Validate critical data (should always pass now)
  console.log('🔍 FamilyTreeWrapper - Final validation before rendering tree:');
  console.log('   User:', user ? '✅ Present' : '❌ Missing');
  console.log('   User ID:', localStorage.getItem('current_user_id'));
  console.log('   Family ID:', user?.family_id);
  
  // 🔧 CRITICAL FIX: Check for missing family_id and show error UI properly
  if (!user.family_id) {
    console.error('❌ CRITICAL: User has no family_id!');
    // Don't use setHasError + return null - render error UI directly
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="memory-card p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl mb-3">Account Setup Incomplete</h2>
          <p className="text-muted-foreground mb-4">
            Your account is missing a family ID. This usually happens if signup didn't complete properly.
          </p>
          <Button 
            onClick={() => {
              console.log('🔄 User clicked retry - reloading page...');
              window.location.reload();
            }}
            className="vibrant-button text-white"
          >
            Retry
          </Button>
          <Button 
            onClick={() => {
              console.log('🏠 User going back to sign in...');
              localStorage.clear();
              navigate('/signin');
            }}
            variant="outline"
            className="mt-3 w-full"
          >
            Sign Out & Try Again
          </Button>
        </div>
      </div>
    );
  }

  console.log('🎨 FamilyTreeWrapper - Rendering main UI');
  console.log('   User:', user ? `✅ ${user.email}` : '❌ null');
  console.log('   Family ID:', user?.family_id || '❌ missing');
  console.log('   Sync complete:', isSyncComplete);
  console.log('   Tree loading:', isLoadingTree);
  
  return (
    <>
      <TopNavigationBar 
        user={user}
        onNavigate={handleNavigate}
      />
      <div className="pt-16">
        <FamilyTreeApp onBack={handleBack} />
      </div>
      <BottomNavigation 
        currentPage={currentPage}
        onNavigate={handleNavigate}
        unreadCount={unreadCount}
      />
    </>
  );
};

// Wrapper component for MemoryUploadPage
const MemoryUploadPageWrapper = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [family, setFamily] = useState<any>(null);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState('upload-memory');
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    const loadUserAndData = async () => {
      // Get current user from localStorage
      const currentUserId = localStorage.getItem('current_user_id');
      if (currentUserId) {
        const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
        if (userProfile) {
          const userData = JSON.parse(userProfile);
          console.log('✅ MemoryUploadPageWrapper: User loaded:', userData.email);
          setUser(userData);
          
          // Get family data and family members from family tree
          if (userData.family_id) {
            // Load family data
            try {
              const familyData = await DatabaseService.getFamily(userData.family_id);
              if (familyData) {
                setFamily(familyData);
              } else {
                // Create dummy family for demo user
                console.log('📦 MemoryUploadPageWrapper: Creating dummy family data');
                const dummyFamily = {
                  id: userData.family_id,
                  name: userData.family_name || 'My Family',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  created_by: userData.id,
                  members: [userData.id]
                };
                setFamily(dummyFamily);
                localStorage.setItem(`family:${userData.family_id}:data`, JSON.stringify(dummyFamily));
              }
            } catch (error) {
              // Silently fall back to localStorage (expected in Figma Make environment)
              const localFamilyData = localStorage.getItem(`family:${userData.family_id}:data`);
              if (localFamilyData) {
                setFamily(JSON.parse(localFamilyData));
              }
            }

            // 🔧 NEW: Use centralized family member sync service
            const { loadFamilyMembers } = await import('./utils/familyMemberSyncService');
            const members = await loadFamilyMembers(userData.family_id, {
              includeRootUser: true, // Include ALL members for memory sharing
              excludeCurrentUser: false
            });
            setFamilyMembers(members);
            console.log(`✅ MemoryUploadPageWrapper: Loaded ${members.length} family members via sync service`);
            
            // Calculate unread count from memories
            try {
              const memories = await DatabaseService.getFamilyMemories(userData.family_id);
              const oneWeekAgo = new Date();
              oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
              const recentCount = memories.filter((m: any) => {
                const memoryDate = new Date(m.created_at || m.createdAt);
                return memoryDate >= oneWeekAgo;
              }).length;
              setUnreadCount(recentCount);
            } catch (error) {
              // Silently fall back to localStorage (expected in Figma Make environment)
              const memoriesData = localStorage.getItem(`family:${userData.family_id}:memories`);
              if (memoriesData) {
                const memories = JSON.parse(memoriesData);
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                const recentCount = memories.filter((m: any) => {
                  const memoryDate = new Date(m.created_at || m.createdAt);
                  return memoryDate >= oneWeekAgo;
                }).length;
                setUnreadCount(recentCount);
              }
            }
          }
        } else {
          // Silently handle missing profile (expected if user not logged in)
        }
      } else {
        // Silently handle missing user ID (expected if user not logged in)
      }
      setIsLoadingUser(false);
    };
    
    loadUserAndData();
  }, []);

  // ��� NEW: Listen for family tree updates and reload members
  useEffect(() => {
    const handleTreeUpdate = async () => {
      const currentUserId = localStorage.getItem('current_user_id');
      if (currentUserId) {
        const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
        if (userProfile) {
          const userData = JSON.parse(userProfile);
          if (userData.family_id) {
            console.log('🔄 MemoryUploadPageWrapper: Tree update detected, reloading members');
            const { loadFamilyMembers } = await import('./utils/familyMemberSyncService');
            const members = await loadFamilyMembers(userData.family_id, {
              includeRootUser: true,
              excludeCurrentUser: false
            });
            setFamilyMembers(members);
            console.log(`✅ MemoryUploadPageWrapper: Reloaded ${members.length} family members`);
          }
        }
      }
    };

    window.addEventListener('familyTreeUpdated', handleTreeUpdate);
    return () => window.removeEventListener('familyTreeUpdated', handleTreeUpdate);
  }, []);

  // Update current page based on route
  useEffect(() => {
    const routeToPage: { [key: string]: string } = {
      '/upload': 'upload-memory',
      '/app': 'home',
      '/vault': 'vault',
      '/tree': 'family-tree',
      '/profile': 'profile'
    };
    setCurrentPage(routeToPage[location.pathname] || 'upload-memory');
  }, [location]);

  const handleNavigate = (page: string) => {
    console.log(`📍 MemoryUploadPageWrapper - Navigation request to: ${page}`);
    
    // Help is handled via dialog on home pages, not a route
    if (page === 'help') {
      console.log('ℹ️ Help is accessed via dialog on home pages');
      return;
    }
    
    // Map page names to routes
    const pageRoutes: { [key: string]: string } = {
      'home': getHomeRoute(),
      'vault': '/vault',
      'upload-memory': '/upload',
      'family-tree': '/tree',
      'profile': '/profile',
      'family-wall': '/wall',
      'journey-selection': '/journey',
      'journal': '/journal',
      'invite-family-member': '/invite',
      'time-capsules': '/capsules',
      'sign-in': '/signin'
    };

    const route = pageRoutes[page] || '/upload';
    console.log(`📍 Navigating to route: ${route}`);
    navigate(route);
  };

  const handleBack = () => {
    navigate(getHomeRoute());
  };

  const handleSuccess = async () => {
    console.log('✅ Memory uploaded successfully!');
    
    // 🎉 Check if this is the first memory and celebrate!
    if (user?.family_id) {
      try {
        const memories = await DatabaseService.getFamilyMemories(user.family_id);
        if (memories.length === 1) {
          const { celebrateFirstMemory } = await import('./utils/confettiService');
          celebrateFirstMemory();
        }
      } catch (error) {
        // Fallback to localStorage
        const memoriesData = localStorage.getItem(`family:${user.family_id}:memories`);
        if (memoriesData) {
          const memories = JSON.parse(memoriesData);
          if (memories.length === 1) {
            const { celebrateFirstMemory } = await import('./utils/confettiService');
            celebrateFirstMemory();
          }
        }
      }
    }
    
    toast.success('🎉 Memory saved successfully!');
    navigate('/vault');
  };

  // Show loading state while checking for user
  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet mx-auto mb-4"></div>
          <p className="text-ink">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <TopNavigationBar 
        user={user}
        onNavigate={handleNavigate}
      />
      <div className="pt-16">
        <MemoryUploadPage 
          user={user}
          family={family}
          familyMembers={familyMembers}
          onBack={handleBack}
          onSuccess={handleSuccess}
        />
      </div>
      <BottomNavigation 
        currentPage={currentPage}
        onNavigate={handleNavigate}
        unreadCount={unreadCount}
      />
    </>
  );
};

// Wrapper component for VaultPage
const VaultPageWrapper = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [family, setFamily] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState('vault');
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    const loadUserAndFamily = async () => {
      // Get current user from localStorage (cached by DatabaseService)
      const currentUserId = localStorage.getItem('current_user_id');
      if (currentUserId) {
        const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
        if (userProfile) {
          const userData = JSON.parse(userProfile);
          console.log('✅ VaultPageWrapper: User loaded:', userData.email);
          setUser(userData);
          
          // Get family data - try Supabase first, fallback to localStorage
          if (userData.family_id) {
            try {
              const familyData = await DatabaseService.getFamily(userData.family_id);
              if (familyData) {
                setFamily(familyData);
              } else {
                // Fallback: Create dummy family for demo user
                console.log('📦 VaultPageWrapper: Creating dummy family data');
                const dummyFamily = {
                  id: userData.family_id,
                  name: userData.family_name || 'My Family',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  created_by: userData.id,
                  members: [userData.id]
                };
                setFamily(dummyFamily);
                localStorage.setItem(`family:${userData.family_id}:data`, JSON.stringify(dummyFamily));
              }
            } catch (error) {
              // Silently fall back to localStorage (expected in Figma Make environment)
              const localFamilyData = localStorage.getItem(`family:${userData.family_id}:data`);
              if (localFamilyData) {
                setFamily(JSON.parse(localFamilyData));
              }
            }
            
            // Calculate unread count from memories - try Supabase first
            try {
              const memories = await DatabaseService.getFamilyMemories(userData.family_id);
              
              // 🔧 CRITICAL FIX: Check if database returned empty but localStorage has data
              if (memories.length === 0) {
                const localMemories = localStorage.getItem(`family:${userData.family_id}:memories`);
                if (localMemories) {
                  const parsedLocalMemories = JSON.parse(localMemories);
                  if (parsedLocalMemories.length > 0) {
                    console.log('📦 Database empty but localStorage has', parsedLocalMemories.length, 'memories - using localStorage');
                    // Use localStorage data instead
                    const oneWeekAgo = new Date();
                    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                    const recentCount = parsedLocalMemories.filter((m: any) => {
                      const memoryDate = new Date(m.created_at || m.createdAt);
                      return memoryDate >= oneWeekAgo;
                    }).length;
                    setUnreadCount(recentCount);
                    return;
                  }
                }
              }
              
              const oneWeekAgo = new Date();
              oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
              const recentCount = memories.filter((m: any) => {
                const memoryDate = new Date(m.created_at || m.createdAt);
                return memoryDate >= oneWeekAgo;
              }).length;
              setUnreadCount(recentCount);
            } catch (error) {
              // Silently fall back to localStorage (expected in Figma Make environment)
              const memoriesData = localStorage.getItem(`family:${userData.family_id}:memories`);
              if (memoriesData) {
                const memories = JSON.parse(memoriesData);
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                const recentCount = memories.filter((m: any) => {
                  const memoryDate = new Date(m.created_at || m.createdAt);
                  return memoryDate >= oneWeekAgo;
                }).length;
                setUnreadCount(recentCount);
              }
            }
          }
        } else {
          // Silently handle missing profile (expected if user not logged in)
        }
      } else {
        // Silently handle missing user ID (expected if user not logged in)
      }
      setIsLoadingUser(false);
    };
    
    loadUserAndFamily();
  }, []);

  // 🎉 NEW: Listen for memoryAdded event and reload memories
  useEffect(() => {
    const handleMemoryAdded = () => {
      console.log('📡 VaultPageWrapper: Received memoryAdded event - reloading memories');
      
      // Force reload from localStorage
      const currentUserId = localStorage.getItem('current_user_id');
      if (currentUserId) {
        const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
        if (userProfile) {
          const userData = JSON.parse(userProfile);
          if (userData.family_id) {
            const memoriesData = localStorage.getItem(`family:${userData.family_id}:memories`);
            if (memoriesData) {
              const memories = JSON.parse(memoriesData);
              console.log('✅ Reloaded', memories.length, 'memories from localStorage');
              
              // Update unread count
              const oneWeekAgo = new Date();
              oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
              const recentCount = memories.filter((m: any) => {
                const memoryDate = new Date(m.created_at || m.createdAt);
                return memoryDate >= oneWeekAgo;
              }).length;
              setUnreadCount(recentCount);
              
              // Trigger vault page refresh by navigating to it again (force re-mount)
              window.location.hash = '#refresh-' + Date.now();
            }
          }
        }
      }
    };

    window.addEventListener('memoryAdded', handleMemoryAdded);
    return () => window.removeEventListener('memoryAdded', handleMemoryAdded);
  }, []);

  // Update current page based on route
  useEffect(() => {
    const routeToPage: { [key: string]: string } = {
      '/vault': 'vault',
      '/app': 'home',
      '/upload': 'upload-memory',
      '/tree': 'family-tree',
      '/profile': 'profile'
    };
    setCurrentPage(routeToPage[location.pathname] || 'vault');
  }, [location]);

  const handleNavigate = (page: string) => {
    console.log(`📍 VaultPageWrapper - Navigation request to: ${page}`);
    
    // Help is handled via dialog on home pages, not a route
    if (page === 'help') {
      console.log('ℹ️ Help is accessed via dialog on home pages');
      return;
    }
    
    // Map page names to routes
    const pageRoutes: { [key: string]: string } = {
      'home': getHomeRoute(),
      'vault': '/vault',
      'upload-memory': '/upload',
      'family-tree': '/tree',
      'profile': '/profile',
      'family-wall': '/wall',
      'journey-selection': '/journey',
      'journal': '/journal',
      'invite-family-member': '/invite',
      'time-capsules': '/capsules',
      'sign-in': '/signin'
    };

    const route = pageRoutes[page] || '/vault';
    console.log(`📍 Navigating to route: ${route}`);
    navigate(route);
  };

  // Show loading state while checking for user
  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet mx-auto mb-4"></div>
          <p className="text-ink">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <TopNavigationBar 
        user={user}
        onNavigate={handleNavigate}
      />
      <div className="pt-16">
        <VaultPage 
          user={user}
          family={family}
          onNavigate={handleNavigate}
        />
      </div>
      <BottomNavigation 
        currentPage={currentPage}
        onNavigate={handleNavigate}
        unreadCount={unreadCount}
      />
    </>
  );
};

// Wrapper component for ReturningUserHomePage
const ReturningUserHomeWrapper = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [family, setFamily] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState('home');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Get current user from localStorage
    const currentUserId = localStorage.getItem('current_user_id');
    if (currentUserId) {
      const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
      if (userProfile) {
        const userData = JSON.parse(userProfile);
        setUser(userData);
        
        // 🎂 Check if today is user's birthday
        if (userData.date_of_birth) {
          const today = new Date();
          const dob = new Date(userData.date_of_birth);
          if (today.getMonth() === dob.getMonth() && today.getDate() === dob.getDate()) {
            import('./utils/confettiService').then(({ celebrateBirthday }) => {
              celebrateBirthday();
            });
          }
        }
        
        // 💕 Check if today is user's anniversary
        if (userData.family_id && userData.marriage_anniversary) {
          const today = new Date();
          const anniversary = new Date(userData.marriage_anniversary);
          if (today.getMonth() === anniversary.getMonth() && today.getDate() === anniversary.getDate()) {
            import('./utils/confettiService').then(({ celebrateAnniversary }) => {
              celebrateAnniversary();
            });
          }
        }
        
        // Get family data
        if (userData.family_id) {
          const familyData = localStorage.getItem(`family:${userData.family_id}:data`);
          if (familyData) {
            setFamily(JSON.parse(familyData));
          }
          
          // Calculate unread count from memories
          const memoriesData = localStorage.getItem(`family:${userData.family_id}:memories`);
          if (memoriesData) {
            const memories = JSON.parse(memoriesData);
            // For demo, show count of recent memories (last 7 days)
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const recentCount = memories.filter((m: any) => {
              const memoryDate = new Date(m.created_at || m.createdAt);
              return memoryDate >= oneWeekAgo;
            }).length;
            setUnreadCount(recentCount);
          }
        }
      }
    }
  }, []);

  // 🎉 NEW: Listen for memoryAdded event and update counts
  useEffect(() => {
    const handleMemoryAdded = () => {
      console.log('📡 ReturningUserHomeWrapper: Received memoryAdded event - updating counters');
      
      // Reload memories count from localStorage
      const currentUserId = localStorage.getItem('current_user_id');
      if (currentUserId) {
        const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
        if (userProfile) {
          const userData = JSON.parse(userProfile);
          if (userData.family_id) {
            const memoriesData = localStorage.getItem(`family:${userData.family_id}:memories`);
            if (memoriesData) {
              const memories = JSON.parse(memoriesData);
              const oneWeekAgo = new Date();
              oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
              const recentCount = memories.filter((m: any) => {
                const memoryDate = new Date(m.created_at || m.createdAt);
                return memoryDate >= oneWeekAgo;
              }).length;
              setUnreadCount(recentCount);
              console.log('✅ Updated unread count:', recentCount);
            }
          }
        }
      }
    };

    window.addEventListener('memoryAdded', handleMemoryAdded);
    return () => window.removeEventListener('memoryAdded', handleMemoryAdded);
  }, []);

  // Update current page based on route
  useEffect(() => {
    const routeToPage: { [key: string]: string } = {
      '/app': 'home',
      '/vault': 'vault',
      '/upload': 'upload-memory',
      '/tree': 'family-tree',
      '/profile': 'profile'
    };
    setCurrentPage(routeToPage[location.pathname] || 'home');
  }, [location]);

  const handleNavigate = (page: string) => {
    console.log(`📍 ReturningUserHomeWrapper - Navigation request to: ${page}`);
    
    // Help is handled via dialog on home pages, not a route
    if (page === 'help') {
      console.log('ℹ️ Help is accessed via dialog on home pages');
      return;
    }
    
    // Map page names to routes
    const pageRoutes: { [key: string]: string } = {
      'home': getHomeRoute(),
      'vault': '/vault',
      'upload-memory': '/upload',
      'family-tree': '/tree',
      'profile': '/profile',
      'family-wall': '/wall',
      'journey-selection': '/journey',
      'journal': '/journal',
      'invite-family-member': '/invite',
      'time-capsules': '/capsules'
    };

    const route = pageRoutes[page] || getHomeRoute();
    console.log(`📍 Navigating to route: ${route}`);
    navigate(route);
  };

  return (
    <>
      <TopNavigationBar 
        user={user}
        onNavigate={handleNavigate}
      />
      <div className="pt-16">
        <ReturningUserHomePage 
          onNavigate={handleNavigate}
          user={user}
          family={family}
        />
      </div>
      <BottomNavigation 
        currentPage={currentPage}
        onNavigate={handleNavigate}
        unreadCount={unreadCount}
      />
    </>
  );
};

// Wrapper component for JourneySelectionPage
const JourneySelectionWrapper = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentPage, setCurrentPage] = useState('journey-selection');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const routeToPage: { [key: string]: string } = {
      '/journey': 'journey-selection',
      '/app': 'home',
      '/vault': 'vault',
      '/tree': 'family-tree',
      '/upload': 'upload-memory',
      '/profile': 'profile'
    };
    setCurrentPage(routeToPage[location.pathname] || 'journey-selection');
  }, [location]);

  // Get unread count for vault badge
  useEffect(() => {
    const currentUserId = localStorage.getItem('current_user_id');
    if (currentUserId) {
      const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
      if (userProfile) {
        const userData = JSON.parse(userProfile);
        if (userData.family_id) {
          const memoriesData = localStorage.getItem(`family:${userData.family_id}:memories`);
          if (memoriesData) {
            const memories = JSON.parse(memoriesData);
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const recentCount = memories.filter((m: any) => {
              const memoryDate = new Date(m.created_at || m.createdAt);
              return memoryDate >= oneWeekAgo;
            }).length;
            setUnreadCount(recentCount);
          }
        }
      }
    }
  }, []);

  const handleNavigate = (page: string, journeyType?: string) => {
    console.log(`📍 JourneySelectionWrapper - Navigation request to: ${page}`, journeyType);
    
    const pageRoutes: { [key: string]: string } = {
      'home': getHomeRoute(),
      'vault': '/vault',
      'upload-memory': '/upload',
      'family-tree': '/tree',
      'profile': '/profile',
      'family-wall': '/wall',
      'journey-selection': '/journey',
      'journal': '/journal',
      'invite-family-member': '/invite',
      'time-capsules': '/capsules',
      'help': '/help',
      'pregnancy-journey': '/journey/pregnancy',
      'couple-journey': '/journey/couple'
    };

    const route = pageRoutes[page] || '/journey';
    console.log(`📍 Navigating to route: ${route}`);
    navigate(route);
  };

  const handleBack = () => {
    // Use navigate(-1) to go back to the previous page in history
    // This works correctly whether user came from Vault or Home
    navigate(-1);
  };

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const currentUserId = localStorage.getItem('current_user_id');
    if (currentUserId) {
      const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
      if (userProfile) {
        setUser(JSON.parse(userProfile));
      }
    }
  }, []);

  return (
    <>
      <TopNavigationBar 
        user={user}
        onNavigate={handleNavigate}
      />
      <div className="pt-16">
        <JourneySelectionPage 
          onNavigate={handleNavigate}
          onBack={handleBack}
        />
      </div>
      <BottomNavigation 
        currentPage={currentPage}
        onNavigate={handleNavigate}
        unreadCount={unreadCount}
      />
    </>
  );
};

// Wrapper component for CoupleJourneyPage
const CoupleJourneyWrapper = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState('journey-selection');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const currentUserId = localStorage.getItem('current_user_id');
    if (currentUserId) {
      const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
      if (userProfile) {
        const userData = JSON.parse(userProfile);
        setUser(userData);
        
        if (userData.family_id) {
          const memoriesData = localStorage.getItem(`family:${userData.family_id}:memories`);
          if (memoriesData) {
            const memories = JSON.parse(memoriesData);
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const recentCount = memories.filter((m: any) => {
              const memoryDate = new Date(m.created_at || m.createdAt);
              return memoryDate >= oneWeekAgo;
            }).length;
            setUnreadCount(recentCount);
          }
        }
      }
    }
  }, []);

  useEffect(() => {
    const routeToPage: { [key: string]: string } = {
      '/journey/couple': 'journey-selection',
      '/app': 'home',
      '/vault': 'vault',
      '/tree': 'family-tree',
      '/upload': 'upload-memory',
      '/profile': 'profile'
    };
    setCurrentPage(routeToPage[location.pathname] || 'journey-selection');
  }, [location]);

  const handleNavigate = (page: string) => {
    console.log(`📍 CoupleJourneyWrapper - Navigation request to: ${page}`);
    
    // Help is handled via dialog on home pages, not a route
    if (page === 'help') {
      console.log('ℹ️ Help is accessed via dialog on home pages');
      return;
    }
    
    const pageRoutes: { [key: string]: string } = {
      'home': getHomeRoute(),
      'vault': '/vault',
      'upload-memory': '/upload',
      'family-tree': '/tree',
      'profile': '/profile',
      'family-wall': '/wall',
      'journey-selection': '/journey',
      'journal': '/journal',
      'invite-family-member': '/invite',
      'time-capsules': '/capsules'
    };

    const route = pageRoutes[page] || '/journey';
    console.log(`📍 Navigating to route: ${route}`);
    navigate(route);
  };

  const handleBack = () => {
    navigate('/journey', { replace: true });
  };

  const handleCaptureMemory = (milestoneData: any) => {
    console.log('📸 Capturing memory for milestone:', milestoneData);
    navigate('/upload', { state: { milestoneContext: milestoneData } });
  };

  return (
    <>
      <TopNavigationBar 
        user={user}
        onNavigate={handleNavigate}
      />
      <div className="pt-16">
        <CoupleJourneyPage 
          userId={user?.id}
          onBack={handleBack}
          onCaptureMemory={handleCaptureMemory}
        />
      </div>
      <BottomNavigation 
        currentPage={currentPage}
        onNavigate={handleNavigate}
        unreadCount={unreadCount}
      />
    </>
  );
};

// Wrapper component for PregnancyJourneyPage
const PregnancyJourneyWrapper = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState('journey-selection');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const currentUserId = localStorage.getItem('current_user_id');
    if (currentUserId) {
      const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
      if (userProfile) {
        const userData = JSON.parse(userProfile);
        setUser(userData);
        
        if (userData.family_id) {
          const memoriesData = localStorage.getItem(`family:${userData.family_id}:memories`);
          if (memoriesData) {
            const memories = JSON.parse(memoriesData);
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const recentCount = memories.filter((m: any) => {
              const memoryDate = new Date(m.created_at || m.createdAt);
              return memoryDate >= oneWeekAgo;
            }).length;
            setUnreadCount(recentCount);
          }
        }
      }
    }
  }, []);

  useEffect(() => {
    const routeToPage: { [key: string]: string } = {
      '/journey/pregnancy': 'journey-selection',
      '/app': 'home',
      '/vault': 'vault',
      '/tree': 'family-tree',
      '/upload': 'upload-memory',
      '/profile': 'profile'
    };
    setCurrentPage(routeToPage[location.pathname] || 'journey-selection');
  }, [location]);

  const handleNavigate = (page: string) => {
    console.log(`📍 PregnancyJourneyWrapper - Navigation request to: ${page}`);
    
    // Help is handled via dialog on home pages, not a route
    if (page === 'help') {
      console.log('ℹ️ Help is accessed via dialog on home pages');
      return;
    }
    
    const pageRoutes: { [key: string]: string } = {
      'home': getHomeRoute(),
      'vault': '/vault',
      'upload-memory': '/upload',
      'family-tree': '/tree',
      'profile': '/profile',
      'family-wall': '/wall',
      'journey-selection': '/journey',
      'journal': '/journal',
      'invite-family-member': '/invite',
      'time-capsules': '/capsules'
    };

    const route = pageRoutes[page] || '/journey';
    console.log(`📍 Navigating to route: ${route}`);
    navigate(route);
  };

  const handleBack = () => {
    navigate('/journey', { replace: true });
  };

  const handleCaptureMemory = (milestoneData: any) => {
    console.log('📸 Capturing memory for milestone:', milestoneData);
    navigate('/upload', { state: { milestoneContext: milestoneData } });
  };

  return (
    <>
      <TopNavigationBar 
        user={user}
        onNavigate={handleNavigate}
      />
      <div className="pt-16">
        <PregnancyJourneyPage 
          userId={user?.id}
          onBack={handleBack}
          onCaptureMemory={handleCaptureMemory}
        />
      </div>
      <BottomNavigation 
        currentPage={currentPage}
        onNavigate={handleNavigate}
        unreadCount={unreadCount}
      />
    </>
  );
};

// Wrapper component for JournalPage
const JournalPageWrapper = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState('journal');
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    // Get current user from localStorage
    const currentUserId = localStorage.getItem('current_user_id');
    if (currentUserId) {
      const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
      if (userProfile) {
        const userData = JSON.parse(userProfile);
        console.log('✅ JournalPageWrapper: User loaded:', userData.email);
        setUser(userData);
        
        // 🔧 NEW: Use centralized family member sync service
        if (userData.family_id) {
          import('./utils/familyMemberSyncService').then(async ({ loadFamilyMembers }) => {
            const members = await loadFamilyMembers(userData.family_id, {
              includeRootUser: true,
              excludeCurrentUser: true, // Journal excludes current user (can't share with self)
              currentUserId: currentUserId
            });
            setFamilyMembers(members);
            console.log(`✅ JournalPageWrapper: Loaded ${members.length} family members via sync service`);
          });
          
          // Calculate unread count from memories
          const memoriesData = localStorage.getItem(`family:${userData.family_id}:memories`);
          if (memoriesData) {
            const memories = JSON.parse(memoriesData);
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const recentCount = memories.filter((m: any) => {
              const memoryDate = new Date(m.created_at || m.createdAt);
              return memoryDate >= oneWeekAgo;
            }).length;
            setUnreadCount(recentCount);
          }
        }
      } else {
        // Silently handle missing profile (expected if user not logged in)
      }
    } else {
      // Silently handle missing user ID (expected if user not logged in)
    }
    setIsLoadingUser(false);
  }, []);

  // 🔧 NEW: Listen for family tree updates and reload members
  useEffect(() => {
    const handleTreeUpdate = async () => {
      const currentUserId = localStorage.getItem('current_user_id');
      if (currentUserId) {
        const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
        if (userProfile) {
          const userData = JSON.parse(userProfile);
          if (userData.family_id) {
            console.log('🔄 JournalPageWrapper: Tree update detected, reloading members');
            const { loadFamilyMembers } = await import('./utils/familyMemberSyncService');
            const members = await loadFamilyMembers(userData.family_id, {
              includeRootUser: true,
              excludeCurrentUser: true,
              currentUserId: currentUserId
            });
            setFamilyMembers(members);
            console.log(`✅ JournalPageWrapper: Reloaded ${members.length} family members`);
          }
        }
      }
    };

    window.addEventListener('familyTreeUpdated', handleTreeUpdate);
    return () => window.removeEventListener('familyTreeUpdated', handleTreeUpdate);
  }, []);

  // Update current page based on route
  useEffect(() => {
    const routeToPage: { [key: string]: string } = {
      '/journal': 'journal',
      '/app': 'home',
      '/vault': 'vault',
      '/tree': 'family-tree',
      '/upload': 'upload-memory',
      '/profile': 'profile'
    };
    setCurrentPage(routeToPage[location.pathname] || 'journal');
  }, [location]);

  const handleNavigate = (page: string) => {
    console.log(`📍 JournalPageWrapper - Navigation request to: ${page}`);
    
    // Help is handled via dialog on home pages, not a route
    if (page === 'help') {
      console.log('ℹ️ Help is accessed via dialog on home pages');
      return;
    }
    
    // Map page names to routes
    const pageRoutes: { [key: string]: string } = {
      'home': getHomeRoute(),
      'vault': '/vault',
      'upload-memory': '/upload',
      'family-tree': '/tree',
      'profile': '/profile',
      'family-wall': '/wall',
      'journey-selection': '/journey',
      'journal': '/journal',
      'invite-family-member': '/invite',
      'time-capsules': '/capsules',
      'sign-in': '/signin'
    };

    const route = pageRoutes[page] || '/journal';
    console.log(`📍 Navigating to route: ${route}`);
    navigate(route);
  };

  const handleBack = () => {
    // Use navigate(-1) to go back to the previous page in history
    // This works correctly whether user came from Vault or Home
    navigate(-1);
  };

  // Show loading state while checking for user
  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet mx-auto mb-4"></div>
          <p className="text-ink">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <TopNavigationBar 
        user={user}
        onNavigate={handleNavigate}
      />
      <div className="pt-16">
        <JournalPage 
          userId={user.id}
          userName={user.display_name || user.email?.split('@')[0] || 'You'}
          familyId={user.family_id}
          familyMembers={familyMembers}
          onBack={handleBack}
        />
      </div>
      <BottomNavigation 
        currentPage={currentPage}
        onNavigate={handleNavigate}
        unreadCount={unreadCount}
      />
    </>
  );
};

// Wrapper component for InviteFamilyMemberPage
const InviteFamilyMemberPageWrapper = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentPage, setCurrentPage] = useState('invite-family-member');
  const [unreadCount, setUnreadCount] = useState(0);

  // Load unread count
  useEffect(() => {
    const currentUserId = localStorage.getItem('current_user_id');
    if (currentUserId) {
      const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
      if (userProfile) {
        const userData = JSON.parse(userProfile);
        
        if (userData.family_id) {
          const memoriesData = localStorage.getItem(`family:${userData.family_id}:memories`);
          if (memoriesData) {
            const memories = JSON.parse(memoriesData);
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const recentCount = memories.filter((m: any) => {
              const memoryDate = new Date(m.created_at || m.createdAt);
              return memoryDate >= oneWeekAgo;
            }).length;
            setUnreadCount(recentCount);
          }
        }
      }
    }
  }, []);

  // Update current page based on route
  useEffect(() => {
    const routeToPage: { [key: string]: string } = {
      '/invite': 'invite-family-member',
      '/app': 'home',
      '/vault': 'vault',
      '/tree': 'family-tree',
      '/upload': 'upload-memory',
      '/profile': 'profile'
    };
    setCurrentPage(routeToPage[location.pathname] || 'invite-family-member');
  }, [location]);

  const handleNavigate = (page: string) => {
    console.log(`📍 InviteFamilyMemberPageWrapper - Navigation request to: ${page}`);
    
    // Help is handled via dialog on home pages, not a route
    if (page === 'help') {
      console.log('ℹ️ Help is accessed via dialog on home pages');
      return;
    }
    
    // Map page names to routes
    const pageRoutes: { [key: string]: string } = {
      'home': getHomeRoute(),
      'vault': '/vault',
      'upload-memory': '/upload',
      'family-tree': '/tree',
      'profile': '/profile',
      'family-wall': '/wall',
      'journey-selection': '/journey',
      'journal': '/journal',
      'invite-family-member': '/invite',
      'time-capsules': '/capsules',
      'sign-in': '/signin'
    };

    const route = pageRoutes[page] || '/invite';
    console.log(`📍 Navigating to route: ${route}`);
    navigate(route);
  };

  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };

  const handleSuccess = async () => {
    console.log('✅ Invitations sent successfully!');
    
    // 🎉 Check if this is the first invite and celebrate!
    const currentUserId = localStorage.getItem('current_user_id');
    if (currentUserId) {
      const invitesKey = `user:${currentUserId}:invites_sent`;
      const existingInvites = localStorage.getItem(invitesKey);
      if (!existingInvites || existingInvites === '[]') {
        const { celebrateFirstInvite } = await import('./utils/confettiService');
        celebrateFirstInvite();
        // Store that user has sent invites
        localStorage.setItem(invitesKey, JSON.stringify([{ timestamp: new Date().toISOString() }]));
      }
    }
    
    toast.success('🎉 Invitations sent to your family members!');
    navigate(getHomeRoute()); // Navigate to appropriate home after success
  };

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const currentUserId = localStorage.getItem('current_user_id');
    if (currentUserId) {
      const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
      if (userProfile) {
        setUser(JSON.parse(userProfile));
      }
    }
  }, []);

  return (
    <>
      <TopNavigationBar 
        user={user}
        onNavigate={handleNavigate}
      />
      <div className="pt-16">
        <InviteFamilyMemberPage 
          onBack={handleBack}
          onSuccess={handleSuccess}
        />
      </div>
      <BottomNavigation 
        currentPage={currentPage}
        onNavigate={handleNavigate}
        unreadCount={unreadCount}
      />
    </>
  );
};

// Wrapper component for TimeCapsulesPage
const TimeCapsulesPageWrapper = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentPage, setCurrentPage] = useState('time-capsules');
  const [unreadCount, setUnreadCount] = useState(0);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);

  // Load family members from family tree
  useEffect(() => {
    const currentUserId = localStorage.getItem('current_user_id');
    if (currentUserId) {
      const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
      if (userProfile) {
        const userData = JSON.parse(userProfile);
        
        // 🔧 NEW: Use centralized family member sync service
        if (userData.family_id) {
          import('./utils/familyMemberSyncService').then(async ({ loadFamilyMembers }) => {
            const members = await loadFamilyMembers(userData.family_id, {
              includeRootUser: true,
              excludeCurrentUser: true, // Time Capsules excludes current user
              currentUserId: currentUserId
            });
            setFamilyMembers(members);
            console.log(`✅ TimeCapsulesPageWrapper: Loaded ${members.length} family members via sync service`);
          });
          
          // Calculate unread count from memories
          const memoriesData = localStorage.getItem(`family:${userData.family_id}:memories`);
          if (memoriesData) {
            const memories = JSON.parse(memoriesData);
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const recentCount = memories.filter((m: any) => {
              const memoryDate = new Date(m.created_at || m.createdAt);
              return memoryDate >= oneWeekAgo;
            }).length;
            setUnreadCount(recentCount);
          }
        }
      }
    }
  }, []);

  // 🔧 NEW: Listen for family tree updates and reload members
  useEffect(() => {
    const handleTreeUpdate = async () => {
      const currentUserId = localStorage.getItem('current_user_id');
      if (currentUserId) {
        const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
        if (userProfile) {
          const userData = JSON.parse(userProfile);
          if (userData.family_id) {
            console.log('🔄 TimeCapsulesPageWrapper: Tree update detected, reloading members');
            const { loadFamilyMembers } = await import('./utils/familyMemberSyncService');
            const members = await loadFamilyMembers(userData.family_id, {
              includeRootUser: true,
              excludeCurrentUser: true,
              currentUserId: currentUserId
            });
            setFamilyMembers(members);
            console.log(`✅ TimeCapsulesPageWrapper: Reloaded ${members.length} family members`);
          }
        }
      }
    };

    window.addEventListener('familyTreeUpdated', handleTreeUpdate);
    return () => window.removeEventListener('familyTreeUpdated', handleTreeUpdate);
  }, []);

  // Update current page based on route
  useEffect(() => {
    const routeToPage: { [key: string]: string } = {
      '/capsules': 'time-capsules',
      '/app': 'home',
      '/vault': 'vault',
      '/tree': 'family-tree',
      '/upload': 'upload-memory',
      '/profile': 'profile'
    };
    setCurrentPage(routeToPage[location.pathname] || 'time-capsules');
  }, [location]);

  const handleNavigate = (page: string) => {
    console.log(`📍 TimeCapsulesPageWrapper - Navigation request to: ${page}`);
    
    // Help is handled via dialog on home pages, not a route
    if (page === 'help') {
      console.log('ℹ️ Help is accessed via dialog on home pages');
      return;
    }
    
    // Map page names to routes
    const pageRoutes: { [key: string]: string } = {
      'home': getHomeRoute(),
      'vault': '/vault',
      'upload-memory': '/upload',
      'family-tree': '/tree',
      'profile': '/profile',
      'family-wall': '/wall',
      'journey-selection': '/journey',
      'journal': '/journal',
      'invite-family-member': '/invite',
      'time-capsules': '/capsules',
      'sign-in': '/signin'
    };

    const route = pageRoutes[page] || '/capsules';
    console.log(`📍 Navigating to route: ${route}`);
    navigate(route);
  };

  const handleBack = () => {
    navigate('/app');
  };

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const currentUserId = localStorage.getItem('current_user_id');
    if (currentUserId) {
      const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
      if (userProfile) {
        setUser(JSON.parse(userProfile));
      }
    }
  }, []);

  return (
    <>
      <TopNavigationBar 
        user={user}
        onNavigate={handleNavigate}
      />
      <div className="pt-16">
        <TimeCapsulesPage 
          onBack={handleBack}
          familyMembers={familyMembers}
        />
      </div>
      <BottomNavigation 
        currentPage={currentPage}
        onNavigate={handleNavigate}
        unreadCount={unreadCount}
      />
    </>
  );
};

// Wrapper component for FamilyWallPage
const FamilyWallPageWrapper = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [family, setFamily] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState('family-wall');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const currentUserId = localStorage.getItem('current_user_id');
    if (currentUserId) {
      const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
      if (userProfile) {
        const userData = JSON.parse(userProfile);
        setUser(userData);
        
        if (userData.family_id) {
          const familyData = localStorage.getItem(`family:${userData.family_id}:data`);
          if (familyData) {
            setFamily(JSON.parse(familyData));
          }
          
          const memoriesData = localStorage.getItem(`family:${userData.family_id}:memories`);
          if (memoriesData) {
            const memories = JSON.parse(memoriesData);
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const recentCount = memories.filter((m: any) => {
              const memoryDate = new Date(m.created_at || m.createdAt);
              return memoryDate >= oneWeekAgo;
            }).length;
            setUnreadCount(recentCount);
          }
        }
      }
    }
  }, []);

  useEffect(() => {
    const routeToPage: { [key: string]: string } = {
      '/wall': 'family-wall',
      '/app': 'home',
      '/vault': 'vault',
      '/tree': 'family-tree',
      '/upload': 'upload-memory',
      '/profile': 'profile'
    };
    setCurrentPage(routeToPage[location.pathname] || 'family-wall');
  }, [location]);

  const handleNavigate = (page: string) => {
    console.log(`📍 FamilyWallPageWrapper - Navigation request to: ${page}`);
    
    if (page === 'help') {
      console.log('ℹ️ Help is accessed via dialog on home pages');
      return;
    }
    
    const pageRoutes: { [key: string]: string } = {
      'home': getHomeRoute(),
      'vault': '/vault',
      'upload-memory': '/upload',
      'family-tree': '/tree',
      'profile': '/profile',
      'family-wall': '/wall',
      'journey-selection': '/journey',
      'journal': '/journal',
      'invite-family-member': '/invite',
      'time-capsules': '/capsules',
      'sign-in': '/signin'
    };

    const route = pageRoutes[page] || '/wall';
    console.log(`📍 Navigating to route: ${route}`);
    navigate(route);
  };

  const handleBack = () => {
    navigate(getHomeRoute());
  };

  return (
    <>
      <TopNavigationBar 
        user={user}
        onNavigate={handleNavigate}
      />
      <div className="pt-16">
        <FamilyWallPage 
          user={user}
          family={family}
          onBack={handleBack}
          onNavigate={handleNavigate}
        />
      </div>
      <BottomNavigation 
        currentPage={currentPage}
        onNavigate={handleNavigate}
        unreadCount={unreadCount}
      />
    </>
  );
};

// Wrapper component for ProfilePage
const ProfilePageWrapper = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentPage, setCurrentPage] = useState('profile');
  const [unreadCount, setUnreadCount] = useState(0);

  // Load unread count
  useEffect(() => {
    const currentUserId = localStorage.getItem('current_user_id');
    if (currentUserId) {
      const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
      if (userProfile) {
        const userData = JSON.parse(userProfile);
        
        if (userData.family_id) {
          const memoriesData = localStorage.getItem(`family:${userData.family_id}:memories`);
          if (memoriesData) {
            const memories = JSON.parse(memoriesData);
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const recentCount = memories.filter((m: any) => {
              const memoryDate = new Date(m.created_at || m.createdAt);
              return memoryDate >= oneWeekAgo;
            }).length;
            setUnreadCount(recentCount);
          }
        }
      }
    }
  }, []);

  // Update current page based on route
  useEffect(() => {
    const routeToPage: { [key: string]: string } = {
      '/profile': 'profile',
      '/app': 'home',
      '/vault': 'vault',
      '/tree': 'family-tree',
      '/upload': 'upload-memory'
    };
    setCurrentPage(routeToPage[location.pathname] || 'profile');
  }, [location]);

  const handleNavigate = (page: string) => {
    console.log(`📍 ProfilePageWrapper - Navigation request to: ${page}`);
    
    // Help is handled via dialog on home pages, not a route
    if (page === 'help') {
      console.log('ℹ️ Help is accessed via dialog on home pages');
      return;
    }
    
    // Map page names to routes
    const pageRoutes: { [key: string]: string } = {
      'home': getHomeRoute(),
      'vault': '/vault',
      'upload-memory': '/upload',
      'family-tree': '/tree',
      'profile': '/profile',
      'family-wall': '/wall',
      'journey-selection': '/journey',
      'journal': '/journal',
      'invite-family-member': '/invite',
      'time-capsules': '/capsules',
      'sign-in': '/signin'
    };

    const route = pageRoutes[page] || '/profile';
    console.log(`📍 Navigating to route: ${route}`);
    navigate(route);
  };

  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const currentUserId = localStorage.getItem('current_user_id');
    if (currentUserId) {
      const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
      if (userProfile) {
        setUser(JSON.parse(userProfile));
      }
    }
  }, []);

  return (
    <>
      <TopNavigationBar 
        user={user}
        onNavigate={handleNavigate}
      />
      <div className="pt-16">
        <ProfilePage onBack={handleBack} />
      </div>
      <BottomNavigation 
        currentPage={currentPage}
        onNavigate={handleNavigate}
        unreadCount={unreadCount}
      />
    </>
  );
};

const App: React.FC = () => {
  // 📊 MONITORING: Initialize error monitoring and analytics
  useEffect(() => {
    // Initialize error monitoring (localStorage mode for now)
    // Change to errorMonitoring.init(true) if you set up Sentry
    errorMonitoring.init(false); // false = localStorage only
    
    // Initialize analytics (custom mode for now)
    // Change to analytics.init('posthog') or analytics.init('ga') after setup
    analytics.init('custom'); // custom = localStorage only
    
    console.log('✅ Monitoring systems initialized (localStorage mode)');
    console.log('   • Error monitoring: Active');
    console.log('   • Analytics tracking: Active');
    console.log('   • Feedback widget: Active');
  }, []);

  // 🔧 UUID Migration: Check and fix invalid UUIDs on app startup
  useEffect(() => {
    import('./utils/fixInvalidUUIDs').then(({ checkAndFixInvalidUUIDs }) => {
      checkAndFixInvalidUUIDs();
    });
  }, []);

  // 🛡️ CRITICAL FIX: Check localStorage health and auto-recover from Supabase on startup
  useEffect(() => {
    import('./utils/profileRecovery').then(({ checkAndRecoverLocalStorage }) => {
      checkAndRecoverLocalStorage();
    });
  }, []);

  // 🗂️ STORAGE: Verify Supabase Storage buckets exist on app startup
  useEffect(() => {
    import('./utils/supabase/storage').then(({ ensureMemoriesBucketExists }) => {
      ensureMemoriesBucketExists().then((exists) => {
        if (!exists) {
          console.warn('⚠️ Memory files bucket (make-2544f7d4-memory-files) does not exist.');
          console.warn('   Memory uploads may fail. Check Supabase Storage.');
        } else {
          console.log('✅ Memory files bucket verified on client startup');
        }
      }).catch((error) => {
        console.error('❌ Error verifying memory files bucket:', error);
      });
    });
  }, []);

  return (
    <ErrorBoundary>
      <DataMigrationWrapper>
        <BrowserRouter>
          <ScrollToTop />
          <Toaster position="top-center" richColors />
          <FeedbackWidget />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes - No authentication required */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/signup" element={<SignInWrapper mode="signup" />} />
              <Route path="/signin" element={<SignInWrapper mode="signin" />} />
              
              {/* Design Mockups - Public for easy viewing */}
              <Route path="/mockups/header-new" element={<HomeHeaderMockups userType="new" userName="Sarah" />} />
              <Route path="/mockups/header-returning" element={<HomeHeaderMockups userType="returning" userName="Sarah" />} />
              
              {/* Debug Tools - Public for testing */}
              <Route path="/debug-reset" element={<DebugResetPage />} />
              
              {/* Admin Dashboard - Restricted to admin users only */}
              <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboardPage /></ProtectedRoute>} />
              
              {/* Protected routes - Authentication required */}
              <Route path="/onboarding" element={<ProtectedRoute><OnboardingPageWrapper /></ProtectedRoute>} />
              <Route path="/home" element={<ProtectedRoute><NewUserHomeWrapper /></ProtectedRoute>} />
              <Route path="/app" element={<ProtectedRoute><ReturningUserHomeWrapper /></ProtectedRoute>} />
              <Route path="/tree" element={<ProtectedRoute><FamilyTreeWrapper /></ProtectedRoute>} />
              <Route path="/vault" element={<ProtectedRoute><VaultPageWrapper /></ProtectedRoute>} />
              <Route path="/upload" element={<ProtectedRoute><MemoryUploadPageWrapper /></ProtectedRoute>} />
              <Route path="/journal" element={<ProtectedRoute><JournalPageWrapper /></ProtectedRoute>} />
              <Route path="/journey" element={<ProtectedRoute><JourneySelectionWrapper /></ProtectedRoute>} />
              <Route path="/journey/couple" element={<ProtectedRoute><CoupleJourneyWrapper /></ProtectedRoute>} />
              <Route path="/journey/pregnancy" element={<ProtectedRoute><PregnancyJourneyWrapper /></ProtectedRoute>} />
              <Route path="/invite" element={<ProtectedRoute><InviteFamilyMemberPageWrapper /></ProtectedRoute>} />
              <Route path="/capsules" element={<ProtectedRoute><TimeCapsulesPageWrapper /></ProtectedRoute>} />
              <Route path="/wall" element={<ProtectedRoute><FamilyWallPageWrapper /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePageWrapper /></ProtectedRoute>} />
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </DataMigrationWrapper>
    </ErrorBoundary>
  );
};

export default App;
