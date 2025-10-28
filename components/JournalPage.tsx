import { useState, useEffect } from 'react';
import { Calendar, BookOpen, Plus, Search, Filter, Edit2, Trash2, ChevronDown, ChevronUp, Sparkles, Clock, Heart, Users, Share2, EyeOff, X, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { MultiSelectDropdown } from './MultiSelectDropdown';
import { DatabaseService } from '../utils/supabase/persistent-database';
import { toast } from 'sonner@2.0.3';

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  date: string;
  moods?: string[]; // Changed from mood to moods (array)
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  sharedWith?: string[]; // Array of family member IDs
  createdBy: string; // User ID who created the entry
  isPrivate?: boolean; // Whether the entry is private (not shared)
}

interface FamilyMember {
  id: string;
  name: string;
  relationship?: string;
}

interface JournalPageProps {
  userId?: string;
  userName?: string;
  familyId?: string;
  familyMembers?: FamilyMember[];
  onBack?: () => void;
}

const DEFAULT_MOODS = [
  'Happy',
  'Peaceful',
  'Thoughtful',
  'Grateful',
  'Excited',
  'Nostalgic',
  'Loving',
  'Reflective'
];

const FREQUENCY_COLORS = {
  daily: 'bg-gradient-to-r from-coral to-orange-400',
  weekly: 'bg-gradient-to-r from-violet to-purple-600',
  monthly: 'bg-gradient-to-r from-aqua to-teal-500'
};

const FREQUENCY_LABELS = {
  daily: 'Daily Reflection',
  weekly: 'Weekly Journal',
  monthly: 'Monthly Chronicle'
};

export function JournalPage({ userId = 'demo-user', userName = 'You', familyId, familyMembers = [], onBack }: JournalPageProps) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [sharedEntries, setSharedEntries] = useState<JournalEntry[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFrequency, setFilterFrequency] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('all');
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [sharingEntry, setSharingEntry] = useState<JournalEntry | null>(null);
  const [currentTab, setCurrentTab] = useState<'my-journals' | 'shared-with-me'>('my-journals');
  const [selectedShareMembers, setSelectedShareMembers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    frequency: 'daily' as 'daily' | 'weekly' | 'monthly',
    moods: [] as string[],
    tags: '',
    isPrivate: false,
    sharedWith: [] as string[]
  });

  // Custom mood management
  const [availableMoods, setAvailableMoods] = useState<string[]>(DEFAULT_MOODS);
  const [newMoodInput, setNewMoodInput] = useState('');

  // ✅ DATABASE-FIRST: Load entries from database
  useEffect(() => {
    loadJournals();
  }, [userId, familyId]);

  // Load journals from database
  const loadJournals = async () => {
    if (!userId || !familyId) return;
    
    setIsLoading(true);
    try {
      console.log('📖 Loading journals from database...');
      
      // Load my journals
      const myJournals = await DatabaseService.getJournalEntries(userId, familyId);
      setEntries(myJournals);
      
      // Load shared journals
      const shared = await DatabaseService.getSharedJournals(userId);
      setSharedEntries(shared);
      
      console.log(`✅ Loaded ${myJournals.length} my journals + ${shared.length} shared journals`);
    } catch (error) {
      console.error('❌ Failed to load journals:', error);
      toast.error('Failed to load journals. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  // Get entries created by current user (now from state)
  const getMyEntries = () => {
    return entries;
  };

  // Get entries shared with current user (now from state)
  const getSharedEntries = () => {
    return sharedEntries;
  };

  // Get family member name by ID
  const getFamilyMemberName = (memberId: string): string => {
    if (memberId === userId) return userName;
    const member = familyMembers.find(m => m.id === memberId);
    return member?.name || 'Unknown';
  };

  // Toggle share member selection
  const toggleShareMember = (memberId: string) => {
    setSelectedShareMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  // ✅ DATABASE-FIRST: Create new entry
  const handleCreateEntry = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Please fill in title and content');
      return;
    }

    if (!userId || !familyId) {
      toast.error('User or family information missing');
      return;
    }

    setIsSaving(true);
    try {
      console.log('💾 Creating journal entry...');
      
      const journalData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        frequency: formData.frequency,
        date: new Date().toISOString().split('T')[0],
        moods: formData.moods,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        isPrivate: formData.isPrivate,
        sharedWith: formData.isPrivate ? [] : formData.sharedWith
      };

      const newEntry = await DatabaseService.createJournalEntry(userId, familyId, journalData);
      
      // Update state
      setEntries(prev => [newEntry, ...prev]);
      
      // 🎉 Celebrate first journal entry!
      if (entries.length === 0) {
        import('../utils/confettiService').then(({ celebrateFirstJournal }) => {
          celebrateFirstJournal();
        });
      }
      
      toast.success('Journal entry created successfully!');
      resetForm();
      setIsCreateDialogOpen(false);
      
    } catch (error) {
      console.error('❌ Failed to create journal:', error);
      toast.error('Failed to save journal entry. Please check your connection.');
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ DATABASE-FIRST: Edit entry
  const handleEditEntry = async () => {
    if (!editingEntry || !formData.title.trim() || !formData.content.trim()) {
      toast.error('Please fill in title and content');
      return;
    }

    if (!userId) {
      toast.error('User information missing');
      return;
    }

    setIsSaving(true);
    try {
      console.log('💾 Updating journal entry...');
      
      const updates = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        frequency: formData.frequency,
        moods: formData.moods,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        isPrivate: formData.isPrivate,
        sharedWith: formData.isPrivate ? [] : formData.sharedWith
      };

      const updatedEntry = await DatabaseService.updateJournalEntry(editingEntry.id, userId, updates);
      
      // Update state
      setEntries(prev => prev.map(entry => 
        entry.id === editingEntry.id ? updatedEntry : entry
      ));
      
      toast.success('Journal entry updated successfully!');
      resetForm();
      setIsEditDialogOpen(false);
      setEditingEntry(null);
      
    } catch (error) {
      console.error('❌ Failed to update journal:', error);
      toast.error('Failed to update journal entry. Please check your connection.');
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ DATABASE-FIRST: Update sharing for an entry
  const handleUpdateSharing = async () => {
    if (!sharingEntry || !userId) return;

    setIsSaving(true);
    try {
      console.log('💾 Updating journal sharing...');
      
      const updates = {
        ...sharingEntry,
        sharedWith: selectedShareMembers,
        isPrivate: selectedShareMembers.length === 0
      };

      const updatedEntry = await DatabaseService.updateJournalEntry(sharingEntry.id, userId, updates);
      
      // Update state
      setEntries(prev => prev.map(entry => 
        entry.id === sharingEntry.id ? updatedEntry : entry
      ));
      
      toast.success('Sharing settings updated!');
      setIsShareDialogOpen(false);
      setSharingEntry(null);
      setSelectedShareMembers([]);
      
    } catch (error) {
      console.error('❌ Failed to update sharing:', error);
      toast.error('Failed to update sharing settings. Please check your connection.');
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ DATABASE-FIRST: Delete entry
  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this journal entry?')) {
      return;
    }

    if (!userId) {
      toast.error('User information missing');
      return;
    }

    try {
      console.log('💾 Deleting journal entry...');
      
      await DatabaseService.deleteJournalEntry(entryId, userId);
      
      // Update state
      setEntries(prev => prev.filter(entry => entry.id !== entryId));
      
      if (expandedEntryId === entryId) {
        setExpandedEntryId(null);
      }
      
      toast.success('Journal entry deleted');
      
    } catch (error) {
      console.error('❌ Failed to delete journal:', error);
      toast.error('Failed to delete journal entry. Please check your connection.');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      frequency: 'daily',
      moods: [],
      tags: '',
      isPrivate: false,
      sharedWith: []
    });
    setNewMoodInput('');
  };

  // Add custom mood
  const handleAddCustomMood = () => {
    const trimmedMood = newMoodInput.trim();
    if (trimmedMood && !availableMoods.includes(trimmedMood)) {
      setAvailableMoods([...availableMoods, trimmedMood]);
      setFormData({ ...formData, moods: [...formData.moods, trimmedMood] });
      setNewMoodInput('');
    }
  };

  // Toggle mood selection
  const toggleMood = (mood: string) => {
    setFormData({
      ...formData,
      moods: formData.moods.includes(mood)
        ? formData.moods.filter(m => m !== mood)
        : [...formData.moods, mood]
    });
  };

  // Open edit dialog
  const openEditDialog = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setFormData({
      title: entry.title,
      content: entry.content,
      frequency: entry.frequency,
      moods: entry.moods || [],
      tags: entry.tags?.join(', ') || '',
      isPrivate: entry.isPrivate || false,
      sharedWith: entry.sharedWith || []
    });
    setIsEditDialogOpen(true);
  };

  // Open share dialog
  const openShareDialog = (entry: JournalEntry) => {
    setSharingEntry(entry);
    setSelectedShareMembers(entry.sharedWith || []);
    setIsShareDialogOpen(true);
  };

  // Get entries to display based on current tab
  const displayEntries = currentTab === 'my-journals' ? getMyEntries() : getSharedEntries();

  // Filter and search entries
  const filteredEntries = displayEntries.filter(entry => {
    const matchesSearch = 
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFrequency = filterFrequency === 'all' || entry.frequency === filterFrequency;
    
    return matchesSearch && matchesFrequency;
  });

  // Group entries by month
  const entriesByMonth = filteredEntries.reduce((acc, entry) => {
    const monthYear = new Date(entry.date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    if (!acc[monthYear]) {
      acc[monthYear] = [];
    }
    acc[monthYear].push(entry);
    return acc;
  }, {} as Record<string, JournalEntry[]>);

  // Stats
  const myEntriesForStats = getMyEntries();
  const sharedEntriesForStats = getSharedEntries();
  
  const stats = {
    total: myEntriesForStats.length,
    shared: myEntriesForStats.filter(e => !e.isPrivate && (e.sharedWith?.length || 0) > 0).length,
    sharedWithMe: sharedEntriesForStats.length,
    thisMonth: myEntriesForStats.filter(e => {
      const entryDate = new Date(e.date);
      const now = new Date();
      return entryDate.getMonth() === now.getMonth() && entryDate.getFullYear() === now.getFullYear();
    }).length
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet via-violet/90 to-coral text-white px-4 py-8 sm:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Back button */}
          {onBack && (
            <Button
              variant="ghost"
              onClick={onBack}
              className="text-white hover:bg-white/10 mb-4 -ml-2 touch-manipulation"
              style={{ minHeight: '44px' }}
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
          )}
          
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-white" style={{ fontSize: '2rem', fontWeight: 600, lineHeight: 1.3 }}>
                My Journal
              </h1>
              <p className="text-cream/90 mt-1" style={{ fontSize: '1.125rem' }}>
                Reflect, remember, and cherish your thoughts
              </p>
            </div>
          </div>

          {/* Stats - Mobile Responsive Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4 sm:mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2 sm:p-3 text-center">
              <div className="text-xl sm:text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-cream/80 text-xs sm:text-sm mt-0.5 sm:mt-1">Total</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2 sm:p-3 text-center">
              <div className="text-xl sm:text-2xl font-bold text-white">{stats.thisMonth}</div>
              <div className="text-cream/80 text-xs sm:text-sm mt-0.5 sm:mt-1">This Month</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2 sm:p-3 text-center">
              <div className="text-xl sm:text-2xl font-bold text-white">{stats.shared}</div>
              <div className="text-cream/80 text-xs sm:text-sm mt-0.5 sm:mt-1">Shared</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2 sm:p-3 text-center">
              <div className="text-xl sm:text-2xl font-bold text-white">{stats.sharedWithMe}</div>
              <div className="text-cream/80 text-xs sm:text-sm mt-0.5 sm:mt-1">With Me</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Mobile Optimized */}
      <div className="max-w-4xl mx-auto px-3 py-4 sm:px-6 sm:py-6">
        {/* Tabs for My Journals vs Shared With Me - Mobile Responsive */}
        <Tabs value={currentTab} onValueChange={(value: any) => setCurrentTab(value)} className="mb-4 sm:mb-6">
          <TabsList className="grid w-full grid-cols-2 h-12 sm:h-14">
            <TabsTrigger value="my-journals" className="text-sm sm:text-lg flex items-center gap-1 sm:gap-2 px-2">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden xs:inline">My Journals</span>
              <span className="xs:hidden">Mine</span>
              {stats.total > 0 && <Badge variant="secondary" className="ml-0.5 sm:ml-1 text-xs">{stats.total}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="shared-with-me" className="text-sm sm:text-lg flex items-center gap-1 sm:gap-2 px-2">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden xs:inline">Shared With Me</span>
              <span className="xs:hidden">Shared</span>
              {stats.sharedWithMe > 0 && <Badge variant="secondary" className="ml-0.5 sm:ml-1 text-xs">{stats.sharedWithMe}</Badge>}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search and Filter Bar - Mobile Optimized to prevent overlaps */}
        <div className="flex flex-col gap-2 sm:gap-3 mb-4 sm:mb-6">
          {/* Search Bar - Full Width on Mobile */}
          <div className="relative w-full">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="      Search Journal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-24 sm:pl-28 pr-3 h-12 sm:h-14 text-base sm:text-lg border-2 w-full"
              style={{ minHeight: '48px', paddingLeft: '96px' }}
            />
          </div>
          
          {/* Filter and New Entry Button Row */}
          <div className="flex gap-2 sm:gap-3">
            <Select value={filterFrequency} onValueChange={(value: any) => setFilterFrequency(value)}>
              <SelectTrigger className="flex-1 sm:flex-initial sm:w-42 h-12 sm:h-14 text-base sm:text-lg border-2">
                <Filter className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-base">All Entries</SelectItem>
                <SelectItem value="daily" className="text-base">Daily</SelectItem>
                <SelectItem value="weekly" className="text-base">Weekly</SelectItem>
                <SelectItem value="monthly" className="text-base">Monthly</SelectItem>
              </SelectContent>
            </Select>

            {currentTab === 'my-journals' && (
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="flex-1 sm:flex-initial h-12 sm:h-14 px-4 sm:px-6 text-base sm:text-lg vibrant-button text-white touch-manipulation"
                style={{ minHeight: '48px' }}
              >
                <Plus className="w-6 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">New Entry</span>
                <span className="xs:hidden">New Journal Entry</span>
              </Button>
            )}
          </div>
        </div>

        {/* Entries List - Mobile Optimized */}
        {filteredEntries.length === 0 ? (
          <Card className="p-6 sm:p-12 text-center memory-card">
            <div className="flex flex-col items-center gap-3 sm:gap-4">
              <div className="p-4 sm:p-6 bg-violet/10 rounded-full">
                <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-violet" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-foreground">
                {currentTab === 'my-journals' ? 'No Journal Entries Yet' : 'No Shared Journals Yet'}
              </h3>
              <p className="text-muted-foreground max-w-md text-sm sm:text-base leading-relaxed">
                {searchQuery || filterFrequency !== 'all' 
                  ? 'No entries match your search or filter criteria.' 
                  : currentTab === 'my-journals'
                    ? 'Start your journaling journey by creating your first entry. Capture your thoughts, reflections, and precious moments.'
                    : 'No family members have shared their journal entries with you yet.'}
              </p>
              {!searchQuery && filterFrequency === 'all' && currentTab === 'my-journals' && (
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="mt-2 sm:mt-4 vibrant-button text-white h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg touch-manipulation"
                  style={{ minHeight: '48px' }}
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Create First Entry
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {Object.entries(entriesByMonth).map(([monthYear, monthEntries]) => (
              <div key={monthYear}>
                <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-violet" />
                  <span className="leading-tight">{monthYear}</span>
                  <span className="text-muted-foreground text-sm sm:text-base ml-1 sm:ml-2">({monthEntries.length})</span>
                </h2>
                
                <div className="space-y-3 sm:space-y-4">
                  {monthEntries.map((entry) => {
                    const isExpanded = expandedEntryId === entry.id;
                    return (
                      <Card key={entry.id} className="memory-card overflow-hidden">
                        <div className="p-4 sm:p-6">
                          {/* Entry Header - Mobile Optimized */}
                          <div className="flex items-start justify-between gap-2 sm:gap-4 mb-2 sm:mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 sm:gap-2 mb-2 flex-wrap">
                                <Badge className={`${FREQUENCY_COLORS[entry.frequency]} text-white px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm`}>
                                  {FREQUENCY_LABELS[entry.frequency]}
                                </Badge>
                                {entry.moods && entry.moods.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {entry.moods.map((mood, idx) => (
                                      <Badge key={idx} variant="outline" className="px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm">
                                        {mood}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                                {currentTab === 'my-journals' && !entry.isPrivate && entry.sharedWith && entry.sharedWith.length > 0 && (
                                  <Badge className="bg-aqua text-white px-2 sm:px-3 py-0.5 sm:py-1 flex items-center gap-1 text-xs sm:text-sm">
                                    <Users className="w-3 h-3" />
                                    <span className="hidden xs:inline">Shared with</span> {entry.sharedWith.length}
                                  </Badge>
                                )}
                                {currentTab === 'my-journals' && (entry.isPrivate || !entry.sharedWith || entry.sharedWith.length === 0) && (
                                  <Badge variant="outline" className="px-2 sm:px-3 py-0.5 sm:py-1 flex items-center gap-1 text-xs sm:text-sm">
                                    <EyeOff className="w-3 h-3" />
                                    <span className="hidden xs:inline">Private</span>
                                  </Badge>
                                )}
                                {currentTab === 'shared-with-me' && (
                                  <Badge className="bg-violet text-white px-2 sm:px-3 py-0.5 sm:py-1 flex items-center gap-1 text-xs sm:text-sm">
                                    By {getFamilyMemberName(entry.createdBy)}
                                  </Badge>
                                )}
                              </div>
                              
                              <h3 className="text-base sm:text-xl font-semibold text-foreground mb-1 leading-snug">
                                {entry.title}
                              </h3>
                              
                              <div className="flex flex-col xs:flex-row xs:items-center gap-2 xs:gap-4 text-muted-foreground text-xs sm:text-sm">
                                <span className="flex items-center gap-1 shrink-0">
                                  <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                                  {new Date(entry.date).toLocaleDateString('en-IN', { 
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </span>
                                {entry.tags && entry.tags.length > 0 && (
                                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                    {entry.tags.map((tag, idx) => (
                                      <span key={idx} className="text-xs bg-aqua/10 text-aqua px-2 py-0.5 sm:py-1 rounded-full">
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-1 sm:gap-2 shrink-0">
                              {currentTab === 'my-journals' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openShareDialog(entry)}
                                    className="h-9 w-9 sm:h-10 sm:w-10 p-0 touch-manipulation"
                                    title="Share with family"
                                    style={{ minHeight: '44px', minWidth: '44px' }}
                                  >
                                    <Share2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditDialog(entry)}
                                    className="h-9 w-9 sm:h-10 sm:w-10 p-0 touch-manipulation"
                                    style={{ minHeight: '44px', minWidth: '44px' }}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteEntry(entry.id)}
                                    className="h-9 w-9 sm:h-10 sm:w-10 p-0 text-destructive hover:text-destructive touch-manipulation"
                                    style={{ minHeight: '44px', minWidth: '44px' }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Entry Content - Mobile Optimized */}
                          <div className={`mt-3 sm:mt-4 ${!isExpanded ? 'line-clamp-3' : ''}`}>
                            <p className="text-foreground whitespace-pre-wrap text-sm sm:text-base leading-relaxed" style={{ fontSize: '0.938rem', lineHeight: 1.6 }}>
                              {entry.content}
                            </p>
                          </div>

                          {/* Expand/Collapse Button - Touch-Friendly */}
                          {entry.content.length > 150 && (
                            <Button
                              variant="ghost"
                              onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                              className="mt-2 sm:mt-3 text-violet hover:text-violet/80 h-10 sm:h-auto touch-manipulation"
                              style={{ minHeight: '44px' }}
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="w-4 h-4 mr-1" />
                                  Show Less
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-4 h-4 mr-1" />
                                  Read More
                                </>
                              )}
                            </Button>
                          )}

                          {/* Show shared with list if expanded */}
                          {currentTab === 'my-journals' && isExpanded && entry.sharedWith && entry.sharedWith.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-border">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Users className="w-4 h-4" />
                                <span>Shared with:</span>
                                <div className="flex flex-wrap gap-2">
                                  {entry.sharedWith.map(memberId => (
                                    <Badge key={memberId} variant="outline" className="text-xs">
                                      {getFamilyMemberName(memberId)}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Entry Dialog - Mobile Optimized */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto max-w-[calc(100vw-2rem)] w-full p-4 sm:p-6 overflow-x-hidden">
          <DialogHeader className="pr-12 sm:pr-14">
            <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl pr-2">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-violet shrink-0" />
              <span className="leading-tight font-[Nunito] break-words">Create New Journal Entry</span>
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base break-words" style={{ fontSize: '1rem' }}>
                 Capture your thoughts, reflections, and precious moments
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 sm:space-y-5 py-3 sm:py-4 overflow-x-hidden w-full min-w-0">
            {/* Frequency Selection */}
            <div>
              <label className="block text-foreground mb-2 font-medium">Entry Type</label>
              <Select value={formData.frequency} onValueChange={(value: any) => setFormData({ ...formData, frequency: value })}>
                <SelectTrigger className="h-14 text-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">📅 Daily Reflection</SelectItem>
                  <SelectItem value="weekly">📖 Weekly Journal</SelectItem>
                  <SelectItem value="monthly">📚 Monthly Chronicle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-foreground mb-2 font-medium">Title</label>
              <Input
                type="text"
                placeholder="Give your entry a meaningful title..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="h-14 text-lg"
              />
            </div>

            {/* Mood Selection - Multi-Select with Custom Option */}
            <div>
              <label className="block text-foreground mb-3 font-medium">
                How are you feeling? (Optional - Select multiple)
              </label>
              
              {/* Mood Grid - Responsive 2 cols mobile, 4 cols desktop */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {availableMoods.map((mood) => (
                  <button
                    key={mood}
                    type="button"
                    onClick={() => toggleMood(mood)}
                    className={`p-3 sm:p-4 rounded-xl border-2 transition-all touch-manipulation ${
                      formData.moods.includes(mood)
                        ? 'border-violet bg-violet/10 shadow-lg'
                        : 'border-border hover:border-violet/50 hover:bg-violet/5'
                    }`}
                    style={{ minHeight: '60px' }}
                  >
                    <div className="text-sm sm:text-base font-medium text-foreground text-center leading-tight">
                      {mood}
                    </div>
                  </button>
                ))}
              </div>

              {/* Add Custom Mood */}
              <div className="mt-4 flex gap-2">
                <Input
                  type="text"
                  placeholder="Capture mood"
                  value={newMoodInput}
                  onChange={(e) => setNewMoodInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCustomMood()}
                  className="h-12 text-base flex-1"
                />
                <Button
                  type="button"
                  onClick={handleAddCustomMood}
                  disabled={!newMoodInput.trim()}
                  variant="outline"
                  className="h-12 px-4 shrink-0 touch-manipulation"
                  style={{ minHeight: '48px' }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>

              {/* Selected Moods Display */}
              {formData.moods.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-sm text-muted-foreground">Selected:</span>
                  {formData.moods.map((mood) => (
                    <Badge key={mood} className="bg-violet text-white px-3 py-1">
                      {mood}
                      <button
                        type="button"
                        onClick={() => toggleMood(mood)}
                        className="ml-2 hover:text-red-200"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Content */}
            <div>
              <label className="block text-foreground mb-2 font-medium">Your Thoughts</label>
              <Textarea
                placeholder="Pour your heart out... Share your thoughts, feelings, memories, or reflections..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="min-h-[200px] text-lg resize-none"
                style={{ fontSize: '1.125rem', lineHeight: 1.7 }}
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-foreground mb-2 font-medium">Tags (Optional)</label>
              <Input
                type="text"
                placeholder="family, memories, gratitude (separate with commas)"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="h-14 text-lg"
              />
              <p className="text-sm text-muted-foreground mt-2">Add tags to organize and find your entries easily</p>
            </div>

            {/* Sharing Section - Mobile Optimized */}
            <div className="pt-3 sm:pt-4 border-t border-border">
              <div className="flex items-center justify-between gap-2 mb-3">
                <label className="block text-foreground font-medium flex items-center gap-2 text-sm sm:text-base">
                  <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-violet" />
                  Share with Family
                </label>
                <div className="flex items-center gap-2 touch-manipulation" style={{ minHeight: '44px' }}>
                  <Checkbox
                    id="isPrivate"
                    checked={formData.isPrivate}
                    onCheckedChange={(checked) => setFormData({ 
                      ...formData, 
                      isPrivate: checked as boolean,
                      sharedWith: checked ? [] : formData.sharedWith
                    })}
                    className="w-5 h-5 sm:w-4 sm:h-4"
                  />
                  <label htmlFor="isPrivate" className="text-sm sm:text-sm text-muted-foreground cursor-pointer">
                    Keep Private
                  </label>
                </div>
              </div>
              
              {!formData.isPrivate && familyMembers.length > 0 && (
                <MultiSelectDropdown
                  placeholder="Select family members to share with..."
                  options={familyMembers.map(m => ({
                    id: m.id,
                    name: m.name,
                    relationship: m.relationship
                  }))}
                  selectedIds={formData.sharedWith}
                  onChange={(selectedIds) => setFormData({ ...formData, sharedWith: selectedIds })}
                  showSearch={familyMembers.length > 5}
                  maxDisplayCount={2}
                />
              )}
              
              {!formData.isPrivate && familyMembers.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  Add family members to your tree to share journal entries with them.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-3 flex-col sm:flex-row">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                resetForm();
              }}
              className="h-12 sm:h-14 px-4 sm:px-6 text-base sm:text-lg w-full sm:w-auto touch-manipulation"
              style={{ minHeight: '48px' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateEntry}
              disabled={!formData.title.trim() || !formData.content.trim()}
              className="h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg vibrant-button text-white w-full sm:w-auto touch-manipulation"
              style={{ minHeight: '48px' }}
            >
              <Heart className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Save Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Entry Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto max-w-[calc(100vw-2rem)] w-full p-4 sm:p-6 overflow-x-hidden">
          <DialogHeader className="pr-12 sm:pr-14">
            <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl pr-2">
              <Edit2 className="w-5 h-5 sm:w-6 sm:h-6 text-violet shrink-0" />
              <span className="break-words">Edit Journal Entry</span>
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base break-words" style={{ fontSize: '1rem' }}>
              Update your thoughts and reflections
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 sm:space-y-5 py-3 sm:py-4 overflow-x-hidden w-full min-w-0">
            {/* Frequency Selection */}
            <div>
              <label className="block text-foreground mb-2 font-medium">Entry Type</label>
              <Select value={formData.frequency} onValueChange={(value: any) => setFormData({ ...formData, frequency: value })}>
                <SelectTrigger className="h-14 text-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">📅 Daily Reflection</SelectItem>
                  <SelectItem value="weekly">📖 Weekly Journal</SelectItem>
                  <SelectItem value="monthly">📚 Monthly Chronicle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-foreground mb-2 font-medium">Title</label>
              <Input
                type="text"
                placeholder="Give your entry a meaningful title..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="h-14 text-lg"
              />
            </div>

            {/* Mood Selection - Multi-Select with Custom Option (Edit) */}
            <div>
              <label className="block text-foreground mb-3 font-medium">
                How are you feeling? (Optional - Select multiple)
              </label>
              
              {/* Mood Grid - Responsive 2 cols mobile, 4 cols desktop */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {availableMoods.map((mood) => (
                  <button
                    key={mood}
                    type="button"
                    onClick={() => toggleMood(mood)}
                    className={`p-3 sm:p-4 rounded-xl border-2 transition-all touch-manipulation ${
                      formData.moods.includes(mood)
                        ? 'border-violet bg-violet/10 shadow-lg'
                        : 'border-border hover:border-violet/50 hover:bg-violet/5'
                    }`}
                    style={{ minHeight: '60px' }}
                  >
                    <div className="text-sm sm:text-base font-medium text-foreground text-center leading-tight">
                      {mood}
                    </div>
                  </button>
                ))}
              </div>

              {/* Add Custom Mood */}
              <div className="mt-4 flex gap-2">
                <Input
                  type="text"
                  placeholder="Add your own feeling..."
                  value={newMoodInput}
                  onChange={(e) => setNewMoodInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCustomMood()}
                  className="h-12 text-base flex-1"
                />
                <Button
                  type="button"
                  onClick={handleAddCustomMood}
                  disabled={!newMoodInput.trim()}
                  variant="outline"
                  className="h-12 px-4 shrink-0 touch-manipulation"
                  style={{ minHeight: '48px' }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>

              {/* Selected Moods Display */}
              {formData.moods.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-sm text-muted-foreground">Selected:</span>
                  {formData.moods.map((mood) => (
                    <Badge key={mood} className="bg-violet text-white px-3 py-1">
                      {mood}
                      <button
                        type="button"
                        onClick={() => toggleMood(mood)}
                        className="ml-2 hover:text-red-200"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Content */}
            <div>
              <label className="block text-foreground mb-2 font-medium">Your Thoughts</label>
              <Textarea
                placeholder="Pour your heart out... Share your thoughts, feelings, memories, or reflections..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="min-h-[200px] text-lg resize-none"
                style={{ fontSize: '1.125rem', lineHeight: 1.7 }}
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-foreground mb-2 font-medium">Tags (Optional)</label>
              <Input
                type="text"
                placeholder="family, memories, gratitude (separate with commas)"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="h-14 text-lg"
              />
              <p className="text-sm text-muted-foreground mt-2">Add tags to organize and find your entries easily</p>
            </div>

            {/* Sharing Section */}
            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-foreground font-medium flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-violet" />
                  Share with Family
                </label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isPrivate-edit"
                    checked={formData.isPrivate}
                    onCheckedChange={(checked) => setFormData({ 
                      ...formData, 
                      isPrivate: checked as boolean,
                      sharedWith: checked ? [] : formData.sharedWith
                    })}
                  />
                  <label htmlFor="isPrivate-edit" className="text-sm text-muted-foreground cursor-pointer">
                    Keep Private
                  </label>
                </div>
              </div>
              
              {!formData.isPrivate && familyMembers.length > 0 && (
                <MultiSelectDropdown
                  placeholder="Select family members to share with..."
                  options={familyMembers.map(m => ({
                    id: m.id,
                    name: m.name,
                    relationship: m.relationship
                  }))}
                  selectedIds={formData.sharedWith}
                  onChange={(selectedIds) => setFormData({ ...formData, sharedWith: selectedIds })}
                  showSearch={familyMembers.length > 5}
                  maxDisplayCount={2}
                />
              )}
              
              {!formData.isPrivate && familyMembers.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  Add family members to your tree to share journal entries with them.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-3 flex-col sm:flex-row">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingEntry(null);
                resetForm();
              }}
              className="h-12 sm:h-14 px-4 sm:px-6 text-base sm:text-lg w-full sm:w-auto touch-manipulation"
              style={{ minHeight: '48px' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditEntry}
              disabled={!formData.title.trim() || !formData.content.trim()}
              className="h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg vibrant-button text-white w-full sm:w-auto touch-manipulation"
              style={{ minHeight: '48px' }}
            >
              <Heart className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Update Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="max-w-xl max-w-[calc(100vw-2rem)] w-full p-4 sm:p-6 overflow-x-hidden">
          <DialogHeader className="pr-12 sm:pr-14">
            <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl pr-2">
              <Share2 className="w-5 h-5 sm:w-6 sm:h-6 text-violet shrink-0" />
              <span className="break-words">Share Journal Entry</span>
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base break-words" style={{ fontSize: '1rem' }}>
              Choose family members to share "{sharingEntry?.title}" with
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 overflow-x-hidden w-full min-w-0">
            {familyMembers.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto overflow-x-hidden p-4 bg-muted/30 rounded-lg w-full">
                {familyMembers.map(member => (
                  <div key={member.id} className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg transition-colors">
                    <Checkbox
                      id={`share-dialog-${member.id}`}
                      checked={selectedShareMembers.includes(member.id)}
                      onCheckedChange={() => toggleShareMember(member.id)}
                    />
                    <label htmlFor={`share-dialog-${member.id}`} className="flex-1 cursor-pointer">
                      <div className="font-medium text-foreground">
                        {member.name}
                      </div>
                      {member.relationship && (
                        <div className="text-xs text-muted-foreground">
                          {member.relationship}
                        </div>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Add family members to your tree to share journal entries with them.
                </p>
              </div>
            )}

            {selectedShareMembers.length > 0 && (
              <div className="mt-4 p-4 bg-aqua/10 rounded-lg border border-aqua/20">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Users className="w-4 h-4 text-aqua" />
                  <span className="font-medium">Sharing with {selectedShareMembers.length} {selectedShareMembers.length === 1 ? 'person' : 'people'}</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedShareMembers.map(memberId => (
                    <Badge key={memberId} className="bg-aqua text-white flex items-center gap-1">
                      {getFamilyMemberName(memberId)}
                      <button
                        onClick={() => toggleShareMember(memberId)}
                        className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-3 flex-col sm:flex-row">
            <Button
              variant="outline"
              onClick={() => {
                setIsShareDialogOpen(false);
                setSharingEntry(null);
                setSelectedShareMembers([]);
              }}
              className="h-12 sm:h-14 px-4 sm:px-6 text-base sm:text-lg w-full sm:w-auto touch-manipulation"
              style={{ minHeight: '48px' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateSharing}
              className="h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg vibrant-button text-white w-full sm:w-auto touch-manipulation"
              style={{ minHeight: '48px' }}
            >
              <Share2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              {selectedShareMembers.length > 0 ? `Share with ${selectedShareMembers.length}` : 'Make Private'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
