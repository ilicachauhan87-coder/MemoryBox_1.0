import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { 
  Search, 
  Heart, 
  Users, 
  Video as VideoIcon, 
  FileText, 
  Star,
  Download,
  Share,
  Grid3X3,
  List,
  MapPin,
  Upload,
  ArrowLeft,
  Sparkles,
  Image as ImageIcon,
  Mic,
  X,
  BookOpen,
  Gift,
  ChefHat,
  Filter,
  Calendar,
  Tag as TagIcon,
  UserCheck,
  RotateCcw,
  Plus,
  Trash2,
  Play,
  FileAudio,
  Edit,
  Smile,
  Laugh,
  Zap,
  ThumbsUp,
  Crown,
  Baby,
  PartyPopper,
  Frown,
  MessageSquare
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { validateFamilyAccess, formatRelativeTime, isDemoUser, hasValidUserAndFamily } from '../utils/app-helpers';
import type { UserProfile, FamilyData, Memory } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { DatabaseService } from '../utils/supabase/persistent-database';
import { MemoryMediaViewer } from './MemoryMediaViewer';
import { LifeJourneyBooks } from './LifeJourneyBooks';

interface VaultPageProps {
  user: UserProfile | null;
  family?: FamilyData | null;
  onNavigate: (page: string) => void;
}

const MEMORY_TYPES = [
  {
    id: 'photo',
    label: 'Photo',
    icon: ImageIcon,
    iconBg: 'bg-blue-500',
    bgGradient: 'bg-gradient-to-r from-blue-50 to-blue-100',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700'
  },
  {
    id: 'video',
    label: 'Video',
    icon: VideoIcon,
    iconBg: 'bg-red-500',
    bgGradient: 'bg-gradient-to-r from-red-50 to-red-100',
    borderColor: 'border-red-200',
    textColor: 'text-red-700'
  },
  {
    id: 'voice',
    label: 'Voice',
    icon: Mic,
    iconBg: 'bg-green-500',
    bgGradient: 'bg-gradient-to-r from-green-50 to-green-100',
    borderColor: 'border-green-200',
    textColor: 'text-green-700'
  },
  {
    id: 'audio',
    label: 'Audio',
    icon: Mic,
    iconBg: 'bg-green-500',
    bgGradient: 'bg-gradient-to-r from-green-50 to-green-100',
    borderColor: 'border-green-200',
    textColor: 'text-green-700'
  },
  {
    id: 'text',
    label: 'Text',
    icon: FileText,
    iconBg: 'bg-gray-500',
    bgGradient: 'bg-gradient-to-r from-gray-50 to-gray-100',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-700'
  }
];

const MEMORY_CATEGORIES = [
  {
    id: 'milestone',
    label: 'Milestones',
    icon: Star,
    bgGradient: 'bg-gradient-to-r from-yellow-50 to-yellow-100',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-700'
  },
  {
    id: 'everyday',
    label: 'Moments & Memories',
    icon: Heart,
    bgGradient: 'bg-gradient-to-r from-purple-50 to-purple-100',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700'
  },
  {
    id: 'tradition',
    label: 'Rituals & Traditions',
    icon: BookOpen,
    bgGradient: 'bg-gradient-to-r from-indigo-50 to-indigo-100',
    borderColor: 'border-indigo-200',
    textColor: 'text-indigo-700'
  },
  {
    id: 'blessing',
    label: 'Blessings & Messages',
    icon: Sparkles,
    bgGradient: 'bg-gradient-to-r from-teal-50 to-teal-100',
    borderColor: 'border-teal-200',
    textColor: 'text-teal-700'
  },
  {
    id: 'recipe',
    label: 'Recipes & Wisdom',
    icon: ChefHat,
    bgGradient: 'bg-gradient-to-r from-orange-50 to-orange-100',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-700'
  },
  {
    id: 'story',
    label: 'Stories',
    icon: FileText,
    bgGradient: 'bg-gradient-to-r from-blue-50 to-blue-100',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700'
  }
];

// Common Indian festival and event tags
const COMMON_TAGS = [
  'Wedding',
  'Family Get Together',
  'Festivals',
  'Holi',
  'Diwali',
  'Raksha Bandhan',
  'Eid',
  'Christmas',
  'Birthday',
  'Anniversary',
  'Ganesh Chaturthi',
  'Durga Puja',
  'Navratri',
  'Pongal',
  'Onam',
  'Baisakhi',
  'Janmashtami'
];

// Predefined emotions (matching MemoryUploadPage.tsx)
const PREDEFINED_EMOTIONS = [
  { name: 'Happy', icon: Smile, color: 'from-yellow-400 to-orange-400', textColor: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  { name: 'Joyful', icon: Laugh, color: 'from-orange-400 to-red-400', textColor: 'text-orange-700', bgColor: 'bg-orange-100' },
  { name: 'Excited', icon: Zap, color: 'from-purple-400 to-pink-400', textColor: 'text-purple-700', bgColor: 'bg-purple-100' },
  { name: 'Proud', icon: ThumbsUp, color: 'from-blue-400 to-indigo-400', textColor: 'text-blue-700', bgColor: 'bg-blue-100' },
  { name: 'Blessed', icon: Crown, color: 'from-amber-400 to-yellow-400', textColor: 'text-amber-700', bgColor: 'bg-amber-100' },
  { name: 'Grateful', icon: Heart, color: 'from-pink-400 to-rose-400', textColor: 'text-pink-700', bgColor: 'bg-pink-100' },
  { name: 'Surprised', icon: Gift, color: 'from-green-400 to-emerald-400', textColor: 'text-green-700', bgColor: 'bg-green-100' },
  { name: 'Playful', icon: Baby, color: 'from-cyan-400 to-blue-400', textColor: 'text-cyan-700', bgColor: 'bg-cyan-100' },
  { name: 'Celebratory', icon: PartyPopper, color: 'from-violet-400 to-purple-400', textColor: 'text-violet-700', bgColor: 'bg-violet-100' },
  { name: 'Nostalgic', icon: Star, color: 'from-indigo-400 to-blue-400', textColor: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  { name: 'Peaceful', icon: MessageSquare, color: 'from-teal-400 to-cyan-400', textColor: 'text-teal-700', bgColor: 'bg-teal-100' },
  { name: 'Emotional', icon: Frown, color: 'from-gray-400 to-slate-400', textColor: 'text-gray-700', bgColor: 'bg-gray-100' }
];

interface FilterState {
  types: string[];
  categories: string[];
  tags: string[];
  people: string[];
  journeys: string[]; // 🆕 'couple', 'pregnancy', 'none' (for regular memories)
  sortBy: 'newest' | 'oldest' | 'year-month';
}

const FILTER_STORAGE_KEY = 'memoryBox_vaultFilters';

export const VaultPage: React.FC<VaultPageProps> = ({ user, family, onNavigate }) => {
  const navigate = useNavigate();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [memoryToDelete, setMemoryToDelete] = useState<Memory | null>(null);
  const [mediaViewerOpen, setMediaViewerOpen] = useState(false);
  const [mediaViewerFiles, setMediaViewerFiles] = useState<any[]>([]);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);
  
  // Load filters from localStorage with default values
  const [filters, setFilters] = useState<FilterState>(() => {
    const saved = localStorage.getItem(FILTER_STORAGE_KEY);
    if (saved) {
      try {
        const parsedFilters = JSON.parse(saved);
        // 🆕 Ensure journeys field exists for backward compatibility
        return {
          ...parsedFilters,
          journeys: parsedFilters.journeys || []
        };
      } catch (e) {
        console.error('Failed to parse saved filters:', e);
      }
    }
    return {
      types: [],
      categories: [],
      tags: [],
      people: [],
      journeys: [], // 🆕 Empty by default
      sortBy: 'newest'
    };
  });

  // Save filters to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    const loadMemories = async () => {
      try {
        // Check if user exists
        if (!user) {
          console.warn('🔒 VaultPage: No user found');
          setIsLoading(false);
          return;
        }

        // Create dummy family if none provided
        const currentFamily: FamilyData = family || {
          id: user.family_id || 'demo-family',
          name: user.family_name || 'My Family',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: user.id,
          members: [user.id]
        };

        // Validate family access
        if (!validateFamilyAccess(user, currentFamily)) {
          console.error('🚨 VaultPage: Invalid family access for user:', user.email);
          console.error('🚨 VaultPage: User family_id:', user.family_id, 'Family id:', currentFamily.id);
          // Don't redirect - just show empty state
          setMemories([]);
          setIsLoading(false);
          return;
        }

        // 🚀 DATABASE-FIRST: Load memories from Supabase database (with localStorage fallback)
        console.log(`🔍 VaultPage: Loading memories from database for family ${currentFamily.id}`);
        const userMemories = await DatabaseService.getFamilyMemories(currentFamily.id);
        setMemories(userMemories);
        console.log(`✅ VaultPage: Loaded ${userMemories.length} memories for ${user.email}`);
        
        // 🎬 DEBUG: Check if memories have files array
        userMemories.forEach((memory, idx) => {
          if (memory.files && memory.files.length > 0) {
            console.log(`  📁 Memory ${idx + 1} "${memory.title}": ${memory.files.length} files`, memory.files);
          } else if (memory.file_url) {
            console.log(`  📷 Memory ${idx + 1} "${memory.title}": Legacy single file (file_url)`);
          } else {
            console.log(`  ⚠️ Memory ${idx + 1} "${memory.title}": No files array or file_url`);
          }
        });
        
        // Extract unique tags from all memories
        const uniqueTags = new Set<string>();
        userMemories.forEach(memory => {
          if (memory.tags && Array.isArray(memory.tags)) {
            memory.tags.forEach(tag => uniqueTags.add(tag));
          }
        });
        // Combine with common tags
        const combinedTags = [...new Set([...COMMON_TAGS, ...Array.from(uniqueTags)])];
        setAllTags(combinedTags.sort());
        
        // 🔧 FIX: Use centralized family member sync service for consistent name extraction
        // This ensures ALL family members appear in the filter, including those with
        // firstName/lastName instead of just 'name' field
        try {
          const { loadFamilyMembers } = await import('../utils/familyMemberSyncService');
          const members = await loadFamilyMembers(currentFamily.id, {
            includeRootUser: true,
            excludeCurrentUser: false // Include all members for filtering
          });
          
          // Extract just the names for the filter
          const memberNames = members.map(m => m.name).filter(Boolean).sort();
          setFamilyMembers(memberNames);
          console.log(`✅ VaultPage: Loaded ${memberNames.length} family members for People filter`);
        } catch (e) {
          console.error('Failed to load family members via sync service:', e);
          setFamilyMembers([]); // Set empty array on error
        }
      } catch (error) {
        console.error('❌ VaultPage: Error loading memories:', error);
        setMemories([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadMemories();
  }, [user, family, onNavigate]);

  // 🔧 NEW: Listen for family tree updates and reload members for People filter
  useEffect(() => {
    const handleTreeUpdate = async () => {
      if (!user?.family_id) return;
      
      console.log('🔄 VaultPage: Tree update detected, reloading family members for filter');
      try {
        const { loadFamilyMembers } = await import('../utils/familyMemberSyncService');
        const members = await loadFamilyMembers(user.family_id, {
          includeRootUser: true,
          excludeCurrentUser: false
        });
        
        const memberNames = members.map(m => m.name).filter(Boolean).sort();
        setFamilyMembers(memberNames);
        console.log(`✅ VaultPage: Reloaded ${memberNames.length} family members for People filter`);
      } catch (e) {
        console.error('Failed to reload family members:', e);
      }
    };

    window.addEventListener('familyTreeUpdated', handleTreeUpdate);
    return () => window.removeEventListener('familyTreeUpdated', handleTreeUpdate);
  }, [user]);

  // 🎉 CRITICAL FIX: Listen for memoryAdded event and reload ALL memories
  useEffect(() => {
    const handleMemoryAdded = async () => {
      console.log('📡 VaultPage: Received memoryAdded event - reloading ALL memories from database');
      
      if (!user) {
        console.warn('⚠️ VaultPage: No user found, cannot reload memories');
        return;
      }

      try {
        console.log('🔄 VaultPage: memoryAdded event triggered - reloading memories');
        
        // Create dummy family if none provided
        const currentFamily: FamilyData = family || {
          id: user.family_id || 'demo-family',
          name: user.family_name || 'My Family',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: user.id,
          members: [user.id]
        };

        // 🚀 DATABASE-FIRST: Reload memories from database (with localStorage fallback)
        console.log(`🔄 VaultPage: Reloading memories from database for family ${currentFamily.id}`);
        const userMemories = await DatabaseService.getFamilyMemories(currentFamily.id);
        setMemories(userMemories);
        console.log(`✅ VaultPage: Successfully reloaded ${userMemories.length} memories!`);
        
        // Update tags list
        const uniqueTags = new Set<string>();
        userMemories.forEach(memory => {
          if (memory.tags && Array.isArray(memory.tags)) {
            memory.tags.forEach(tag => uniqueTags.add(tag));
          }
        });
        const combinedTags = [...new Set([...COMMON_TAGS, ...Array.from(uniqueTags)])];
        setAllTags(combinedTags.sort());
        
        // Show success feedback
        toast.success(`🎉 Vault updated! ${userMemories.length} memories loaded`);
      } catch (error) {
        console.error('❌ VaultPage: Error reloading memories after memoryAdded event:', error);
        toast.error('Failed to reload memories. Please refresh the page.');
      }
    };

    window.addEventListener('memoryAdded', handleMemoryAdded);
    return () => window.removeEventListener('memoryAdded', handleMemoryAdded);
  }, [user, family]); // Re-create listener if user or family changes

  // Apply filters and sorting
  const filteredMemories = memories
    .filter(memory => {
      // Search term filter
      const matchesSearch = !searchTerm || 
        memory.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        memory.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        memory.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      if (!matchesSearch) return false;
      
      // Type filter
      const matchesType = filters.types.length === 0 || 
        filters.types.includes(memory.type || '');
      
      if (!matchesType) return false;
      
      // Category filter
      // 🔧 FIX: Check both 'category' and 'memory_type' fields for compatibility
      const memoryCategory = memory.category || memory.memory_type || '';
      const matchesCategory = filters.categories.length === 0 || 
        filters.categories.includes(memoryCategory);
      
      if (!matchesCategory) return false;
      
      // Tags filter (memory must have at least one of the selected tags)
      const matchesTags = filters.tags.length === 0 || 
        (memory.tags && filters.tags.some(filterTag => 
          memory.tags?.some(memoryTag => 
            memoryTag.toLowerCase() === filterTag.toLowerCase()
          )
        ));
      
      if (!matchesTags) return false;
      
      // People filter (memory must include at least one of the selected people)
      // 🔧 FIX: Check both 'people_involved' and 'person_tags' fields for compatibility
      const memoryPeople = memory.people_involved || memory.person_tags || [];
      const matchesPeople = filters.people.length === 0 || 
        (memoryPeople.length > 0 && filters.people.some(filterPerson => 
          memoryPeople.some((memoryPerson: string) => 
            memoryPerson.toLowerCase() === filterPerson.toLowerCase()
          )
        ));
      
      if (!matchesPeople) return false;
      
      // 🆕 Journey filter (filter by journeyType: 'couple', 'pregnancy', or 'none')
      if (filters.journeys.length > 0) {
        const memoryJourneyType = (memory as any).journeyType;
        
        // 🐛 DEBUG: Log journey filtering for troubleshooting
        if (memoryJourneyType) {
          console.log(`🔍 Journey Filter Check:`, {
            memoryTitle: memory.title,
            memoryJourneyType: memoryJourneyType,
            selectedFilters: filters.journeys,
            willShow: filters.journeys.includes(memoryJourneyType)
          });
        }
        
        // Check if "none" is selected and memory has no journey
        if (filters.journeys.includes('none') && !memoryJourneyType) {
          return true;  // ✅ Show regular memories
        }
        
        // Check if memory's journey type is in selected filters
        if (memoryJourneyType && filters.journeys.includes(memoryJourneyType)) {
          return true;  // ✅ Show journey memories (couple or pregnancy)
        }
        
        // If we get here, memory doesn't match selected journey filters
        return false;  // ❌ Hide this memory
      }
      
      return true;
    })
    .sort((a, b) => {
      switch (filters.sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'year-month':
          // Group by year-month, then sort within groups by newest
          const aDate = new Date(a.created_at);
          const bDate = new Date(b.created_at);
          const aYearMonth = aDate.getFullYear() * 12 + aDate.getMonth();
          const bYearMonth = bDate.getFullYear() * 12 + bDate.getMonth();
          if (aYearMonth !== bYearMonth) {
            return bYearMonth - aYearMonth; // Newer months first
          }
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

  const handleMemoryClick = (memory: Memory) => {
    setSelectedMemory(memory);
  };

  const closeMemoryViewer = () => {
    setSelectedMemory(null);
  };

  // 🎬 NEW: Open media viewer with files
  const handleOpenMediaViewer = (memory: Memory, startIndex: number = 0) => {
    if (memory.files && memory.files.length > 0) {
      setMediaViewerFiles(memory.files);
      setMediaViewerIndex(startIndex);
      setMediaViewerOpen(true);
    }
  };

  const closeMediaViewer = () => {
    setMediaViewerOpen(false);
    setMediaViewerFiles([]);
    setMediaViewerIndex(0);
  };

  const handleDeleteMemory = (memory: Memory, event?: React.MouseEvent) => {
    // Prevent card click when clicking delete button
    if (event) {
      event.stopPropagation();
    }
    setMemoryToDelete(memory);
  };

  const confirmDeleteMemory = async () => {
    if (!memoryToDelete || !user || !family) return;

    try {
      // Get current family ID
      const familyId = family.id || user.family_id;
      
      // 🚀 DATABASE-FIRST: Delete from database (with localStorage fallback)
      console.log(`🗑️ Deleting memory from database: ${memoryToDelete.title} (${memoryToDelete.id})`);
      await DatabaseService.deleteMemory(familyId, memoryToDelete.id);
      console.log(`✅ Memory deleted successfully`);

      // Update state
      setMemories(prevMemories => prevMemories.filter(m => m.id !== memoryToDelete.id));
      
      // Close modal if the deleted memory was being viewed
      if (selectedMemory?.id === memoryToDelete.id) {
        setSelectedMemory(null);
      }

      // Show success toast
      toast.success('Memory deleted successfully', {
        description: `"${memoryToDelete.title}" has been removed from your vault.`
      });

      // Clear the delete dialog
      setMemoryToDelete(null);
    } catch (error) {
      console.error('❌ Error deleting memory:', error);
      toast.error('Failed to delete memory', {
        description: 'Please try again.'
      });
    }
  };

  const cancelDeleteMemory = () => {
    setMemoryToDelete(null);
  };

  // ✏️ NEW: Edit memory handler
  const handleEditMemory = (memory: Memory, event?: React.MouseEvent) => {
    // Prevent card click when clicking edit button
    if (event) {
      event.stopPropagation();
    }
    
    console.log('✏️ Editing memory:', memory.id, memory.title);
    
    // Navigate to upload page with memory data in state
    navigate('/upload', {
      state: { editMemory: memory }
    });
    
    // Show feedback toast
    toast.info('Opening memory for editing...', {
      description: `"${memory.title}"`
    });
  };

  // Filter handlers
  const toggleTypeFilter = (type: string) => {
    setFilters(prev => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter(t => t !== type)
        : [...prev.types, type]
    }));
  };

  const toggleCategoryFilter = (category: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const toggleTagFilter = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const togglePersonFilter = (person: string) => {
    setFilters(prev => ({
      ...prev,
      people: prev.people.includes(person)
        ? prev.people.filter(p => p !== person)
        : [...prev.people, person]
    }));
  };

  // 🆕 Journey filter toggle function
  const toggleJourneyFilter = (journeyType: string) => {
    setFilters(prev => ({
      ...prev,
      journeys: prev.journeys.includes(journeyType)
        ? prev.journeys.filter(j => j !== journeyType)
        : [...prev.journeys, journeyType]
    }));
  };

  const setSortBy = (sortBy: FilterState['sortBy']) => {
    setFilters(prev => ({ ...prev, sortBy }));
  };

  const clearAllFilters = () => {
    setFilters({
      types: [],
      categories: [],
      tags: [],
      people: [],
      journeys: [], // 🆕 Clear journey filters too
      sortBy: 'newest'
    });
  };

  const hasActiveFilters = 
    filters.types.length > 0 || 
    filters.categories.length > 0 || 
    filters.tags.length > 0 || 
    filters.people.length > 0 ||
    filters.journeys.length > 0; // 🆕 Include journey filters

  const handleAddCustomTag = () => {
    const trimmedTag = customTagInput.trim();
    if (trimmedTag && !allTags.includes(trimmedTag)) {
      setAllTags(prev => [...prev, trimmedTag].sort());
      toggleTagFilter(trimmedTag);
      setCustomTagInput('');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet mx-auto mb-4"></div>
          <p className="text-ink">Loading your memories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background vibrant-texture pb-24 w-full overflow-x-hidden">
      <div className="px-4 py-6 space-y-6">
        {/* Header - Page Title */}
        <div className="text-center space-y-4">
          <div>
            <h1 className="text-3xl font-semibold text-primary flex items-center justify-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              Memory Vault
            </h1>
            <p className="text-muted-foreground">Your family's precious moments, beautifully preserved</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 w-full max-w-3xl mx-auto">
          <Button
            onClick={() => onNavigate('journal')}
            variant="outline"
            className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-900 hover:border-amber-400 h-12 sm:h-auto"
          >
            <BookOpen className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">My Journal</span>
          </Button>
          <Button
            onClick={() => onNavigate('journey-selection')}
            variant="outline"
            className="border-violet-300 text-violet-700 hover:bg-violet-50 hover:text-violet-900 hover:border-violet-400 h-12 sm:h-auto"
          >
            <Heart className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">Life Journeys</span>
          </Button>
          <Button
            onClick={() => onNavigate('upload-memory')}
            className="vibrant-button h-12 sm:h-auto"
          >
            <Upload className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">Add Memory</span>
          </Button>
        </div>

        {/* 📚 BOOK OF LIFE: Life Journey Books Section */}
        <LifeJourneyBooks 
          userId={user?.id || null}
          memories={memories}
          onNavigate={onNavigate}
        />

        {/* Search & View Mode Controls */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full">
          <div className="flex-1 relative min-w-0">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search memories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <div className="flex gap-2 justify-end sm:justify-start flex-shrink-0">
            {/* Filter Button */}
            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <SheetTrigger asChild>
                <Button
                  variant={hasActiveFilters ? 'default' : 'outline'}
                  size="sm"
                  className={`flex-shrink-0 relative transition-all ${
                    hasActiveFilters 
                      ? 'bg-gradient-to-r from-violet to-coral hover:from-coral hover:to-violet shadow-md' 
                      : 'border-2 border-violet/30 hover:border-violet hover:bg-violet/5'
                  }`}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Filters</span>
                  {hasActiveFilters && (
                    <Badge className="ml-2 bg-white text-violet hover:bg-white px-1.5 py-0.5 h-5 min-w-5 flex items-center justify-center font-bold animate-pulse">
                      {filters.types.length + filters.categories.length + filters.tags.length + filters.people.length + filters.journeys.length}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[85vh] overflow-y-auto pb-32 bg-gradient-to-b from-cream via-white to-cream">
                <SheetHeader className="pb-4 border-b-2 border-violet/20">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-br from-violet to-coral rounded-lg">
                      <Filter className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <SheetTitle className="text-xl text-violet leading-tight">Filter Memories</SheetTitle>
                      <SheetDescription className="text-base leading-relaxed">
                        Select multiple filters to find specific memories
                      </SheetDescription>
                    </div>
                  </div>
                </SheetHeader>

                <div className="space-y-5 pt-4">
                  {/* Clear All Button */}
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      onClick={clearAllFilters}
                      className="w-full border-2 border-coral text-coral hover:bg-coral hover:text-white font-medium transition-all h-12 text-base"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Clear All Filters ({filters.types.length + filters.categories.length + filters.tags.length + filters.people.length + filters.journeys.length})
                    </Button>
                  )}

                  {/* Sort By Section */}
                  <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-aqua/10 via-aqua/5 to-transparent border-2 border-aqua/20">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 bg-gradient-to-br from-aqua to-aqua/80 rounded-lg">
                        <Calendar className="w-4 h-4 text-white" />
                      </div>
                      <h3 className="font-semibold text-aqua text-base">Sort By</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {(['newest', 'oldest', 'year-month'] as const).map((sort) => (
                        <button
                          key={sort}
                          onClick={() => setSortBy(sort)}
                          className={`p-3.5 rounded-lg border-2 transition-all text-left text-base font-medium min-h-[52px] ${
                            filters.sortBy === sort
                              ? 'border-aqua bg-aqua/10 font-semibold text-aqua shadow-md'
                              : 'border-border hover:border-aqua/50 hover:bg-aqua/5'
                          }`}
                        >
                          {sort === 'newest' && '🆕 Newest First'}
                          {sort === 'oldest' && '⏰ Oldest First'}
                          {sort === 'year-month' && '📅 By Year & Month'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Separator className="bg-gradient-to-r from-transparent via-violet/30 to-transparent h-0.5" />

                  {/* Memory Types Section */}
                  <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-violet/10 via-violet/5 to-transparent border-2 border-violet/20">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 bg-gradient-to-br from-violet to-coral rounded-lg">
                        <ImageIcon className="w-4 h-4 text-white" />
                      </div>
                      <h3 className="font-semibold text-violet text-base">Memory Types</h3>
                      {filters.types.length > 0 && (
                        <Badge className="ml-auto bg-violet text-white text-sm">
                          {filters.types.length}
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {MEMORY_TYPES.filter(type => !['audio', 'text'].includes(type.id)).map((type) => (
                        <div
                          key={type.id}
                          className={`flex items-center space-x-2.5 p-3 rounded-lg border-2 cursor-pointer transition-all min-h-[52px] ${
                            filters.types.includes(type.id)
                              ? 'border-violet bg-violet/10 shadow-sm'
                              : 'border-border hover:border-violet/40 hover:bg-violet/5'
                          }`}
                          onClick={() => toggleTypeFilter(type.id)}
                        >
                          <Checkbox
                            checked={filters.types.includes(type.id)}
                            readOnly
                            className="h-[4px] w-[4px] sm:h-[11px] sm:w-[11px] shrink-0 pointer-events-none"
                          />
                          <Label className="cursor-pointer flex items-center space-x-2 flex-1 text-base font-medium pointer-events-none">
                            <type.icon className="w-4 h-4 shrink-0" />
                            <span className="leading-tight">{type.label}</span>
                          </Label>
                        </div>
                      ))}
                      <div
                        className={`flex items-center space-x-2.5 p-3 rounded-lg border-2 cursor-pointer transition-all min-h-[52px] ${
                          filters.types.includes('text')
                            ? 'border-violet bg-violet/10 shadow-sm'
                            : 'border-border hover:border-violet/40 hover:bg-violet/5'
                        }`}
                        onClick={() => toggleTypeFilter('text')}
                      >
                        <Checkbox
                          checked={filters.types.includes('text')}
                          readOnly
                          className="h-[4px] w-[4px] sm:h-[11px] sm:w-[11px] shrink-0 pointer-events-none"
                        />
                        <Label className="cursor-pointer flex items-center space-x-2 flex-1 text-base font-medium pointer-events-none">
                          <FileText className="w-4 h-4 shrink-0" />
                          <span className="leading-tight">Story</span>
                        </Label>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-gradient-to-r from-transparent via-coral/30 to-transparent h-0.5" />

                  {/* Categories Section */}
                  <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-coral/10 via-coral/5 to-transparent border-2 border-coral/20">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 bg-gradient-to-br from-coral to-coral/80 rounded-lg">
                        <BookOpen className="w-4 h-4 text-white" />
                      </div>
                      <h3 className="font-semibold text-coral text-base">Categories</h3>
                      {filters.categories.length > 0 && (
                        <Badge className="ml-auto bg-coral text-white text-sm">
                          {filters.categories.length}
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {MEMORY_CATEGORIES.map((category) => (
                        <div
                          key={category.id}
                          className={`flex items-center space-x-2.5 p-3 rounded-lg border-2 cursor-pointer transition-all min-h-[52px] ${
                            filters.categories.includes(category.id)
                              ? 'border-coral bg-coral/10 shadow-sm'
                              : 'border-border hover:border-coral/40 hover:bg-coral/5'
                          }`}
                          onClick={() => toggleCategoryFilter(category.id)}
                        >
                          <Checkbox
                            checked={filters.categories.includes(category.id)}
                            readOnly
                            className="h-[4px] w-[4px] sm:h-[11px] sm:w-[11px] shrink-0 pointer-events-none"
                          />
                          <Label className="cursor-pointer flex items-center space-x-2 flex-1 text-base font-medium pointer-events-none">
                            <category.icon className="w-4 h-4 shrink-0" />
                            <span className="leading-tight">{category.label}</span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator className="bg-gradient-to-r from-transparent via-aqua/30 to-transparent h-0.5" />

                  {/* Tags Section */}
                  <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-violet/10 via-coral/5 to-aqua/5 border-2 border-violet/20">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 bg-gradient-to-br from-violet via-coral to-aqua rounded-lg">
                        <TagIcon className="w-4 h-4 text-white" />
                      </div>
                      <h3 className="font-semibold text-violet text-base">Tags</h3>
                      {filters.tags.length > 0 && (
                        <Badge className="ml-auto bg-gradient-to-r from-violet to-coral text-white text-sm">
                          {filters.tags.length}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Custom Tag Input */}
                    <div className="flex gap-2">
                      <Input
                        value={customTagInput}
                        onChange={(e) => setCustomTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomTag();
                          }
                        }}
                        placeholder="Add custom tag..."
                        className="flex-1 h-11 text-base border-2 border-violet/20 focus:border-violet"
                      />
                      <Button
                        onClick={handleAddCustomTag}
                        disabled={!customTagInput.trim()}
                        className="bg-gradient-to-r from-violet to-coral text-white hover:from-coral hover:to-violet h-11 px-4 text-base font-medium"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Tags Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto scrollbar-hide">
                      {allTags.map((tag) => (
                        <div
                          key={tag}
                          className={`flex items-center space-x-2.5 p-3 rounded-lg border-2 cursor-pointer transition-all min-h-[52px] ${
                            filters.tags.includes(tag)
                              ? 'border-violet bg-gradient-to-br from-violet/10 to-coral/10 shadow-sm'
                              : 'border-border hover:border-violet/40 hover:bg-violet/5'
                          }`}
                          onClick={() => toggleTagFilter(tag)}
                        >
                          <Checkbox
                            checked={filters.tags.includes(tag)}
                            readOnly
                            className="h-[4px] w-[4px] sm:h-[11px] sm:w-[11px] shrink-0 pointer-events-none"
                          />
                          <Label className="cursor-pointer flex-1 text-base font-medium pointer-events-none leading-tight break-words">
                            {tag}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator className="bg-gradient-to-r from-transparent via-violet/30 to-transparent h-0.5" />

                  {/* People Section */}
                  {familyMembers.length > 0 && (
                    <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-aqua/10 via-aqua/5 to-transparent border-2 border-aqua/20">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 bg-gradient-to-br from-aqua to-aqua/80 rounded-lg">
                          <UserCheck className="w-4 h-4 text-white" />
                        </div>
                        <h3 className="font-semibold text-aqua text-base">People</h3>
                        {filters.people.length > 0 && (
                          <Badge className="ml-auto bg-aqua text-white text-sm">
                            {filters.people.length}
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {familyMembers.map((person) => (
                          <div
                            key={person}
                            className={`flex items-center space-x-2.5 p-3 rounded-lg border-2 cursor-pointer transition-all min-h-[52px] ${
                              filters.people.includes(person)
                                ? 'border-aqua bg-aqua/10 shadow-sm'
                                : 'border-border hover:border-aqua/40 hover:bg-aqua/5'
                            }`}
                            onClick={() => togglePersonFilter(person)}
                          >
                            <Checkbox
                              checked={filters.people.includes(person)}
                              readOnly
                              className="h-[4px] w-[4px] sm:h-[11px] sm:w-[11px] shrink-0 pointer-events-none"
                            />
                            <Label className="cursor-pointer flex-1 truncate text-base font-medium pointer-events-none leading-tight">
                              {person}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator className="bg-gradient-to-r from-transparent via-violet/30 to-transparent h-0.5" />

                  {/* 🆕 Life Journeys Section */}
                  <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-pink-50 via-purple-50 to-pink-50 border-2 border-pink-300">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 bg-gradient-to-br from-pink-500 to-purple-500 rounded-lg">
                        <Heart className="w-4 h-4 text-white" />
                      </div>
                      <h3 className="font-semibold text-purple-700 text-base">Life Journeys</h3>
                      {filters.journeys.length > 0 && (
                        <Badge className="ml-auto bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm">
                          {filters.journeys.length}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2">
                      {/* Couple Journey Filter */}
                      <div
                        className={`flex items-center space-x-2.5 p-3 rounded-lg border-2 cursor-pointer transition-all min-h-[52px] ${
                          filters.journeys.includes('couple')
                            ? 'border-pink-500 bg-pink-50 shadow-sm'
                            : 'border-border hover:border-pink-300 hover:bg-pink-50/50'
                        }`}
                        onClick={() => toggleJourneyFilter('couple')}
                      >
                        <Checkbox
                          checked={filters.journeys.includes('couple')}
                          readOnly
                          className="h-[4px] w-[4px] sm:h-[11px] sm:w-[11px] shrink-0 pointer-events-none"
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-xl">💕</span>
                          <div className="flex-1">
                            <p className="font-medium text-sm">Couple Journey</p>
                            <p className="text-xs text-muted-foreground">Courtship to Honeymoon</p>
                          </div>
                        </div>
                      </div>

                      {/* Pregnancy Journey Filter */}
                      <div
                        className={`flex items-center space-x-2.5 p-3 rounded-lg border-2 cursor-pointer transition-all min-h-[52px] ${
                          filters.journeys.includes('pregnancy')
                            ? 'border-purple-500 bg-purple-50 shadow-sm'
                            : 'border-border hover:border-purple-300 hover:bg-purple-50/50'
                        }`}
                        onClick={() => toggleJourneyFilter('pregnancy')}
                      >
                        <Checkbox
                          checked={filters.journeys.includes('pregnancy')}
                          readOnly
                          className="h-[4px] w-[4px] sm:h-[11px] sm:w-[11px] shrink-0 pointer-events-none"
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-xl">🤰</span>
                          <div className="flex-1">
                            <p className="font-medium text-sm">Pregnancy Journey</p>
                            <p className="text-xs text-muted-foreground">Pregnancy to Year 2</p>
                          </div>
                        </div>
                      </div>

                      {/* Regular Memories Filter */}
                      <div
                        className={`flex items-center space-x-2.5 p-3 rounded-lg border-2 cursor-pointer transition-all min-h-[52px] ${
                          filters.journeys.includes('none')
                            ? 'border-aqua bg-aqua/10 shadow-sm'
                            : 'border-border hover:border-aqua/40 hover:bg-aqua/5'
                        }`}
                        onClick={() => toggleJourneyFilter('none')}
                      >
                        <Checkbox
                          checked={filters.journeys.includes('none')}
                          readOnly
                          className="h-[4px] w-[4px] sm:h-[11px] sm:w-[11px] shrink-0 pointer-events-none"
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-xl">📷</span>
                          <div className="flex-1">
                            <p className="font-medium text-sm">Regular Memories</p>
                            <p className="text-xs text-muted-foreground">Not part of a journey</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Apply Button */}
                  <div className="pt-4">
                    <Button
                      onClick={() => setIsFilterOpen(false)}
                      className="w-full vibrant-button text-lg h-14 shadow-lg font-semibold"
                    >
                      <Sparkles className="w-5 h-5 mr-2 shrink-0" />
                      <span>Show {filteredMemories.length} {filteredMemories.length === 1 ? 'Memory' : 'Memories'}</span>
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="flex-shrink-0"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="flex-shrink-0"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 items-center pt-2 p-3 bg-gradient-to-r from-violet/5 via-coral/5 to-aqua/5 rounded-lg border border-violet/20">
            <span className="text-sm font-semibold text-violet flex items-center">
              <Sparkles className="w-4 h-4 mr-1" />
              Active filters:
            </span>
            {filters.types.map(type => (
              <Badge key={type} className="gap-1 bg-violet text-white hover:bg-violet/90 transition-colors">
                {MEMORY_TYPES.find(t => t.id === type)?.label || type}
                <button onClick={() => toggleTypeFilter(type)} className="hover:text-coral transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {filters.categories.map(cat => (
              <Badge key={cat} className="gap-1 bg-coral text-white hover:bg-coral/90 transition-colors">
                {MEMORY_CATEGORIES.find(c => c.id === cat)?.label || cat}
                <button onClick={() => toggleCategoryFilter(cat)} className="hover:text-violet transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {filters.tags.map(tag => (
              <Badge key={tag} className="gap-1 bg-gradient-to-r from-violet to-coral text-white hover:from-coral hover:to-violet transition-all">
                {tag}
                <button onClick={() => toggleTagFilter(tag)} className="hover:text-cream transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {filters.people.map(person => (
              <Badge key={person} className="gap-1 bg-aqua text-white hover:bg-aqua/90 transition-colors">
                <Users className="w-3 h-3" />
                {person}
                <button onClick={() => togglePersonFilter(person)} className="hover:text-violet transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {/* 🆕 Journey Filters Display */}
            {filters.journeys.map(journey => (
              <Badge 
                key={journey} 
                className={`gap-1 ${
                  journey === 'couple' 
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500' 
                    : journey === 'pregnancy' 
                    ? 'bg-gradient-to-r from-purple-500 to-violet-500' 
                    : 'bg-gradient-to-r from-aqua to-teal-500'
                } text-white hover:opacity-90 transition-all`}
              >
                {journey === 'couple' && '💕'}
                {journey === 'pregnancy' && '🤰'}
                {journey === 'none' && '📷'}
                {' '}
                {journey === 'couple' ? 'Couple Journey' : journey === 'pregnancy' ? 'Pregnancy Journey' : 'Regular Memories'}
                <button onClick={() => toggleJourneyFilter(journey)} className="hover:text-cream transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Content Area */}
        {filteredMemories.length === 0 ? (
          /* Empty State */
          <div className="text-center py-8">
            <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-ink mb-2">No memories yet</h2>
            <p className="text-muted-foreground mb-6">
              Start building your family's memory vault by adding your first memory.
            </p>
            <Button
              onClick={() => onNavigate('upload-memory')}
              className="vibrant-button"
            >
              <Upload className="w-4 h-4 mr-2" />
              Add Your First Memory
            </Button>
          </div>
        ) : (
          /* Memory Grid/List */
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6' 
            : 'space-y-4'
          }>
            {filteredMemories.map((memory) => {
              const memoryType = MEMORY_TYPES.find(t => t.id === memory.type) || MEMORY_TYPES[0];
              
              return (
                <Card
                  key={memory.id}
                  className="memory-card cursor-pointer transition-all hover:shadow-lg group"
                  onClick={() => {
                    // 🎬 DEBUG: Log what's in the memory when clicked
                    console.log(`🔍 Memory clicked: "${memory.title}"`, {
                      hasFiles: !!memory.files,
                      filesLength: memory.files?.length || 0,
                      files: memory.files,
                      hasFileUrl: !!memory.file_url,
                      file_url: memory.file_url
                    });
                    handleMemoryClick(memory);
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start space-x-2">
                      <div className={`p-2 rounded-lg ${memoryType.iconBg} flex-shrink-0`}>
                        <memoryType.icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Title - Full width, can wrap to multiple lines */}
                        <CardTitle className="text-lg leading-snug break-words">{memory.title}</CardTitle>
                        
                        {/* Bottom row: Timestamp + Badges + Buttons */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm text-muted-foreground whitespace-nowrap">
                              {formatRelativeTime(memory.created_at)}
                            </p>
                            
                            {/* 🎬 DEBUG BADGE: Show files count */}
                            {memory.files && memory.files.length > 0 && (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 flex-shrink-0">
                                {memory.files.length} files
                              </Badge>
                            )}
                            {!memory.files && memory.file_url && (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 flex-shrink-0">
                                legacy
                              </Badge>
                            )}
                            {!memory.files && !memory.file_url && (
                              <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200 flex-shrink-0">
                                no media
                              </Badge>
                            )}
                          </div>
                          
                          {/* Edit/Delete buttons - Always visible on right */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-violet hover:text-violet hover:bg-violet/10"
                              onClick={(e) => handleEditMemory(memory, e)}
                              title="Edit memory"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => handleDeleteMemory(memory, e)}
                              title="Delete memory"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    {/* Description */}
                    {memory.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {memory.description}
                      </p>
                    )}
                    
                    {/* 🎬 ENHANCED: Multi-Media Grid Preview */}
                    {memory.files && memory.files.length > 0 ? (
                      <div className="mb-3">
                        <div className={`grid gap-1 ${
                          memory.files.length === 1 ? 'grid-cols-1' :
                          memory.files.length === 2 ? 'grid-cols-2' :
                          memory.files.length === 3 ? 'grid-cols-3' :
                          'grid-cols-2'
                        }`}>
                          {memory.files.slice(0, 4).map((file: any, idx: number) => {
                            // 🔍 DEBUG: Log file data to diagnose blank thumbnails
                            console.log(`📸 File ${idx + 1} for memory "${memory.title}":`, {
                              type: file.type,
                              hasUrl: !!file.url,
                              hasPreview: !!file.preview,
                              url: file.url ? file.url.substring(0, 50) + '...' : 'MISSING',
                              preview: file.preview ? file.preview.substring(0, 50) + '...' : 'MISSING',
                              name: file.name,
                              fullFile: file
                            });
                            
                            return (
                              <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                                {file.type === 'photo' && (file.url || file.preview) && (
                                  <ImageWithFallback
                                    src={file.url || file.preview}
                                    alt={`Media ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                )}
                                
                                {/* 🔍 DEBUG: Show if photo is missing URL/preview */}
                                {file.type === 'photo' && !(file.url || file.preview) && (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-100 text-red-700 p-2">
                                    <ImageIcon className="w-8 h-8 mb-1" />
                                    <span className="text-xs text-center">No URL</span>
                                  </div>
                                )}
                              
                                {file.type === 'video' && (
                                  <div className="relative w-full h-full bg-gradient-to-br from-red-500 to-pink-500">
                                    {(file.url || file.preview) && (
                                      <video
                                        src={file.url || file.preview}
                                        className="w-full h-full object-cover"
                                        preload="metadata"
                                      />
                                    )}
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                      <Play className="w-8 h-8 text-white drop-shadow-lg" />
                                    </div>
                                    
                                    {/* 🔍 DEBUG: Show if video is missing URL/preview */}
                                    {!(file.url || file.preview) && (
                                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-100 text-red-700 p-2">
                                        <VideoIcon className="w-8 h-8 mb-1" />
                                        <span className="text-xs text-center">No URL</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {file.type === 'audio' && (
                                  <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-green-50 to-emerald-50 p-3">
                                    <FileAudio className="w-8 h-8 text-green-600 mb-2" />
                                    <span className="text-xs text-green-700 text-center truncate w-full px-2">
                                      {file.name}
                                    </span>
                                  </div>
                                )}
                                
                                {/* More files indicator */}
                                {idx === 3 && memory.files.length > 4 && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
                                    <span className="font-semibold text-lg">
                                      +{memory.files.length - 4}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* File count badge */}
                        {memory.files.length > 1 && (
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {memory.files.filter((f: any) => f.type === 'photo').length > 0 && (
                              <div className="flex items-center gap-1">
                                <ImageIcon className="w-3 h-3" />
                                <span>{memory.files.filter((f: any) => f.type === 'photo').length} photo{memory.files.filter((f: any) => f.type === 'photo').length > 1 ? 's' : ''}</span>
                              </div>
                            )}
                            {memory.files.filter((f: any) => f.type === 'video').length > 0 && (
                              <div className="flex items-center gap-1">
                                <VideoIcon className="w-3 h-3" />
                                <span>{memory.files.filter((f: any) => f.type === 'video').length} video{memory.files.filter((f: any) => f.type === 'video').length > 1 ? 's' : ''}</span>
                              </div>
                            )}
                            {memory.files.filter((f: any) => f.type === 'audio').length > 0 && (
                              <div className="flex items-center gap-1">
                                <Mic className="w-3 h-3" />
                                <span>{memory.files.filter((f: any) => f.type === 'audio').length} audio</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Fallback: Old single file display for backward compatibility */
                      memory.file_url && memory.type === 'photo' && (
                        <div className="mb-3">
                          <ImageWithFallback
                            src={memory.file_url}
                            alt={memory.title}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                        </div>
                      )
                    )}
                    
                    {/* People and location */}
                    <div className="space-y-2">
                      {memory.people_involved && memory.people_involved.length > 0 && (
                        <div className="flex items-center space-x-1 min-w-0">
                          <Users className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">
                            {memory.people_involved.slice(0, 2).join(', ')}
                            {memory.people_involved.length > 2 && ` +${memory.people_involved.length - 2}`}
                          </span>
                        </div>
                      )}
                      
                      {memory.location && (
                        <div className="flex items-center space-x-1 min-w-0">
                          <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">{memory.location}</span>
                        </div>
                      )}
                      
                      {/* 🆕 Emotions Display */}
                      {memory.emotionTags && memory.emotionTags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0 pt-1">
                          {memory.emotionTags.slice(0, 3).map((emotion: string, idx: number) => {
                            const predefinedEmotion = PREDEFINED_EMOTIONS.find(e => e.name === emotion);
                            
                            if (predefinedEmotion) {
                              const Icon = predefinedEmotion.icon;
                              return (
                                <Badge 
                                  key={idx} 
                                  variant="secondary"
                                  className={`text-xs px-2 py-0.5 ${predefinedEmotion.bgColor} ${predefinedEmotion.textColor} border-0 flex items-center gap-1`}
                                >
                                  <Icon className="w-3 h-3" />
                                  <span>{emotion}</span>
                                </Badge>
                              );
                            } else {
                              // Custom emotion
                              return (
                                <Badge 
                                  key={idx} 
                                  variant="secondary"
                                  className="text-xs px-2 py-0.5 bg-violet/10 text-violet border-0 flex items-center gap-1"
                                >
                                  <Sparkles className="w-3 h-3" />
                                  <span>{emotion}</span>
                                </Badge>
                              );
                            }
                          })}
                          {memory.emotionTags.length > 3 && (
                            <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-muted text-muted-foreground border-0">
                              +{memory.emotionTags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Memory Viewer Modal */}
      {selectedMemory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-border p-4 sm:p-6 flex items-center justify-between gap-3 w-full">
              <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                <div className="p-2 rounded-lg bg-primary flex-shrink-0">
                  <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-xl font-semibold text-foreground truncate">{selectedMemory.title}</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {formatRelativeTime(selectedMemory.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    console.log('🔍 DIALOG EDIT BUTTON CLICKED - Memory object being passed:', selectedMemory);
                    console.log('🔍 Category fields in memory:', {
                      category: selectedMemory.category,
                      memory_type: selectedMemory.memory_type,
                      memory_category: selectedMemory.memory_category,
                      type: selectedMemory.type
                    });
                    
                    // 🔧 FIX: Close dialog first to prevent interference
                    closeMemoryViewer();
                    
                    // Use the same handleEditMemory function as the card Edit button
                    // Small delay to ensure dialog closes first
                    setTimeout(() => {
                      handleEditMemory(selectedMemory);
                    }, 150);
                  }}
                  className="text-primary hover:text-primary hover:bg-primary/10"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleDeleteMemory(selectedMemory)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={closeMemoryViewer}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 pb-32 space-y-4 sm:space-y-6 w-full overflow-x-hidden">
              {/* Description Section */}
              {selectedMemory.description && (
                <div className="space-y-2 w-full">
                  <h3 className="font-bold text-foreground">Description</h3>
                  <p className="text-muted-foreground leading-relaxed break-words">{selectedMemory.description}</p>
                </div>
              )}

              {/* 🎬 ENHANCED: Multi-Media Gallery Section */}
              {selectedMemory.files && selectedMemory.files.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-foreground">
                      Media ({selectedMemory.files.length})
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenMediaViewer(selectedMemory, 0)}
                      className="gap-2"
                    >
                      <ImageIcon className="w-4 h-4" />
                      View Gallery
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {selectedMemory.files.map((file: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => handleOpenMediaViewer(selectedMemory, idx)}
                        className="relative aspect-square rounded-lg overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all group"
                      >
                        {file.type === 'photo' && (file.url || file.preview) && (
                          <ImageWithFallback
                            src={file.url || file.preview}
                            alt={`Media ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        )}
                        
                        {file.type === 'video' && (
                          <div className="relative w-full h-full bg-gradient-to-br from-red-500 to-pink-500">
                            {(file.url || file.preview) && (
                              <video
                                src={file.url || file.preview}
                                className="w-full h-full object-cover"
                                preload="metadata"
                              />
                            )}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/50 transition-colors">
                              <Play className="w-10 h-10 text-white drop-shadow-lg" />
                            </div>
                          </div>
                        )}
                        
                        {file.type === 'audio' && (
                          <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-green-500 to-emerald-600 p-4">
                            <FileAudio className="w-10 h-10 text-white mb-2" />
                            <span className="text-xs text-white text-center truncate w-full px-2 font-medium">
                              {file.name || 'Audio'}
                            </span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Fallback: Old single media display for backward compatibility */
                <>
                  {selectedMemory.type === 'photo' && selectedMemory.file_url && (
                    <div className="w-full overflow-hidden rounded-lg">
                      <ImageWithFallback
                        src={selectedMemory.file_url}
                        alt={selectedMemory.title}
                        className="w-full max-h-96 object-contain rounded-lg bg-muted"
                      />
                    </div>
                  )}

                  {selectedMemory.type === 'video' && selectedMemory.file_url && (
                    <div className="w-full overflow-hidden rounded-lg">
                      <video
                        controls
                        className="w-full max-h-96 rounded-lg"
                        poster={selectedMemory.thumbnail_url}
                      >
                        <source src={selectedMemory.file_url} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  )}
                </>
              )}

              {/* People Section */}
              {selectedMemory.people_involved && selectedMemory.people_involved.length > 0 && (
                <div className="space-y-2 w-full">
                  <h4 className="font-medium text-foreground">People in this Memory</h4>
                  <div className="flex flex-wrap gap-2 w-full">
                    {selectedMemory.people_involved.map((person, index) => (
                      <Badge key={index} variant="secondary" className="px-3 py-1 whitespace-nowrap">
                        <Users className="w-3 h-3 mr-1 flex-shrink-0" />
                        <span className="truncate max-w-[150px]">{person}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Location Section */}
              {selectedMemory.location && (
                <div className="space-y-2 w-full">
                  <h4 className="font-medium text-foreground">Location</h4>
                  <div className="flex items-center space-x-2 text-muted-foreground w-full">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span className="break-words flex-1">{selectedMemory.location}</span>
                  </div>
                </div>
              )}

              {/* 🆕 Emotions Section */}
              {selectedMemory.emotionTags && selectedMemory.emotionTags.length > 0 && (
                <div className="space-y-3 w-full">
                  <h4 className="font-medium text-foreground flex items-center gap-2">
                    <Heart className="w-4 h-4 text-primary" />
                    Emotions & Feelings
                  </h4>
                  <div className="flex flex-wrap gap-2 w-full">
                    {selectedMemory.emotionTags.map((emotion: string, index: number) => {
                      const predefinedEmotion = PREDEFINED_EMOTIONS.find(e => e.name === emotion);
                      
                      if (predefinedEmotion) {
                        const Icon = predefinedEmotion.icon;
                        return (
                          <Badge 
                            key={index} 
                            variant="secondary"
                            className={`px-3 py-1.5 ${predefinedEmotion.bgColor} ${predefinedEmotion.textColor} border border-current/20 flex items-center gap-2 text-sm`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{emotion}</span>
                          </Badge>
                        );
                      } else {
                        // Custom emotion with violet theme
                        return (
                          <Badge 
                            key={index} 
                            variant="secondary"
                            className="px-3 py-1.5 bg-gradient-to-r from-violet/10 to-coral/10 text-violet border border-violet/30 flex items-center gap-2 text-sm hover:from-violet/20 hover:to-coral/20 transition-colors"
                          >
                            <Sparkles className="w-4 h-4" />
                            <span>{emotion}</span>
                          </Badge>
                        );
                      }
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!memoryToDelete} onOpenChange={(open) => !open && cancelDeleteMemory()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Memory?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{memoryToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDeleteMemory}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteMemory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 🎬 ENHANCED: Full-Screen Media Viewer */}
      {mediaViewerOpen && mediaViewerFiles.length > 0 && (
        <MemoryMediaViewer
          files={mediaViewerFiles}
          initialIndex={mediaViewerIndex}
          onClose={closeMediaViewer}
          memoryTitle={selectedMemory?.title || 'Memory'}
        />
      )}
    </div>
  );
};
