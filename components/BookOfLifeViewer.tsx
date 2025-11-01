import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar, MapPin, Tag, Users, Heart, Baby, Sparkles, Share, Download, Edit, Trash2, ImageIcon, Video as VideoIcon, Mic, Play, FileAudio, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { MemoryMediaViewer } from './MemoryMediaViewer';
import { DatabaseService } from '../utils/supabase/persistent-database';
import { hapticFeedback } from '../utils/hapticFeedback';
import { toast } from 'sonner@2.0.3';
import { useIsMobile } from './ui/use-mobile';
import type { Memory, UserProfile } from '../utils/supabase/client';

interface BookOfLifeViewerProps {
  journeyType: 'couple' | 'pregnancy';
  bookTitle: string;
  memories: Memory[];
  user: UserProfile | null;
  onBack: () => void;
  onNavigate: (page: string) => void;
  onMemoryDeleted?: () => void;
  childId?: string; // NEW: Filter pregnancy memories by child
  childName?: string; // NEW: Display child name in title
}

type SortOrder = 'newest-first' | 'oldest-first';

// Journey-specific theme configurations
const getJourneyTheme = (journeyType: 'couple' | 'pregnancy') => {
  if (journeyType === 'couple') {
    return {
      // Colors
      gradient: 'from-rose-400 via-pink-400 to-red-400',
      bgGradient: 'from-rose-50 via-pink-50 to-cream',
      headerGradient: 'from-rose-500 to-pink-500',
      cardBorder: 'border-rose-200',
      cardHoverBorder: 'hover:border-rose-400',
      accentColor: 'bg-rose-500',
      textColor: 'text-rose-700',
      
      // Icons & Decorations
      icon: Heart,
      emoji: '💕',
      decorativeEmojis: ['💕', '💑', '💖', '✨', '💐', '🌹'],
      
      // Styles
      titleFont: 'Playfair Display, serif',
      subtitleText: 'Your Love Story',
      emptyStateTitle: 'Your Love Story Awaits',
      emptyStateMessage: 'Start capturing the beautiful moments of your journey together',
      
      // Animations
      pageTransition: { duration: 0.5, ease: 'easeInOut' }
    };
  } else {
    return {
      // Colors
      gradient: 'from-blue-300 via-purple-300 to-pink-300',
      bgGradient: 'from-blue-50 via-purple-50 to-cream',
      headerGradient: 'from-blue-400 to-purple-400',
      cardBorder: 'border-purple-200',
      cardHoverBorder: 'hover:border-purple-400',
      accentColor: 'bg-purple-400',
      textColor: 'text-purple-700',
      
      // Icons & Decorations
      icon: Baby,
      emoji: '👶',
      decorativeEmojis: ['👶', '🍼', '👣', '✨', '🌟', '💫'],
      
      // Styles
      titleFont: 'Playfair Display, serif',
      subtitleText: 'Baby\'s Journey',
      emptyStateTitle: 'Baby\'s Story Begins',
      emptyStateMessage: 'Capture every precious moment of your little one\'s journey',
      
      // Animations
      pageTransition: { duration: 0.5, ease: 'easeInOut' }
    };
  }
};

export const BookOfLifeViewer: React.FC<BookOfLifeViewerProps> = ({
  journeyType,
  bookTitle,
  memories,
  user,
  onBack,
  onNavigate,
  onMemoryDeleted,
  childId, // NEW
  childName // NEW
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [viewMode, setViewMode] = useState<'book' | 'timeline'>('book');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest-first');
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [memoryToDelete, setMemoryToDelete] = useState<Memory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Detect mobile for responsive book layout
  const isMobile = useIsMobile();

  // Get journey-specific theme
  const theme = getJourneyTheme(journeyType);

  // NEW: Filter memories by child_id for pregnancy books
  const filteredMemories = journeyType === 'pregnancy' && childId
    ? memories.filter(m => (m as any).child_id === childId)
    : memories;

  // Sort memories by date based on selected sort order (use filteredMemories)
  const sortedMemories = [...filteredMemories].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return sortOrder === 'newest-first' ? dateB - dateA : dateA - dateB;
  });

  // Group memories for book view
  // Mobile: 1 memory per page (single card, swipeable)
  // Desktop: 2 memories per page (facing pages)
  const memoriesPerPage = isMobile ? 1 : 2;
  const pageGroups: Memory[][] = [];
  for (let i = 0; i < sortedMemories.length; i += memoriesPerPage) {
    pageGroups.push(sortedMemories.slice(i, i + memoriesPerPage));
  }

  const totalPages = pageGroups.length;

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setIsFlipping(true);
      hapticFeedback.tap();
      setTimeout(() => {
        setCurrentPage(prev => prev + 1);
        setIsFlipping(false);
      }, 300);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setIsFlipping(true);
      hapticFeedback.tap();
      setTimeout(() => {
        setCurrentPage(prev => prev - 1);
        setIsFlipping(false);
      }, 300);
    }
  };

  const handleMemoryClick = (memory: Memory) => {
    hapticFeedback.tap();
    setSelectedMemory(memory);
  };

  const handleEditMemory = (memory: Memory, e: React.MouseEvent) => {
    e.stopPropagation();
    hapticFeedback.tap();
    
    console.log('✏️ BOOK OF LIFE EDIT: Opening editor for memory:', {
      id: memory.id,
      title: memory.title,
      journeyType: journeyType,
      hasFiles: memory.files?.length || 0,
      childId: (memory as any).child_id
    });
    
    // 🎯 CRITICAL FIX: Store edit data in localStorage BEFORE navigation
    // This ensures MemoryUploadPage can access it even before component mounts
    // Custom events don't work because they're dispatched before listener is set up
    const editData = {
      editMemory: memory,
      milestoneContext: {
        journeyType: journeyType,
        milestoneId: (memory as any).milestone_id || (memory as any).milestoneId || 'memory-edit',
        milestoneTitle: memory.title,
        editingMemory: memory, // Full memory object with all multimedia files
        childId: (memory as any).child_id, // For pregnancy journeys
        isEditMode: true // Flag to indicate edit mode
      },
      timestamp: Date.now() // Prevent stale data
    };
    
    try {
      localStorage.setItem('memorybox_edit_context', JSON.stringify(editData));
      console.log('✅ Saved edit context to localStorage:', editData);
    } catch (error) {
      console.error('Failed to save edit context:', error);
    }
    
    // Navigate to upload page
    onNavigate('upload-memory');
    
    // Show appropriate toast
    const memoryType = journeyType === 'couple' ? 'couple memory' : 'pregnancy memory';
    toast.success(`✏️ Opening editor for your ${memoryType}...`, {
      description: 'All fields and media files will be pre-loaded'
    });
  };

  const handleDeleteMemory = (memory: Memory, e: React.MouseEvent) => {
    e.stopPropagation();
    hapticFeedback.tap();
    setMemoryToDelete(memory);
  };

  const confirmDelete = async () => {
    if (!memoryToDelete || !user?.id) return;

    setIsDeleting(true);
    try {
      await DatabaseService.deleteMemory(user.id, memoryToDelete.id);
      hapticFeedback.success();
      toast.success('Memory deleted successfully');
      setMemoryToDelete(null);
      
      // If we're on the last page and it becomes empty, go back
      if (pageGroups[currentPage].length === 1 && currentPage > 0) {
        setCurrentPage(prev => prev - 1);
      }
      
      if (onMemoryDeleted) {
        onMemoryDeleted();
      }
    } catch (error) {
      console.error('Failed to delete memory:', error);
      hapticFeedback.error();
      toast.error('Failed to delete memory. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => {
      const newOrder = prev === 'newest-first' ? 'oldest-first' : 'newest-first';
      hapticFeedback.tap();
      toast.success(`Sorted: ${newOrder === 'newest-first' ? 'Newest to Oldest' : 'Oldest to Newest'}`, {
        duration: 2000
      });
      return newOrder;
    });
  };

  const handleSwipe = (offset: number) => {
    if (!isMobile) return; // Only enable swipe on mobile
    
    if (offset < -50 && currentPage < totalPages - 1) {
      // Swiped left - go to next page
      handleNextPage();
    } else if (offset > 50 && currentPage > 0) {
      // Swiped right - go to previous page
      handlePrevPage();
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Empty State
  if (filteredMemories.length === 0) {
    const ThemeIcon = theme.icon;
    
    return (
      <div className={`min-h-screen bg-gradient-to-br ${theme.bgGradient} pb-24`}>
        <div className="px-4 py-6 max-w-4xl mx-auto">
          {/* Journey-Specific Header with Decorations */}
          <div className="relative mb-8">
            {/* Decorative Elements */}
            <div className="absolute top-0 left-0 text-4xl opacity-20 animate-pulse">
              {theme.decorativeEmojis[0]}
            </div>
            <div className="absolute top-0 right-0 text-4xl opacity-20 animate-pulse delay-150">
              {theme.decorativeEmojis[1]}
            </div>
            
            <div className="flex items-center gap-3 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="h-10 w-10 p-0 hover:bg-white/50"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <ThemeIcon className={`w-6 h-6 ${theme.textColor}`} />
                  <h1 
                    className={`text-2xl sm:text-3xl font-bold ${theme.textColor}`}
                    style={{ fontFamily: theme.titleFont }}
                  >
                    {childName ? `${childName}'s Book of Life` : bookTitle}
                  </h1>
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  {theme.subtitleText}
                </p>
              </div>
            </div>
          </div>

          {/* Empty State */}
          <div className="max-w-md mx-auto mt-16 text-center space-y-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className={`w-32 h-32 mx-auto rounded-full bg-gradient-to-br ${theme.gradient} flex items-center justify-center shadow-2xl`}
            >
              <span className="text-7xl">{theme.emoji}</span>
            </motion.div>
            
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                {theme.emptyStateTitle}
              </h2>
              <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
                {theme.emptyStateMessage}
              </p>
              <Button
                onClick={() => onNavigate('upload-memory')}
                className={`bg-gradient-to-r ${theme.headerGradient} hover:opacity-90 text-white px-8 py-6 text-lg shadow-xl`}
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Add Your First Memory
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  const ThemeIcon = theme.icon;

  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.bgGradient} pb-24`}>
      <div className="px-4 py-6 max-w-7xl mx-auto">
        {/* Journey-Specific Header with Decorations */}
        <div className="relative mb-6">
          {/* Decorative Corner Elements */}
          <div className="absolute -top-2 -left-2 text-3xl opacity-20 animate-bounce">
            {theme.decorativeEmojis[0]}
          </div>
          <div className="absolute -top-2 -right-2 text-3xl opacity-20 animate-bounce delay-150">
            {theme.decorativeEmojis[1]}
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="h-10 w-10 p-0 hover:bg-white/50"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex-1 min-w-0">
                  {/* Title with Journey Icon */}
                  <div className="flex items-center gap-2 mb-1">
                    <ThemeIcon className={`w-6 h-6 flex-shrink-0 ${theme.textColor}`} />
                    <h1 
                      className={`text-2xl sm:text-3xl font-bold ${theme.textColor} truncate`}
                      style={{ fontFamily: theme.titleFont }}
                    >
                      {childName ? `${childName}'s Book of Life` : bookTitle}
                    </h1>
                  </div>
                  {/* Subtitle with memory count */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                    <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{theme.subtitleText}</span>
                    <span>•</span>
                    <span className="font-medium">{filteredMemories.length} {filteredMemories.length === 1 ? 'memory' : 'memories'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Controls Row */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <Button
                  variant={viewMode === 'book' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setViewMode('book');
                    hapticFeedback.tap();
                  }}
                  className={`flex items-center gap-1.5 ${viewMode === 'book' ? `bg-gradient-to-r ${theme.headerGradient} text-white` : ''}`}
                >
                  <span>📖</span>
                  <span className="hidden xs:inline">Book</span>
                </Button>
                <Button
                  variant={viewMode === 'timeline' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setViewMode('timeline');
                    hapticFeedback.tap();
                  }}
                  className={`flex items-center gap-1.5 ${viewMode === 'timeline' ? `bg-gradient-to-r ${theme.headerGradient} text-white` : ''}`}
                >
                  <span>📅</span>
                  <span className="hidden xs:inline">Timeline</span>
                </Button>
              </div>
              
              {/* Sort Order Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSortOrder}
                className="flex items-center gap-1.5 px-3"
                title={sortOrder === 'newest-first' ? 'Newest to Oldest' : 'Oldest to Newest'}
              >
                {sortOrder === 'newest-first' ? (
                  <ArrowDown className="w-4 h-4" />
                ) : (
                  <ArrowUp className="w-4 h-4" />
                )}
                <span className="text-xs sm:text-sm">
                  {sortOrder === 'newest-first' ? 'Newest' : 'Oldest'}
                </span>
              </Button>
            </div>
          </div>
        </div>

        {viewMode === 'book' ? (
          // Book View - Journey-Specific Styling
          <div className="max-w-6xl mx-auto">
            {/* Book Pages with Journey-Specific Border */}
            <div className="relative">
              {/* Current Page with Journey Theme */}
              <div className={`bg-white rounded-2xl shadow-2xl min-h-[500px] p-4 sm:p-8 overflow-hidden border-4 ${theme.cardBorder} relative`}>
                {/* Decorative Corner Accents */}
                <div className={`absolute top-0 left-0 w-16 h-16 bg-gradient-to-br ${theme.gradient} opacity-10 rounded-br-full`}></div>
                <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl ${theme.gradient} opacity-10 rounded-bl-full`}></div>
                <div className={`absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr ${theme.gradient} opacity-10 rounded-tr-full`}></div>
                <div className={`absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl ${theme.gradient} opacity-10 rounded-tl-full`}></div>
                
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentPage}
                    initial={{ 
                      opacity: 0, 
                      x: isMobile ? 100 : 0, 
                      rotateY: isMobile ? 0 : -10 
                    }}
                    animate={{ 
                      opacity: 1, 
                      x: 0, 
                      rotateY: 0 
                    }}
                    exit={{ 
                      opacity: 0, 
                      x: isMobile ? -100 : 0, 
                      rotateY: isMobile ? 0 : 10 
                    }}
                    transition={theme.pageTransition}
                    drag={isMobile ? "x" : false}
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.2}
                    onDragEnd={(_, info) => handleSwipe(info.offset.x)}
                    className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-6 sm:gap-8 min-h-[400px]`}
                  >
                    {pageGroups[currentPage].map((memory, idx) => (
                      <div
                        key={memory.id}
                        className="space-y-4 cursor-pointer group"
                        onClick={() => handleMemoryClick(memory)}
                      >
                        {/* Memory Card with Journey-Specific Styling */}
                        <Card className={`border-2 ${theme.cardBorder} ${theme.cardHoverBorder} transition-all hover:shadow-xl relative overflow-hidden`}>
                          {/* Journey-Specific Top Border Accent */}
                          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${theme.gradient}`}></div>
                          
                          {/* Floating Action Buttons */}
                          <div className="absolute top-3 right-3 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleEditMemory(memory, e)}
                              className={`${theme.textColor} hover:bg-white bg-white/90 backdrop-blur-sm shadow-md h-8 w-8 p-0 border ${theme.cardBorder}`}
                              title="Edit Memory"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleDeleteMemory(memory, e)}
                              className="text-destructive hover:bg-destructive/20 bg-white/90 backdrop-blur-sm shadow-md h-8 w-8 p-0 border border-red-200"
                              title="Delete Memory"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          <CardContent className="p-4">
                            {/* Media Preview */}
                            {memory.files && memory.files.length > 0 && (
                              <div className={`grid gap-2 mb-4 rounded-lg overflow-hidden ${
                                memory.files.length === 1 ? 'grid-cols-1' :
                                memory.files.length === 2 ? 'grid-cols-2' :
                                'grid-cols-2'
                              }`}>
                                {memory.files.slice(0, 4).map((file: any, fileIdx: number) => (
                                  <div key={fileIdx} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                                    {file.type === 'photo' && (file.url || file.preview) && (
                                      <ImageWithFallback
                                        src={file.url || file.preview}
                                        alt={`Media ${fileIdx + 1}`}
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
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                          <Play className="w-8 h-8 text-white drop-shadow-lg" />
                                        </div>
                                      </div>
                                    )}
                                    {file.type === 'audio' && (
                                      <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-green-50 to-emerald-50 p-3">
                                        <FileAudio className="w-8 h-8 text-green-600 mb-2" />
                                        <span className="text-xs text-green-700 text-center truncate w-full">
                                          {file.name}
                                        </span>
                                      </div>
                                    )}
                                    {fileIdx === 3 && memory.files.length > 4 && (
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
                                        <span className="font-semibold text-lg">+{memory.files.length - 4}</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Title & Description */}
                            <div className="space-y-2">
                              <h3 className="font-semibold text-lg text-gray-900 leading-tight">{memory.title}</h3>
                              {memory.description && (
                                <p className="text-sm text-muted-foreground line-clamp-3">{memory.description}</p>
                              )}
                            </div>

                            {/* Complete Metadata - Journey-Specific Badges */}
                            <div className="space-y-2 mt-3">
                              {/* Date & Category Row */}
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>{formatDate(memory.created_at)}</span>
                                </div>
                                {memory.category && (
                                  <Badge variant="outline" className={`text-xs ${theme.textColor} border-current`}>
                                    {memory.category}
                                  </Badge>
                                )}
                              </div>

                              {/* People Row */}
                              {(() => {
                                const people = memory.people || [];
                                const hasValidPeople = people.length > 0 && people.some((p: any) => p && p.name);
                                
                                if (hasValidPeople) {
                                  const peopleNames = people.map((p: any) => p.name).filter(Boolean).join(', ');
                                  return (
                                    <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                      <Users className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                      <span className="line-clamp-1">{peopleNames}</span>
                                    </div>
                                  );
                                }
                                return null;
                              })()}

                              {/* Location Row */}
                              {memory.location && (
                                <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                  <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                  <span className="line-clamp-1">{memory.location}</span>
                                </div>
                              )}

                              {/* Emotions Row with Journey-Specific Colors */}
                              {memory.emotions && memory.emotions.length > 0 && (
                                <div className="flex items-start gap-1.5 text-xs">
                                  <Heart className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${theme.textColor}`} />
                                  <div className="flex flex-wrap gap-1">
                                    {memory.emotions.map((emotion: string, idx: number) => (
                                      <Badge 
                                        key={idx} 
                                        variant="secondary" 
                                        className={`text-xs ${theme.textColor} bg-current/10 border-current/20`}
                                      >
                                        {emotion}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Page Number Indicator with Journey Colors */}
                        <div className={`text-center text-sm font-medium ${theme.textColor}`}>
                          Memory {currentPage * memoriesPerPage + idx + 1} of {filteredMemories.length}
                        </div>
                      </div>
                    ))}

                    {/* Empty Page with Journey-Specific Message */}
                    {!isMobile && pageGroups[currentPage].length === 1 && (
                      <div className="flex items-center justify-center text-muted-foreground/30">
                        <div className="text-center space-y-3">
                          <div className="text-5xl opacity-50">{theme.decorativeEmojis[2]}</div>
                          <Sparkles className="w-12 h-12 mx-auto opacity-30" />
                          <p className="text-sm">Add more memories<br />to fill this page</p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Navigation Arrows with Journey Colors */}
              {currentPage > 0 && (
                <button
                  onClick={handlePrevPage}
                  disabled={isFlipping}
                  className={`absolute w-12 h-12 rounded-full bg-gradient-to-r ${theme.headerGradient} shadow-xl flex items-center justify-center text-white hover:shadow-2xl transition-all disabled:opacity-50 z-10 ${
                    isMobile 
                      ? 'bottom-4 left-1/4 -translate-x-1/2' 
                      : 'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2'
                  }`}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}
              {currentPage < totalPages - 1 && (
                <button
                  onClick={handleNextPage}
                  disabled={isFlipping}
                  className={`absolute w-12 h-12 rounded-full bg-gradient-to-r ${theme.headerGradient} shadow-xl flex items-center justify-center text-white hover:shadow-2xl transition-all disabled:opacity-50 z-10 ${
                    isMobile 
                      ? 'bottom-4 right-1/4 translate-x-1/2' 
                      : 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2'
                  }`}
                  aria-label="Next page"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* Page Progress with Journey Colors */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6 sm:mt-8">
              <span className={`text-sm font-medium ${theme.textColor}`}>
                Page {currentPage + 1} of {totalPages}
              </span>
              <div className="flex gap-1.5">
                {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setCurrentPage(i);
                      hapticFeedback.tap();
                    }}
                    className={`h-2 rounded-full transition-all ${
                      i === currentPage 
                        ? `${theme.accentColor} w-8` 
                        : 'bg-gray-300 w-2'
                    }`}
                    aria-label={`Go to page ${i + 1}`}
                  />
                ))}
                {totalPages > 10 && <span className="text-xs text-muted-foreground">...</span>}
              </div>
            </div>
          </div>
        ) : (
          // Timeline View with Journey-Specific Styling
          <div className="max-w-3xl mx-auto space-y-4">
            {sortedMemories.map((memory, idx) => (
              <motion.div
                key={memory.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card 
                  className={`border-2 ${theme.cardBorder} ${theme.cardHoverBorder} transition-all hover:shadow-lg cursor-pointer group relative overflow-hidden`}
                  onClick={() => handleMemoryClick(memory)}
                >
                  {/* Journey-Specific Left Border Accent */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${theme.gradient}`}></div>
                  
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Media Preview */}
                      {memory.files && memory.files.length > 0 && memory.files[0] && (
                        <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-muted">
                          {memory.files[0].type === 'photo' && (memory.files[0].url || memory.files[0].preview) && (
                            <ImageWithFallback
                              src={memory.files[0].url || memory.files[0].preview}
                              alt={memory.title}
                              className="w-full h-full object-cover"
                            />
                          )}
                          {memory.files[0].type === 'video' && (
                            <div className="relative w-full h-full bg-gradient-to-br from-red-500 to-pink-500">
                              {(memory.files[0].url || memory.files[0].preview) && (
                                <video
                                  src={memory.files[0].url || memory.files[0].preview}
                                  className="w-full h-full object-cover"
                                  preload="metadata"
                                />
                              )}
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <Play className="w-6 h-6 text-white" />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg text-gray-900 mb-1">{memory.title}</h3>
                        {memory.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{memory.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(memory.created_at)}</span>
                          </div>
                          {memory.category && (
                            <Badge variant="outline" className={`text-xs ${theme.textColor} border-current`}>
                              {memory.category}
                            </Badge>
                          )}
                          {memory.files && memory.files.length > 1 && (
                            <Badge variant="secondary" className="text-xs">
                              {memory.files.length} files
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleEditMemory(memory, e)}
                          className={`h-8 w-8 p-0 ${theme.textColor} hover:bg-current/10`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDeleteMemory(memory, e)}
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Floating Add Memory Button with Journey Colors */}
        <motion.div 
          className="fixed bottom-24 right-4 sm:right-6 z-20"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            onClick={() => onNavigate('upload-memory')}
            className={`bg-gradient-to-r ${theme.headerGradient} hover:opacity-90 text-white h-14 w-14 rounded-full shadow-2xl p-0`}
            size="lg"
          >
            <Sparkles className="w-6 h-6" />
          </Button>
        </motion.div>
      </div>

      {/* Memory Viewer Modal */}
      {selectedMemory && selectedMemory.files && selectedMemory.files.length > 0 && (
        <MemoryMediaViewer
          files={selectedMemory.files}
          initialIndex={0}
          onClose={() => setSelectedMemory(null)}
          memoryTitle={selectedMemory.title}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!memoryToDelete} onOpenChange={() => setMemoryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Memory?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{memoryToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
