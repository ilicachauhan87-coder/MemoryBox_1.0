import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { HelpDialog } from './HelpDialog';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { getDailyQuoteForReturningUser, getCategoryEmoji, getCategoryName, getAllCategories } from '../utils/quotesService';
import { 
  getUserFamilyMemories, 
  getUserFamilyMembers, 
  getFamilyInsights, 
  getTodayInFamilyHistory, 
  getRecentActivity,
  validateFamilyAccess
} from '../utils/app-helpers';
import { 
  Heart, 
  Camera, 
  Video, 
  Mic, 
  FileText, 
  Users, 
  Star,
  Clock,
  Sparkles,
  TreePine,
  Upload,
  MessageCircle,
  Eye,
  ChevronRight,
  Flame,
  UserPlus,
  Plus,
  BookOpen,
  Calendar,
  Gift,
  ArrowRight,
  TrendingUp,
  Award,
  Image,
  Play
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
  date_of_birth?: string;
}

interface FamilyData {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  members: string[];
}

interface ReturningUserHomePageProps {
  onNavigate: (page: string) => void;
  user: UserProfile | null;
  family: FamilyData | null;
}

export function ReturningUserHomePage({ onNavigate, user, family }: ReturningUserHomePageProps) {
  const [greeting, setGreeting] = useState('');
  const [streakDays, setStreakDays] = useState(0);
  const [memories, setMemories] = useState<any[]>([]);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [familyInsights, setFamilyInsights] = useState({
    totalMemories: 0,
    thisWeek: 0,
    mostActive: 'You',
    favoriteType: 'Photos',
    connectionStrength: 0
  });
  const [todayInHistory, setTodayInHistory] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);

  // Utility functions
  const safeNumber = (value: any, fallback: number = 0): number => {
    const num = Number(value);
    return isNaN(num) || !isFinite(num) ? fallback : num;
  };

  const safeArrayLength = (arr: any): number => {
    return Array.isArray(arr) ? arr.length : 0;
  };

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return 'Unknown';
    
    try {
      const now = new Date();
      const date = new Date(dateString);
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffInHours < 1) return 'Just now';
      if (diffInHours < 24) return `${diffInHours}h ago`;
      if (diffInHours < 48) return 'Yesterday';
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}d ago`;
      return `${Math.floor(diffInDays / 7)}w ago`;
    } catch {
      return 'Recently';
    }
  };

  // Get time-based greeting with stats
  useEffect(() => {
    const hour = new Date().getHours();
    const userName = user?.display_name || user?.name?.split(' ')[0] || 'there';
    const newMemories = memories.filter(m => {
      const memDate = new Date(m.created_at || m.createdAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return memDate >= weekAgo;
    }).length;
    
    let timeGreeting = '';
    let emoji = '';
    
    if (hour < 12) {
      timeGreeting = 'Good Morning';
      emoji = '☀️';
    } else if (hour < 17) {
      timeGreeting = 'Good Afternoon';
      emoji = '🌤️';
    } else {
      timeGreeting = 'Good Evening';
      emoji = '🌙';
    }
    
    setGreeting(`${timeGreeting}, ${userName} ${emoji}`);
  }, [user, memories]);

  // Personalized quote using centralized service with 150+ quotes across 6 categories
  // Smart context-aware selection based on family composition
  const getPersonalizedQuote = () => {
    // Use centralized quotes service for maximum variety and cultural authenticity
    return getDailyQuoteForReturningUser();
  };

  // OLD IMPLEMENTATION - REPLACED  
  const getPersonalizedQuote_OLD = () => {
    const hasChildren = familyMembers.some((m: any) => 
      m.relationship?.toLowerCase().includes('child') || 
      m.relationship?.toLowerCase().includes('son') ||
      m.relationship?.toLowerCase().includes('daughter')
    );
    
    const hasGrandparents = familyMembers.some((m: any) => 
      m.relationship?.toLowerCase().includes('grand')
    );
    
    const hasSpouse = familyMembers.some((m: any) => 
      m.relationship?.toLowerCase().includes('spouse') ||
      m.relationship?.toLowerCase().includes('husband') ||
      m.relationship?.toLowerCase().includes('wife')
    );

    if (hasChildren) {
      const childQuotes = [
        '"The days are long but the years are short." — Gretchen Rubin',
        '"To be in your children\'s memories tomorrow, you have to be in their lives today." — Barbara Johnson',
        '"Children are the living messages we send to a time we will not see." — Neil Postman'
      ];
      return childQuotes[new Date().getDate() % childQuotes.length];
    } else if (hasGrandparents) {
      const legacyQuotes = [
        '"Legacy is not what I did for myself. It\'s what I\'m doing for the next generation." — Vitor Belfort',
        '"What we leave behind is not what is engraved in stone monuments, but what is woven into the lives of others." — Pericles',
        '"The greatest legacy one can pass on to one\'s children is not money or things, but a legacy of character and faith." — Billy Graham'
      ];
      return legacyQuotes[new Date().getDate() % legacyQuotes.length];
    } else if (hasSpouse) {
      const loveQuotes = [
        '"In all the world, there is no heart for me like yours." — Maya Angelou',
        '"The best thing to hold onto in life is each other." — Audrey Hepburn',
        '"Love is composed of a single soul inhabiting two bodies." — Aristotle'
      ];
      return loveQuotes[new Date().getDate() % loveQuotes.length];
    }

    const generalQuotes = [
      '"Family is not an important thing. It\'s everything." — Michael J. Fox',
      '"The love of a family is life\'s greatest blessing." — Eva Burrows',
      '"Family means no one gets left behind or forgotten." — David Ogden Stiers'
    ];
    return generalQuotes[new Date().getDate() % generalQuotes.length];
  };

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      console.log('🔍 ReturningUserHomePage: loadUserData called', {
        userId: user.id,
        userEmail: user.email,
        familyId: user.family_id,
        userName: user.name || user.display_name
      });

      try {
        // Privacy validation
        if (family && !validateFamilyAccess(user, family)) {
          console.error('🚨 PRIVACY VIOLATION: Invalid family access');
          setIsLoading(false);
          return;
        }

        // Load memories
        console.log(`🔍 ReturningUserHomePage: Loading memories for family_id: ${user.family_id}`);
        const userMemories = await getUserFamilyMemories(user.id, user.family_id);
        
        // 🔧 FIX: Refresh file URLs for multimedia (prevents blank thumbnails)
        const { refreshAllMemoryFileUrls } = await import('../utils/memoryUrlRefresh.ts');
        const memoriesWithFreshUrls = await refreshAllMemoryFileUrls(userMemories);
        
        setMemories(memoriesWithFreshUrls);
        console.log(`📊 ReturningUserHomePage: Loaded ${memoriesWithFreshUrls.length} memories`);
        console.log(`📊 ReturningUserHomePage: Memory details:`, userMemories.map(m => ({ 
          id: m.id, 
          title: m.title, 
          type: m.memory_type || m.type,
          created_at: m.created_at 
        })));

        // Load family members
        const members = await getUserFamilyMembers(user.id, user.family_id);
        setFamilyMembers(members);
        console.log(`📊 ReturningUserHomePage: Loaded ${members.length} family members`);

        // Load insights
        const insights = await getFamilyInsights(user.id, user.family_id);
        setFamilyInsights(insights);
        console.log(`📊 ReturningUserHomePage: Insights - totalMemories: ${insights.totalMemories}, thisWeek: ${insights.thisWeek}`);

        // Load today in history
        const history = await getTodayInFamilyHistory(user.id, user.family_id);
        setTodayInHistory(history);

        // Load recent activity
        const activity = await getRecentActivity(user.id, user.family_id);
        setRecentActivity(activity);

        // Calculate streak
        const activityCount = safeNumber(user.activity_count, 0);
        setStreakDays(Math.min(15, Math.floor(activityCount / 2)));

        // Load upcoming events (birthdays, anniversaries)
        loadUpcomingEvents(members);
      } catch (error) {
        console.error('Failed to load user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [user, family]);

  // Load upcoming events
  const loadUpcomingEvents = (members: any[]) => {
    const events: any[] = [];
    const today = new Date();
    const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    members.forEach(member => {
      if (member.dateOfBirth || member.date_of_birth) {
        const dobStr = member.dateOfBirth || member.date_of_birth;
        const dob = new Date(dobStr);
        const birthdayThisYear = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
        
        if (birthdayThisYear >= today && birthdayThisYear <= nextMonth) {
          const daysUntil = Math.ceil((birthdayThisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          events.push({
            type: 'birthday',
            name: member.name || member.firstName,
            date: birthdayThisYear,
            daysUntil,
            icon: Gift
          });
        }
      }
    });

    // Sort by days until
    events.sort((a, b) => a.daysUntil - b.daysUntil);
    setUpcomingEvents(events.slice(0, 3));
  };

  // Listen for storage changes
  useEffect(() => {
    const handleTreeUpdate = () => {
      if (user?.family_id) {
        getUserFamilyMembers(user.id, user.family_id).then(members => {
          setFamilyMembers(members);
          loadUpcomingEvents(members);
        });
      }
    };

    window.addEventListener('storage', handleTreeUpdate);
    window.addEventListener('familyTreeUpdated', handleTreeUpdate);

    return () => {
      window.removeEventListener('storage', handleTreeUpdate);
      window.removeEventListener('familyTreeUpdated', handleTreeUpdate);
    };
  }, [user]);

  // 🎉 CRITICAL FIX: Listen for memoryAdded event to update memory count in real-time
  useEffect(() => {
    const handleMemoryAdded = async () => {
      console.log('📡 ReturningUserHomePage: Received memoryAdded event - reloading memories');
      
      if (!user?.family_id) return;
      
      try {
        // Reload memories from database
        const userMemories = await getUserFamilyMemories(user.id, user.family_id);
        setMemories(userMemories);
        
        // Reload insights with new memory count
        const insights = await getFamilyInsights(user.id, user.family_id);
        setFamilyInsights(insights);
        
        console.log(`✅ ReturningUserHomePage: Updated memory count to ${userMemories.length} after memoryAdded event`);
      } catch (error) {
        console.warn('⚠️ Failed to reload memories after memoryAdded event:', error);
      }
    };

    window.addEventListener('memoryAdded', handleMemoryAdded);
    
    return () => {
      window.removeEventListener('memoryAdded', handleMemoryAdded);
    };
  }, [user]);

  if (!user || isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet mx-auto mb-4"></div>
          <p className="text-ink">Loading your memories...</p>
        </div>
      </div>
    );
  }

  const newMemoriesCount = memories.filter(m => {
    const memDate = new Date(m.created_at || m.createdAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return memDate >= weekAgo;
  }).length;

  const milestonesToday = todayInHistory?.milestones?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-white to-cream/50 pb-24 overflow-x-hidden">
      {/* Header Section with Dynamic Greeting */}
      <div className="bg-gradient-to-br from-violet/90 via-coral/80 to-aqua/90 text-white px-4 py-8 sm:py-12 shadow-2xl relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/20 to-transparent"></div>
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-full">
              <Heart className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div className="flex-1">
              <h1 className="text-white text-2xl sm:text-3xl md:text-4xl" style={{ fontWeight: 600 }}>
                {greeting}
              </h1>
              <p className="text-white/90 text-sm sm:text-base md:text-lg mt-1">
                {newMemoriesCount > 0 || milestonesToday > 0 
                  ? `${newMemoriesCount > 0 ? `${newMemoriesCount} new ${newMemoriesCount === 1 ? 'memory' : 'memories'}` : ''}${newMemoriesCount > 0 && milestonesToday > 0 ? ' & ' : ''}${milestonesToday > 0 ? `${milestonesToday} ${milestonesToday === 1 ? 'milestone' : 'milestones'} today` : ''}`
                  : 'Your family memories are waiting'}
              </p>
            </div>
          </div>
          
          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-6">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 sm:p-4 text-center">
              <div className="text-xl sm:text-2xl md:text-3xl mb-1" style={{ fontWeight: 600 }}>
                {safeArrayLength(memories)}
              </div>
              <div className="text-xs sm:text-sm text-white/90">Memories</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 sm:p-4 text-center">
              <div className="text-xl sm:text-2xl md:text-3xl mb-1" style={{ fontWeight: 600 }}>
                {safeArrayLength(familyMembers)}
              </div>
              <div className="text-xs sm:text-sm text-white/90">Family</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 sm:p-4 text-center">
              <div className="text-xl sm:text-2xl md:text-3xl mb-1 flex items-center justify-center gap-1" style={{ fontWeight: 600 }}>
                {streakDays}
                {streakDays > 0 && <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-300" />}
              </div>
              <div className="text-xs sm:text-sm text-white/90">Day Streak</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 sm:p-4 text-center">
              <div className="text-xl sm:text-2xl md:text-3xl mb-1" style={{ fontWeight: 600 }}>
                {newMemoriesCount}
              </div>
              <div className="text-xs sm:text-sm text-white/90">This Week</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Personalized Quote/Reflection Area */}
        <Card className="memory-card border-2 border-violet/20 shadow-lg hover:shadow-xl transition-all">
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gradient-to-br from-violet/10 to-coral/10 rounded-full flex-shrink-0">
                <Sparkles className="w-6 h-6 text-violet" />
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
              { icon: Plus, label: 'Add Memory', page: 'upload-memory', gradient: 'from-coral to-orange-500' },
              { icon: UserPlus, label: 'Invite Family', page: 'invite-family-member', gradient: 'from-aqua to-blue-500' },
              { icon: TreePine, label: 'Build Tree', page: 'family-tree', gradient: 'from-emerald-500 to-teal-600' },
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

        {/* Today's Highlights */}
        {(todayInHistory || upcomingEvents.length > 0) && (
          <Card className="memory-card border-2 border-aqua/20 shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-lg sm:text-xl mb-4 flex items-center gap-2" style={{ fontWeight: 600 }}>
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-aqua" />
                Today's Highlights
              </h3>
              
              <div className="space-y-3">
                {todayInHistory && (
                  <div className="p-4 bg-gradient-to-br from-violet/10 to-coral/10 rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-violet/20 rounded-lg">
                        <Star className="w-5 h-5 text-violet" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm sm:text-base mb-1" style={{ fontWeight: 600 }}>
                          Memory from {todayInHistory.yearsAgo} years ago
                        </h4>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {todayInHistory.title || 'A special family moment'}
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onNavigate('vault')}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                )}
                
                {upcomingEvents.map((event, idx) => {
                  const Icon = event.icon;
                  return (
                    <div key={idx} className="p-4 bg-gradient-to-br from-aqua/10 to-blue/10 rounded-xl">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-aqua/20 rounded-lg">
                          <Icon className="w-5 h-5 text-aqua" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm sm:text-base mb-1" style={{ fontWeight: 600 }}>
                            {event.name}'s Birthday
                          </h4>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {event.daysUntil === 0 ? 'Today! 🎉' : 
                             event.daysUntil === 1 ? 'Tomorrow' : 
                             `in ${event.daysUntil} days`}
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => onNavigate('upload-memory')}
                        >
                          Add Memory
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity Feed */}
        {recentActivity.length > 0 && (
          <Card className="memory-card shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg sm:text-xl flex items-center gap-2" style={{ fontWeight: 600 }}>
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-coral" />
                  Recent Activity
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onNavigate('vault')}
                >
                  View All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              
              <div className="space-y-3">
                {recentActivity.slice(0, 5).map((activity, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-cream/50 transition-colors cursor-pointer"
                    onClick={() => onNavigate('vault')}
                  >
                    <Avatar className="w-10 h-10 border-2 border-white shadow-md">
                      <AvatarImage src={activity.userAvatar} />
                      <AvatarFallback className="bg-gradient-to-br from-violet to-coral text-white text-sm">
                        {(activity.userName || 'U').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm sm:text-base truncate" style={{ fontWeight: 500 }}>
                        {activity.userName || 'Family member'}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {activity.action || 'added a memory'}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground flex-shrink-0">
                      {formatTimeAgo(activity.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Hero Carousel - Recent Memories */}
        {memories.length > 0 && (
          <Card className="memory-card shadow-lg overflow-hidden">
            <CardContent className="p-0">
              <div className="p-6 pb-4">
                <h3 className="text-lg sm:text-xl flex items-center gap-2" style={{ fontWeight: 600 }}>
                  <Image className="w-5 h-5 sm:w-6 sm:h-6 text-coral" />
                  Recent Memories
                </h3>
              </div>
              
              <div className="overflow-x-auto scrollbar-hide px-6 pb-6">
                <div className="flex gap-4 min-w-max">
                  {memories.slice(0, 6).map((memory, idx) => (
                    <Card 
                      key={idx}
                      className="w-64 cursor-pointer hover:shadow-xl transition-all hover:scale-105"
                      onClick={() => onNavigate('vault')}
                    >
                      <CardContent className="p-0">
                        {/* Always show thumbnail area - with proper fallback for text-only memories */}
                        <div className="relative h-40 bg-gradient-to-br from-violet/10 to-coral/10">
                          {(() => {
                            // Check for media URL in multiple possible property names (backward compatibility)
                            const mediaUrl = memory.file_url || memory.thumbnail_url || memory.mediaUrl || memory.photo_url || memory.media_url;
                            // Check for media type in multiple possible property names
                            const mediaType = memory.type || memory.mediaType || memory.format;
                            
                            if (mediaUrl) {
                              return (
                                <>
                                  <ImageWithFallback
                                    src={mediaUrl}
                                    alt={memory.title || 'Memory'}
                                    className="w-full h-full object-cover"
                                  />
                                  {(mediaType === 'video') && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="p-3 bg-black/50 rounded-full">
                                        <Play className="w-6 h-6 text-white" />
                                      </div>
                                    </div>
                                  )}
                                </>
                              );
                            } else {
                              // Fallback for text-only memories
                              return (
                                <div className="w-full h-full flex flex-col items-center justify-center text-center px-4">
                                  <div className="p-4 bg-white/80 rounded-full mb-3">
                                    <BookOpen className="w-8 h-8 text-violet" />
                                  </div>
                                  <p className="text-sm text-ink/80 font-medium">Text Memory</p>
                                </div>
                              );
                            }
                          })()}
                        </div>
                        <div className="p-4">
                          <h4 className="text-sm mb-1 line-clamp-1" style={{ fontWeight: 600 }}>
                            {memory.title || 'Untitled Memory'}
                          </h4>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {memory.description || memory.content || 'A precious family moment'}
                          </p>
                          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                            <Heart className="w-3 h-3" />
                            <span>{memory.reactions || 0}</span>
                            <MessageCircle className="w-3 h-3 ml-2" />
                            <span>{memory.comments?.length || 0}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              
              <div className="px-6 pb-6">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => onNavigate('vault')}
                >
                  View All Memories
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Engagement Widget - Weekly Challenge */}
        <Card className="memory-card bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-200 rounded-full flex-shrink-0">
                <Award className="w-6 h-6 text-purple-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-base sm:text-lg mb-2" style={{ fontWeight: 600 }}>
                  📸 Weekly Challenge
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-3">
                  {memories.length === 0 
                    ? "Share a memory from your favorite family celebration"
                    : familyMembers.length < 5
                    ? "Add your grandparents to complete your family tree"
                    : newMemoriesCount < 3
                    ? "Upload 3 memories this week to keep your streak alive!"
                    : "Write in your journal about a childhood memory"}
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-purple-600 text-purple-700 hover:bg-purple-600 hover:text-white"
                  onClick={() => {
                    if (memories.length === 0) onNavigate('upload-memory');
                    else if (familyMembers.length < 5) onNavigate('family-tree');
                    else if (newMemoriesCount < 3) onNavigate('upload-memory');
                    else onNavigate('journal');
                  }}
                >
                  Start Now
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vault Progress & Milestones */}
        <Card className="memory-card shadow-lg">
          <CardContent className="p-6">
            <h3 className="text-lg sm:text-xl mb-4" style={{ fontWeight: 600 }}>
              Vault Milestones
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-violet/10 to-coral/10 rounded-xl">
                <Users className="w-8 h-8 mx-auto mb-2 text-violet" />
                <p className="text-2xl sm:text-3xl mb-1" style={{ fontWeight: 600 }}>
                  {safeArrayLength(familyMembers)}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">Family Tree</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-coral/10 to-orange/10 rounded-xl">
                <Image className="w-8 h-8 mx-auto mb-2 text-coral" />
                <p className="text-2xl sm:text-3xl mb-1" style={{ fontWeight: 600 }}>
                  {safeArrayLength(memories)}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Memories</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-aqua/10 to-blue/10 rounded-xl">
                <Flame className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                <p className="text-2xl sm:text-3xl mb-1" style={{ fontWeight: 600 }}>
                  {streakDays}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">Day Streak</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-amber/10 to-yellow/10 rounded-xl">
                <Star className="w-8 h-8 mx-auto mb-2 text-amber-600" />
                <p className="text-2xl sm:text-3xl mb-1" style={{ fontWeight: 600 }}>
                  {familyInsights.connectionStrength}%
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">Engagement</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Empty State - Encourage Action */}
        {memories.length === 0 && (
          <Card className="memory-card bg-gradient-to-br from-aqua/5 to-violet/5 border-2 border-aqua/20">
            <CardContent className="p-8 text-center">
              <div className="inline-flex p-4 bg-aqua/20 rounded-full mb-4">
                <Upload className="w-10 h-10 text-aqua" />
              </div>
              <h3 className="text-lg sm:text-xl mb-2" style={{ fontWeight: 600 }}>
                Start Building Your Legacy
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-4 max-w-md mx-auto">
                Share your first family memory and begin preserving the moments that matter most
              </p>
              <Button 
                className="bg-gradient-to-br from-aqua to-blue-500 text-white hover:opacity-90"
                onClick={() => onNavigate('upload-memory')}
              >
                Add Your First Memory
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
