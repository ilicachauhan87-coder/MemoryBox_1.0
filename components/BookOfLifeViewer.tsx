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

  // NEW: Filter memories by child_id for pregnancy books
  const filteredMemories = journeyType === 'pregnancy' && childId
    ? memories.filter(m => (m as any).child_id === childId)
    : memories;

  // Get book theme based on journey type
  const bookTheme = journeyType === 'couple'
    ? {
        gradient: 'from-pink-500 to-rose-500',
        bgGradient: 'from-pink-50 to-rose-50',
        color: 'text-pink-700',
        icon: Heart,
        emoji: '💕',
        accentColor: 'bg-pink-500'
      }
    : {
        gradient: 'from-purple-500 to-violet-500',
        bgGradient: 'from-purple-50 to-violet-50',
        color: 'text-purple-700',
        icon: Baby,
        emoji: '👶',
        accentColor: 'bg-purple-500'
      };

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
    
    // 🚀 ENHANCED FIX: Direct navigation to upload page with complete context
    // This ensures multimedia files are properly pre-populated in edit mode
    const editContext = {
      editMemory: memory,
      milestoneContext: {
        journeyType: journeyType,
        milestoneId: (memory as any).milestone_id || (memory as any).milestoneId || 'memory-edit',
        milestoneTitle: memory.title,
        editingMemory: memory, // Full memory object with all multimedia files
        childId: (memory as any).child_id, // For pregnancy journeys
        isEditMode: true // Flag to indicate edit mode
      }
    };
    
    // Dispatch custom event for MemoryUploadPage to handle
    // This works better than localStorage for complex objects with files
    window.dispatchEvent(new CustomEvent('editMemory', { 
      detail: editContext 
    }));
    
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
      toast.success(`Sorted: ${newOrder === 'newest-first' ? 'Newest to Oldest' : 'Oldest to Newest'}`);
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

  if (memories.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream to-white pb-24">
        <div className="px-4 py-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-10 w-10 p-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-violet" style={{ fontFamily: 'Playfair Display, serif' }}>
                {bookTitle}
              </h1>
              <p className="text-sm text-muted-foreground">Your journey memories</p>
            </div>
          </div>

          {/* Empty State */}
          <div className="max-w-md mx-auto mt-20 text-center space-y-6">
            <div className={`w-24 h-24 mx-auto rounded-full bg-gradient-to-br ${bookTheme.gradient} flex items-center justify-center text-6xl`}>
              {bookTheme.emoji}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">No Memories Yet</h2>
              <p className="text-muted-foreground mb-6">
                Start adding memories to your {journeyType === 'couple' ? 'love story' : "baby's journey"}!
              </p>
              <Button
                onClick={() => onNavigate('upload-memory')}
                className="vibrant-button"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Add Your First Memory
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bookTheme.bgGradient} pb-24`}>
      <div className="px-4 py-6">
        {/* Header */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="h-10 w-10 p-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-violet" style={{ fontFamily: 'Playfair Display, serif' }}>
                  {bookTitle}
                </h1>
                <p className="text-sm text-muted-foreground">{memories.length} {memories.length === 1 ? 'memory' : 'memories'}</p>
              </div>
            </div>
          </div>
          
          {/* Controls Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <Button
                variant={viewMode === 'book' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setViewMode('book');
                  hapticFeedback.tap();
                }}
                className="flex items-center gap-1.5"
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
                className="flex items-center gap-1.5"
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

        {viewMode === 'book' ? (
          // Book View
          <div className="max-w-6xl mx-auto">
            {/* Book Pages */}
            <div className="relative">
              {/* Current Page */}
              <div className="bg-white rounded-2xl shadow-2xl min-h-[500px] p-8 overflow-hidden">
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
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    drag={isMobile ? "x" : false}
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.2}
                    onDragEnd={(_, info) => handleSwipe(info.offset.x)}
                    className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-8 min-h-[400px]`}
                  >
                    {pageGroups[currentPage].map((memory, idx) => (
                      <div
                        key={memory.id}
                        className="space-y-4 cursor-pointer group"
                        onClick={() => handleMemoryClick(memory)}
                      >
                        {/* Memory Card */}
                        <Card className="border-2 hover:border-violet transition-all hover:shadow-lg relative">
                          {/* Floating Action Buttons - Top Right Corner */}
                          <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleEditMemory(memory, e)}
                              className="text-violet hover:bg-violet/20 bg-white/90 backdrop-blur-sm shadow-md h-8 w-8 p-0"
                              title="Edit Memory"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleDeleteMemory(memory, e)}
                              className="text-destructive hover:bg-destructive/20 bg-white/90 backdrop-blur-sm shadow-md h-8 w-8 p-0"
                              title="Delete Memory"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          <CardContent className="p-4">
                            {/* Media Preview */}
                            {memory.files && memory.files.length > 0 && (
                              <div className={`grid gap-2 mb-4 ${
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

                            {/* Complete Metadata - All Details */}
                            <div className="space-y-2 mt-3">
                              {/* Date & Category Row */}
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>{formatDate(memory.created_at)}</span>
                                </div>
                                {memory.category && (
                                  <Badge variant="outline" className="text-xs">
                                    {memory.category}
                                  </Badge>
                                )}
                              </div>

                              {/* People Row - Simple names display */}
                              {(() => {
                                const people = memory.people || [];
                                
                                // 🔍 DIAGNOSTIC: Log what we receive for debugging
                                console.log(`📋 BookOfLife Memory "${memory.title}":`, {
                                  hasPeople: people.length > 0,
                                  people: people,
                                  people_involved: memory.people_involved,
                                  people_ids: memory.people_ids,
                                  person_tags: memory.person_tags
                                });
                                
                                // Only show if we have valid people with names
                                const hasValidPeople = people.length > 0 && people.some((p: any) => p && p.name);
                                
                                if (hasValidPeople) {
                                  // Just show the names, clean and simple
                                  const peopleNames = people.map((p: any) => p.name).filter(Boolean).join(', ');
                                  return (
                                    <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                      <Users className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                      <span className="line-clamp-1">{peopleNames}</span>
                                    </div>
                                  );
                                }
                                
                                // If no valid names, hide section completely
                                return null;
                              })()}

                              {/* Location Row */}
                              {memory.location && (
                                <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                  <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                  <span className="line-clamp-1">{memory.location}</span>
                                </div>
                              )}

                              {/* Emotions Row */}
                              {memory.emotions && memory.emotions.length > 0 && (
                                <div className="flex items-start gap-1.5 text-xs">
                                  <Heart className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-coral" />
                                  <div className="flex flex-wrap gap-1">
                                    {memory.emotions.map((emotion: string, idx: number) => (
                                      <Badge key={idx} variant="secondary" className="text-xs bg-coral/10 text-coral border-coral/20">
                                        {emotion}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Page Number Indicator (bottom of memory) */}
                        <div className="text-center text-sm text-muted-foreground">
                          {currentPage * memoriesPerPage + idx + 1} of {memories.length}
                        </div>
                      </div>
                    ))}

                    {/* If odd number of memories, show empty page on right (desktop only) */}
                    {!isMobile && pageGroups[currentPage].length === 1 && (
                      <div className="flex items-center justify-center text-muted-foreground/30">
                        <div className="text-center">
                          <Sparkles className="w-12 h-12 mx-auto mb-2" />
                          <p className="text-sm">Add more memories to fill this page</p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Navigation Arrows */}
              {currentPage > 0 && (
                <button
                  onClick={handlePrevPage}
                  disabled={isFlipping}
                  className={`absolute w-12 h-12 rounded-full bg-white shadow-xl flex items-center justify-center text-violet hover:bg-violet hover:text-white transition-all disabled:opacity-50 z-10 ${
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
                  className={`absolute w-12 h-12 rounded-full bg-white shadow-xl flex items-center justify-center text-violet hover:bg-violet hover:text-white transition-all disabled:opacity-50 z-10 ${
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

            {/* Page Progress */}
            <div className="flex items-center justify-center gap-2 mt-8">
              <span className="text-sm text-muted-foreground">
                Page {currentPage + 1} of {totalPages}
              </span>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setCurrentPage(i);
                      hapticFeedback.tap();
                    }}
                    className={`h-2 rounded-full transition-all ${
                      i === currentPage 
                        ? `${bookTheme.accentColor} w-8` 
                        : 'bg-gray-300 w-2'
                    }`}
                    aria-label={`Go to page ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          // Timeline View
          <div className="max-w-3xl mx-auto space-y-4">
            {sortedMemories.map((memory, idx) => (
              <motion.div
                key={memory.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card 
                  className="border-2 hover:border-violet transition-all hover:shadow-lg cursor-pointer group"
                  onClick={() => handleMemoryClick(memory)}
                >
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
                            <Badge variant="outline" className="text-xs">
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
                          className="h-8 w-8 p-0 text-violet hover:bg-violet/10"
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

        {/* Add Memory Button (Floating) */}
        <div className="fixed bottom-24 right-6 z-20">
          <Button
            onClick={() => onNavigate('upload-memory')}
            className="vibrant-button h-14 w-14 rounded-full shadow-2xl p-0"
            size="lg"
          >
            <Sparkles className="w-6 h-6" />
          </Button>
        </div>
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
