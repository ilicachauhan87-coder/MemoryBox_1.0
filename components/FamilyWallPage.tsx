import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { VisuallyHidden } from './ui/visually-hidden';
import { Textarea } from './ui/textarea';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Checkbox } from './ui/checkbox';
import { MemoryMediaViewer } from './MemoryMediaViewer';
import { DatabaseService } from '../utils/supabase/persistent-database';
import { 
  Heart, 
  MessageSquare, 
  Share2, 
  Image as ImageIcon,
  Video,
  Mic,
  Calendar,
  Gift,
  Sparkles,
  Clock,
  Users,
  Filter,
  Plus,
  Pin,
  Star,
  Send,
  Smile,
  Laugh,
  Frown,
  ThumbsUp,
  MapPin,
  Tag,
  Play,
  X,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Cake,
  PartyPopper,
  TrendingUp,
  Award,
  Target,
  Flame,
  Eye
} from 'lucide-react';
import { format, formatDistanceToNow, isToday, isYesterday, isThisWeek, isThisMonth, isThisYear, differenceInDays } from 'date-fns';

interface FamilyWallPageProps {
  user: any;
  family: any;
  onBack?: () => void;
  onNavigate?: (page: string) => void;
}

interface Memory {
  id: string;
  type: 'memory' | 'journal' | 'milestone' | 'birthday' | 'anniversary' | 'demo';
  userId: string;
  userName: string;
  userAvatar?: string;
  userRelationship?: string;
  content: string;
  caption?: string;
  timestamp: Date;
  mediaType?: 'photo' | 'video' | 'audio' | 'text';
  mediaUrl?: string;  // Keep for backward compatibility
  files?: {           // ✅ Multi-media support
    preview?: string;  // Demo format
    url?: string;      // Database format
    type: 'photo' | 'video' | 'audio';
    name: string;
    size?: number;
    compressed?: boolean;
  }[];
  tags?: string[];
  location?: string;
  reactions: { [key: string]: number };
  userReaction?: string;
  comments: Comment[];
  isPinned?: boolean;
  isFavorite?: boolean;
  views?: number;
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text?: string;
  voiceUrl?: string;
  timestamp: Date;
  reactions: number;
}

interface QuickAction {
  id: string;
  label: string;
  icon: any;
  gradient: string;
  onClick: () => void;
}

export function FamilyWallPage({ user, family, onBack, onNavigate }: FamilyWallPageProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [activeFilters, setActiveFilters] = useState<string[]>(['all']);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  
  // 🎬 Multi-media viewer state
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [viewerFiles, setViewerFiles] = useState<any[]>([]);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

  useEffect(() => {
    loadMemories();
  }, [user, family]);

  // 🔄 Auto-reload when new content is added
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Reload when memories, journals, or milestones change
      if (
        e.key?.includes(':memories') || 
        e.key?.includes('journal_entries') || 
        e.key?.includes('couple_journey')
      ) {
        console.log('🔄 Family Wall: Content updated, reloading...');
        loadMemories();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user]);

  // 🎭 Generate fake engagement from family tree members
  // 🔒 PRIVACY-AWARE: Only generates engagement from members who have access to the memory
  const generateFakeEngagement = (memory: Memory, familyMembers: any[], sharedWith?: string[]): Memory => {
    if (!familyMembers || familyMembers.length === 0) {
      return memory;
    }

    // 🎭 DEMO MODE: For demo purposes, we ALWAYS generate comments (1-3 minimum)
    // Check if we need to add engagement (skip if already has comments from real users)
    const hasRealComments = memory.comments && memory.comments.length > 0 && 
      memory.comments.some(c => !c.id.startsWith('fake-comment-'));
    
    if (hasRealComments) {
      // Real user comments exist, don't override them
      return memory;
    }

    // 🔒 PRIVACY FILTER: Only select members who have access to this memory
    // 💀 CRITICAL FIX: Filter out deceased members - they cannot generate engagement!
    let eligibleMembers = familyMembers.filter(member => 
      member.id !== user?.id && member.status !== 'deceased'
    );
    
    if (sharedWith && sharedWith.length > 0) {
      // If memory is shared with specific members (not "Family"), filter to only those members
      const isSharedWithEveryone = sharedWith.includes('Family');
      
      if (!isSharedWithEveryone) {
        // Filter to only members who are in the sharedWith list (and alive)
        eligibleMembers = eligibleMembers.filter(member => {
          const memberName = member.name || member.firstName || '';
          return sharedWith.includes(memberName);
        });
        
        console.log(`🔒 Family Wall: Memory shared with ${sharedWith.length} specific members. Generating engagement from ${eligibleMembers.length} eligible members (excluding deceased).`);
      }
    }
    
    // If no eligible members after filtering, return memory without engagement
    if (eligibleMembers.length === 0) {
      console.log('🔒 Family Wall: No eligible living members for engagement (all deceased or memory private)');
      return {
        ...memory,
        views: 1 // Just the uploader viewed it
      };
    }
    
    console.log(`🎭 Family Wall: Generating demo engagement from ${eligibleMembers.length} living family members (1-3 comments guaranteed)`);

    // Randomly select 2-5 family members to react (or fewer if not enough eligible members)
    const maxReactors = Math.min(eligibleMembers.length, Math.floor(Math.random() * 4) + 2);
    const reactingMembers = eligibleMembers
      .sort(() => Math.random() - 0.5)
      .slice(0, maxReactors);

    // Generate random reactions
    const reactions = { '❤️': 0, '😄': 0, '😢': 0, '🙌': 0 };
    reactingMembers.forEach(() => {
      const randomReaction = ['❤️', '😄', '🙌'][Math.floor(Math.random() * 3)];
      reactions[randomReaction]++;
    });

    // 🎭 DEMO MODE: Generate 1-3 comments MINIMUM from family members for every memory
    // This ensures every memory feels social and engaging
    const minComments = 1;
    const maxComments = 3;
    const commentCount = Math.min(
      reactingMembers.length, 
      Math.floor(Math.random() * (maxComments - minComments + 1)) + minComments
    ); // Generates 1, 2, or 3
    const commentingMembers = reactingMembers.slice(0, commentCount);
    const comments = commentingMembers.map((member, index) => {
      // 🎭 DEMO MODE: Diverse, warm comments that feel authentic
      const commentTexts = [
        'Beautiful memory! ❤️',
        'Love this! 😊',
        'Thanks for sharing! 🙏',
        'So wonderful! ✨',
        'Precious moment! 💕',
        'This is amazing! 🌟',
        'Great memories! 🎉',
        'So glad you shared this! 💝',
        'What a special moment! 🌸',
        'This brings back memories! 😌',
        'Absolutely lovely! 💖',
        'Treasure these moments! ⭐',
        'Beautiful family moments! 👨‍👩‍👧‍👦',
        'So happy to see this! 😊',
        'Wonderful memories! 🥰'
      ];
      
      return {
        id: `fake-comment-${memory.id}-${index}`,
        userId: member.id,
        userName: member.name || member.firstName || 'Family Member',
        userAvatar: member.photo,
        text: commentTexts[Math.floor(Math.random() * commentTexts.length)],
        timestamp: new Date(memory.timestamp.getTime() + (index + 1) * 10 * 60 * 1000), // 10 mins apart
        reactions: Math.floor(Math.random() * 5) // 0-4 reactions on comment
      };
    });

    // Calculate views: eligible members + uploader
    const viewCount = Math.min(eligibleMembers.length + 1, Math.floor(Math.random() * 20) + 5);

    return {
      ...memory,
      reactions,
      comments,
      views: viewCount
    };
  };

  const loadMemories = async () => {
    const familyId = user?.family_id;
    if (!familyId) {
      // Show demo content for users without family data
      setMemories(getDemoMemories());
      return;
    }

    const allMemories: Memory[] = [];
    const realMemories: Memory[] = [];

    // 🔄 Load family tree members for fake engagement (database-first)
    let familyMembers: any[] = [];
    try {
      const treeData = await DatabaseService.getFamilyTree(familyId);
      familyMembers = Array.isArray(treeData) ? treeData : treeData?.people || [];
    } catch (error) {
      console.log('Could not load family members for engagement:', error);
    }

    // ✅ DATABASE-FIRST: Load user's memories from database
    try {
      const rawMemories = await DatabaseService.getFamilyMemories(familyId);
      console.log(`💾 Family Wall: Loaded ${rawMemories.length} memories from database`);
      
      // 🔧 FIX: Refresh file URLs for multimedia (prevents blank thumbnails)
      const { refreshAllMemoryFileUrls } = await import('../utils/memoryUrlRefresh.ts');
      const memoriesWithFreshUrls = await refreshAllMemoryFileUrls(rawMemories);
      
      if (memoriesWithFreshUrls.length > 0) {
        memoriesWithFreshUrls.forEach((memory: any) => {
          // 🔒 PRIVACY FILTER: Only show memories that are shared with family
          // Skip memories that are:
          // 1. Explicitly marked as private (is_private: true)
          // 2. Shared only with the user themselves (sharedWith contains only user's name)
          // 3. Not shared with 'Family' or other family members
          
          const isPrivate = memory.is_private === true;
          const sharedWith = memory.sharedWith || memory.shared_with || [];
          const userName = user.display_name || user.name || user.email;
          
          // Check if memory is truly shared with family (not just private to self)
          const isSharedWithFamily = sharedWith.includes('Family');
          const isSharedWithOthers = sharedWith.some((person: string) => 
            person !== userName && person !== 'Family'
          );
          const isOnlySharedWithSelf = sharedWith.length === 1 && sharedWith[0] === userName;
          
          // Skip if private OR only shared with self
          if (isPrivate || isOnlySharedWithSelf) {
            console.log(`🔒 Family Wall: Skipping private memory "${memory.title}" (private: ${isPrivate}, self-only: ${isOnlySharedWithSelf})`);
            return;
          }
          
          // Skip if sharedWith array exists but doesn't include Family or other members
          if (sharedWith.length > 0 && !isSharedWithFamily && !isSharedWithOthers) {
            console.log(`🔒 Family Wall: Skipping non-shared memory "${memory.title}" (not shared with family/others)`);
            return;
          }
          
          const memoryObj: Memory = {
            id: `memory-${memory.id}`,
            type: 'memory',
            userId: memory.uploaded_by || memory.uploadedBy || user.id,
            userName: memory.uploaded_by_name || user.display_name || 'Family Member',
            userAvatar: memory.uploaded_by_avatar,
            userRelationship: memory.uploaded_by_relationship || 'Family',
            content: memory.caption || memory.description || 'Shared a memory',
            caption: memory.caption,
            timestamp: new Date(memory.created_at || memory.createdAt),
            mediaType: memory.file_type?.includes('video') ? 'video' : memory.file_type?.includes('audio') ? 'audio' : 'photo',
            mediaUrl: memory.file_url,  // Keep for backward compatibility
            files: memory.files || [],   // ✅ Load multi-media files array
            tags: memory.tags || [],
            location: memory.location,
            reactions: memory.reactions || { '❤️': 0, '😄': 0, '😢': 0, '🙌': 0 },
            userReaction: memory.userReaction,
            comments: memory.comments || [],
            isPinned: memory.isPinned || false,
            isFavorite: memory.isFavorite || false,
            views: memory.views || 0
          };
          
          // 🎭 Add fake engagement from family members
          // 🔒 Pass sharedWith array to ensure engagement only comes from members with access
          const memoryWithEngagement = generateFakeEngagement(memoryObj, familyMembers, sharedWith);
          realMemories.push(memoryWithEngagement);
        });
      }
    } catch (error) {
      console.error('❌ Error loading memories from database:', error);
    }

    // ✅ DATABASE-FIRST: Load journal entries (shared ones)
    try {
      const journals = await DatabaseService.getJournalEntries(user.id, familyId);
      console.log(`💾 Family Wall: Loaded ${journals.length} journal entries from database`);
      
      const userName = user.display_name || user.name || user.email;
      
      // 🔒 PRIVACY FILTER: Only show journals that are truly shared with family
      // Filter out journals that are:
      // 1. Not shared at all (sharedWith is empty)
      // 2. Shared only with the user themselves
      const sharedJournals = journals.filter((entry: any) => {
        const sharedWith = entry.sharedWith || entry.shared_with || [];
        
        if (sharedWith.length === 0) {
          return false; // Not shared
        }
        
        // Check if only shared with self
        const isOnlySharedWithSelf = sharedWith.length === 1 && sharedWith[0] === userName;
        if (isOnlySharedWithSelf) {
          console.log(`🔒 Family Wall: Skipping self-only journal "${entry.title}"`);
          return false;
        }
        
        return true; // Shared with others
      });
      
      if (sharedJournals.length > 0) {
        sharedJournals.forEach((entry: any) => {
          const journalObj: Memory = {
            id: `journal-${entry.id}`,
            type: 'journal',
            userId: entry.createdBy || entry.created_by || user.id,
            userName: user.display_name || user.name || 'You',
            userAvatar: user.photo,
            userRelationship: 'You',
            content: entry.content || entry.title || 'Shared a journal entry',
            timestamp: new Date(entry.createdAt || entry.created_at),
            mediaType: 'text',
            tags: entry.tags || [],
            reactions: entry.reactions || { '❤️': 0, '😄': 0, '😢': 0, '🙌': 0 },
            comments: entry.comments || [],
            views: entry.views || 0
          };
          
          // 🎭 Add fake engagement from family members
          // 🔒 Pass sharedWith array to ensure engagement only comes from members with access
          const sharedWith = entry.sharedWith || entry.shared_with || [];
          const journalWithEngagement = generateFakeEngagement(journalObj, familyMembers, sharedWith);
          realMemories.push(journalWithEngagement);
        });
      }
    } catch (error) {
      console.error('❌ Error loading journals from database:', error);
    }

    // ✅ DATABASE-FIRST: Load milestones
    try {
      const journeyData = await DatabaseService.getJourneyProgress(user.id, 'couple');
      console.log(`💾 Family Wall: Loaded journey data from database`);
      
      if (journeyData?.milestones) {
        const completedMilestones = journeyData.milestones.filter((m: any) => m.isCompleted || m.is_completed);
        if (completedMilestones.length > 0) {
          completedMilestones.forEach((milestone: any) => {
            const milestoneObj: Memory = {
              id: `milestone-couple-${milestone.id}`,
              type: 'milestone',
              userId: user.id,
              userName: user.display_name || user.name || 'You',
              userAvatar: user.photo,
              userRelationship: 'You',
              content: `${milestone.icon} ${milestone.title}`,
              caption: milestone.description,
              timestamp: new Date(milestone.completedDate || milestone.completed_date || Date.now()),
              mediaType: 'text',
              tags: ['milestone', 'couple-journey'],
              reactions: milestone.reactions || { '❤️': 0, '😄': 0, '😢': 0, '🙌': 0 },
              comments: milestone.comments || [],
              views: milestone.views || 0
            };
            
            // 🎭 Add fake engagement from family members
            // 🔒 Milestones are typically public to all family, so no sharedWith filter
            const milestoneWithEngagement = generateFakeEngagement(milestoneObj, familyMembers, ['Family']);
            realMemories.push(milestoneWithEngagement);
          });
        }
      }
    } catch (error) {
      console.error('❌ Error loading milestones from database:', error);
    }

    // ✨ NEW BEHAVIOR: Always show demo content, but BELOW real memories
    const demoMemories = getDemoMemories();
    
    // Sort real memories: pinned first, then by most recent
    realMemories.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    // Combine: Real memories first, then demo memories
    allMemories.push(...realMemories, ...demoMemories);

    console.log(`✅ Family Wall: Showing ${realMemories.length} real memories + ${demoMemories.length} demo examples (DATABASE-FIRST)`);
    setMemories(allMemories);
  };

  // 🎨 Generate dynamic demo memories based on actual family members
  const getDemoMemories = (): Memory[] => {
    const now = new Date();
    
    // Try to load real family members
    const familyId = user?.family_id;
    let livingMembers: any[] = [];
    
    if (familyId) {
      try {
        const treeData = localStorage.getItem(`familyTree_${familyId}`);
        if (treeData) {
          const tree = JSON.parse(treeData);
          const allMembers = Array.isArray(tree) ? tree : tree.people || [];
          // Filter for living members only (exclude deceased and exclude current user)
          livingMembers = allMembers.filter((m: any) => 
            m.status !== 'deceased' && m.id !== user?.id
          );
        }
      } catch (error) {
        console.log('Could not load family members for dynamic demos');
      }
    }
    
    // If we have real family members, generate personalized demos
    if (livingMembers.length >= 3) {
      return generatePersonalizedDemos(livingMembers, user, now);
    }
    
    // Otherwise, use static demo data as fallback
    return getStaticDemoMemories(now);
  };
  
  // 🎯 Generate personalized demo memories using actual family members
  // ✨ ENHANCED: Use all members without repetition
  const generatePersonalizedDemos = (members: any[], currentUser: any, now: Date): Memory[] => {
    const demoMemories: Memory[] = [];
    
    // Shuffle members to ensure diverse selection without repetition
    const shuffledMembers = [...members].sort(() => Math.random() - 0.5);
    const usedMembers = new Set<string>(); // Track which members we've used
    
    // Pick diverse members from different generations/relationships
    const parents = members.filter((m: any) => 
      m.relationshipToUser?.toLowerCase().includes('mother') || 
      m.relationshipToUser?.toLowerCase().includes('father')
    );
    const grandparents = members.filter((m: any) => 
      m.relationshipToUser?.toLowerCase().includes('grand')
    );
    const siblings = members.filter((m: any) => 
      m.relationshipToUser?.toLowerCase().includes('brother') || 
      m.relationshipToUser?.toLowerCase().includes('sister')
    );
    const children = members.filter((m: any) => 
      m.relationshipToUser?.toLowerCase().includes('son') || 
      m.relationshipToUser?.toLowerCase().includes('daughter')
    );
    const others = members.filter((m: any) => 
      !parents.includes(m) && !grandparents.includes(m) && 
      !siblings.includes(m) && !children.includes(m)
    );
    
    // Helper to get next unused member from category
    const getUnusedMember = (category: any[]) => {
      return category.find(m => !usedMembers.has(m.id));
    };
    
    // Demo 1: Parent sharing festival memory
    const parent = getUnusedMember(parents);
    if (parent) {
      usedMembers.add(parent.id);
      demoMemories.push({
        id: 'demo-1',
        type: 'demo',
        userId: parent.id,
        userName: parent.name || parent.firstName || 'Family Member',
        userAvatar: parent.photo,
        userRelationship: parent.relationshipToUser || 'Family',
        content: 'Such beautiful memories from our Diwali celebration! The rangoli this year was spectacular. ✨🪔',
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        mediaType: 'photo',
        files: [
          { preview: 'https://images.unsplash.com/photo-1605362242548-3af0d67dd4c3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080', type: 'photo', name: 'Rangoli Design' },
          { preview: 'https://images.unsplash.com/photo-1666244454829-7f0889ec5783?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080', type: 'photo', name: 'Diwali Lights' },
          { preview: 'https://images.unsplash.com/photo-1760080903536-736f18eddcac?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080', type: 'photo', name: 'Family Photo' },
          { preview: 'https://images.unsplash.com/photo-1635564981692-857482d9325f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080', type: 'photo', name: 'Diwali Sweets' }
        ],
        tags: ['Diwali', 'festival', 'family'],
        location: 'Delhi, India',
        reactions: { '❤️': 12, '😄': 5, '😢': 0, '🙌': 8 },
        comments: generateDemoComments(shuffledMembers.filter(m => !usedMembers.has(m.id)).slice(0, 2), now.getTime() - 1.5 * 60 * 60 * 1000, usedMembers),
        isPinned: true,
        isFavorite: true,
        views: 34
      });
    }
    
    // Demo 2: Sibling/Child milestone
    const youngMember = getUnusedMember(children) || getUnusedMember(siblings) || getUnusedMember(others);
    if (youngMember) {
      usedMembers.add(youngMember.id);
      demoMemories.push({
        id: 'demo-2',
        type: 'demo',
        userId: youngMember.id,
        userName: youngMember.name || youngMember.firstName || 'Family Member',
        userAvatar: youngMember.photo,
        userRelationship: youngMember.relationshipToUser || 'Family',
        content: 'First day at school! So proud of my little one. 📚👧',
        timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        mediaType: 'photo',
        files: [
          { preview: 'https://images.unsplash.com/photo-1673882400966-57c83f87dda5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080', type: 'photo', name: 'School Uniform' },
          { preview: 'https://images.unsplash.com/photo-1673882400966-57c83f87dda5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080', type: 'video', name: 'First Steps Video' }
        ],
        tags: ['milestone', 'school', 'family'],
        reactions: { '❤️': 18, '😄': 10, '😢': 2, '🙌': 15 },
        comments: generateDemoComments(shuffledMembers.filter(m => !usedMembers.has(m.id)).slice(0, 2), now.getTime() - 20 * 60 * 60 * 1000, usedMembers),
        views: 56
      });
    }
    
    // Demo 3: Grandparent sharing tradition
    const grandparent = getUnusedMember(grandparents);
    if (grandparent) {
      usedMembers.add(grandparent.id);
      demoMemories.push({
        id: 'demo-3',
        type: 'demo',
        userId: grandparent.id,
        userName: grandparent.name || grandparent.firstName || 'Family Member',
        userAvatar: grandparent.photo,
        userRelationship: grandparent.relationshipToUser || 'Family',
        content: 'Made everyone\'s favorite aloo paratha today! Recipe passed down from my mother. 🥘❤️',
        timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        mediaType: 'photo',
        mediaUrl: 'https://images.unsplash.com/photo-1742281257687-092746ad6021?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
        tags: ['food', 'tradition', 'family-recipe'],
        reactions: { '❤️': 25, '😄': 12, '😢': 0, '🙌': 20 },
        comments: generateDemoComments(shuffledMembers.filter(m => !usedMembers.has(m.id)).slice(0, 2), now.getTime() - 2.5 * 24 * 60 * 60 * 1000, usedMembers),
        views: 89
      });
    }
    
    // Demo 4: Another parent/sibling sharing birthday
    const celebrant = getUnusedMember(parents) || getUnusedMember(siblings) || getUnusedMember(others);
    if (celebrant) {
      usedMembers.add(celebrant.id);
      demoMemories.push({
        id: 'demo-4',
        type: 'birthday',
        userId: celebrant.id,
        userName: celebrant.name || celebrant.firstName || 'Family Member',
        userAvatar: celebrant.photo,
        userRelationship: celebrant.relationshipToUser || 'Family',
        content: `🎂 Happy Birthday ${celebrant.name || celebrant.firstName}! Thank you for being our pillar of strength.`,
        timestamp: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        mediaType: 'photo',
        files: [
          { preview: 'https://images.unsplash.com/photo-1630481721712-0a79d553c1ea?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080', type: 'photo', name: 'Birthday Celebration' },
          { preview: 'https://images.unsplash.com/photo-1635349135195-ea08a39fcc5c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080', type: 'photo', name: 'Birthday Cake' },
          { preview: 'https://images.unsplash.com/photo-1760080903536-736f18eddcac?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080', type: 'video', name: 'Birthday Song Video' }
        ],
        tags: ['birthday', 'celebration', 'family'],
        reactions: { '❤️': 67, '😄': 45, '😢': 5, '🙌': 52 },
        comments: generateDemoComments(shuffledMembers.filter(m => !usedMembers.has(m.id)).slice(0, 2), now.getTime() - 29.5 * 24 * 60 * 60 * 1000, usedMembers),
        isFavorite: true,
        views: 234
      });
    }
    
    console.log(`✨ Generated ${demoMemories.length} personalized demo memories from ${members.length} living family members`);
    return demoMemories;
  };
  
  // Helper to generate demo comments from real family members
  // ✨ ENHANCED: Track used members to avoid repetition
  const generateDemoComments = (members: any[], baseTimestamp: number, usedMembers: Set<string>): Comment[] => {
    const comments: Comment[] = [];
    const commentTexts = [
      'Beautiful memory! ❤️',
      'Love this! 😊',
      'Thanks for sharing! 🙏',
      'So wonderful! ✨',
      'Precious moment! 💕',
      'This is amazing! 🌟'
    ];
    
    members.forEach((member, index) => {
      if (index < 2) { // Limit to 2 comments
        usedMembers.add(member.id); // Mark as used
        comments.push({
          id: `demo-comment-${member.id}-${index}`,
          userId: member.id,
          userName: member.name || member.firstName || 'Family Member',
          userAvatar: member.photo,
          text: commentTexts[Math.floor(Math.random() * commentTexts.length)],
          timestamp: new Date(baseTimestamp + (index + 1) * 10 * 60 * 1000),
          reactions: Math.floor(Math.random() * 5)
        });
      }
    });
    
    return comments;
  };
  
  // 📦 Static fallback demo memories (used when family tree is small)
  const getStaticDemoMemories = (now: Date): Memory[] => {
    return [
      {
        id: 'demo-1',
        type: 'demo',
        userId: 'demo-user-1',
        userName: 'Priti Chauhan',
        userRelationship: 'Mother',
        content: 'Such beautiful memories from our Diwali celebration! The rangoli this year was spectacular. ✨🪔',
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        mediaType: 'photo',
        files: [
          { preview: 'https://images.unsplash.com/photo-1605362242548-3af0d67dd4c3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080', type: 'photo', name: 'Rangoli Design' },
          { preview: 'https://images.unsplash.com/photo-1666244454829-7f0889ec5783?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080', type: 'photo', name: 'Diwali Lights' },
          { preview: 'https://images.unsplash.com/photo-1760080903536-736f18eddcac?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080', type: 'photo', name: 'Family Photo' },
          { preview: 'https://images.unsplash.com/photo-1635564981692-857482d9325f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080', type: 'photo', name: 'Diwali Sweets' }
        ],
        tags: ['Diwali', 'festival', 'family'],
        location: 'Delhi, India',
        reactions: { '❤️': 12, '😄': 5, '😢': 0, '🙌': 8 },
        comments: [
          {
            id: 'comment-1',
            userId: 'demo-user-2',
            userName: 'Rajeev Chauhan',
            text: 'The colors were amazing! Best Diwali yet. 🎇',
            timestamp: new Date(now.getTime() - 1.5 * 60 * 60 * 1000),
            reactions: 3
          }
        ],
        isPinned: true,
        isFavorite: true,
        views: 34
      },
      {
        id: 'demo-2',
        type: 'demo',
        userId: 'demo-user-4',
        userName: 'Miraya Chauhan Sinha',
        userRelationship: 'Daughter',
        content: 'First day at school! So proud of my little one. 📚👧',
        timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        mediaType: 'photo',
        files: [
          { preview: 'https://images.unsplash.com/photo-1673882400966-57c83f87dda5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080', type: 'photo', name: 'School Uniform' },
          { preview: 'https://images.unsplash.com/photo-1673882400966-57c83f87dda5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080', type: 'video', name: 'First Steps Video' }
        ],
        tags: ['milestone', 'school', 'family'],
        reactions: { '❤️': 18, '😄': 10, '😢': 2, '🙌': 15 },
        comments: [],
        views: 56
      },
      {
        id: 'demo-3',
        type: 'demo',
        userId: 'demo-user-6',
        userName: 'Shrimati Urmila Devi',
        userRelationship: 'Paternal Grandmother',
        content: 'Made everyone\'s favorite aloo paratha today! Recipe passed down from my mother. 🥘❤️',
        timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        mediaType: 'photo',
        mediaUrl: 'https://images.unsplash.com/photo-1742281257687-092746ad6021?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
        tags: ['food', 'tradition', 'family-recipe'],
        reactions: { '❤️': 25, '😄': 12, '😢': 0, '🙌': 20 },
        comments: [],
        views: 89
      },
      {
        id: 'demo-4',
        type: 'birthday',
        userId: 'demo-user-9',
        userName: 'Rajeev Kumar Chauhan',
        userRelationship: 'Father',
        content: '🎂 Happy 60th Birthday Papa! Thank you for being our pillar of strength.',
        timestamp: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        mediaType: 'photo',
        files: [
          { preview: 'https://images.unsplash.com/photo-1630481721712-0a79d553c1ea?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080', type: 'photo', name: 'Birthday Celebration' },
          { preview: 'https://images.unsplash.com/photo-1635349135195-ea08a39fcc5c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080', type: 'photo', name: 'Birthday Cake' },
          { preview: 'https://images.unsplash.com/photo-1760080903536-736f18eddcac?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080', type: 'video', name: 'Birthday Song Video' }
        ],
        tags: ['birthday', 'celebration', 'family'],
        reactions: { '❤️': 67, '😄': 45, '😢': 5, '🙌': 52 },
        comments: [],
        isFavorite: true,
        views: 234
      }
    ];
  };

  const getThrowbackBadge = (timestamp: Date) => {
    const daysAgo = differenceInDays(new Date(), timestamp);
    
    if (daysAgo < 1) return null;
    if (daysAgo === 1) return { text: 'Yesterday', color: 'bg-violet/20 text-violet' };
    if (daysAgo < 7) return { text: `${daysAgo} days ago`, color: 'bg-coral/20 text-coral' };
    if (daysAgo < 30) return { text: `${Math.floor(daysAgo / 7)} weeks ago`, color: 'bg-aqua/20 text-aqua' };
    if (daysAgo < 365) return { text: `${Math.floor(daysAgo / 30)} months ago`, color: 'bg-orange-500/20 text-orange-700' };
    
    const yearsAgo = Math.floor(daysAgo / 365);
    return { 
      text: `${yearsAgo} ${yearsAgo === 1 ? 'year' : 'years'} ago`, 
      color: 'bg-purple-500/20 text-purple-700',
      isThrowback: true
    };
  };

  const quickActions: QuickAction[] = [
    {
      id: 'add-memory',
      label: 'Add Memory',
      icon: Plus,
      gradient: 'from-violet to-purple-600',
      onClick: () => {
        if (onNavigate) onNavigate('upload-memory');
      }
    },
    {
      id: 'journal',
      label: 'My Journal',
      icon: BookOpen,
      gradient: 'from-coral to-orange-600',
      onClick: () => {
        if (onNavigate) onNavigate('journal');
      }
    },
    {
      id: 'journeys',
      label: 'Life Journeys',
      icon: Sparkles,
      gradient: 'from-aqua to-teal-600',
      onClick: () => {
        if (onNavigate) onNavigate('journey-selection');
      }
    },
    {
      id: 'invite',
      label: 'Invite Family',
      icon: Users,
      gradient: 'from-green-500 to-emerald-600',
      onClick: () => {
        if (onNavigate) onNavigate('invite-family-member');
      }
    },
    {
      id: 'capsule',
      label: 'Time Capsule',
      icon: Clock,
      gradient: 'from-indigo-500 to-purple-600',
      onClick: () => {
        if (onNavigate) onNavigate('time-capsules');
      }
    }
  ];

  // Filter options configuration
  const filterOptions = [
    { id: 'photos', label: 'Photos', icon: ImageIcon, emoji: '📷' },
    { id: 'videos', label: 'Videos', icon: Video, emoji: '🎥' },
    { id: 'audio', label: 'Audio', icon: Mic, emoji: '🎤' },
    { id: 'milestones', label: 'Milestones', icon: Sparkles, emoji: '✨' }
  ];

  // Toggle filter selection
  const toggleFilter = (filterId: string) => {
    if (filterId === 'all') {
      setActiveFilters(['all']);
      return;
    }

    setActiveFilters(prev => {
      // Remove 'all' if selecting specific filters
      const withoutAll = prev.filter(f => f !== 'all');
      
      // Toggle the selected filter
      if (withoutAll.includes(filterId)) {
        const newFilters = withoutAll.filter(f => f !== filterId);
        // If no filters left, default to 'all'
        return newFilters.length === 0 ? ['all'] : newFilters;
      } else {
        return [...withoutAll, filterId];
      }
    });
  };

  // Filter memories based on active filters
  const filteredMemories = memories.filter(memory => {
    if (activeFilters.includes('all')) return true;
    
    // Check if memory matches any active filter
    if (activeFilters.includes('photos') && memory.mediaType === 'photo') return true;
    if (activeFilters.includes('videos') && memory.mediaType === 'video') return true;
    if (activeFilters.includes('audio') && memory.mediaType === 'audio') return true;
    if (activeFilters.includes('milestones') && (memory.type === 'milestone' || memory.type === 'birthday' || memory.type === 'anniversary')) return true;
    
    return false;
  });

  // Get filter count for button badge
  const activeFilterCount = activeFilters.includes('all') ? 0 : activeFilters.length;

  const handleReaction = (memoryId: string, emoji: string) => {
    setMemories(prev => prev.map(m => {
      if (m.id === memoryId) {
        const newReactions = { ...m.reactions };
        const currentReaction = m.userReaction;
        
        // Remove old reaction if exists
        if (currentReaction && newReactions[currentReaction] > 0) {
          newReactions[currentReaction]--;
        }
        
        // Add new reaction
        if (emoji === currentReaction) {
          // Toggle off
          return { ...m, reactions: newReactions, userReaction: undefined };
        } else {
          // Add new
          newReactions[emoji] = (newReactions[emoji] || 0) + 1;
          return { ...m, reactions: newReactions, userReaction: emoji };
        }
      }
      return m;
    }));
  };

  const handleAddComment = (memoryId: string) => {
    if (!commentText.trim()) return;

    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      userId: user?.id || 'current-user',
      userName: user?.display_name || user?.name || 'You',
      userAvatar: user?.photo,
      text: commentText.trim(),
      timestamp: new Date(),
      reactions: 0
    };

    setMemories(prev => prev.map(m => {
      if (m.id === memoryId) {
        return { ...m, comments: [...m.comments, newComment] };
      }
      return m;
    }));

    setCommentText('');
  };

  const handleTogglePin = (memoryId: string) => {
    setMemories(prev => prev.map(m => {
      if (m.id === memoryId) {
        return { ...m, isPinned: !m.isPinned };
      }
      return m;
    }).sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.timestamp.getTime() - a.timestamp.getTime();
    }));
  };

  const handleToggleFavorite = (memoryId: string) => {
    setMemories(prev => prev.map(m => {
      if (m.id === memoryId) {
        return { ...m, isFavorite: !m.isFavorite };
      }
      return m;
    }));
  };

  const openFullscreen = (memory: Memory) => {
    setSelectedMemory(memory);
    setShowFullscreen(true);
  };

  const closeFullscreen = () => {
    setShowFullscreen(false);
    setSelectedMemory(null);
  };

  const navigateMemory = (direction: 'prev' | 'next') => {
    if (!selectedMemory) return;
    
    const currentIndex = filteredMemories.findIndex(m => m.id === selectedMemory.id);
    let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    
    if (newIndex < 0) newIndex = filteredMemories.length - 1;
    if (newIndex >= filteredMemories.length) newIndex = 0;
    
    setSelectedMemory(filteredMemories[newIndex]);
  };

  const getMediaTypeIcon = (type?: string) => {
    switch (type) {
      case 'photo': return <ImageIcon className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'audio': return <Mic className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const totalReactions = (reactions: { [key: string]: number }) => {
    return Object.values(reactions).reduce((sum, count) => sum + count, 0);
  };

  // 🎬 Convert memory files to viewer format
  const convertMemoryFilesToViewer = (memory: Memory) => {
    if (memory.files && memory.files.length > 0) {
      // Use multi-file format - handle both database (url) and demo (preview) formats
      return memory.files.map(f => ({
        ...f,
        // 🔧 FIX: Database uses 'url' field, demo uses 'preview' field
        preview: f.preview || f.url || '',
        type: f.type || 'photo',
        name: f.name || 'Media file',
        file: { name: f.name || 'media', size: 0 } // Add mock file object
      }));
    } else if (memory.mediaUrl) {
      // Fallback to single file format for backward compatibility
      return [{
        preview: memory.mediaUrl,
        type: memory.mediaType || 'photo',
        name: 'Media file',
        file: { name: 'media', size: 0 }
      }];
    }
    return [];
  };

  // 🎬 Open media viewer
  const handleOpenGallery = (memory: Memory, startIndex: number = 0) => {
    const files = convertMemoryFilesToViewer(memory);
    if (files.length === 0) return;
    
    setViewerFiles(files);
    setViewerInitialIndex(startIndex);
    setShowMediaViewer(true);
  };

  return (
    <div className="min-h-screen bg-background vibrant-texture pb-24 overflow-x-hidden">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet via-coral to-aqua text-white px-4 py-4 sm:py-6 sm:px-6 shadow-lg overflow-hidden">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 bg-white/20 backdrop-blur-sm rounded-2xl flex-shrink-0">
              <Heart className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-white text-xl sm:text-2xl md:text-3xl truncate" style={{ fontWeight: 600 }}>
                Family Wall
              </h1>
              <p className="text-white/90 text-xs sm:text-sm md:text-base truncate">
                {(() => {
                  const realCount = memories.filter(m => m.type !== 'demo' && m.type !== 'birthday').length;
                  if (realCount === 0) return 'Share your first memory to see family engagement!';
                  return `${realCount} ${realCount === 1 ? 'memory' : 'memories'} shared`;
                })()}
              </p>
            </div>
          </div>

          {/* Stats Row - Only count REAL memories (exclude demo) */}
          {memories.length > 0 && (
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mt-3 sm:mt-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl p-1.5 sm:p-2 text-center">
                <div className="text-base sm:text-xl md:text-2xl font-bold leading-tight">
                  {memories.filter(m => m.type !== 'demo' && m.type !== 'birthday').length}
                </div>
                <div className="text-[10px] sm:text-xs text-white/90 mt-0.5">Memories</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl p-1.5 sm:p-2 text-center">
                <div className="text-base sm:text-xl md:text-2xl font-bold leading-tight">
                  {memories.filter(m => m.type === 'milestone' && m.type !== 'demo').length}
                </div>
                <div className="text-[10px] sm:text-xs text-white/90 mt-0.5">Milestones</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl p-1.5 sm:p-2 text-center">
                <div className="text-base sm:text-xl md:text-2xl font-bold leading-tight">
                  {memories.filter(m => m.type !== 'demo' && m.type !== 'birthday').reduce((sum, m) => sum + totalReactions(m.reactions), 0)}
                </div>
                <div className="text-[10px] sm:text-xs text-white/90 mt-0.5">Reactions</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl p-1.5 sm:p-2 text-center">
                <div className="text-base sm:text-xl md:text-2xl font-bold leading-tight">
                  {memories.filter(m => m.type !== 'demo' && m.type !== 'birthday').reduce((sum, m) => sum + m.comments.length, 0)}
                </div>
                <div className="text-[10px] sm:text-xs text-white/90 mt-0.5">Comments</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions - Mobile Optimized with 48px Touch Targets */}
      <div className="sticky top-16 z-40 bg-white/95 backdrop-blur-sm border-b border-border py-2 sm:py-3 shadow-sm overflow-hidden">
        <div className="max-w-4xl mx-auto px-2 sm:px-3 md:px-4">
          <div className="overflow-x-auto -mx-2 sm:-mx-3 md:-mx-4 px-2 sm:px-3 md:px-4">
            <div className="flex gap-1.5 sm:gap-2 min-w-max pb-1">
              {quickActions.map(action => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.id}
                    onClick={action.onClick}
                    size="sm"
                    className={`flex-shrink-0 bg-gradient-to-br ${action.gradient} text-white hover:opacity-90 touch-manipulation px-2.5 sm:px-3 md:px-4 h-12 gap-1.5 sm:gap-2`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="whitespace-nowrap text-xs sm:text-sm hidden sm:inline">{action.label}</span>
                    <span className="whitespace-nowrap text-[10px] sm:hidden">{action.label.split(' ')[0]}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Filters - Mobile Optimized with 48px Touch Target */}
      <div className="bg-white border-b border-border py-2 px-2 sm:px-3 md:px-4 shadow-sm overflow-hidden">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-1.5 sm:gap-2">
          <Popover open={showFilterPopover} onOpenChange={setShowFilterPopover}>
            <PopoverTrigger asChild>
              <Button
                variant={activeFilterCount > 0 ? 'default' : 'outline'}
                size="sm"
                className="touch-manipulation h-12 px-3 sm:px-4 gap-1.5 sm:gap-2 flex-shrink-0"
              >
                <Filter className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm">Filter</span>
                {activeFilterCount > 0 && (
                  <Badge className="ml-0.5 sm:ml-1 bg-coral text-white border-0 h-5 min-w-[18px] flex items-center justify-center px-1 sm:px-1.5 text-[10px] sm:text-xs">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="start">
              <div className="space-y-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Filter by:</p>
                  
                  {/* All option */}
                  <div className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted transition-colors">
                    <Checkbox
                      id="filter-all"
                      checked={activeFilters.includes('all')}
                      onCheckedChange={() => toggleFilter('all')}
                    />
                    <label
                      htmlFor="filter-all"
                      className="flex-1 flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <span className="font-medium">All</span>
                    </label>
                  </div>

                  {/* Individual filter options */}
                  {filterOptions.map(option => {
                    const Icon = option.icon;
                    return (
                      <div key={option.id} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted transition-colors">
                        <Checkbox
                          id={`filter-${option.id}`}
                          checked={activeFilters.includes(option.id)}
                          onCheckedChange={() => toggleFilter(option.id)}
                          disabled={activeFilters.includes('all')}
                        />
                        <label
                          htmlFor={`filter-${option.id}`}
                          className="flex-1 flex items-center gap-2 text-sm cursor-pointer"
                        >
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          <span>{option.label}</span>
                          <span className="ml-auto">{option.emoji}</span>
                        </label>
                      </div>
                    );
                  })}
                </div>

                {/* Clear all button */}
                {activeFilterCount > 0 && (
                  <div className="pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-center text-xs"
                      onClick={() => setActiveFilters(['all'])}
                    >
                      Clear all filters
                    </Button>
                  </div>
                )}

                {/* Results count */}
                <div className="pt-2 border-t text-center">
                  <p className="text-xs text-muted-foreground">
                    {filteredMemories.length} {filteredMemories.length === 1 ? 'memory' : 'memories'} found
                  </p>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Active filters display */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap flex-1 overflow-hidden">
              {activeFilters.filter(f => f !== 'all').map(filterId => {
                const option = filterOptions.find(o => o.id === filterId);
                if (!option) return null;
                return (
                  <Badge
                    key={filterId}
                    variant="secondary"
                    className="text-xs px-2 py-1 gap-1 flex-shrink-0"
                  >
                    <span>{option.emoji}</span>
                    <span className="hidden sm:inline">{option.label}</span>
                    <button
                      onClick={() => toggleFilter(filterId)}
                      className="ml-1 hover:bg-black/10 rounded-full p-0.5 inline-flex items-center justify-center"
                      aria-label={`Remove ${option.label} filter`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Memory Feed */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4 space-y-3 sm:space-y-4">
        {/* Weekly Prompt (if no memories) */}
        {filteredMemories.length === 0 && (
          <Card className="memory-card bg-gradient-to-br from-violet/5 to-coral/5 border-2 border-dashed border-violet/30">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-to-br from-violet to-coral rounded-xl text-white flex-shrink-0">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">💡 Weekly Memory Prompt</h3>
                  <p className="text-muted-foreground mb-4">
                    "Share your favorite family recipe and the story behind it"
                  </p>
                  <Button 
                    className="bg-gradient-to-br from-violet to-coral text-white"
                    onClick={quickActions[0].onClick}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your Memory
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Memories */}
        {filteredMemories.length === 0 && !activeFilters.includes('all') ? (
          <Card className="memory-card p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="p-6 bg-gradient-to-br from-violet/10 to-coral/10 rounded-full">
                <Filter className="w-12 h-12 text-violet" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">No memories match your filters</h3>
                <p className="text-muted-foreground">
                  Try a different filter or add new memories!
                </p>
              </div>
              <Button 
                variant="outline"
                onClick={() => setActiveFilters(['all'])}
              >
                Show All Memories
              </Button>
            </div>
          </Card>
        ) : (
          filteredMemories.map((memory, index) => {
            const throwbackBadge = getThrowbackBadge(memory.timestamp);
            const isDemoContent = memory.type === 'demo';
            
            return (
              <Card 
                key={memory.id} 
                className={`memory-card hover:shadow-xl transition-all cursor-pointer relative overflow-hidden
                  ${memory.isPinned ? 'border-2 border-violet shadow-lg' : ''}
                  ${throwbackBadge?.isThrowback ? 'bg-gradient-to-br from-purple-50 to-pink-50' : ''}`}
                onClick={() => openFullscreen(memory)}
                style={{
                  animation: `slideInStagger 0.6s ease-out ${index * 0.1}s both`
                }}
              >
                {/* Pinned Badge - Moved to top-right to avoid overlap with user info */}
                {memory.isPinned && !isDemoContent && (
                  <div className="absolute top-3 right-3 z-10">
                    <Badge className="bg-gradient-to-br from-violet to-coral text-white border-0 shadow-md">
                      <Pin className="w-3 h-3 mr-1" />
                      Pinned
                    </Badge>
                  </div>
                )}

                {/* Demo/Example Badge - Stack below Pinned if both exist */}
                {isDemoContent && (
                  <div className={`absolute ${memory.isPinned ? 'top-14' : 'top-3'} right-3 z-10`}>
                    <Badge variant="outline" className="bg-aqua/10 text-aqua border-aqua/30 backdrop-blur-sm text-xs shadow-sm">
                      💡 Example
                    </Badge>
                  </div>
                )}

                <CardContent className="p-3 sm:p-4 md:p-6">
                  <div className="flex gap-2 sm:gap-3 md:gap-4">
                    {/* Avatar */}
                    <Avatar className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 flex-shrink-0 border-2 border-white shadow-lg">
                      <AvatarImage src={memory.userAvatar} alt={memory.userName} />
                      <AvatarFallback className="bg-gradient-to-br from-violet to-coral text-white text-sm sm:text-base md:text-lg">
                        {memory.userName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    {/* Content */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      {/* Header */}
                      <div className="mb-3">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-base sm:text-lg truncate">{memory.userName}</p>
                            {memory.userRelationship && (
                              <p className="text-sm text-muted-foreground">{memory.userRelationship}</p>
                            )}
                          </div>
                          {memory.isFavorite && (
                            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1">
                            {getMediaTypeIcon(memory.mediaType)}
                            <span>{formatDistanceToNow(memory.timestamp, { addSuffix: true })}</span>
                          </div>
                          {throwbackBadge && (
                            <Badge className={`${throwbackBadge.color} border-0 text-xs`}>
                              {throwbackBadge.isThrowback && '🕰️ '}
                              {throwbackBadge.text}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Memory Media - Multi-Media Grid */}
                      {(() => {
                        const files = convertMemoryFilesToViewer(memory);
                        if (files.length === 0) return null;
                        
                        return (
                          <div className="mb-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                            {/* File count badge */}
                            {files.length > 1 && (
                              <Badge variant="secondary" className="text-xs">
                                {files.length} {files.length === 1 ? 'file' : 'files'}
                              </Badge>
                            )}
                            
                            {/* Multi-Media Grid (show up to 4 files) */}
                            <div className={`grid gap-2 ${
                              files.length === 1 ? 'grid-cols-1' :
                              files.length === 2 ? 'grid-cols-2' :
                              'grid-cols-2'
                            }`}>
                              {files.slice(0, 4).map((file, index) => (
                                <button
                                  key={index}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenGallery(memory, index);
                                  }}
                                  className="relative aspect-square rounded-lg overflow-hidden group bg-muted"
                                >
                                  {/* Photo - Show actual preview */}
                                  {file.type === 'photo' && (
                                    <>
                                      <ImageWithFallback
                                        src={file.preview}
                                        alt={file.name}
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                        <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                                      </div>
                                    </>
                                  )}
                                  
                                  {/* Video - Show preview with play icon */}
                                  {file.type === 'video' && (
                                    <>
                                      <ImageWithFallback
                                        src={file.preview}
                                        alt={file.name}
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-center">
                                        <div className="bg-white/90 rounded-full p-3">
                                          <Play className="w-8 h-8 text-primary fill-current" />
                                        </div>
                                      </div>
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                    </>
                                  )}
                                  
                                  {/* Audio - Show waveform gradient */}
                                  {file.type === 'audio' && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-green-100 to-emerald-100">
                                      <Mic className="w-10 h-10 text-green-600 mb-2" />
                                      <span className="text-xs text-green-800 font-medium px-2 text-center line-clamp-2">{file.name}</span>
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                    </div>
                                  )}
                                  
                                  {/* +X more badge */}
                                  {index === 3 && files.length > 4 && (
                                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10">
                                      <span className="text-white text-lg font-semibold">
                                        +{files.length - 4} more
                                      </span>
                                    </div>
                                  )}
                                  
                                  {/* File type badge */}
                                  <div className="absolute top-2 right-2 z-10">
                                    <Badge variant="secondary" className="text-xs bg-black/50 text-white border-0">
                                      {file.type === 'photo' && '📷'}
                                      {file.type === 'video' && '🎬'}
                                      {file.type === 'audio' && '🎤'}
                                    </Badge>
                                  </div>
                                </button>
                              ))}
                            </div>
                            
                            {/* View Gallery Button */}
                            {files.length > 1 && (
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenGallery(memory, 0);
                                }}
                                variant="outline"
                                size="sm"
                                className="w-full"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View All {files.length} Files
                              </Button>
                            )}
                          </div>
                        );
                      })()}

                      {/* Memory Content */}
                      <div className="mb-3">
                        <p className="text-foreground text-base sm:text-lg leading-relaxed whitespace-pre-wrap">
                          {memory.content}
                        </p>
                        {memory.caption && memory.caption !== memory.content && (
                          <p className="text-muted-foreground text-sm mt-2">
                            {memory.caption}
                          </p>
                        )}
                      </div>

                      {/* Tags & Location */}
                      {(memory.tags && memory.tags.length > 0) || memory.location ? (
                        <div className="mb-3 flex flex-wrap gap-2">
                          {memory.tags?.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              <Tag className="w-3 h-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                          {memory.location && (
                            <Badge variant="outline" className="text-xs">
                              <MapPin className="w-3 h-3 mr-1" />
                              {memory.location}
                            </Badge>
                          )}
                        </div>
                      ) : null}

                      {/* Reactions - Elder-Friendly Larger Emojis */}
                      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 mb-3 pb-3 border-b border-border overflow-x-auto scrollbar-hide">
                        {Object.entries(memory.reactions).map(([emoji, count]) => (
                          <button
                            key={emoji}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReaction(memory.id, emoji);
                            }}
                            className={`flex items-center gap-1 px-2 sm:px-3 py-2 rounded-lg hover:bg-gray-100 transition-all touch-manipulation flex-shrink-0
                              ${memory.userReaction === emoji ? 'bg-violet/10 ring-2 ring-violet/30' : ''}`}
                            style={{ minHeight: '48px', minWidth: '52px' }}
                          >
                            <span className="text-xl sm:text-2xl">{emoji}</span>
                            <span className={`text-sm sm:text-base font-semibold ${count > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {count}
                            </span>
                          </button>
                        ))}
                      </div>

                      {/* Actions & Stats - Elder-Friendly Larger Icons */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-2">
                        {/* Action Buttons Row */}
                        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-muted-foreground hover:text-coral touch-manipulation h-12 px-3"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 sm:mr-1.5" />
                            <span className="text-sm sm:text-base font-medium ml-1">{memory.comments.length}</span>
                          </Button>
                          
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-muted-foreground hover:text-aqua touch-manipulation h-12 px-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(memory.id);
                            }}
                          >
                            <Star className={`w-5 h-5 sm:w-6 sm:h-6 sm:mr-1.5 ${memory.isFavorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                            <span className="text-sm sm:text-base font-medium ml-1 hidden sm:inline">Favorite</span>
                          </Button>

                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-muted-foreground hover:text-violet touch-manipulation h-12 px-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePin(memory.id);
                            }}
                          >
                            <Pin className={`w-5 h-5 sm:w-6 sm:h-6 sm:mr-1.5 ${memory.isPinned ? 'fill-violet text-violet' : ''}`} />
                            <span className="text-sm sm:text-base font-medium ml-1 hidden sm:inline">{memory.isPinned ? 'Unpin' : 'Pin'}</span>
                          </Button>
                        </div>

                        {/* Views Counter - Moved Left for Better Visibility */}
                        {memory.views && memory.views > 0 && (
                          <div className="text-sm sm:text-base text-muted-foreground flex items-center gap-1 sm:ml-2">
                            <span>{memory.views} views</span>
                          </div>
                        )}
                      </div>

                      {/* Recent Comments Preview - Elder-Friendly Typography */}
                      {memory.comments.length > 0 && (
                        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border space-y-3">
                          {memory.comments.slice(-2).map(comment => (
                            <div key={comment.id} className="flex gap-2.5 sm:gap-3">
                              <Avatar className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0">
                                <AvatarImage src={comment.userAvatar} alt={comment.userName} />
                                <AvatarFallback className="text-sm bg-gradient-to-br from-aqua to-teal-600 text-white">
                                  {comment.userName.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0 bg-gray-50 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 overflow-hidden">
                                <p className="font-semibold text-sm sm:text-base truncate text-foreground">{comment.userName}</p>
                                <p className="text-sm sm:text-base text-foreground break-words mt-0.5 leading-relaxed">{comment.text}</p>
                                <p className="text-xs sm:text-sm text-muted-foreground/80 mt-1.5 sm:mt-2">
                                  {formatDistanceToNow(comment.timestamp, { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                          ))}
                          {memory.comments.length > 2 && (
                            <button 
                              className="text-sm sm:text-base font-medium text-violet hover:underline touch-manipulation h-12 flex items-center"
                              onClick={(e) => {
                                e.stopPropagation();
                                openFullscreen(memory);
                              }}
                            >
                              View all {memory.comments.length} comments
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}

        {/* Load More / End Message */}
        {filteredMemories.length > 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm">
              {filteredMemories.length === 1 ? 
                '🎉 This is your first memory!' : 
                `✨ You've seen all ${filteredMemories.length} memories`
              }
            </p>
            <p className="text-muted-foreground text-xs mt-2">
              Keep adding more precious moments to your family wall!
            </p>
          </div>
        )}
      </div>

      {/* Fullscreen Memory View Dialog */}
      <Dialog open={showFullscreen} onOpenChange={setShowFullscreen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0">
          <VisuallyHidden>
            <DialogTitle>Memory Detail View</DialogTitle>
            <DialogDescription>View memory details, photos, and interactions</DialogDescription>
          </VisuallyHidden>
          {selectedMemory && (
            <div className="flex flex-col h-full max-h-[90vh]">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-10">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarImage src={selectedMemory.userAvatar} alt={selectedMemory.userName} />
                    <AvatarFallback className="bg-gradient-to-br from-violet to-coral text-white">
                      {selectedMemory.userName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{selectedMemory.userName}</p>
                    <p className="text-xs text-muted-foreground truncate">{selectedMemory.userRelationship}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateMemory('prev')}
                    className="touch-manipulation"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateMemory('next')}
                    className="touch-manipulation"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Content */}
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-6">
                  {/* Memory Media - Fullscreen */}
                  {selectedMemory.mediaUrl && selectedMemory.mediaType === 'photo' && (
                    <div className="rounded-xl overflow-hidden shadow-lg">
                      <ImageWithFallback
                        src={selectedMemory.mediaUrl}
                        alt={selectedMemory.content}
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  )}

                  {/* Memory Content */}
                  <div>
                    <p className="text-lg leading-relaxed whitespace-pre-wrap">{selectedMemory.content}</p>
                    {selectedMemory.caption && selectedMemory.caption !== selectedMemory.content && (
                      <p className="text-muted-foreground mt-2">{selectedMemory.caption}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-3">
                      {format(selectedMemory.timestamp, 'PPP p')}
                    </p>
                  </div>

                  {/* Tags & Location */}
                  {(selectedMemory.tags && selectedMemory.tags.length > 0) || selectedMemory.location ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedMemory.tags?.map(tag => (
                        <Badge key={tag} variant="secondary">
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                      {selectedMemory.location && (
                        <Badge variant="outline">
                          <MapPin className="w-3 h-3 mr-1" />
                          {selectedMemory.location}
                        </Badge>
                      )}
                    </div>
                  ) : null}

                  {/* Reactions - Elder-Friendly */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {Object.entries(selectedMemory.reactions).map(([emoji, count]) => (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(selectedMemory.id, emoji)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-gray-100 transition-all touch-manipulation
                          ${selectedMemory.userReaction === emoji ? 'bg-violet/10 ring-2 ring-violet/30' : ''}`}
                        style={{ minHeight: '48px' }}
                      >
                        <span className="text-3xl">{emoji}</span>
                        <span className={`text-base font-semibold ${count > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {count}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Comments - Elder-Friendly Typography */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-xl">
                      Comments ({selectedMemory.comments.length})
                    </h3>
                    
                    {selectedMemory.comments.map(comment => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="w-11 h-11 sm:w-12 sm:h-12 flex-shrink-0">
                          <AvatarImage src={comment.userAvatar} alt={comment.userName} />
                          <AvatarFallback className="text-sm bg-gradient-to-br from-aqua to-teal-600 text-white">
                            {comment.userName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 bg-gray-50 rounded-xl p-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="font-semibold text-base sm:text-lg text-foreground">{comment.userName}</p>
                            <p className="text-sm sm:text-base text-muted-foreground/80 flex-shrink-0">
                              {formatDistanceToNow(comment.timestamp, { addSuffix: true })}
                            </p>
                          </div>
                          <p className="text-base sm:text-lg text-foreground leading-relaxed">{comment.text}</p>
                          {comment.reactions > 0 && (
                            <p className="text-sm text-muted-foreground mt-2">
                              ❤️ {comment.reactions}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Add Comment - Elder-Friendly */}
                    <div className="flex gap-3">
                      <Avatar className="w-11 h-11 sm:w-12 sm:h-12 flex-shrink-0">
                        <AvatarImage src={user?.photo} alt={user?.display_name || 'You'} />
                        <AvatarFallback className="bg-gradient-to-br from-violet to-coral text-white">
                          {(user?.display_name || user?.name || 'U').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 flex gap-2">
                        <Textarea
                          placeholder="Add a comment..."
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          className="flex-1 min-h-[48px] resize-none text-base"
                          rows={2}
                        />
                        <Button
                          onClick={() => handleAddComment(selectedMemory.id)}
                          disabled={!commentText.trim()}
                          className="bg-gradient-to-br from-violet to-coral text-white self-end touch-manipulation"
                          style={{ minHeight: '48px', minWidth: '48px' }}
                        >
                          <Send className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Multi-Media Viewer */}
      {showMediaViewer && (
        <MemoryMediaViewer
          files={viewerFiles}
          initialIndex={viewerInitialIndex}
          onClose={() => setShowMediaViewer(false)}
        />
      )}
    </div>
  );
}
