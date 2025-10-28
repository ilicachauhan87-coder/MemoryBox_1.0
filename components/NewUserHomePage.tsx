import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { HelpDialog } from './HelpDialog';
import { getPersonalizedQuoteForNewUser } from '../utils/quotesService';
import { 
  TreePine, 
  Upload, 
  Heart, 
  CheckCircle,
  ArrowRight,
  Sparkles,
  Clock,
  UserPlus,
  Lock,
  Star,
  BookOpen,
  HelpCircle,
  Calendar,
  Image,
  Users,
  Plus,
  PlayCircle,
  Gift
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  display_name?: string;
  auth_method: string;
  is_new_user: boolean;
  isNewUser: boolean;
  activity_count: number;
  created_at: string;
  updated_at: string;
  family_id: string;
  gender?: string;
}

interface NewUserHomePageProps {
  onNavigate: (page: string) => void;
  user: UserProfile | null;
  onCompleteOnboarding?: (data?: any) => void;
}

export function NewUserHomePage({ onNavigate, user }: NewUserHomePageProps) {
  const [userHasMemories, setUserHasMemories] = useState(false);
  const [userHasFamilyMembers, setUserHasFamilyMembers] = useState(false);
  const [actualFamilyMemberCount, setActualFamilyMemberCount] = useState(0);
  const [actualMemoryCount, setActualMemoryCount] = useState(0);
  const [actualTimeCapsuleCount, setActualTimeCapsuleCount] = useState(0);
  const [actualMilestoneCount, setActualMilestoneCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [greeting, setGreeting] = useState('Welcome to your Family Vault');

  // Get time-based greeting
  useEffect(() => {
    const hour = new Date().getHours();
    const userName = user?.display_name || user?.name?.split(' ')[0] || 'there';
    
    if (hour < 12) {
      setGreeting(`Good Morning, ${userName} ☀️`);
    } else if (hour < 17) {
      setGreeting(`Good Afternoon, ${userName} 🌤️`);
    } else {
      setGreeting(`Good Evening, ${userName} 🌙`);
    }
  }, [user]);

  // Personalized quote using centralized service with 75+ curated family quotes
  // Rotates daily through categories: togetherness, memories, love
  const getPersonalizedQuote = () => {
    return getPersonalizedQuoteForNewUser(user?.gender);
  };

  // OLD IMPLEMENTATION - REPLACED
  const getPersonalizedQuote_OLD = () => {
    const gender = user?.gender?.toLowerCase();
    const quotes = {
      male: [
        '"A family tree can wither if nobody tends its roots." — Unknown',
        '"The love of a family is life\'s greatest blessing." — Eva Burrows',
        '"Family is not an important thing. It\'s everything." — Michael J. Fox'
      ],
      female: [
        '"In every conceivable manner, the family is link to our past, bridge to our future." — Alex Haley',
        '"Family means no one gets left behind or forgotten." — David Ogden Stiers',
        '"The memories we make with our family is everything." — Candace Cameron Bure'
      ],
      default: [
        '"Family is where life begins and love never ends." — Unknown',
        '"The family is one of nature\'s masterpieces." — George Santayana',
        '"Rejoice with your family in the beautiful land of life." — Albert Einstein'
      ]
    };

    const quoteSet = gender === 'male' ? quotes.male : gender === 'female' ? quotes.female : quotes.default;
    const today = new Date().getDate();
    return quoteSet[today % quoteSet.length];
  };

  // 🎯 CRITICAL FIX: Centralized function to check/reload all user progress metrics
  // This ensures ALL counters stay in sync with database
  const checkUserProgress = async (forceReload = false) => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    console.log('🔍 NewUserHomePage: checkUserProgress called', {
      forceReload,
      userId: user.id,
      userEmail: user.email,
      familyId: user.family_id,
      userName: user.name || user.display_name
    });

    try {
      // Check for family members in the tree
      if (user.family_id) {
        const treeKey = `familyTree_${user.family_id}`;
        const treeData = localStorage.getItem(treeKey);
        
        if (treeData) {
          try {
            const parsedTree = JSON.parse(treeData);
            const peopleArray = Array.isArray(parsedTree) ? parsedTree : parsedTree.people || [];
            // 🔧 FIX: Filter out BOTH root users AND temporary placeholder users with generic names
            const memberCount = peopleArray.filter((p: any) => {
              // Exclude root user
              if (p.isRoot === true) return false;
              // Exclude temporary placeholder user created by FamilyTreeApp
              if (p.id === 'root' && (p.firstName === 'You' || p.name === 'You')) return false;
              // Must have a name to count
              if (!p.name && !p.firstName) return false;
              return true;
            }).length;
            setUserHasFamilyMembers(memberCount > 0);
            setActualFamilyMemberCount(memberCount);
            console.log('📊 NewUserHomePage: Family tree check - found', memberCount, 'non-root members');
          } catch (e) {
            setUserHasFamilyMembers(false);
          }
        }

        // ✅ DATABASE-FIRST: Check for memories from database
        console.log(`🔍 NewUserHomePage: Loading memories for family_id: ${user.family_id}`);
        try {
          const { DatabaseService } = await import('../utils/supabase/persistent-database');
          const memories = await DatabaseService.getFamilyMemories(user.family_id);
          const memCount = Array.isArray(memories) ? memories.length : 0;
          setUserHasMemories(memCount > 0);
          setActualMemoryCount(memCount);
          console.log(`📊 NewUserHomePage: Found ${memCount} memories in database for family ${user.family_id}`);
          console.log(`📊 NewUserHomePage: Memory details:`, memories.map(m => ({ 
            id: m.id, 
            title: m.title, 
            type: m.memory_type || m.type,
            created_at: m.created_at 
          })));
        } catch (error) {
          console.warn('⚠️ NewUserHomePage: Failed to load memories count from database, falling back to localStorage:', error);
          // Fallback to localStorage
          const memoriesKey = `family:${user.family_id}:memories`;
          const memoriesData = localStorage.getItem(memoriesKey);
          if (memoriesData) {
            try {
              const memories = JSON.parse(memoriesData);
              const memCount = Array.isArray(memories) ? memories.length : 0;
              setUserHasMemories(memCount > 0);
              setActualMemoryCount(memCount);
              console.log(`📦 NewUserHomePage: Found ${memCount} memories in localStorage fallback`);
            } catch (e) {
              setUserHasMemories(false);
              setActualMemoryCount(0);
              console.log(`❌ NewUserHomePage: localStorage parse error, setting counts to 0`);
            }
          } else {
            setUserHasMemories(false);
            setActualMemoryCount(0);
            console.log(`📦 NewUserHomePage: No memories found in localStorage`);
          }
        }

        // ✅ DATABASE-FIRST: Check for Time Capsules from database
        try {
          const { DatabaseService } = await import('../utils/supabase/persistent-database');
          const capsules = await DatabaseService.getTimeCapsules(user.family_id);
          const capsuleCount = Array.isArray(capsules) ? capsules.length : 0;
          setActualTimeCapsuleCount(capsuleCount);
          console.log(`📊 NewUserHomePage: Found ${capsuleCount} time capsules`);
        } catch (error) {
          console.warn('⚠️ Failed to load time capsules count:', error);
          setActualTimeCapsuleCount(0);
        }

        // ✅ DATABASE-FIRST: Check for Milestones from database (couple + pregnancy journeys)
        try {
          const { DatabaseService } = await import('../utils/supabase/persistent-database');
          
          // Get couple journey milestones
          const coupleJourney = await DatabaseService.getJourneyProgress(user.id, 'couple');
          const coupleMilestones = coupleJourney?.milestones || [];
          const coupleCustom = coupleJourney?.customMilestones || [];
          
          // Get pregnancy journey milestones
          const pregnancyJourney = await DatabaseService.getJourneyProgress(user.id, 'pregnancy');
          const pregnancyMilestones = pregnancyJourney?.milestones || [];
          const pregnancyCustom = pregnancyJourney?.customMilestones || [];
          
          // Count only COMPLETED milestones
          const completedCouple = coupleMilestones.filter((m: any) => m.completed || m.is_completed).length;
          const completedCoupleCustom = coupleCustom.filter((m: any) => m.completed || m.is_completed).length;
          const completedPregnancy = pregnancyMilestones.filter((m: any) => m.completed || m.is_completed).length;
          const completedPregnancyCustom = pregnancyCustom.filter((m: any) => m.completed || m.is_completed).length;
          
          const totalMilestones = completedCouple + completedCoupleCustom + completedPregnancy + completedPregnancyCustom;
          setActualMilestoneCount(totalMilestones);
          console.log(`📊 NewUserHomePage: Found ${totalMilestones} completed milestones (${completedCouple} couple, ${completedPregnancy} pregnancy, ${completedCoupleCustom + completedPregnancyCustom} custom)`);
        } catch (error) {
          console.warn('⚠️ Failed to load milestones count:', error);
          setActualMilestoneCount(0);
        }
      }
    } catch (error) {
      console.error('Failed to check user progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check user progress on mount
  useEffect(() => {
    checkUserProgress();
  }, [user]);

  // Listen for storage changes to update progress
  useEffect(() => {
    const handleStorageChange = () => {
      if (user?.family_id) {
        const treeKey = `familyTree_${user.family_id}`;
        const treeData = localStorage.getItem(treeKey);
        if (treeData) {
          try {
            const parsedTree = JSON.parse(treeData);
            const peopleArray = Array.isArray(parsedTree) ? parsedTree : parsedTree.people || [];
            // 🔧 FIX: Filter out BOTH root users AND temporary placeholder users with generic names
            const memberCount = peopleArray.filter((p: any) => {
              // Exclude root user
              if (p.isRoot === true) return false;
              // Exclude temporary placeholder user created by FamilyTreeApp
              if (p.id === 'root' && (p.firstName === 'You' || p.name === 'You')) return false;
              // Must have a name to count
              if (!p.name && !p.firstName) return false;
              return true;
            }).length;
            setUserHasFamilyMembers(memberCount > 0);
            setActualFamilyMemberCount(memberCount);
            console.log('📊 NewUserHomePage: Storage change detected - found', memberCount, 'non-root members');
          } catch (e) {
            // Silent fail
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('familyTreeUpdated', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('familyTreeUpdated', handleStorageChange);
    };
  }, [user]);

  // 🎉 CRITICAL FIX: Listen for memoryAdded event to update ALL metrics in real-time
  useEffect(() => {
    const handleMemoryAdded = async () => {
      console.log('📡 NewUserHomePage: Received memoryAdded event - reloading ALL metrics');
      if (!user?.family_id) return;
      await checkUserProgress(true);
    };

    const handleMemoryUpdated = async () => {
      console.log('📡 NewUserHomePage: Received memoryUpdated event - reloading ALL metrics');
      if (!user?.family_id) return;
      await checkUserProgress(true);
    };

    window.addEventListener('memoryAdded', handleMemoryAdded);
    window.addEventListener('memoryUpdated', handleMemoryUpdated);
    
    return () => {
      window.removeEventListener('memoryAdded', handleMemoryAdded);
      window.removeEventListener('memoryUpdated', handleMemoryUpdated);
    };
  }, [user]);

  // Calculate progress towards graduation
  // ✅ FIX: Use actualMemoryCount from database instead of localStorage
  const memoryCount = actualMemoryCount; // Already loaded from database in checkUserProgress
  const [nuclearFamilyComplete, setNuclearFamilyComplete] = useState(false);
  const MIN_MEMORIES_REQUIRED = 5;
  
  // Check graduation criteria
  useEffect(() => {
    if (!user?.family_id) return;
    
    // Check nuclear family completion
    const treeKey = `familyTree_${user.family_id}`;
    const treeData = localStorage.getItem(treeKey);
    if (treeData) {
      try {
        const parsedTree = JSON.parse(treeData);
        const peopleArray = Array.isArray(parsedTree) ? parsedTree : parsedTree.people || [];
        
        // 🔧 FIX: Always verify actual tree structure - don't rely solely on wizard flag
        // Wizard completion flag doesn't mean family was actually added (user may have skipped)
        const generationCounts: { [key: number]: number } = {};
        peopleArray.forEach((person: any) => {
          const gen = person.generation || 0;
          generationCounts[gen] = (generationCounts[gen] || 0) + 1;
        });
        
        const gen0Count = generationCounts[0] || 0;
        const genPlus1Count = generationCounts[1] || 0;
        const genMinus1Count = generationCounts[-1] || 0;
        
        // Nuclear family criteria: At least 2 in Gen0 (user + spouse) AND (2+ children OR 2+ parents)
        const hasGen0 = gen0Count >= 2;
        const hasGen1OrGenMinus1 = genPlus1Count >= 2 || genMinus1Count >= 2;
        const structureComplete = hasGen0 && hasGen1OrGenMinus1;
        
        setNuclearFamilyComplete(structureComplete);
        
        console.log('📊 NewUserHomePage - Nuclear Family Check:', {
          gen0Count,
          genPlus1Count,
          genMinus1Count,
          hasGen0,
          hasGen1OrGenMinus1,
          nuclearFamilyComplete: structureComplete
        });
      } catch (e) {
        setNuclearFamilyComplete(false);
      }
    }
  }, [user, userHasFamilyMembers, actualMemoryCount]);
  
  // Calculate progress (2 goals: memories + family)
  const memoryProgress = Math.min((memoryCount / MIN_MEMORIES_REQUIRED) * 100, 100);
  const familyProgress = nuclearFamilyComplete ? 100 : (userHasFamilyMembers ? 50 : 0);
  const overallProgress = (memoryProgress + familyProgress) / 2;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet mx-auto mb-4"></div>
          <p className="text-ink">Loading your vault...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-white to-cream/50 pb-24 overflow-x-hidden">
      {/* Header Section with Dynamic Greeting */}
      <div className="bg-gradient-to-br from-violet/90 via-coral/80 to-aqua/90 text-white px-4 py-8 sm:py-12 shadow-2xl relative overflow-hidden">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/20 to-transparent"></div>
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-full">
              <Sparkles className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div>
              <h1 className="text-white text-2xl sm:text-3xl md:text-4xl" style={{ fontWeight: 600 }}>
                {greeting}
              </h1>
              <p className="text-white/90 text-sm sm:text-base md:text-lg mt-1">
                Welcome to your Family Vault 🌸
              </p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <Card className="mt-6 bg-white/95 backdrop-blur-sm border-0 shadow-xl">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-ink font-medium text-sm sm:text-base">Your Progress</p>
                <Badge className="bg-aqua text-white border-0">
                  {Math.round(overallProgress)}% Complete
                </Badge>
              </div>
              <Progress value={overallProgress} className="h-3 bg-cream" />
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="text-xs sm:text-sm">
                  <p className="text-muted-foreground mb-1">📸 Memories</p>
                  <p className={memoryCount >= MIN_MEMORIES_REQUIRED ? 'text-emerald-600 font-medium' : 'text-ink'}>
                    {memoryCount} / {MIN_MEMORIES_REQUIRED}
                    {memoryCount >= MIN_MEMORIES_REQUIRED && ' ✓'}
                  </p>
                </div>
                <div className="text-xs sm:text-sm">
                  <p className="text-muted-foreground mb-1">👨‍👩‍👧‍👦 Family</p>
                  <p className={nuclearFamilyComplete ? 'text-emerald-600 font-medium' : 'text-ink'}>
                    {nuclearFamilyComplete ? 'Complete ✓' : userHasFamilyMembers ? 'In Progress' : 'Not Started'}
                  </p>
                </div>
              </div>
              <p className="text-muted-foreground text-xs sm:text-sm mt-3">
                {overallProgress === 100 
                  ? "🎓 Congratulations! You've completed your vault setup!"
                  : "Complete both goals to unlock the full experience"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Personalized Quote/Reflection Area */}
        <Card className="memory-card border-2 border-violet/20 shadow-lg hover:shadow-xl transition-all">
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gradient-to-br from-violet/10 to-coral/10 rounded-full flex-shrink-0">
                <Heart className="w-6 h-6 text-violet" />
              </div>
              <div className="flex-1">
                <p className="text-ink text-base sm:text-lg italic leading-relaxed">
                  {getPersonalizedQuote()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Access Panel */}
        <div className="space-y-3">
          <h2 className="text-xl sm:text-2xl text-ink px-1" style={{ fontWeight: 600 }}>
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { icon: TreePine, label: 'Build Tree', page: 'family-tree', gradient: 'from-emerald-500 to-teal-600' },
              { icon: Plus, label: 'Add Memory', page: 'upload-memory', gradient: 'from-coral to-orange-500' },
              { icon: UserPlus, label: 'Invite Family', page: 'invite-family-member', gradient: 'from-aqua to-blue-500' },
              { icon: Clock, label: 'Time Capsule', page: 'time-capsules', gradient: 'from-violet to-purple-600' },
              { icon: Star, label: 'Life Journeys', page: 'journey-selection', gradient: 'from-purple-500 to-pink-600' },
              { icon: BookOpen, label: 'My Journal', page: 'journal', gradient: 'from-amber-500 to-orange-600' }
            ].map((action, idx) => {
              const Icon = action.icon;
              return (
                <Button
                  key={idx}
                  onClick={() => onNavigate(action.page)}
                  className={`h-24 sm:h-28 flex flex-col items-center justify-center gap-2 bg-gradient-to-br ${action.gradient} text-white hover:opacity-90 transition-all hover:scale-105 shadow-md`}
                >
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                  <span className="text-xs sm:text-sm text-center leading-tight">
                    {action.label}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Core Adaptive Section - NEW USER EXPERIENCE */}
        <Card className="memory-card border-2 border-coral/30 shadow-lg">
          <CardContent className="p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="inline-flex p-4 bg-gradient-to-br from-coral/10 to-violet/10 rounded-full mb-4">
                <TreePine className="w-12 h-12 text-coral" />
              </div>
              <h2 className="text-xl sm:text-2xl text-ink mb-2" style={{ fontWeight: 600 }}>
                Start Your Family Vault
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
                Begin your journey by building your family tree and adding your first precious memory
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mt-6">
              {/* Build Family Tree */}
              <Card 
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  userHasFamilyMembers ? 'border-2 border-emerald-500 bg-emerald-50/50' : 'border-2 border-dashed border-violet/30 hover:border-violet/50'
                }`}
                onClick={() => onNavigate('family-tree')}
              >
                <CardContent className="p-6 text-center">
                  <div className={`inline-flex p-3 rounded-full mb-3 ${
                    userHasFamilyMembers ? 'bg-emerald-100' : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                  }`}>
                    {userHasFamilyMembers ? (
                      <CheckCircle className="w-8 h-8 text-emerald-600" />
                    ) : (
                      <TreePine className="w-8 h-8 text-white" />
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg mb-2" style={{ fontWeight: 600 }}>
                    {userHasFamilyMembers ? '✓ Family Tree Started' : 'Build Family Tree'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {userHasFamilyMembers 
                      ? 'Add more family members' 
                      : 'Add your loved ones to your tree'}
                  </p>
                  <Button 
                    variant={userHasFamilyMembers ? "outline" : "default"}
                    className={userHasFamilyMembers ? '' : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'}
                  >
                    {userHasFamilyMembers ? 'Continue' : 'Get Started'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>

              {/* Add First Memory */}
              <Card 
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  userHasMemories ? 'border-2 border-coral bg-coral/5' : 'border-2 border-dashed border-violet/30 hover:border-violet/50'
                }`}
                onClick={() => onNavigate('upload-memory')}
              >
                <CardContent className="p-6 text-center">
                  <div className={`inline-flex p-3 rounded-full mb-3 ${
                    userHasMemories ? 'bg-coral/20' : 'bg-gradient-to-br from-coral to-orange-500'
                  }`}>
                    {userHasMemories ? (
                      <CheckCircle className="w-8 h-8 text-coral" />
                    ) : (
                      <Upload className="w-8 h-8 text-white" />
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg mb-2" style={{ fontWeight: 600 }}>
                    {userHasMemories ? '✓ First Memory Added' : 'Add First Memory'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {userHasMemories 
                      ? 'Upload more photos & stories' 
                      : 'Share a photo or story with your family'}
                  </p>
                  <Button 
                    variant={userHasMemories ? "outline" : "default"}
                    className={userHasMemories ? '' : 'bg-gradient-to-br from-coral to-orange-500 text-white'}
                  >
                    {userHasMemories ? 'Add More' : 'Upload Now'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Engagement/Suggestion Widget */}
        <Card className="memory-card bg-gradient-to-br from-aqua/5 to-violet/5 border-2 border-aqua/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-aqua/20 rounded-full flex-shrink-0">
                <Sparkles className="w-6 h-6 text-aqua" />
              </div>
              <div className="flex-1">
                <h3 className="text-base sm:text-lg mb-2" style={{ fontWeight: 600 }}>
                  💡 Smart Suggestion
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-3">
                  {memoryCount < MIN_MEMORIES_REQUIRED && !nuclearFamilyComplete
                    ? `You're just getting started! Add ${MIN_MEMORIES_REQUIRED - memoryCount} more ${memoryCount === MIN_MEMORIES_REQUIRED - 1 ? 'memory' : 'memories'} and complete your nuclear family to unlock the full experience.`
                    : memoryCount >= MIN_MEMORIES_REQUIRED && !nuclearFamilyComplete
                    ? "Great job on memories! Now complete your nuclear family by adding your spouse/partner and children OR parents via the family tree."
                    : memoryCount < MIN_MEMORIES_REQUIRED && nuclearFamilyComplete
                    ? `Your family tree looks great! Add ${MIN_MEMORIES_REQUIRED - memoryCount} more ${memoryCount === MIN_MEMORIES_REQUIRED - 1 ? 'memory' : 'memories'} to complete your vault setup.`
                    : "🎉 You've completed both goals! You're ready to explore the full MemoryBox experience with your family."}
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-aqua text-aqua hover:bg-aqua hover:text-white"
                  onClick={() => {
                    if (memoryCount < MIN_MEMORIES_REQUIRED && !nuclearFamilyComplete) {
                      // Need both - suggest whichever they haven't started
                      if (memoryCount === 0) onNavigate('upload-memory');
                      else onNavigate('family-tree');
                    } else if (memoryCount >= MIN_MEMORIES_REQUIRED && !nuclearFamilyComplete) {
                      onNavigate('family-tree');
                    } else if (memoryCount < MIN_MEMORIES_REQUIRED && nuclearFamilyComplete) {
                      onNavigate('upload-memory');
                    } else {
                      onNavigate('family-wall');
                    }
                  }}
                >
                  {memoryCount < MIN_MEMORIES_REQUIRED && !nuclearFamilyComplete
                    ? (memoryCount === 0 ? 'Add Memory' : 'Build Family')
                    : memoryCount >= MIN_MEMORIES_REQUIRED && !nuclearFamilyComplete
                    ? 'Complete Family'
                    : memoryCount < MIN_MEMORIES_REQUIRED && nuclearFamilyComplete
                    ? 'Add Memories'
                    : 'View Family Wall'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vault Progress & Milestones */}
        <Card className="memory-card">
          <CardContent className="p-6">
            <h3 className="text-lg sm:text-xl mb-4" style={{ fontWeight: 600 }}>
              Your Vault Progress
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-violet/10 to-coral/10 rounded-xl">
                <Users className="w-8 h-8 mx-auto mb-2 text-violet" />
                <p className="text-2xl sm:text-3xl mb-1" style={{ fontWeight: 600 }}>
                  {actualFamilyMemberCount}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">Family Members</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-coral/10 to-orange/10 rounded-xl">
                <Image className="w-8 h-8 mx-auto mb-2 text-coral" />
                <p className="text-2xl sm:text-3xl mb-1" style={{ fontWeight: 600 }}>
                  {actualMemoryCount}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">Memories Saved</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-aqua/10 to-blue/10 rounded-xl">
                <Clock className="w-8 h-8 mx-auto mb-2 text-aqua" />
                <p className="text-2xl sm:text-3xl mb-1" style={{ fontWeight: 600 }}>
                  {actualTimeCapsuleCount}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">Time Capsules</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-amber/10 to-yellow/10 rounded-xl">
                <Star className="w-8 h-8 mx-auto mb-2 text-amber-600" />
                <p className="text-2xl sm:text-3xl mb-1" style={{ fontWeight: 600 }}>
                  {actualMilestoneCount}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">Milestones</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Graduation Card */}
        {overallProgress === 100 && (
          <Card className="memory-card bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
            <CardContent className="p-6 text-center">
              <div className="inline-flex p-4 bg-white rounded-full mb-4">
                <Gift className="w-10 h-10 text-purple-600" />
              </div>
              <h3 className="text-lg sm:text-xl mb-2" style={{ fontWeight: 600 }}>
                🎉 Congratulations!
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-4 max-w-md mx-auto">
                You've taken the first steps in building your Family Vault. Explore the Family Wall to see how your memories come to life!
              </p>
              <Button 
                className="bg-gradient-to-br from-purple-600 to-pink-600 text-white hover:opacity-90"
                onClick={() => onNavigate('family-wall')}
              >
                Explore Family Wall
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Help Dialog */}
      <HelpDialog 
        isOpen={showHelpDialog}
        onClose={() => setShowHelpDialog(false)}
      />
    </div>
  );
}
