import React, { useState, useEffect, useRef } from 'react';
import { Edit2, BookOpen, Heart, Baby, Calendar, MapPin, Sparkles, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner@2.0.3';
import { motion, AnimatePresence } from 'framer-motion'; // For animations
import { useBookPreferences } from '../hooks/useBookPreferences';
import { hapticFeedback } from '../utils/hapticFeedback';
import { DatabaseService } from '../utils/supabase/persistent-database'; // NEW: For loading family tree
import type { Memory } from '../utils/supabase/client';
import '../styles/book-animations.css';

interface LifeJourneyBooksProps {
  userId: string | null;
  memories: Memory[];
  onNavigate: (page: string) => void;
}

interface BookData {
  id: string;
  type: 'couple' | 'pregnancy';
  title: string;
  icon: React.ComponentType<any>;
  emoji: string;
  gradient: string;
  spineColor: string;
  memories: Memory[];
  memoryCount: number;
  dateRange: string;
  lastMemoryDate: string | null;
  childId?: string; // NEW: Child ID for pregnancy books
  childName?: string; // NEW: Child name for pregnancy books
}

export const LifeJourneyBooks: React.FC<LifeJourneyBooksProps> = ({
  userId,
  memories,
  onNavigate
}) => {
  const { preferences, loading, updateTitle, markAsOpened } = useBookPreferences(userId);
  const [editingBook, setEditingBook] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [activeBookIndex, setActiveBookIndex] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const [familyTreePeople, setFamilyTreePeople] = useState<any[]>([]); // NEW: Family tree data
  
  // Swipe gesture state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const swipeContainerRef = useRef<HTMLDivElement>(null);

  // Minimum swipe distance (in px) to trigger navigation
  const minSwipeDistance = 50;

  // Load family tree data for child names
  useEffect(() => {
    const loadFamilyTree = async () => {
      const currentUserId = localStorage.getItem('current_user_id');
      if (!currentUserId) return;
      
      try {
        const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
        if (userProfile) {
          const userData = JSON.parse(userProfile);
          if (userData.family_id) {
            const familyTreeData = await DatabaseService.getChildrenFromFamilyTree(userData.family_id);
            setFamilyTreePeople(familyTreeData);
          }
        }
      } catch (error) {
        console.error('Failed to load family tree:', error);
      }
    };
    
    loadFamilyTree();
  }, []);

  // Filter memories by journey type
  const coupleMemories = memories.filter(m => m.journey_type === 'couple');
  const pregnancyMemories = memories.filter(m => m.journey_type === 'pregnancy');

  // Calculate date ranges
  const getDateRange = (mems: Memory[]): string => {
    if (mems.length === 0) return 'No memories yet';
    const dates = mems.map(m => new Date(m.created_at)).sort((a, b) => a.getTime() - b.getTime());
    const first = dates[0];
    const last = dates[dates.length - 1];
    
    const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    if (mems.length === 1) return formatDate(first);
    return `${formatDate(first)} - ${formatDate(last)}`;
  };

  const getLastMemoryDate = (mems: Memory[]): string | null => {
    if (mems.length === 0) return null;
    const lastDate = new Date(Math.max(...mems.map(m => new Date(m.created_at).getTime())));
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  // Build book data
  const books: BookData[] = [];
  
  // Add couple book (one book total)
  if (coupleMemories.length > 0) {
    books.push({
      id: 'couple',
      type: 'couple',
      title: preferences.couple || 'Our Love Story',
      icon: Heart,
      emoji: '💕',
      gradient: 'from-[#FF6F61] to-[#6A0572]', // MemoryBox: Coral to Violet
      spineColor: 'bg-[#6A0572]',
      memories: coupleMemories,
      memoryCount: coupleMemories.length,
      dateRange: getDateRange(coupleMemories),
      lastMemoryDate: getLastMemoryDate(coupleMemories)
    });
  }
  
  // Add pregnancy books (ONE BOOK PER CHILD - NEW LOGIC)
  if (pregnancyMemories.length > 0) {
    // Group pregnancy memories by child_id
    const memoriesByChild = new Map<string, Memory[]>();
    
    pregnancyMemories.forEach(memory => {
      const childId = (memory as any).child_id || 'unassigned';
      if (!memoriesByChild.has(childId)) {
        memoriesByChild.set(childId, []);
      }
      memoriesByChild.get(childId)!.push(memory);
    });
    
    // Create one book per child
    memoriesByChild.forEach((childMemories, childId) => {
      // Find child info from family tree
      const child = familyTreePeople.find(p => p.id === childId);
      
      // Get custom title from preferences (keyed by child_id)
      const customTitle = preferences[childId];
      
      // Determine book title
      let bookTitle: string;
      if (customTitle) {
        bookTitle = customTitle;
      } else if (child && child.name) {
        bookTitle = `${child.name}'s Journey`;
      } else if (childId === 'unborn') {
        bookTitle = "Baby's Journey (Expected)";
      } else if (childId === 'unassigned') {
        bookTitle = "Pregnancy Journey";
      } else {
        bookTitle = "Baby's Journey";
      }
      
      books.push({
        id: `pregnancy-${childId}`,
        type: 'pregnancy',
        title: bookTitle,
        icon: Baby,
        emoji: '👶',
        gradient: 'from-[#17BEBB] to-[#6A0572]', // MemoryBox: Aqua to Violet
        spineColor: 'bg-[#17BEBB]',
        memories: childMemories,
        memoryCount: childMemories.length,
        dateRange: getDateRange(childMemories),
        lastMemoryDate: getLastMemoryDate(childMemories),
        childId: childId !== 'unassigned' ? childId : undefined, // NEW
        childName: child?.name // NEW
      });
    });
  }

  // Check if user has seen tutorial
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('bookSwipeTutorialSeen');
    if (!hasSeenTutorial && books.length > 1 && window.innerWidth < 768) {
      // Show tutorial after 1 second delay
      const timer = setTimeout(() => {
        setShowTutorial(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [books.length]);

  // Don't render if no books
  if (books.length === 0) return null;

  // Swipe handlers
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && activeBookIndex < books.length - 1) {
      // Swipe left - next book
      setActiveBookIndex(prev => prev + 1);
      hapticFeedback.tap();
    }

    if (isRightSwipe && activeBookIndex > 0) {
      // Swipe right - previous book
      setActiveBookIndex(prev => prev - 1);
      hapticFeedback.tap();
    }
  };

  const handleEditTitle = (book: BookData) => {
    hapticFeedback.tap();
    setEditingBook(book.id);
    setEditValue(book.title);
  };

  const handleSaveTitle = async (bookType: 'couple' | 'pregnancy', childId?: string) => {
    if (!editValue.trim()) {
      toast.error('Book title cannot be empty');
      hapticFeedback.error();
      return;
    }

    if (editValue.length > 50) {
      toast.error('Title must be 50 characters or less');
      hapticFeedback.error();
      return;
    }

    try {
      await updateTitle(bookType, editValue.trim(), childId); // NEW: Pass child_id
      hapticFeedback.success();
      setEditingBook(null);
    } catch (error) {
      console.error('Failed to save title:', error);
      hapticFeedback.error();
    }
  };

  const handleBookClick = async (book: BookData) => {
    hapticFeedback.select();
    await markAsOpened(book.type, book.childId); // NEW: Pass child_id
    
    // Navigate to Book of Life viewer
    if (book.type === 'couple') {
      onNavigate('book-couple');
    } else {
      // NEW: Include child_id in navigation for pregnancy books
      if (book.childId) {
        onNavigate(`book-pregnancy-${book.childId}`);
      } else {
        onNavigate('book-pregnancy');
      }
    }
  };

  const handleCloseTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('bookSwipeTutorialSeen', 'true');
    hapticFeedback.tap();
  };

  // Skeleton loading component
  if (loading) {
    return (
      <div className="book-shelf-container mb-8" aria-busy="true" aria-label="Loading your journey books">
        {/* Section Header Skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-gradient-to-r from-violet/20 to-violet/5 rounded-lg shimmer" />
            <div className="h-4 w-48 bg-gradient-to-r from-gray-200 to-gray-100 rounded shimmer" />
          </div>
        </div>

        {/* Books Grid Skeleton */}
        <div className="books-grid grid gap-6 grid-cols-1 md:grid-cols-2">
          {[1, 2].map(i => (
            <div key={i} className="book-card-skeleton relative">
              {/* Spine Skeleton */}
              <div className="book-spine-skeleton shimmer" />
              
              {/* Cover Skeleton */}
              <div className="book-cover-skeleton p-6 space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-white/30 shimmer" />
                </div>
                <div className="h-8 bg-white/30 rounded shimmer mx-auto w-3/4" />
                <div className="space-y-2">
                  <div className="h-6 bg-white/20 rounded shimmer" />
                  <div className="h-6 bg-white/20 rounded shimmer" />
                  <div className="h-6 bg-white/20 rounded shimmer" />
                </div>
              </div>
              
              {/* Page Edges Skeleton */}
              <div className="book-page-edges-skeleton shimmer" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="book-shelf-container mb-8"
    >
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-violet" style={{ fontFamily: 'Playfair Display, serif' }}>
            📚 Your Life Journey Books
          </h2>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Your most precious memories, beautifully preserved
          </p>
        </div>
      </div>

      {/* Swipe Container (Mobile Only) */}
      <div 
        ref={swipeContainerRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="md:hidden"
      >
        {/* Mobile: Show one book at a time with swipe */}
        <div className="relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeBookIndex}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3 }}
              className="book-card-wrapper"
            >
              {/* Single Book Card */}
              {renderBookCard(books[activeBookIndex])}
            </motion.div>
          </AnimatePresence>

          {/* Swipe Navigation Arrows */}
          {books.length > 1 && (
            <>
              {activeBookIndex > 0 && (
                <button
                  onClick={() => {
                    setActiveBookIndex(prev => prev - 1);
                    hapticFeedback.tap();
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-violet hover:bg-white transition-colors"
                  aria-label="Previous book"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              {activeBookIndex < books.length - 1 && (
                <button
                  onClick={() => {
                    setActiveBookIndex(prev => prev + 1);
                    hapticFeedback.tap();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-violet hover:bg-white transition-colors"
                  aria-label="Next book"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Pagination Dots */}
        {books.length > 1 && (
          <div className="swipe-pagination mt-6 flex justify-center gap-2">
            {books.map((_, index) => (
              <button
                key={index}
                className={`pagination-dot ${index === activeBookIndex ? 'active' : ''}`}
                onClick={() => {
                  setActiveBookIndex(index);
                  hapticFeedback.tap();
                }}
                aria-label={`View book ${index + 1} of ${books.length}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Desktop: Show all books in grid */}
      <div className="hidden md:grid books-grid gap-6 grid-cols-1 md:grid-cols-2">
        {books.map((book, index) => (
          <motion.div
            key={book.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
            className="book-card-wrapper"
          >
            {renderBookCard(book)}
          </motion.div>
        ))}
      </div>

      {/* Swipe Tutorial Overlay */}
      <AnimatePresence>
        {showTutorial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
            onClick={handleCloseTutorial}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-violet to-purple-600 rounded-2xl p-8 max-w-sm w-full shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={handleCloseTutorial}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                aria-label="Close tutorial"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Tutorial Content */}
              <div className="text-center text-white space-y-6">
                <div className="text-5xl mb-4">📚</div>
                <h3 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Welcome to Your Books!
                </h3>
                <p className="text-white/90 text-lg leading-relaxed">
                  Swipe left or right to explore your journey books
                </p>

                {/* Animated Swipe Gesture */}
                <div className="relative h-20 flex items-center justify-center">
                  <motion.div
                    animate={{ x: [-40, 40, -40] }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 2,
                      ease: "easeInOut"
                    }}
                    className="text-4xl"
                  >
                    👉
                  </motion.div>
                </div>

                <Button
                  onClick={handleCloseTutorial}
                  className="w-full bg-white text-violet hover:bg-white/90 font-semibold py-6 text-lg"
                  size="lg"
                >
                  Got it!
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  // Helper function to render book card (DRY principle)
  function renderBookCard(book: BookData) {
    return (
      <div 
        className="book-card relative cursor-pointer group"
        onClick={() => handleBookClick(book)}
        onTouchStart={() => hapticFeedback.tap()}
        role="button"
        tabIndex={0}
        aria-label={`Open ${book.title} with ${book.memoryCount} memories`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleBookClick(book);
          }
        }}
      >
        {/* Book Spine */}
        <div className={`book-spine ${book.spineColor}`}>
          <div className="book-spine-text">
            <span className="text-xs text-white font-semibold tracking-wide">
              {book.dateRange}
            </span>
          </div>
        </div>

        {/* Book Cover - COMPACT FIT */}
        <div className={`book-cover bg-gradient-to-br ${book.gradient} relative flex flex-col gap-1.5`}>
          {/* Edit Title Button */}
          {!editingBook && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 bg-white/15 hover:bg-white/25 text-white h-7 w-7 p-0"
              onClick={(e) => {
                e.stopPropagation();
                handleEditTitle(book);
              }}
              aria-label="Edit book title"
            >
              <Edit2 className="w-3 h-3" />
            </Button>
          )}

          {/* 1. Icon on Top */}
          <div className="flex justify-center flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center" style={{ fontSize: '26px' }}>
              {book.emoji}
            </div>
          </div>

          {/* 2. Title */}
          {editingBook === book.id ? (
            <div className="flex-shrink-0 mb-1" onClick={(e) => e.stopPropagation()}>
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveTitle(book.type, book.childId); // NEW: Pass child_id
                  } else if (e.key === 'Escape') {
                    setEditingBook(null);
                  }
                }}
                className="text-center text-white bg-white/20 border-white/40"
                style={{ fontSize: '16px', fontWeight: '600', fontFamily: 'Playfair Display, serif' }}
                maxLength={50}
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  onClick={() => handleSaveTitle(book.type, book.childId)} // NEW: Pass child_id
                  className="flex-1 bg-white hover:bg-white/90"
                  style={{ color: '#6A0572', fontSize: '13px' }}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingBook(null)}
                  className="flex-1 border-white text-white hover:bg-white/10"
                  style={{ fontSize: '13px' }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <h3 
              className="book-title text-center text-white px-1 line-clamp-2 flex-shrink-0 mb-1"
              style={{ 
                minHeight: '40px',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}
            >
              {book.title}
            </h3>
          )}

          {/* 3. Memory Count */}
          <div className="flex items-center justify-center gap-1.5 text-white flex-shrink-0">
            <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="book-memory-count">
              {book.memoryCount} {book.memoryCount === 1 ? 'Memory' : 'Memories'}
            </span>
          </div>
          
          {/* 4. Date Range (Timeline) */}
          <div className="flex items-center justify-center gap-1.5 text-white flex-shrink-0">
            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
            <span 
              className="book-metadata-text text-white/95 truncate"
              style={{ maxWidth: '180px' }}
              title={book.dateRange}
            >
              {book.dateRange}
            </span>
          </div>

          {/* 5. Last Added - ALWAYS VISIBLE */}
          <div className="flex items-center justify-center gap-1.5 text-white flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
            <span 
              className="book-last-added text-white truncate"
              style={{ 
                maxWidth: '180px',
                background: 'rgba(0, 0, 0, 0.25)',
                padding: '3px 8px',
                borderRadius: '12px',
                backdropFilter: 'blur(4px)'
              }}
              title={book.lastMemoryDate ? `Last added: ${book.lastMemoryDate}` : 'No memories yet'}
            >
              Last added: {book.lastMemoryDate || 'Never'}
            </span>
          </div>

          {/* 6. Tap Indicator */}
          <div className="book-tap-indicator text-center text-white/70 transition-colors group-hover:text-white flex-shrink-0 mt-1">
            <span className="hidden md:group-hover:inline">Click to open →</span>
            <span className="md:hidden opacity-80">Tap to open →</span>
          </div>
        </div>

        {/* Page Edges (right side) */}
        <div className="book-page-edges"></div>
      </div>
    );
  }
};
