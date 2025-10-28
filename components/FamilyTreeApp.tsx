import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { toast } from 'sonner@2.0.3';
import { useIsMobile } from './ui/use-mobile';
import { PersonPalette } from './PersonPalette';
import { ConnectionTypeDialog } from './ConnectionTypeDialog';
import { ContextualPersonDialog } from './ContextualPersonDialog';
import { QuickActionMenu } from './QuickActionMenu';
import { RelationshipHint } from './RelationshipHint';
import { WelcomeWizard } from './WelcomeWizard';
import { SiblingMigrationButton } from './SiblingMigrationButton';
import { WizardProgressTracker } from './WizardProgressTracker';
import { FamilyTemplateMenu } from './FamilyTemplateMenu';
import { InLawsWizard, InLawsWizardData } from './InLawsWizard';
import { MaternalWizard, MaternalWizardData } from './MaternalWizard';
import { PaternalWizard, PaternalWizardData } from './PaternalWizard';
import { MobileGestureTutorial } from './MobileGestureTutorial';
import { FloatingActionButton } from './FloatingActionButton';
import { ZoomControls } from './ZoomControls';
import { SearchAndFilter } from './SearchAndFilter';
import { FamilyMemberProfile } from './FamilyMemberProfile';
import { RelationshipValidator } from '../utils/relationshipValidation';
import { hapticFeedback } from '../utils/hapticFeedback';
import { HistoryState, createEmptyHistory, addToHistory, canUndo, canRedo, undo, redo, getActionDescription, HistoryAction } from '../utils/historyManager';
import { notifyFamilyTreeUpdate } from '../utils/familyMemberSyncService';
import { DatabaseService } from '../utils/supabase/persistent-database';
import { Plus, Users, Heart, Baby, Trash2, Move, Link, Crown, User, ChevronLeft, ChevronRight, ArrowLeft, ArrowRight, X, Menu, ChevronUp, Undo2, Redo2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// Type definitions
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
  bio?: string;
}

interface Relationship {
  id: string;
  type: 'spouse' | 'parent-child' | 'sibling';
  from: string; // Person ID
  to: string; // Person ID
}

interface FamilyTree {
  people: InteractivePerson[];
  relationships: Relationship[];
  rootUserId: string;
  // 🔧 CRITICAL FIX: Use string keys because JSON.parse/stringify always converts object keys to strings
  // This matches our actual usage pattern with '-2', '-1', '0', '1', '2'
  generationLimits: Record<string, { current: number; max: number }>;
}

interface GenerationZoneProps {
  generation: number;
  title: string;
  maxPeople: number;
  currentCount: number;
  color: string;
  yPosition: number;
  isConnectionMode?: boolean;
  connectionSourceGeneration?: number | null;
}

interface GridPersonProps {
  person: InteractivePerson;
  onMove: (id: string, direction: 'left' | 'right') => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  isSelected: boolean;
  isConnecting: boolean;
  isConnectionSource: boolean;
  connectionSourceGeneration: number | null;
  relationshipHint: 'spouse' | 'child' | 'parent' | 'invalid' | 'already-connected' | null;
  relationshipMessage?: string;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onQuickMenuOpen: (personId: string, isOpen: boolean) => void;
  quickMenuOpen: boolean;
  onStartConnectionFrom: (personId: string) => void;
  onToggleCollapse: (personId: string) => void;
  hasDescendants: boolean;
  onOpenProfile: (personId: string) => void;
}

interface GridAddButtonProps {
  generation: -2 | -1 | 0 | 1 | 2;
  gridSlot: number;
  onClick: (generation: -2 | -1 | 0 | 1 | 2, gridSlot: number) => void;
}

const GENERATION_LIMITS = {
  '-2': { max: 4, title: 'Grandparents (Maternal & Paternal)', color: 'bg-violet/10 border-violet/20' },
  '-1': { max: 20, title: 'Parents, In-Laws, & Parents\' Siblings', color: 'bg-aqua/10 border-aqua/30' },
  '0': { max: 78, title: 'Your Generation & Siblings/Cousins', color: 'bg-coral/10 border-coral/30' },
  '1': { max: 42, title: 'Children', color: 'bg-violet/5 border-violet/20' },
  '2': { max: 18, title: 'Grandchildren', color: 'bg-aqua/5 border-aqua/20' }
};

// Updated with increased band heights (180px between generations)
const GENERATION_Y_POSITIONS = {
  '-2': 90,   // Top generation
  '-1': 270,  // 180px spacing
  '0': 450,   // 180px spacing - center
  '1': 630,   // 180px spacing
  '2': 810    // 180px spacing - bottom
};

// Grid configuration
const GRID_CONFIG = {
  NODE_WIDTH: 100,      // Width including padding
  CANVAS_WIDTH: 18000,
  LEFT_MARGIN: 200,     // Margin from canvas edge
  RIGHT_MARGIN: 200,
  getSlotCount: () => Math.floor((GRID_CONFIG.CANVAS_WIDTH - GRID_CONFIG.LEFT_MARGIN - GRID_CONFIG.RIGHT_MARGIN) / GRID_CONFIG.NODE_WIDTH),
  getSlotX: (slot: number) => GRID_CONFIG.LEFT_MARGIN + (slot * GRID_CONFIG.NODE_WIDTH) + (GRID_CONFIG.NODE_WIDTH / 2)
};

// Utility functions
const generateId = () => `person_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Collapsed Node Indicator Component
interface CollapsedIndicatorProps {
  person: InteractivePerson;
  hiddenCount: number;
  onExpand: (personId: string) => void;
  isMobile: boolean;
}

const CollapsedIndicator: React.FC<CollapsedIndicatorProps> = ({ person, hiddenCount, onExpand, isMobile }) => {
  return (
    <div
      className="absolute cursor-pointer group z-30"
      style={{
        left: person.position.x,
        top: person.position.y,
        transform: 'translate(-50%, -50%)',
        width: isMobile ? '70px' : '90px',
        height: isMobile ? '90px' : '110px',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onExpand(person.id);
      }}
      title={`${person.firstName} ${person.lastName || ''} (collapsed) - Click to expand`}
    >
      <div
        className="w-full h-full border-2 border-dashed border-violet/40 rounded-lg bg-violet/5 hover:bg-violet/10 hover:border-violet/60 transition-all duration-200 flex flex-col items-center justify-center"
        style={{
          width: isMobile ? '70px' : '90px',
          height: isMobile ? '90px' : '110px',
        }}
      >
        {/* Collapsed icon and count */}
        <div className="flex flex-col items-center gap-1">
          <div className={`rounded-full ${
            person.gender?.toLowerCase() === 'male' ? 'bg-aqua' : 'bg-coral'
          } text-white font-medium flex items-center justify-center`}
          style={{
            width: isMobile ? '32px' : '40px',
            height: isMobile ? '32px' : '40px',
            fontSize: isMobile ? '16px' : '20px'
          }}>
            {person.firstName.charAt(0)}
          </div>
          <div className="text-center">
            <div className="text-xs font-medium text-violet">
              👤 +{hiddenCount - 1}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Click to expand
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Grid Add Button Component - Grey + signs for empty slots
const GridAddButton: React.FC<GridAddButtonProps> = ({ generation, gridSlot, onClick }) => {
  const isMobile = useIsMobile();
  const position = {
    x: GRID_CONFIG.getSlotX(gridSlot),
    y: GENERATION_Y_POSITIONS[generation.toString() as keyof typeof GENERATION_Y_POSITIONS]
  };

  return (
    <div
      className="absolute cursor-pointer group z-10"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
        width: isMobile ? '70px' : '90px',
        height: isMobile ? '90px' : '110px',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(generation, gridSlot);
      }}
    >
      <div
        className="w-full h-full border border-dashed border-gray-300 rounded-lg hover:bg-white/40 hover:border-gray-400 transition-all duration-200 flex items-center justify-center"
        style={{
          width: isMobile ? '70px' : '90px',
          height: isMobile ? '90px' : '110px',
        }}
      >
        <Plus className="w-6 h-6 text-gray-300 group-hover:text-gray-500 transition-colors" strokeWidth={1.5} />
      </div>
    </div>
  );
};

// Grid-based Person Component
const GridPerson: React.FC<GridPersonProps> = ({ 
  person, 
  onMove, 
  onSelect, 
  onDelete, 
  isSelected, 
  isConnecting,
  isConnectionSource,
  connectionSourceGeneration,
  relationshipHint,
  relationshipMessage,
  canMoveLeft,
  canMoveRight,
  onQuickMenuOpen,
  quickMenuOpen,
  onStartConnectionFrom,
  onToggleCollapse,
  hasDescendants,
  onOpenProfile
}) => {
  const isMobile = useIsMobile();
  const [isHovering, setIsHovering] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMobile) hapticFeedback.tap();
    onSelect(person.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMobile) hapticFeedback.delete();
    onDelete(person.id);
  };

  const handleMoveLeft = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMobile) hapticFeedback.tap();
    onMove(person.id, 'left');
  };

  const handleMoveRight = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMobile) hapticFeedback.tap();
    onMove(person.id, 'right');
  };

  const handleConnect = () => {
    // Close the quick menu
    onQuickMenuOpen(person.id, false);
    // Start connection mode with this person as the source
    onStartConnectionFrom(person.id);
  };

  const handleProfile = () => {
    onQuickMenuOpen(person.id, false);
    onOpenProfile(person.id);
  };

  const handleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMobile) hapticFeedback.select();
    onToggleCollapse(person.id);
  };

  return (
    <div
      className={`absolute cursor-pointer transition-all duration-200 group ${
        isSelected && !isConnecting ? 'ring-4 ring-violet ring-opacity-75 z-30' : 'z-20'
      } ${
        isConnectionSource ? 'ring-4 ring-aqua animate-pulse z-40' : ''
      } ${
        isConnecting && relationshipHint && relationshipHint !== 'invalid' && relationshipHint !== 'already-connected' 
          ? 'ring-2 ring-coral hover:ring-4' 
          : ''
      }`}
      style={{ 
        left: person.position.x, 
        top: person.position.y,
        transform: 'translate(-50%, -50%)',
        width: isMobile ? '70px' : '90px',
        height: isMobile ? '90px' : '110px',
      }}
      onClick={handleClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <Card className={`w-full h-full relative hover:shadow-xl transition-all duration-200 memory-card ${
        person.gender?.toLowerCase() === 'male' 
          ? person.status === 'deceased' 
            ? 'border-2 border-gray-400 bg-gray-50' 
            : 'border-2 border-aqua bg-aqua/5' 
          : person.status === 'deceased'
            ? 'border-2 border-gray-400 bg-gray-50'
            : 'border-2 border-coral bg-coral/5'
      } ${person.isRoot ? 'ring-2 ring-violet bg-violet/10 shadow-lg' : ''}`}
      style={{
        width: isMobile ? '70px' : '90px',
        height: isMobile ? '90px' : '110px',
        padding: isMobile ? '6px' : '8px'
      }}>
        
        {/* Root icon for user */}
        {person.isRoot && (
          <div className="absolute top-1 right-1 bg-violet rounded-full p-1" 
               style={{
                 width: isMobile ? '16px' : '18px',
                 height: isMobile ? '16px' : '18px'
               }}>
            <Crown className="text-white" 
                   style={{
                     width: isMobile ? '8px' : '10px',
                     height: isMobile ? '8px' : '10px'
                   }} />
          </div>
        )}
        
        {/* Status icon for deceased */}
        {person.status === 'deceased' && (
          <div className="absolute bottom-1 left-1"
               style={{
                 fontSize: isMobile ? '14px' : '16px',
                 lineHeight: 1
               }}
               title="Deceased">
            🌸
          </div>
        )}
        
        {/* Delete button for non-root users - Enhanced touch targets on mobile */}
        {!person.isRoot && (
          <button
            onClick={handleDelete}
            className={`absolute ${
              isMobile 
                ? '-top-1.5 -right-1.5 w-3.5 h-3.5 opacity-100' // Mobile: 40% smaller (14x14px) to prevent overpowering the node
                : '-top-1 -right-1 w-5 h-5 opacity-0 group-hover:opacity-100' // Desktop: Hover to show
            } bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 active:scale-95 transition-all z-10`}
            style={{ minWidth: isMobile ? '14px' : undefined, minHeight: isMobile ? '14px' : undefined }}
          >
            <Trash2 className={isMobile ? 'w-1.5 h-1.5' : 'w-3 h-3'} />
          </button>
        )}
        
        {/* Collapse button if person has descendants - Enhanced touch targets on mobile */}
        {hasDescendants && (
          <button
            onClick={handleCollapse}
            className={`absolute ${
              isMobile 
                ? '-top-1.5 -left-1.5 opacity-100' // Mobile: 40% smaller (26x26px) to prevent overpowering the node
                : '-top-1 -left-1 w-5 h-5 opacity-0 group-hover:opacity-100' // Desktop: Hover to show
            } bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 active:scale-95 transition-all z-10`}
            style={{ 
              width: isMobile ? '26px' : undefined, 
              height: isMobile ? '26px' : undefined,
              minWidth: isMobile ? '26px' : undefined, 
              minHeight: isMobile ? '26px' : undefined 
            }}
            title="Collapse branch"
          >
            <ChevronLeft className={isMobile ? 'w-3 h-3' : 'w-3 h-3'} style={{ transform: 'rotate(-90deg)' }} />
          </button>
        )}
        
        <div className="flex flex-col items-center h-full justify-start pt-1">
          {/* Profile picture centered at top */}
          <div className="relative mb-2">
            {person.profilePicture ? (
              <ImageWithFallback
                src={person.profilePicture}
                alt={person.firstName}
                className={`rounded-full object-cover shadow-sm ${
                  // ✅ GENDER DISTINCTION FIX: Bold colored border when photo exists
                  person.status === 'deceased'
                    ? 'border-[3px] border-gray-400'
                    : person.gender?.toLowerCase() === 'male'
                      ? 'border-[3px] border-blue-400'
                      : 'border-[3px] border-pink-400'
                }`}
                style={{
                  width: isMobile ? '40px' : '50px',
                  height: isMobile ? '40px' : '50px'
                }}
              />
            ) : (
              <div className={`rounded-full border-2 border-white shadow-sm flex items-center justify-center font-medium text-white ${
                person.gender?.toLowerCase() === 'male' 
                  ? person.status === 'deceased' ? 'bg-gray-400' : 'bg-blue-400'
                  : person.status === 'deceased' ? 'bg-gray-400' : 'bg-pink-400'
              }`}
              style={{
                width: isMobile ? '40px' : '50px',
                height: isMobile ? '40px' : '50px'
              }}>
                <span style={{fontSize: isMobile ? '14px' : '16px'}}>
                  {person.firstName.charAt(0)}
                </span>
              </div>
            )}
            
            {/* Alive indicator (small green dot) */}
            {person.status === 'alive' && (
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            )}
          </div>
          
          {/* Name labels with proper sizing */}
          <div className="flex-1 flex flex-col justify-center items-center text-center">
            <span className="font-medium leading-tight truncate w-full text-gray-900"
                  style={{
                    fontSize: isMobile ? '11px' : '12px',
                    maxWidth: isMobile ? '8ch' : '10ch'
                  }}>
              {person.firstName}
            </span>
            {person.lastName && (
              <span className="text-gray-600 truncate w-full leading-tight"
                    style={{
                      fontSize: isMobile ? '10px' : '11px',
                      maxWidth: isMobile ? '8ch' : '10ch'
                    }}>
                {person.lastName}
              </span>
            )}
            
            {/* Root user badge */}
            {person.isRoot && (
              <Badge variant="secondary" className="mt-1 px-1 py-0 bg-yellow-100 text-yellow-800 border-yellow-300"
                     style={{fontSize: '10px'}}>
                You
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Connection Source Badge */}
      {isConnectionSource && (
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none whitespace-nowrap">
          <Badge className="bg-blue-500 text-white border-2 border-blue-600 shadow-lg">
            <span className="mr-1">📍</span>
            Connecting from...
          </Badge>
        </div>
      )}

      {/* Relationship Hint - Show when connection mode is active and hovering */}
      {isConnecting && !isConnectionSource && relationshipHint && (isHovering || isMobile) && (
        <RelationshipHint 
          type={relationshipHint} 
          message={relationshipMessage}
          isMobile={isMobile}
        />
      )}

      {/* Quick Action Menu */}
      {!isConnecting && (
        <QuickActionMenu
          isOpen={quickMenuOpen}
          onConnect={handleConnect}
          onProfile={handleProfile}
          personName={`${person.firstName} ${person.lastName || ''}`.trim()}
          isMobile={isMobile}
          generation={person.generation}
        />
      )}

      {/* Movement Controls - Show when selected - Enhanced touch targets on mobile */}
      {isSelected && !isConnecting && (
        <div className={`absolute ${isMobile ? '-bottom-14' : '-bottom-12'} left-1/2 transform -translate-x-1/2 flex ${isMobile ? 'gap-2' : 'gap-1'} z-40`}>
          <Button
            size={isMobile ? "default" : "sm"}
            variant="outline"
            className={`${
              isMobile 
                ? 'h-11 w-11 active:scale-95' // Mobile: 44x44px minimum touch target with press animation
                : 'h-8 w-8'
            } p-0 bg-white border-2 border-blue-400 hover:bg-blue-50 transition-all`}
            style={{ minWidth: isMobile ? '44px' : undefined, minHeight: isMobile ? '44px' : undefined }}
            onClick={handleMoveLeft}
            disabled={!canMoveLeft}
            title="Move left"
          >
            <ChevronLeft className={isMobile ? 'h-5 w-5' : 'h-4 w-4'} />
          </Button>
          <Button
            size={isMobile ? "default" : "sm"}
            variant="outline"
            className={`${
              isMobile 
                ? 'h-11 w-11 active:scale-95' // Mobile: 44x44px minimum touch target with press animation
                : 'h-8 w-8'
            } p-0 bg-white border-2 border-blue-400 hover:bg-blue-50 transition-all`}
            style={{ minWidth: isMobile ? '44px' : undefined, minHeight: isMobile ? '44px' : undefined }}
            onClick={handleMoveRight}
            disabled={!canMoveRight}
            title="Move right"
          >
            <ChevronRight className={isMobile ? 'h-5 w-5' : 'h-4 w-4'} />
          </Button>
        </div>
      )}
    </div>
  );
};

// Generation Zone Component (updated for increased height + mobile zoom on tap)
interface GenerationZoneClickableProps extends Omit<GenerationZoneProps, 'children'> {
  onZoomToGeneration?: (generation: number) => void;
  isMobile?: boolean;
}

const GenerationZone: React.FC<GenerationZoneClickableProps> = ({ 
  generation, 
  title, 
  maxPeople, 
  currentCount, 
  color, 
  yPosition,
  isConnectionMode = false,
  connectionSourceGeneration = null,
  onZoomToGeneration,
  isMobile = false
}) => {
  const isAtCapacity = currentCount >= maxPeople;
  const isNearCapacity = currentCount >= maxPeople * 0.8;

  const handleClick = () => {
    if (isMobile && onZoomToGeneration) {
      onZoomToGeneration(generation);
    }
  };
  
  // Highlight bands when in connection mode to show where connections can be made
  const isHighlighted = isConnectionMode && connectionSourceGeneration !== null;
  const isSourceBand = isConnectionMode && connectionSourceGeneration === generation;
  
  // Apply different highlight styles based on connection context
  let highlightClass = '';
  if (isHighlighted) {
    if (isSourceBand) {
      highlightClass = 'ring-2 ring-aqua ring-opacity-60'; // Source generation highlighted in aqua
    } else {
      highlightClass = 'ring-2 ring-coral ring-opacity-40'; // Target generations highlighted in coral
    }
  }

  return (
    <div
      className={`absolute w-full border-2 border-dashed transition-all duration-200 ${color} ${highlightClass} ${
        isMobile ? 'cursor-pointer active:scale-[0.99] active:opacity-80' : ''
      }`}
      style={{ 
        top: yPosition - 90, // Center the 180px tall zone around the generation Y position
        height: '180px', // Increased height for better connector line routing
        zIndex: 5
      }}
      onClick={handleClick}
    >
      <div className="absolute top-2 left-2 flex items-center gap-2">
        <span className="text-sm">{title}</span>
        <Badge variant={isAtCapacity ? 'destructive' : isNearCapacity ? 'secondary' : 'default'}>
          {currentCount}/{maxPeople}
        </Badge>
      </div>
      
      {/* Grid slot indicators */}
      <div className="absolute bottom-1 left-2 text-xs text-gray-400">
        Slots: {GRID_CONFIG.getSlotCount()}
      </div>
      
      {/* Connection mode indicator */}
      {isHighlighted && !isSourceBand && (
        <div className="absolute top-2 right-2">
          <Badge className="bg-coral text-white text-xs">
            {generation > (connectionSourceGeneration || 0) ? '👶 Child' : generation < (connectionSourceGeneration || 0) ? '👨 Parent' : '💑 Spouse'}
          </Badge>
        </div>
      )}
    </div>
  );
};

// Family Tree Canvas Component
const FamilyTreeCanvas: React.FC<{
  familyTree: FamilyTree;
  selectedPersonId: string | null;
  isConnecting: boolean;
  connectionFrom: string | null;
  onPersonMove: (id: string, direction: 'left' | 'right') => void;
  onPersonSelect: (id: string) => void;
  onPersonDelete: (id: string) => void;
  onGridAddClick: (generation: -2 | -1 | 0 | 1 | 2, gridSlot: number) => void;
  quickMenuPersonId: string | null;
  onQuickMenuOpen: (personId: string, isOpen: boolean) => void;
  onStartConnectionFrom: (personId: string) => void;
  collapsedNodes: Record<string, { hidden: string[]; timestamp: number }>;
  onToggleCollapse: (personId: string) => void;
  onGetDescendants: (personId: string) => InteractivePerson[];
  onOpenProfile: (personId: string) => void;
  onZoomToGeneration?: (generation: number) => void;
  mobileZoomLevel?: number;
  onMobileZoomChange?: (zoom: number) => void;
}> = ({
  familyTree,
  selectedPersonId,
  isConnecting,
  connectionFrom,
  onPersonMove,
  onPersonSelect,
  onPersonDelete,
  onGridAddClick,
  quickMenuPersonId,
  onQuickMenuOpen,
  onStartConnectionFrom,
  collapsedNodes,
  onToggleCollapse,
  onOpenProfile,
  onGetDescendants,
  onZoomToGeneration,
  mobileZoomLevel = 1,
  onMobileZoomChange
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Pinch-to-zoom state (use prop if available, otherwise local state)
  const zoomLevel = mobileZoomLevel;
  const setZoomLevel = onMobileZoomChange || (() => {});
  const [isPinching, setIsPinching] = useState(false);
  const touchStartDistance = useRef<number>(0);
  const touchStartZoom = useRef<number>(1);

  // Calculate distance between two touch points
  const getTouchDistance = (touch1: Touch, touch2: Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Handle touch start for pinch zoom
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      setIsPinching(true);
      touchStartDistance.current = getTouchDistance(e.touches[0], e.touches[1]);
      touchStartZoom.current = zoomLevel;
      e.preventDefault();
    }
  }, [zoomLevel]);

  // Handle touch move for pinch zoom
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2 && isPinching) {
      const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
      const scale = currentDistance / touchStartDistance.current;
      const newZoom = Math.max(0.5, Math.min(3, touchStartZoom.current * scale));
      setZoomLevel(newZoom);
      e.preventDefault();
    }
  }, [isPinching]);

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    setIsPinching(false);
  }, []);

  // Attach touch listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isMobile) return;

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, isMobile]);

  // Build set of all hidden person IDs from collapsed nodes
  const hiddenPersonIds = new Set<string>();
  Object.values(collapsedNodes).forEach(node => {
    node.hidden.forEach(id => hiddenPersonIds.add(id));
  });

  // Filter visible people (not hidden by collapse)
  const visiblePeople = familyTree.people.filter(p => !hiddenPersonIds.has(p.id));

  // Helper to get relationship hint for a target person based on connection source
  const getRelationshipHint = (targetPerson: InteractivePerson, sourcePerson: InteractivePerson | null): {
    type: 'spouse' | 'child' | 'parent' | 'invalid' | 'already-connected';
    message?: string;
  } => {
    if (!sourcePerson) {
      return { type: 'invalid', message: 'No source' };
    }

    if (targetPerson.id === sourcePerson.id) {
      return { type: 'invalid', message: 'Cannot connect to self' };
    }

    // Check if already connected
    const existingRelationship = familyTree.relationships.find(rel =>
      (rel.from === sourcePerson.id && rel.to === targetPerson.id) ||
      (rel.from === targetPerson.id && rel.to === sourcePerson.id)
    );

    if (existingRelationship) {
      return { 
        type: 'already-connected', 
        message: existingRelationship.type === 'spouse' ? 'Spouse' : 'Parent/Child'
      };
    }

    // Determine relationship based on generation
    if (sourcePerson.generation === targetPerson.generation) {
      return { type: 'spouse', message: 'Make Spouse' };
    } else if (sourcePerson.generation < targetPerson.generation) {
      return { type: 'child', message: 'Add as Child' };
    } else {
      return { type: 'parent', message: 'Add as Parent' };
    }
  };

  // Helper function to check if a person can move in a direction (now supports swapping)
  const getMovementAbility = (person: InteractivePerson) => {
    const currentSlot = person.gridSlot || 0;
    const maxSlots = GRID_CONFIG.getSlotCount() - 1;
    
    // Can move left if not at the leftmost boundary (swapping allowed if occupied)
    const canMoveLeft = currentSlot > 0;
    
    // Can move right if not at the rightmost boundary (swapping allowed if occupied)
    const canMoveRight = currentSlot < maxSlots;
    
    return { canMoveLeft, canMoveRight };
  };

  // Calculate empty slots for each generation (for grid add buttons)
  const getEmptySlots = (generation: number) => {
    const sameGenPeople = familyTree.people.filter(p => p.generation === generation);
    const occupiedSlots = new Set(sameGenPeople.map(p => p.gridSlot || 0));
    const maxSlots = GRID_CONFIG.getSlotCount();
    
    // Find spouse pairs to identify protected slots
    const spouseRelationships = familyTree.relationships.filter(rel => rel.type === 'spouse');
    const protectedSlots = new Set<number>();
    
    spouseRelationships.forEach(rel => {
      const person1 = sameGenPeople.find(p => p.id === rel.from);
      const person2 = sameGenPeople.find(p => p.id === rel.to);
      
      if (person1 && person2 && person1.generation === generation) {
        const slot1 = person1.gridSlot || 0;
        const slot2 = person2.gridSlot || 0;
        const leftSlot = Math.min(slot1, slot2);
        const rightSlot = Math.max(slot1, slot2);
        
        // Protect slots between spouse pairs
        for (let slot = leftSlot + 1; slot < rightSlot; slot++) {
          protectedSlots.add(slot);
        }
      }
    });
    
    // Return all empty slots that aren't protected
    const emptySlots: number[] = [];
    for (let slot = 0; slot < maxSlots; slot++) {
      if (!occupiedSlots.has(slot) && !protectedSlots.has(slot)) {
        emptySlots.push(slot);
      }
    }
    
    return emptySlots;
  };

  return (
    <div
      ref={canvasRef}
      className="relative bg-white transition-transform duration-200"
      style={{ 
        width: '18000px', 
        minWidth: '18000px', 
        height: '900px', // Exact height for 5 generation bands (5 × 180px)
        transform: `scale(${zoomLevel})`,
        transformOrigin: 'top left'
      }}
      onClick={() => {
        // Close quick menu when clicking on canvas background
        if (quickMenuPersonId) {
          onQuickMenuOpen(quickMenuPersonId, false);
        }
      }}
    >
      {/* Connection Mode Banner */}
      {isConnecting && connectionFrom && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
          <div className="bg-aqua text-white px-6 py-3 rounded-lg shadow-xl border-2 border-aqua flex items-center gap-3">
            <span className="text-lg">🔗</span>
            <div className="text-center">
              <div className="font-semibold">
                Connecting from: {familyTree.people.find(p => p.id === connectionFrom)?.firstName}
              </div>
              <div className="text-sm opacity-90">
                Click another person to create relationship
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generation Zones */}
      {['-2', '-1', '0', '1', '2'].map((gen) => {
        const config = GENERATION_LIMITS[gen as keyof typeof GENERATION_LIMITS];
        const sourcePerson = connectionFrom ? familyTree.people.find(p => p.id === connectionFrom) : null;
        // 🔧 FIX: Use parseInt(gen) as the key to access generationLimits (which uses numeric keys)
        const genNum = parseInt(gen);
        const generationLimit = familyTree.generationLimits[genNum] || { current: 0, max: 0 };
        return (
          <GenerationZone
            key={gen}
            generation={genNum}
            title={config.title}
            maxPeople={config.max}
            currentCount={generationLimit.current}
            color={config.color}
            yPosition={GENERATION_Y_POSITIONS[gen as keyof typeof GENERATION_Y_POSITIONS]}
            isConnectionMode={isConnecting}
            connectionSourceGeneration={sourcePerson?.generation || null}
            onZoomToGeneration={onZoomToGeneration}
            isMobile={isMobile}
          />
        );
      })}

      {/* SVG for relationship lines - Updated for new spacing */}
      <svg 
        className="absolute pointer-events-none" 
        style={{ 
          zIndex: 15,
          left: 0,
          top: 0,
          width: '18000px',
          height: '900px'
        }}
        width="18000"
        height="900"
        viewBox="0 0 18000 900"
      >
        <defs>
          {/* Gradient for spouse lines - MemoryBox colors */}
          <linearGradient id="spouseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FF6F61" />
            <stop offset="50%" stopColor="#6A0572" />
            <stop offset="100%" stopColor="#17BEBB" />
          </linearGradient>
        </defs>
        

        
        {familyTree.relationships
          .filter(rel => rel.type !== 'sibling') // 🔧 FIX: No visual connector lines between siblings
          .map(relationship => {
          const fromPerson = familyTree.people.find(p => p.id === relationship.from);
          const toPerson = familyTree.people.find(p => p.id === relationship.to);
          
          console.log('🎨 Rendering relationship:', { 
            relationshipId: relationship.id, 
            type: relationship.type, 
            fromPerson: fromPerson?.firstName, 
            toPerson: toPerson?.firstName 
          });
          
          if (!fromPerson || !toPerson) {
            console.log('❌ Missing person data for relationship:', relationship.id);
            return null;
          }

          // Check if either person in the relationship is hidden (collapsed)
          const isFromHidden = hiddenPersonIds.has(fromPerson.id);
          const isToHidden = hiddenPersonIds.has(toPerson.id);
          const isCollapsed = isFromHidden || isToHidden;

          // For spouse relationships, create beautiful edge-to-edge connection with heart
          if (relationship.type === 'spouse') {
            // Don't render if both are hidden
            if (isFromHidden && isToHidden) return null;
            
            console.log('💑 Rendering spouse relationship between:', fromPerson.firstName, 'and', toPerson.firstName);
            // Determine left and right person based on x position
            const leftPerson = fromPerson.position.x < toPerson.position.x ? fromPerson : toPerson;
            const rightPerson = fromPerson.position.x < toPerson.position.x ? toPerson : fromPerson;
            
            // Node dimensions (person positions are at center of nodes)
            const nodeWidth = isMobile ? 70 : 90; // Full node width
            const nodeHeight = isMobile ? 90 : 110; // Full node height
            
            // Calculate exact connection points according to specifications:
            // Start point = midpoint of right border of the left spouse node
            // End point = midpoint of left border of the right spouse node
            // Both points share the same y-coordinate (horizontal line)
            
            const startX = leftPerson.position.x + (nodeWidth / 2); // Right edge of left node
            const endX = rightPerson.position.x - (nodeWidth / 2); // Left edge of right node
            const sharedY = leftPerson.position.y; // Same Y-coordinate (midpoint height of nodes)
            
            // Midpoint for heart icon
            const midX = (startX + endX) / 2;
            
            console.log('📏 Spouse connector coordinates:', {
              leftPerson: leftPerson.firstName,
              rightPerson: rightPerson.firstName,
              startX,
              endX,
              sharedY,
              midX,
              nodeWidth,
              isMobile
            });
            

            
            // Only render if the spouses are not too close together
            const distance = Math.abs(endX - startX);
            console.log('📏 Distance between spouses:', distance);
            if (distance < 10) {
              console.log('⚠️ Spouses too close together, skipping line render');
              return null;
            }
            
            console.log('✅ Distance OK, proceeding with render');
            
            return (
              <g key={relationship.id}>
                {/* Beautiful spouse connection line */}
                <line
                  x1={startX}
                  y1={sharedY}
                  x2={endX}
                  y2={sharedY}
                  stroke={isCollapsed ? "#9ca3af" : "url(#spouseGradient)"}
                  strokeWidth={isMobile ? "3" : "4"}
                  opacity={isCollapsed ? "0.3" : "0.9"}
                  strokeDasharray={isCollapsed ? "5,5" : "none"}
                />
                
                {/* Heart symbol at midpoint */}
                <text
                  x={midX}
                  y={sharedY}
                  fill="#ec4899"
                  fontSize={isMobile ? "16" : "20"}
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  ❤️
                </text>
                
                {/* Spouse connection line - straight horizontal line */}
                <line
                  x1={startX}
                  y1={sharedY}
                  x2={endX}
                  y2={sharedY}
                  stroke={isCollapsed ? "#9ca3af" : "#ef4444"}
                  strokeWidth="6"
                  strokeLinecap="round"
                  opacity={isCollapsed ? "0.3" : "0.8"}
                  strokeDasharray={isCollapsed ? "5,5" : "none"}
                />
                
                {/* Heart icon at midpoint */}
                <g transform={`translate(${midX}, ${sharedY})`}>
                  {/* Heart background circle */}
                  <circle
                    cx="0"
                    cy="0"
                    r="12"
                    fill="white"
                    stroke="url(#spouseGradient)"
                    strokeWidth="2"
                  />
                  {/* Heart shape */}
                  <path
                    d="M0,-3 C-3,-6 -8,-6 -8,-1 C-8,3 0,8 0,8 C0,8 8,3 8,-1 C8,-6 3,-6 0,-3 Z"
                    fill="#ef4444"
                    transform="scale(0.7)"
                  />
                </g>
              </g>
            );
          }

          // For parent-child relationships, create proper routing with the increased vertical space
          const parentY = Math.min(fromPerson.position.y, toPerson.position.y);
          const childY = Math.max(fromPerson.position.y, toPerson.position.y);
          const midY = parentY + (childY - parentY) / 2;

          // Gray out and dash if relationship involves collapsed node
          const lineColor = isCollapsed ? "#9ca3af" : "#3b82f6";
          const lineOpacity = isCollapsed ? "0.3" : "0.8";
          const lineDash = isCollapsed ? "5,5" : "none";

          return (
            <g key={relationship.id}>
              {/* Vertical line from parent */}
              <line
                x1={fromPerson.position.x}
                y1={fromPerson.position.y}
                x2={fromPerson.position.x}
                y2={midY}
                stroke={lineColor}
                strokeWidth="6"
                strokeLinecap="round"
                opacity={lineOpacity}
                strokeDasharray={lineDash}
              />
              {/* Horizontal line */}
              <line
                x1={fromPerson.position.x}
                y1={midY}
                x2={toPerson.position.x}
                y2={midY}
                stroke={lineColor}
                strokeWidth="6"
                strokeLinecap="round"
                opacity={lineOpacity}
                strokeDasharray={lineDash}
              />
              {/* Vertical line to child */}
              <line
                x1={toPerson.position.x}
                y1={midY}
                x2={toPerson.position.x}
                y2={toPerson.position.y}
                stroke={lineColor}
                strokeWidth="6"
                strokeLinecap="round"
                opacity={lineOpacity}
                strokeDasharray={lineDash}
              />
            </g>
          );
        })}
      </svg>

      {/* Grid Add Buttons - Grey + signs for empty slots */}
      {['-2', '-1', '0', '1', '2'].map((gen) => {
        const generation = parseInt(gen) as -2 | -1 | 0 | 1 | 2;
        const emptySlots = getEmptySlots(generation);
        
        return emptySlots.map(slot => (
          <GridAddButton
            key={`add-${gen}-${slot}`}
            generation={generation}
            gridSlot={slot}
            onClick={onGridAddClick}
          />
        ));
      })}

      {/* Collapsed Node Indicators */}
      {Object.entries(collapsedNodes).map(([personId, collapseData]) => {
        const person = familyTree.people.find(p => p.id === personId);
        if (!person) return null;
        
        return (
          <CollapsedIndicator
            key={`collapsed-${personId}`}
            person={person}
            hiddenCount={collapseData.hidden.length}
            onExpand={onToggleCollapse}
            isMobile={isMobile}
          />
        );
      })}

      {/* All Visible Family Member Nodes */}
      {visiblePeople.map(person => {
        const { canMoveLeft, canMoveRight } = getMovementAbility(person);
        const sourcePerson = connectionFrom ? familyTree.people.find(p => p.id === connectionFrom) : null;
        const relationshipHintData = isConnecting && sourcePerson ? getRelationshipHint(person, sourcePerson) : null;
        
        // Check if person has descendants (for collapse button visibility)
        const descendants = onGetDescendants(person.id);
        const hasDescendants = descendants.length > 0;
        
        return (
          <GridPerson
            key={person.id}
            person={person}
            onMove={onPersonMove}
            onSelect={onPersonSelect}
            onDelete={onPersonDelete}
            isSelected={selectedPersonId === person.id}
            isConnecting={isConnecting}
            isConnectionSource={isConnecting && connectionFrom === person.id}
            connectionSourceGeneration={sourcePerson?.generation || null}
            relationshipHint={relationshipHintData?.type || null}
            relationshipMessage={relationshipHintData?.message}
            canMoveLeft={canMoveLeft}
            canMoveRight={canMoveRight}
            onQuickMenuOpen={onQuickMenuOpen}
            quickMenuOpen={quickMenuPersonId === person.id}
            onStartConnectionFrom={onStartConnectionFrom}
            onToggleCollapse={onToggleCollapse}
            hasDescendants={hasDescendants}
            onOpenProfile={onOpenProfile}
          />
        );
      })}
    </div>
  );
};

// Main Application Component
interface FamilyTreeAppProps {
  onBack?: () => void;
}

const InteractiveFamilyTreeApp: React.FC<FamilyTreeAppProps> = ({ onBack }) => {
  const isMobile = useIsMobile();
  
  // Track when database load is complete to prevent duplicate root user creation
  const [isDatabaseLoaded, setIsDatabaseLoaded] = useState(false);
  
  // 🔧 DATABASE-FIRST FIX: Initialize with empty tree, will load from database in useEffect
  const [familyTree, setFamilyTree] = useState<FamilyTree>(() => {
    const currentUserId = localStorage.getItem('current_user_id');
    if (!currentUserId) {
      console.log('⚠️ FamilyTreeApp: No current user ID, starting with empty tree');
      return {
        people: [],
        relationships: [],
        rootUserId: '',
        generationLimits: {
          '-2': { current: 0, max: 4 },
          '-1': { current: 0, max: 20 },
          '0': { current: 0, max: 78 },
          '1': { current: 0, max: 42 },
          '2': { current: 0, max: 18 }
        }
      };
    }

    const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
    if (!userProfile) {
      console.log('⚠️ FamilyTreeApp: No user profile found');
      return {
        people: [],
        relationships: [],
        rootUserId: '',
        generationLimits: {
          '-2': { current: 0, max: 4 },
          '-1': { current: 0, max: 20 },
          '0': { current: 0, max: 78 },
          '1': { current: 0, max: 42 },
          '2': { current: 0, max: 18 }
        }
      };
    }

    const userData = JSON.parse(userProfile);
    if (!userData.family_id) {
      console.log('⚠️ FamilyTreeApp: No family ID found');
      return {
        people: [],
        relationships: [],
        rootUserId: '',
        generationLimits: {
          '-2': { current: 0, max: 4 },
          '-1': { current: 0, max: 20 },
          '0': { current: 0, max: 78 },
          '1': { current: 0, max: 42 },
          '2': { current: 0, max: 18 }
        }
      };
    }

    // 🔧 DATABASE-FIRST FIX: Load from localStorage as initial state only (will be updated from DB in useEffect)
    const treeData = localStorage.getItem(`familyTree_${userData.family_id}`);
    if (treeData) {
      try {
        const parsedTree = JSON.parse(treeData);
        // Determine format and log appropriately
        const peopleCount = Array.isArray(parsedTree) ? parsedTree.length : (parsedTree.people?.length || 0);
        const relationshipCount = Array.isArray(parsedTree) ? 0 : (parsedTree.relationships?.length || 0);
        console.log('✅ FamilyTreeApp: Loaded tree with', peopleCount, 'people and', relationshipCount, 'relationships from localStorage');
        
        // Find and log root user's gender for debugging
        const peopleArray = Array.isArray(parsedTree) ? parsedTree : parsedTree.people || [];
        const rootUser = peopleArray.find((p: any) => p.id === currentUserId || p.isRoot === true);
        if (rootUser) {
          console.log('   📊 Root user data validation:');
          console.log('      ✓ ID:', rootUser.id);
          console.log('      ✓ firstName:', rootUser.firstName, rootUser.firstName ? '✅' : '❌ MISSING!');
          console.log('      ✓ name:', rootUser.name);
          console.log('      ✓ gender:', rootUser.gender, rootUser.gender ? '✅' : '❌ MISSING!');
          console.log('      ✓ status:', rootUser.status, rootUser.status ? '✅' : '❌ MISSING!');
          console.log('      ✓ generation:', rootUser.generation, rootUser.generation !== undefined ? '✅' : '❌ MISSING!');
          console.log('      ✓ position:', rootUser.position, rootUser.position ? '✅' : '❌ MISSING!');
          console.log('      ✓ gridSlot:', rootUser.gridSlot, rootUser.gridSlot !== undefined ? '✅' : '❌ MISSING!');
          console.log('      ✓ isRoot:', rootUser.isRoot);
          
          // Validate critical fields
          const missingFields = [];
          if (!rootUser.firstName) missingFields.push('firstName');
          if (!rootUser.gender) missingFields.push('gender');
          if (!rootUser.status) missingFields.push('status');
          if (rootUser.generation === undefined) missingFields.push('generation');
          if (!rootUser.position) missingFields.push('position');
          
          if (missingFields.length > 0) {
            console.error('❌ CRITICAL: Root user is missing required fields:', missingFields);
            console.error('   This WILL cause FamilyTreeApp to crash or malfunction!');
            console.error('   Full root user data:', rootUser);
          } else {
            console.log('   ✅ All required fields present for root user');
          }
        } else {
          console.error('❌ CRITICAL: Root user not found in tree!');
          console.error('   currentUserId:', currentUserId);
          console.error('   People in tree:', peopleArray.length);
          console.error('   People IDs:', peopleArray.map((p: any) => p.id));
          console.error('   ⚠️ This will be auto-fixed in useEffect...');
        }
        
        // Check if tree data is in new format (object with people, relationships) or old format (array)
        if (Array.isArray(parsedTree)) {
          // Old format: just array of people, no relationships stored
          console.log('   📦 Tree in old format (array), relationships will be empty');
          
          // 🔧 Calculate current counts for each generation
          const counts = { '-2': 0, '-1': 0, '0': 0, '1': 0, '2': 0 };
          parsedTree.forEach((person: any) => {
            const gen = person.generation?.toString() || '0';
            if (counts[gen as keyof typeof counts] !== undefined) {
              counts[gen as keyof typeof counts]++;
            }
          });
          
          return {
            people: parsedTree,
            relationships: [],
            rootUserId: currentUserId,
            generationLimits: {
              '-2': { current: counts['-2'], max: 4 },
              '-1': { current: counts['-1'], max: 20 },
              '0': { current: counts['0'], max: 78 },
              '1': { current: counts['1'], max: 42 },
              '2': { current: counts['2'], max: 18 }
            }
          };
        } else {
          // New format: object with people and relationships arrays
          console.log('   📦 Tree in new format (object), loading', parsedTree.relationships?.length || 0, 'relationships');
          
          // 🔧 CRITICAL FIX: Normalize generationLimits to ALWAYS use string keys
          // JSON.parse may convert string keys to numbers, which breaks PersonPalette
          const defaultLimits = {
            '-2': { current: 0, max: 4 },
            '-1': { current: 0, max: 20 },
            '0': { current: 0, max: 78 },
            '1': { current: 0, max: 42 },
            '2': { current: 0, max: 18 }
          };
          
          let normalizedLimits = defaultLimits;
          if (parsedTree.generationLimits) {
            // Convert any numeric keys to string keys
            normalizedLimits = {
              '-2': parsedTree.generationLimits['-2'] || parsedTree.generationLimits[-2] || defaultLimits['-2'],
              '-1': parsedTree.generationLimits['-1'] || parsedTree.generationLimits[-1] || defaultLimits['-1'],
              '0': parsedTree.generationLimits['0'] || parsedTree.generationLimits[0] || defaultLimits['0'],
              '1': parsedTree.generationLimits['1'] || parsedTree.generationLimits[1] || defaultLimits['1'],
              '2': parsedTree.generationLimits['2'] || parsedTree.generationLimits[2] || defaultLimits['2']
            };
          }
          
          return {
            people: parsedTree.people || [],
            relationships: parsedTree.relationships || [],
            rootUserId: parsedTree.rootUserId || currentUserId,
            generationLimits: normalizedLimits
          };
        }
      } catch (e) {
        console.error('❌ FamilyTreeApp: Failed to parse tree data:', e);
      }
    }

    console.log('⚠️ FamilyTreeApp: No tree data found in localStorage - initializing empty tree');
    console.log('   This is NORMAL for brand new users who just completed onboarding');
    console.log('   Creating empty tree structure...');
    
    return {
      people: [],
      relationships: [],
      rootUserId: currentUserId || '',
      generationLimits: {
        '-2': { current: 0, max: 4 },
        '-1': { current: 0, max: 20 },
        '0': { current: 0, max: 78 },
        '1': { current: 0, max: 42 },
        '2': { current: 0, max: 18 }
      }
    };
  });

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionFrom, setConnectionFrom] = useState<string | null>(null);
  const [connectionTo, setConnectionTo] = useState<string | null>(null);
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showContextualAddDialog, setShowContextualAddDialog] = useState(false);
  
  // Undo/Redo History State
  const [history, setHistory] = useState<HistoryState>(createEmptyHistory());
  const [contextualAddGeneration, setContextualAddGeneration] = useState<-2 | -1 | 0 | 1 | 2>(0);
  const [quickMenuPersonId, setQuickMenuPersonId] = useState<string | null>(null);
  const [contextualAddGridSlot, setContextualAddGridSlot] = useState<number>(0);
  const [showWelcomeWizard, setShowWelcomeWizard] = useState(false);

  // Family Template Wizards state
  const [showInLawsWizard, setShowInLawsWizard] = useState(false);
  const [showMaternalWizard, setShowMaternalWizard] = useState(false);
  const [showPaternalWizard, setShowPaternalWizard] = useState(false);

  // Profile state
  const [selectedPersonForProfile, setSelectedPersonForProfile] = useState<InteractivePerson | null>(null);

  // Collapse state - tracks which people are collapsed along with their hidden descendants
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, {
    hidden: string[]; // IDs of all hidden people (person + spouse + descendants)
    timestamp: number;
  }>>(() => {
    // Load from localStorage
    const saved = localStorage.getItem('familyTree_collapsedNodes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse collapsed nodes from localStorage:', e);
      }
    }
    return {};
  });

  // Wizard completion tracking - MUST BE BEFORE helper functions that use it
  const [wizardCompletions, setWizardCompletions] = useState<{
    welcome: boolean;
    inLaws: boolean;
    maternal: boolean;
    paternal: boolean;
  }>(() => {
    // Load from localStorage
    const saved = localStorage.getItem('familyTree_wizardCompletions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse wizard completions from localStorage:', e);
      }
    }
    return {
      welcome: false,
      inLaws: false,
      maternal: false,
      paternal: false
    };
  });

  // 🔧 FIX: Calculate ACTUAL nuclear family completion based on tree structure
  // Don't trust wizardCompletions.welcome flag - always verify actual tree data
  const isNuclearFamilyActuallyComplete = useCallback(() => {
    // Count by generation to verify nuclear family structure exists
    const generationCounts: { [key: number]: number } = {};
    familyTree.people.forEach((person: any) => {
      const gen = person.generation || 0;
      generationCounts[gen] = (generationCounts[gen] || 0) + 1;
    });
    
    const gen0Count = generationCounts[0] || 0;
    const genPlus1Count = generationCounts[1] || 0;
    const genMinus1Count = generationCounts[-1] || 0;
    
    // Nuclear family criteria: At least 2 in Gen0 (user + spouse) AND (2+ children OR 2+ parents)
    const hasGen0 = gen0Count >= 2;
    const hasGen1OrGenMinus1 = genPlus1Count >= 2 || genMinus1Count >= 2;
    const isComplete = hasGen0 && hasGen1OrGenMinus1;
    
    console.log('📊 isNuclearFamilyActuallyComplete check:', {
      gen0Count,
      genPlus1Count,
      genMinus1Count,
      hasGen0,
      hasGen1OrGenMinus1,
      isComplete,
      wizardFlag: wizardCompletions.welcome,
      usingActualData: true
    });
    
    return isComplete;
  }, [familyTree.people, wizardCompletions.welcome]);

  // Helper functions to open wizards with wizard locking
  const openWelcomeWizard = useCallback(() => {
    // 🔧 FIX: Check ACTUAL completion, not just the flag
    if (isNuclearFamilyActuallyComplete()) {
      toast.info('✓ Nuclear family already complete! Use the + buttons on the canvas to add more family members.', {
        duration: 4000
      });
      return;
    }
    setShowWelcomeWizard(true);
  }, [isNuclearFamilyActuallyComplete]);

  const openInLawsWizard = useCallback(() => {
    if (wizardCompletions.inLaws) {
      toast.info('✓ In-Laws wizard already completed! Use the + buttons on the canvas to add more in-laws family members.', {
        duration: 4000
      });
      return;
    }
    setShowInLawsWizard(true);
  }, [wizardCompletions.inLaws]);

  const openMaternalWizard = useCallback(() => {
    if (wizardCompletions.maternal) {
      toast.info("✓ Maternal wizard already completed! Use the + buttons on the canvas to add more of your mother's family members.", {
        duration: 4000
      });
      return;
    }
    setShowMaternalWizard(true);
  }, [wizardCompletions.maternal]);

  const openPaternalWizard = useCallback(() => {
    if (wizardCompletions.paternal) {
      toast.info("✓ Paternal wizard already completed! Use the + buttons on the canvas to add more of your father's family members.", {
        duration: 4000
      });
      return;
    }
    setShowPaternalWizard(true);
  }, [wizardCompletions.paternal]);

  // 🔧 DATABASE-FIRST FIX: Load tree from database on mount and when page becomes visible
  // This ensures profile changes from ProfilePage are always reflected in the tree
  useEffect(() => {
    const loadTreeFromDatabase = async () => {
      const currentUserId = localStorage.getItem('current_user_id');
      if (!currentUserId) return;

      const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
      if (!userProfile) return;

      const userData = JSON.parse(userProfile);
      if (!userData.family_id) return;

      try {
        console.log('🔄 Loading tree from database to sync profile changes...');
        const { DatabaseService } = await import('../utils/supabase/persistent-database');
        
        // Load from database (which will update localStorage cache)
        const dbTree = await DatabaseService.getFamilyTree(userData.family_id);
        
        // 🔧 AUTO-FIX: If tree doesn't exist OR is empty, create root user
        const peopleArray = dbTree ? (Array.isArray(dbTree) ? dbTree : dbTree.people || []) : [];
        const needsAutoFix = !dbTree || peopleArray.length === 0;
        
        if (needsAutoFix) {
            console.log('🔧 AUTO-FIX: Tree is empty or missing, creating root user from user profile...');
            console.log('   dbTree exists:', !!dbTree);
            console.log('   peopleArray length:', peopleArray.length);
            
            try {
              const user = JSON.parse(userProfile);
              
              // Calculate root user position
              const centerSlot = 89; // Center of 177 total slots
              const gridX = 200 + (centerSlot * 100) + 50; // = 9150
              const gridY = 450; // Generation 0 Y position
              
              const rootUserNode = {
                id: currentUserId,
                name: user.name || `${user.firstName || user.first_name || ''} ${user.lastName || user.last_name || ''}`.trim(),
                firstName: user.firstName || user.first_name || '',
                middleName: user.middleName || user.middle_name || undefined,
                lastName: user.lastName || user.last_name || '',
                gender: (user.gender?.toLowerCase() === 'female' ? 'female' : 'male') as 'male' | 'female',
                status: 'alive' as 'alive' | 'deceased',
                generation: 0 as -2 | -1 | 0 | 1 | 2,
                isRoot: true,
                dateOfBirth: user.date_of_birth || user.dateOfBirth || undefined,
                email: user.email,
                phone: user.phone || undefined,
                photo: user.photo_url || user.photo || undefined,
                gridSlot: centerSlot,
                position: { x: gridX, y: gridY }
              };
              
              console.log('✅ Created root user node:', rootUserNode);
              
              // Create tree structure with root user
              const newTree = {
                people: [rootUserNode],
                relationships: [],
                rootUserId: currentUserId,
                generationLimits: {
                  '-2': { current: 0, max: 4 },
                  '-1': { current: 0, max: 20 },
                  '0': { current: 1, max: 78 },
                  '1': { current: 0, max: 42 },
                  '2': { current: 0, max: 18 }
                }
              };
              
              // Save to localStorage
              localStorage.setItem(`familyTree_${userData.family_id}`, JSON.stringify(newTree));
              console.log('💾 Saved root user to localStorage');
              
              // Save to database
              await DatabaseService.saveFamilyTree(userData.family_id, newTree);
              console.log('✅ Saved root user to database');
              
              // Update state
              setFamilyTree(newTree);
              setIsDatabaseLoaded(true);
              toast.success('Welcome! Your family tree has been initialized.');
              
              return; // Exit early - tree is now set up
            } catch (error) {
              console.error('❌ Failed to auto-create root user:', error);
              toast.error('Failed to initialize family tree. Please try refreshing the page.');
              setIsDatabaseLoaded(true); // Mark as loaded even on error to prevent infinite loops
              return;
            }
        }
        
        // If we reach here, dbTree exists and has people
        if (dbTree) {
          // Parse tree format again for the normal flow
          const peopleArray = Array.isArray(dbTree) ? dbTree : dbTree.people || [];
          const relationshipsArray = Array.isArray(dbTree) ? [] : dbTree.relationships || [];
          
          // Only update state if we got valid data
          if (peopleArray.length > 0) {
            // Calculate generation limits
            const counts = { '-2': 0, '-1': 0, '0': 0, '1': 0, '2': 0 };
            peopleArray.forEach((person: any) => {
              const gen = person.generation?.toString() || '0';
              if (counts[gen as keyof typeof counts] !== undefined) {
                counts[gen as keyof typeof counts]++;
              }
            });
            
            // Normalize generationLimits to use string keys
            const defaultLimits = {
              '-2': { current: counts['-2'], max: 4 },
              '-1': { current: counts['-1'], max: 20 },
              '0': { current: counts['0'], max: 78 },
              '1': { current: counts['1'], max: 42 },
              '2': { current: counts['2'], max: 18 }
            };
            
            const loadedLimits = dbTree.generationLimits || defaultLimits;
            const normalizedLimits = {
              '-2': loadedLimits['-2'] || loadedLimits[-2] || defaultLimits['-2'],
              '-1': loadedLimits['-1'] || loadedLimits[-1] || defaultLimits['-1'],
              '0': loadedLimits['0'] || loadedLimits[0] || defaultLimits['0'],
              '1': loadedLimits['1'] || loadedLimits[1] || defaultLimits['1'],
              '2': loadedLimits['2'] || loadedLimits[2] || defaultLimits['2']
            };
            
            setFamilyTree({
              people: peopleArray,
              relationships: relationshipsArray,
              rootUserId: dbTree.rootUserId || currentUserId,
              generationLimits: normalizedLimits
            });
            
            console.log('✅ Tree loaded from database:', peopleArray.length, 'people,', relationshipsArray.length, 'relationships');
            setIsDatabaseLoaded(true);
          }
        }
      } catch (error) {
        // ❌ DATABASE-FIRST: If database fails, show error to user
        console.error('❌ Failed to load tree from database:', error);
        toast.error('Failed to load family tree. Please refresh the page.');
        setIsDatabaseLoaded(true); // Mark as loaded even on error to prevent infinite loops
        // Keep existing state as fallback to prevent blank screen
      }
    };

    // Load on mount
    loadTreeFromDatabase();

    // Also reload when page becomes visible (user returns from profile page)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('📱 Page visible again - reloading tree from database...');
        loadTreeFromDatabase();
      }
    };

    // 🔧 BIDIRECTIONAL SYNC FIX: Listen for profile page updates
    const handleProfileUpdated = (event: any) => {
      console.log('📡 FamilyTreeApp: Received userProfileUpdated event from ProfilePage');
      console.log('   Event detail:', event.detail);
      console.log('🔄 Reloading tree to sync profile changes...');
      loadTreeFromDatabase();
    };

    const handleTreeUpdated = (event: any) => {
      console.log('📡 FamilyTreeApp: Received familyTreeUpdated event');
      console.log('   Event detail:', event.detail);
      if (event.detail?.source === 'profile-page') {
        console.log('🔄 Profile page updated tree, reloading...');
        loadTreeFromDatabase();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('userProfileUpdated', handleProfileUpdated);
    window.addEventListener('familyTreeUpdated', handleTreeUpdated);
    
    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('userProfileUpdated', handleProfileUpdated);
      window.removeEventListener('familyTreeUpdated', handleTreeUpdated);
    };
  }, []); // Run only on mount and visibility changes

  // Save wizard completions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('familyTree_wizardCompletions', JSON.stringify(wizardCompletions));
  }, [wizardCompletions]);

  // Save collapsed nodes to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('familyTree_collapsedNodes', JSON.stringify(collapsedNodes));
  }, [collapsedNodes]);

  // 🔥 CRITICAL FIX: Persist family tree to localStorage whenever it changes (including relationships)
  useEffect(() => {
    // Get current user ID to determine storage key
    const currentUserId = localStorage.getItem('current_user_id');
    if (!currentUserId) return;

    const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
    if (!userProfile) return;

    const userData = JSON.parse(userProfile);
    if (!userData.family_id) return;

    // Only persist if tree has people (avoid persisting completely empty state)
    if (familyTree.people.length === 0) return;
    
    // 🔧 DATABASE-FIRST FIX: ALWAYS save the tree, even if it only has root user
    // This ensures root user is persisted to database on initial creation
    // Previously we skipped saving root-only trees, which caused database to stay empty forever
    
    // Check if this is a deletion scenario (had more people before, now back to root only)
    const existingSavedTree = localStorage.getItem(`familyTree_${userData.family_id}`);
    const hadMorePeopleBefore = existingSavedTree ? (() => {
      try {
        const parsed = JSON.parse(existingSavedTree);
        const savedPeople = Array.isArray(parsed) ? parsed : parsed.people || [];
        return savedPeople.length > 1;
      } catch {
        return false;
      }
    })() : false;
    
    // Log what we're saving
    if (familyTree.people.length === 1 && familyTree.people[0].isRoot === true) {
      if (hadMorePeopleBefore) {
        console.log('🗑️ Saving deletion: Tree back to only root user (members were deleted)');
        console.log('   Previous saved tree had', JSON.parse(existingSavedTree!).people?.length || 0, 'people');
        console.log('   Now has 1 person - must save to persist deletions');
      } else {
        console.log('💾 Saving root user to database (initial state)');
        console.log('   Root user ID:', familyTree.people[0].id);
        console.log('   This ensures tree persists across page reloads');
      }
    }

    // Save in NEW FORMAT with relationships array
    const treeToSave = {
      people: familyTree.people,
      relationships: familyTree.relationships,
      rootUserId: familyTree.rootUserId,
      generationLimits: familyTree.generationLimits
    };

    localStorage.setItem(`familyTree_${userData.family_id}`, JSON.stringify(treeToSave));
    console.log('💾 Family tree persisted:', familyTree.people.length, 'people,', familyTree.relationships.length, 'relationships');
    
    // 🔧 DEBUG: Log DOB status for all members
    const membersWithDOB = familyTree.people.filter(p => p.dateOfBirth && p.dateOfBirth !== '').length;
    const membersWithoutDOB = familyTree.people.length - membersWithDOB;
    if (membersWithoutDOB > 0) {
      console.log(`📅 DOB Status: ${membersWithDOB} with DOB, ${membersWithoutDOB} without DOB (can add via profile editing)`);
    }

    // 🔧 CRITICAL FIX: Notify all components about family tree update
    // This ensures family member lists sync to Add Memory, Journeys, Journal, Time Capsules
    notifyFamilyTreeUpdate(userData.family_id, 'FamilyTreeApp-Auto-Save');
    
    // 🔧 CRITICAL FIX: Also dispatch legacy event for backward compatibility
    window.dispatchEvent(new CustomEvent('familyTreeUpdated', { 
      detail: { 
        familyId: userData.family_id, 
        memberCount: familyTree.people.length,
        timestamp: new Date().toISOString()
      } 
    }));
    console.log('📢 Dispatched familyTreeUpdated event');

    // 🔧 DATABASE-FIRST: Persist to database for cross-device sync
    import('../utils/supabase/persistent-database').then(({ DatabaseService }) => {
      DatabaseService.saveFamilyTree(userData.family_id, treeToSave)
        .then(() => {
          console.log('✅ Family tree saved to database successfully');
        })
        .catch((error) => {
          console.error('❌ Failed to save family tree to database:', error);
          // Don't block the app - localStorage is backup
        });
    }).catch((error) => {
      console.error('❌ Failed to load database module:', error);
    });
  }, [familyTree]);

  // ✅ AUTO-OPEN Welcome Wizard whenever tree only has root user
  // This ensures wizard shows every time until user adds at least one family member
  useEffect(() => {
    // Wait for initial render to complete
    const timer = setTimeout(() => {
      // 🔧 FIX: Check if tree only has root user (regardless of wizard completion status)
      // Welcome Wizard should show EVERY TIME user visits tree page until they add someone
      const hasOnlyRootUser = familyTree.people.length === 1 && 
                              familyTree.people[0]?.isRoot === true;

      // Auto-open if tree only has root user (new user needs guidance)
      if (hasOnlyRootUser) {
        console.log('🎉 User has only root user in tree - showing Welcome Wizard for guidance');
        setShowWelcomeWizard(true);
        
        // Show welcome toast (only if wizard wasn't previously completed to avoid spam)
        if (!wizardCompletions.welcome) {
          toast.success('👋 Welcome! Let\'s build your family tree together!', {
            duration: 3000
          });
        }
      } else {
        // Tree has family members beyond root user - hide wizard
        console.log('✅ Tree has', familyTree.people.length, 'members - Welcome Wizard not needed');
        setShowWelcomeWizard(false);
      }
    }, 500); // Small delay to ensure tree is loaded

    return () => clearTimeout(timer);
  }, [familyTree.people.length, wizardCompletions.welcome]); // Re-run when tree size changes

  // ✅ AUTO-CENTER on root user whenever user enters tree page
  // This ensures canvas is always centered on root user for both new and existing users
  useEffect(() => {
    // Wait for canvas container to be available in DOM
    const timer = setTimeout(() => {
      const scrollContainer = document.getElementById('canvas-scroll-container');
      
      // Only center if:
      // 1. Canvas container exists
      // 2. Tree has at least one person (root user)
      if (scrollContainer && familyTree.people.length > 0) {
        const rootUser = familyTree.people.find(person => person.isRoot);
        
        if (rootUser) {
          const containerWidth = scrollContainer.clientWidth;
          const containerHeight = scrollContainer.clientHeight;
          
          // Account for zoom level when calculating scroll position
          const currentZoom = isMobile ? mobileZoomLevel : desktopZoomLevel;
          const scaledX = rootUser.position.x * currentZoom;
          const scaledY = rootUser.position.y * currentZoom;
          
          // Account for bottom navigation height on mobile
          const bottomNavOffset = isMobile ? 40 : 0;
          
          const scrollLeft = scaledX - (containerWidth / 2);
          const scrollTop = scaledY - (containerHeight / 2) + bottomNavOffset;
          
          // Instant scroll (no animation) and no toast on page load
          scrollContainer.scrollTo({
            left: Math.max(0, scrollLeft),
            top: Math.max(0, scrollTop),
            behavior: 'auto' // Instant, not smooth
          });
          
          console.log('🎯 Auto-centered canvas on root user:', rootUser.firstName);
        }
      }
    }, 300); // Small delay to ensure canvas is rendered

    return () => clearTimeout(timer);
  }, []); // Empty dependency array = run once on mount only

  // Mobile-specific state
  const [showMobileTutorial, setShowMobileTutorial] = useState(() => {
    // Only show on mobile and if not seen before
    if (!isMobile) return false;
    const hasSeenTutorial = localStorage.getItem('familyTree_hasSeenMobileTutorial');
    return !hasSeenTutorial;
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [mobileZoomLevel, setMobileZoomLevel] = useState(1); // Lift zoom state for scroll calculations
  const [desktopZoomLevel, setDesktopZoomLevel] = useState(1); // Desktop zoom state
  const [showFamilyTemplateMenu, setShowFamilyTemplateMenu] = useState(false); // Control FamilyTemplateMenu from FAB
  const previousZoomLevel = useRef(1); // Track previous zoom level to detect changes

  // Center view on root user - MOVED UP to avoid initialization error
  const centerOnUser = useCallback((showToast = true) => {
    const scrollContainer = document.getElementById('canvas-scroll-container');
    if (!scrollContainer) {
      if (showToast) toast.error('Canvas not found. Please try again.');
      return;
    }

    let targetUser = familyTree.people.find(person => person.isRoot);
    if (!targetUser) {
      targetUser = familyTree.people.find(person => person.generation === 0);
    }
    if (!targetUser) {
      targetUser = familyTree.people[0];
    }
    
    if (!targetUser) {
      if (showToast) toast.error('No family members found. Add some people to your tree first!');
      return;
    }

    const containerWidth = scrollContainer.clientWidth;
    const containerHeight = scrollContainer.clientHeight;
    
    // Account for zoom level when calculating scroll position
    const currentZoom = isMobile ? mobileZoomLevel : desktopZoomLevel;
    const scaledX = targetUser.position.x * currentZoom;
    const scaledY = targetUser.position.y * currentZoom;
    
    // Account for bottom navigation height (approx 80px on mobile, 0 on desktop as it wraps properly)
    const bottomNavOffset = isMobile ? 40 : 0; // Half of bottom nav height for better centering
    
    const scrollLeft = scaledX - (containerWidth / 2);
    const scrollTop = scaledY - (containerHeight / 2) + bottomNavOffset;
    
    scrollContainer.scrollTo({
      left: Math.max(0, scrollLeft),
      top: Math.max(0, scrollTop),
      behavior: showToast ? 'smooth' : 'auto' // Instant scroll when auto-centering on zoom
    });
    
    if (showToast) {
      toast.success(`🎯 Centered on ${targetUser.firstName} ${targetUser.lastName || ''}`);
    }
  }, [familyTree.people, isMobile, mobileZoomLevel, desktopZoomLevel]);

  // Find next available grid slot for a generation (respects spouse relationships)
  const findNextAvailableSlot = useCallback((generation: number, preferredSlot?: number): number => {
    const sameGenPeople = familyTree.people.filter(p => p.generation === generation);
    const occupiedSlots = new Set(sameGenPeople.map(p => p.gridSlot || 0));
    const maxSlots = GRID_CONFIG.getSlotCount();
    
    // If preferred slot is available, use it
    if (preferredSlot !== undefined && !occupiedSlots.has(preferredSlot)) {
      return preferredSlot;
    }
    
    // Find spouse pairs in this generation to avoid breaking them up
    const spouseRelationships = familyTree.relationships.filter(rel => rel.type === 'spouse');
    const spousePairs: Array<{leftSlot: number, rightSlot: number}> = [];
    
    spouseRelationships.forEach(rel => {
      const person1 = sameGenPeople.find(p => p.id === rel.from);
      const person2 = sameGenPeople.find(p => p.id === rel.to);
      
      if (person1 && person2 && person1.generation === generation) {
        const slot1 = person1.gridSlot || 0;
        const slot2 = person2.gridSlot || 0;
        const leftSlot = Math.min(slot1, slot2);
        const rightSlot = Math.max(slot1, slot2);
        
        // Protect ALL spouse pairs regardless of distance
        spousePairs.push({ leftSlot, rightSlot });
      }
    });
    
    console.log(`🔍 Found ${spousePairs.length} spouse pairs in generation ${generation}:`, spousePairs);
    
    // Create a list of all protected slots (between spouse pairs, excluding the spouse positions themselves)
    const protectedSlots = new Set<number>();
    spousePairs.forEach(pair => {
      // Only protect slots BETWEEN spouses, not the spouse positions themselves
      for (let slot = pair.leftSlot + 1; slot < pair.rightSlot; slot++) {
        protectedSlots.add(slot);
      }
    });
    
    console.log(`🚫 Protected slots for placement (between spouses):`, Array.from(protectedSlots).sort((a, b) => a - b));
    
    // Find first available slot from center outward, respecting spouse pairs
    const centerSlot = Math.floor(maxSlots / 2);
    for (let offset = 0; offset < maxSlots; offset++) {
      const slot1 = centerSlot + offset;
      const slot2 = centerSlot - offset;
      
      // Check slot1 (center + offset)
      if (slot1 < maxSlots && !occupiedSlots.has(slot1) && !protectedSlots.has(slot1)) {
        console.log(`✅ Found available slot ${slot1} (center + ${offset}) - doesn't break spouse pairs`);
        return slot1;
      }
      
      // Check slot2 (center - offset)
      if (slot2 >= 0 && !occupiedSlots.has(slot2) && !protectedSlots.has(slot2)) {
        console.log(`✅ Found available slot ${slot2} (center - ${offset}) - doesn't break spouse pairs`);
        return slot2;
      }
      
      // Log when slots are rejected due to spouse pairs
      if (slot1 < maxSlots && !occupiedSlots.has(slot1) && protectedSlots.has(slot1)) {
        console.log(`❌ Slot ${slot1} rejected - would break spouse pair`);
      }
      if (slot2 >= 0 && !occupiedSlots.has(slot2) && protectedSlots.has(slot2)) {
        console.log(`❌ Slot ${slot2} rejected - would break spouse pair`);
      }
    }
    
    console.log('⚠️ No spouse-respecting slots found, falling back to any available slot');
    
    // Fallback: if no spouse-respecting slot found, use any available slot
    for (let offset = 0; offset < maxSlots; offset++) {
      const slot1 = centerSlot + offset;
      const slot2 = centerSlot - offset;
      
      if (slot1 < maxSlots && !occupiedSlots.has(slot1)) return slot1;
      if (slot2 >= 0 && !occupiedSlots.has(slot2)) return slot2;
    }
    
    return 0; // Ultimate fallback
  }, [familyTree.people, familyTree.relationships]);

  // 🔧 COMPREHENSIVE FIX: Ensure root user exists with correct ID
  // This fixes the white screen crash while ensuring tree always has root user
  // IMPORTANT: Only runs as FALLBACK after database load is complete
  useEffect(() => {
    // Only run if database load is complete AND tree is still empty
    if (!isDatabaseLoaded || familyTree.people.length > 0) return;

    console.log('📊 Tree is empty after database load - checking if root user needs to be created');

    // Get current user ID
    const currentUserId = localStorage.getItem('current_user_id');
    if (!currentUserId) {
      console.error('❌ No current user ID found - cannot create root user');
      return;
    }

    // Get user profile for gender and name
    const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
    let userGender: 'male' | 'female' = 'male';
    let userName = 'You';
    
    if (userProfile) {
      try {
        const userData = JSON.parse(userProfile);
        userGender = userData.gender?.toLowerCase() === 'female' ? 'female' : 'male';
        userName = userData.firstName || userData.name || 'You';
      } catch (e) {
        console.warn('⚠️ Failed to parse user profile, using defaults');
      }
    }

    // Calculate center position
    const centerSlot = Math.floor(GRID_CONFIG.getSlotCount() / 2);
    const rootUser: InteractivePerson = {
      id: currentUserId, // ✅ Use actual user ID (not hardcoded 'root')
      firstName: userName,
      gender: userGender,
      status: 'alive',
      generation: 0,
      isRoot: true,
      gridSlot: centerSlot,
      position: { 
        x: GRID_CONFIG.getSlotX(centerSlot), 
        y: GENERATION_Y_POSITIONS['0'] 
      }
    };

    console.log('🚀 Creating root user for empty tree');
    console.log('   User ID:', currentUserId, 'Gender:', userGender, 'Name:', userName);
    console.log('   Position:', rootUser.position);
    
    setFamilyTree(prev => ({
      ...prev,
      people: [rootUser],
      rootUserId: currentUserId,
      generationLimits: {
        ...prev.generationLimits,
        '0': { current: 1, max: 78 }
      }
    }));
  }, [familyTree.people.length, isDatabaseLoaded]); // Re-run when people count changes OR database load completes

  // Calculate current counts for each generation
  const updateGenerationCounts = useCallback((people: InteractivePerson[]) => {
    const counts = { '-2': 0, '-1': 0, '0': 0, '1': 0, '2': 0 };
    people.forEach(person => {
      counts[person.generation.toString() as keyof typeof counts]++;
    });
    return counts;
  }, []);

  // Get spouse of a person
  const getSpouse = useCallback((personId: string): InteractivePerson | null => {
    const spouseRel = familyTree.relationships.find(rel => 
      rel.type === 'spouse' && (rel.from === personId || rel.to === personId)
    );
    
    if (!spouseRel) return null;
    
    const spouseId = spouseRel.from === personId ? spouseRel.to : spouseRel.from;
    return familyTree.people.find(p => p.id === spouseId) || null;
  }, [familyTree.people, familyTree.relationships]);

  // Get all descendants of a person recursively
  const getAllDescendants = useCallback((personId: string): InteractivePerson[] => {
    const descendants: InteractivePerson[] = [];
    const visited = new Set<string>();
    
    const collectDescendants = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      
      // Find all children
      const childRelationships = familyTree.relationships.filter(rel => 
        rel.type === 'parent-child' && rel.from === id
      );
      
      childRelationships.forEach(rel => {
        const child = familyTree.people.find(p => p.id === rel.to);
        if (child && !visited.has(child.id)) {
          descendants.push(child);
          
          // Get child's spouse (if any)
          const childSpouse = getSpouse(child.id);
          if (childSpouse && !visited.has(childSpouse.id)) {
            descendants.push(childSpouse);
            visited.add(childSpouse.id);
          }
          
          // Recursively get this child's descendants
          collectDescendants(child.id);
          if (childSpouse) {
            collectDescendants(childSpouse.id);
          }
        }
      });
    };
    
    collectDescendants(personId);
    return descendants;
  }, [familyTree.people, familyTree.relationships, getSpouse]);

  // Handle person movement (grid-based) with synchronized spouse-pair movement
  const handlePersonMove = useCallback((id: string, direction: 'left' | 'right') => {
    console.log('🏃‍♂️ handlePersonMove called:', { id, direction });
    
    setFamilyTree(prev => {
      const personToMove = prev.people.find(p => p.id === id);
      if (!personToMove) {
        console.log('❌ Person to move not found:', id);
        return prev;
      }
      
      const currentSlot = personToMove.gridSlot || 0;
      const maxSlots = GRID_CONFIG.getSlotCount() - 1;
      
      // Check if this person is part of a spouse pair
      const spouseRelationship = prev.relationships.find(rel => 
        rel.type === 'spouse' && (rel.from === id || rel.to === id)
      );
      
      // If person has a spouse, move them together as a unit
      if (spouseRelationship) {
        const spouseId = spouseRelationship.from === id ? spouseRelationship.to : spouseRelationship.from;
        const spouse = prev.people.find(p => p.id === spouseId);
        
        if (!spouse || spouse.generation !== personToMove.generation) {
          console.log('⚠️ Spouse not found or in different generation');
          return prev;
        }
        
        // Determine left and right spouse (by slot position)
        const leftSpouse = personToMove.gridSlot! < spouse.gridSlot! ? personToMove : spouse;
        const rightSpouse = personToMove.gridSlot! < spouse.gridSlot! ? spouse : personToMove;
        const gap = rightSpouse.gridSlot! - leftSpouse.gridSlot!;
        
        console.log(`💑 Moving spouse pair together:`, {
          leftSpouse: leftSpouse.firstName,
          leftSlot: leftSpouse.gridSlot,
          rightSpouse: rightSpouse.firstName,
          rightSlot: rightSpouse.gridSlot,
          gap,
          direction
        });
        
        // Get all OTHER spouse pairs in this generation for collision detection
        const sameGenPeople = prev.people.filter(p => p.generation === personToMove.generation);
        const spouseRelationships = prev.relationships.filter(rel => rel.type === 'spouse');
        const otherSpousePairs: Array<{leftSlot: number, rightSlot: number, leftPersonId: string, rightPersonId: string}> = [];
        
        spouseRelationships.forEach(rel => {
          // Skip the moving pair
          if (rel.id === spouseRelationship.id) return;
          
          const person1 = sameGenPeople.find(p => p.id === rel.from);
          const person2 = sameGenPeople.find(p => p.id === rel.to);
          
          if (person1 && person2 && person1.generation === personToMove.generation) {
            const slot1 = person1.gridSlot || 0;
            const slot2 = person2.gridSlot || 0;
            const pairLeftSlot = Math.min(slot1, slot2);
            const pairRightSlot = Math.max(slot1, slot2);
            const pairLeftPersonId = slot1 < slot2 ? person1.id : person2.id;
            const pairRightPersonId = slot1 < slot2 ? person2.id : person1.id;
            
            otherSpousePairs.push({ leftSlot: pairLeftSlot, rightSlot: pairRightSlot, leftPersonId: pairLeftPersonId, rightPersonId: pairRightPersonId });
          }
        });
        
        // Get occupied slots (excluding the moving pair)
        const occupiedSlots = new Set(
          sameGenPeople
            .filter(p => p.id !== leftSpouse.id && p.id !== rightSpouse.id)
            .map(p => p.gridSlot || 0)
        );
        
        // Helper function to check if a pair of slots would overlap with other spouse connectors OR single nodes
        const wouldOverlapConnector = (candidateLeftSlot: number, candidateRightSlot: number): boolean => {
          // Build the connector zone (all slots between left and right spouse)
          const ourConnectorSlots: number[] = [];
          for (let slot = candidateLeftSlot + 1; slot < candidateRightSlot; slot++) {
            ourConnectorSlots.push(slot);
          }
          
          // CHECK 1: Would ANY person (single or spouse) be in our connector zone?
          for (const ourSlot of ourConnectorSlots) {
            if (occupiedSlots.has(ourSlot)) {
              console.log(`⚠️ Slot ${ourSlot} in connector zone is occupied by another person`);
              return true; // Someone would be in our connector line - BLOCK
            }
          }
          
          // CHECK 2: Would we overlap with other spouse pairs' connector zones or positions?
          for (const pair of otherSpousePairs) {
            const theirConnectorSlots: number[] = [];
            for (let slot = pair.leftSlot + 1; slot < pair.rightSlot; slot++) {
              theirConnectorSlots.push(slot);
            }
            
            // Check if we would occupy their spouse positions
            if (candidateLeftSlot === pair.leftSlot || candidateLeftSlot === pair.rightSlot ||
                candidateRightSlot === pair.leftSlot || candidateRightSlot === pair.rightSlot) {
              console.log(`⚠️ Would occupy another couple's position at ${candidateLeftSlot} or ${candidateRightSlot}`);
              return true;
            }
            
            // Check if our connector would overlap with their connector
            for (const ourSlot of ourConnectorSlots) {
              if (theirConnectorSlots.includes(ourSlot) || ourSlot === pair.leftSlot || ourSlot === pair.rightSlot) {
                console.log(`⚠️ Connector overlap with another couple at slot ${ourSlot}`);
                return true;
              }
            }
            
            // Check if their positions fall in our connector zone
            if (pair.leftSlot > candidateLeftSlot && pair.leftSlot < candidateRightSlot) {
              console.log(`⚠️ Another couple's left position (${pair.leftSlot}) falls in our connector zone`);
              return true;
            }
            if (pair.rightSlot > candidateLeftSlot && pair.rightSlot < candidateRightSlot) {
              console.log(`⚠️ Another couple's right position (${pair.rightSlot}) falls in our connector zone`);
              return true;
            }
          }
          
          return false; // All checks passed - safe to move
        };
        
        // Extended search for valid spouse pair position (up to 20 slots)
        const findValidPairPosition = (startLeftSlot: number, moveDirection: 'left' | 'right'): {leftSlot: number, rightSlot: number, jumped: boolean} | null => {
          const step = moveDirection === 'left' ? -1 : 1;
          const MAX_SEARCH = 20;
          
          for (let offset = 1; offset <= MAX_SEARCH; offset++) {
            const candidateLeftSlot = startLeftSlot + (step * offset);
            const candidateRightSlot = candidateLeftSlot + gap;
            
            // Check bounds for BOTH positions
            if (candidateLeftSlot < 0 || candidateRightSlot > maxSlots) {
              console.log(`🚫 Boundary reached at offset ${offset}`);
              continue;
            }
            
            // Check if BOTH slots are empty
            const leftOccupied = occupiedSlots.has(candidateLeftSlot);
            const rightOccupied = occupiedSlots.has(candidateRightSlot);
            
            if (leftOccupied || rightOccupied) {
              console.log(`⚠️ Slots occupied: left=${candidateLeftSlot}(${leftOccupied}), right=${candidateRightSlot}(${rightOccupied})`);
              continue;
            }
            
            // Check if would overlap with other spouse pairs
            if (wouldOverlapConnector(candidateLeftSlot, candidateRightSlot)) {
              console.log(`⚠️ Would overlap other couple's connector at slots ${candidateLeftSlot}-${candidateRightSlot}`);
              continue;
            }
            
            // Valid position found!
            console.log(`✅ Found valid pair position: left=${candidateLeftSlot}, right=${candidateRightSlot}, offset=${offset}`);
            return { leftSlot: candidateLeftSlot, rightSlot: candidateRightSlot, jumped: offset > 1 };
          }
          
          return null;
        };
        
        // Find the next valid position for the spouse pair
        const newPosition = findValidPairPosition(leftSpouse.gridSlot!, direction);
        
        if (!newPosition) {
          toast.error(`Cannot move ${direction}. No space for couple to maintain connection (searched 20 slots).`);
          return prev;
        }
        
        const newLeftX = GRID_CONFIG.getSlotX(newPosition.leftSlot);
        const newRightX = GRID_CONFIG.getSlotX(newPosition.rightSlot);
        const slotsMoved = Math.abs(newPosition.leftSlot - leftSpouse.gridSlot!);
        
        console.log(`💑 Moving couple from [${leftSpouse.gridSlot}, ${rightSpouse.gridSlot}] to [${newPosition.leftSlot}, ${newPosition.rightSlot}]`);
        
        // Update BOTH spouses simultaneously
        const updatedPeople = prev.people.map(person => {
          if (person.id === leftSpouse.id) {
            return {
              ...person,
              gridSlot: newPosition.leftSlot,
              position: { ...person.position, x: newLeftX }
            };
          } else if (person.id === rightSpouse.id) {
            return {
              ...person,
              gridSlot: newPosition.rightSlot,
              position: { ...person.position, x: newRightX }
            };
          }
          return person;
        });
        
        // Success toast
        if (newPosition.jumped) {
          toast.success(`🦘 Moved ${leftSpouse.firstName} & ${rightSpouse.firstName} together (jumped ${slotsMoved} slots)`);
        } else {
          toast.success(`✅ Moved ${leftSpouse.firstName} & ${rightSpouse.firstName} ${direction} together`);
        }
        
        return {
          ...prev,
          people: updatedPeople
        };
      }
      
      // SINGLE PERSON MOVEMENT (no spouse) - original logic
      const sameGenPeople = prev.people.filter(p => p.generation === personToMove.generation && p.id !== id);
      
      // Get spouse relationships in this generation to respect them during movement
      const spouseRelationships = prev.relationships.filter(rel => rel.type === 'spouse');
      const spousePairs: Array<{leftSlot: number, rightSlot: number, leftPersonId: string, rightPersonId: string}> = [];
      
      spouseRelationships.forEach(rel => {
        const person1 = prev.people.find(p => p.id === rel.from);
        const person2 = prev.people.find(p => p.id === rel.to);
        
        if (person1 && person2 && person1.generation === personToMove.generation) {
          const slot1 = person1.gridSlot || 0;
          const slot2 = person2.gridSlot || 0;
          const leftSlot = Math.min(slot1, slot2);
          const rightSlot = Math.max(slot1, slot2);
          const leftPersonId = slot1 < slot2 ? person1.id : person2.id;
          const rightPersonId = slot1 < slot2 ? person2.id : person1.id;
          
          // Protect ALL spouse pairs regardless of distance
          spousePairs.push({ leftSlot, rightSlot, leftPersonId, rightPersonId });
        }
      });
      
      console.log(`🔍 Found ${spousePairs.length} spouse pairs in movement generation:`, spousePairs);
      
      // Helper function to check if a slot would interfere with spouse relationships
      const wouldBreakSpousePair = (slot: number, excludePersonId?: string): boolean => {
        return spousePairs.some(pair => {
          // Don't consider a pair "broken" if the moving person is part of it
          if (excludePersonId && (pair.leftPersonId === excludePersonId || pair.rightPersonId === excludePersonId)) {
            return false;
          }
          // Check if placing someone at this slot would interfere with the spouse connector line
          // Also block slots immediately adjacent to spouse pairs to prevent visual interference
          return slot > pair.leftSlot && slot < pair.rightSlot;
        });
      };
      
      // Helper function to check if this person is part of a spouse pair that would be broken
      const isPartOfSpousePair = (personId: string): {isPart: boolean, partnerSlot?: number} => {
        const pair = spousePairs.find(pair => pair.leftPersonId === personId || pair.rightPersonId === personId);
        if (!pair) return {isPart: false};
        
        const partnerSlot = pair.leftPersonId === personId ? pair.rightSlot : pair.leftSlot;
        return {isPart: true, partnerSlot};
      };
      
      // Create a list of all protected slots (between spouse pairs, excluding the spouse positions themselves)
      const protectedSlots = new Set<number>();
      spousePairs.forEach(pair => {
        // Only protect slots BETWEEN spouses, not the spouse positions themselves
        for (let slot = pair.leftSlot + 1; slot < pair.rightSlot; slot++) {
          protectedSlots.add(slot);
        }
      });
      
      // If the moving person is part of a spouse pair, allow them to move to their partner's adjacent slots
      const movingPersonPair = spousePairs.find(pair => 
        pair.leftPersonId === id || pair.rightPersonId === id
      );
      
      if (movingPersonPair) {
        // Remove protection from slots immediately adjacent to this person's spouse pair
        // This allows spouses to move closer together or further apart
        const partnerSlot = movingPersonPair.leftPersonId === id ? movingPersonPair.rightSlot : movingPersonPair.leftSlot;
        console.log(`🤝 Moving person is spouse of someone at slot ${partnerSlot}, allowing adjacent movement`);
      }
      
      console.log(`🚫 Protected slots (between spouses):`, Array.from(protectedSlots).sort((a, b) => a - b));
      
      // Smart jump mechanism: skip over entire spouse pairs and find EMPTY slots only
      const findNextValidSlot = (startSlot: number, moveDirection: 'left' | 'right'): number | null => {
        const step = moveDirection === 'left' ? -1 : 1;
        const occupiedSlots = new Set(sameGenPeople.map(p => p.gridSlot || 0));
        let candidateSlot = startSlot;
        
        for (let attempts = 0; attempts < maxSlots; attempts++) {
          candidateSlot += step;
          
          // Check bounds
          if (candidateSlot < 0 || candidateSlot > maxSlots) {
            return null; // Hit boundary
          }
          
          // If we hit a protected slot, jump over the ENTIRE spouse pair
          if (protectedSlots.has(candidateSlot)) {
            const protectingPair = spousePairs.find(pair => 
              candidateSlot > pair.leftSlot && candidateSlot < pair.rightSlot
            );
            
            if (protectingPair) {
              // Jump completely over the spouse pair to avoid any interference
              if (moveDirection === 'left') {
                candidateSlot = protectingPair.leftSlot - 1; // Land before the entire pair
                console.log(`🦘 Jumping over spouse pair [${protectingPair.leftSlot},${protectingPair.rightSlot}] to slot ${candidateSlot}`);
              } else {
                candidateSlot = protectingPair.rightSlot + 1; // Land after the entire pair
                console.log(`🦘 Jumping over spouse pair [${protectingPair.leftSlot},${protectingPair.rightSlot}] to slot ${candidateSlot}`);
              }
              
              // Recheck bounds after jump
              if (candidateSlot < 0 || candidateSlot > maxSlots) {
                return null;
              }
              
              // Continue checking if this jumped slot is also occupied
              continue;
            }
          }
          
          // IMPORTANT: Only return slots that are completely EMPTY
          // This prevents any swapping that would disrupt spouse positions
          if (!occupiedSlots.has(candidateSlot)) {
            console.log(`✅ Found empty slot ${candidateSlot} that doesn't interfere with spouse lines`);
            return candidateSlot;
          } else {
            console.log(`⚠️ Slot ${candidateSlot} is occupied, continuing search...`);
          }
        }
        
        return null; // No empty slot found
      };
      
      let targetSlot = findNextValidSlot(currentSlot, direction);
      let isSwapMove = false;
      
      // If no empty slot found and we're not dealing with protected slots, allow adjacent swapping
      if (targetSlot === null && !protectedSlots.has(currentSlot)) {
        const adjacentSlot = direction === 'left' ? currentSlot - 1 : currentSlot + 1;
        
        // Check bounds for adjacent slot
        if (adjacentSlot >= 0 && adjacentSlot <= maxSlots) {
          const adjacentPerson = sameGenPeople.find(p => (p.gridSlot || 0) === adjacentSlot);
          
          // Allow swap if adjacent slot is occupied and not protected
          if (adjacentPerson && !protectedSlots.has(adjacentSlot)) {
            targetSlot = adjacentSlot;
            isSwapMove = true;
            console.log(`🔄 No empty slots found, falling back to adjacent swap with ${adjacentPerson.firstName}`);
          }
        }
      }
      
      if (targetSlot === null) {
        toast.error(`Cannot move ${direction}. No valid position available that doesn't interfere with spouse relationships.`);
        return prev;
      }
      
      if (isSwapMove) {
        // SWAP MOVE: Exchange positions with adjacent person
        const occupyingPerson = sameGenPeople.find(p => (p.gridSlot || 0) === targetSlot);
        
        if (!occupyingPerson) {
          toast.error('Swap target person not found');
          return prev;
        }
        
        const personToMoveNewX = GRID_CONFIG.getSlotX(targetSlot);
        const occupyingPersonNewX = GRID_CONFIG.getSlotX(currentSlot);
        
        console.log(`🔄 Swapping positions between ${personToMove.firstName} and ${occupyingPerson.firstName}`);
        toast.success(`🔄 Swapped positions: ${personToMove.firstName} ↔ ${occupyingPerson.firstName}`);
        
        return {
          ...prev,
          people: prev.people.map(person => {
            if (person.id === id) {
              return {
                ...person,
                gridSlot: targetSlot,
                position: { ...person.position, x: personToMoveNewX }
              };
            } else if (person.id === occupyingPerson.id) {
              return {
                ...person,
                gridSlot: currentSlot,
                position: { ...person.position, x: occupyingPersonNewX }
              };
            }
            return person;
          })
        };
      } else {
        // JUMP MOVE: Move to empty slot (potentially jumping over spouse pairs)
        const newX = GRID_CONFIG.getSlotX(targetSlot);
        const slotsMoved = Math.abs(targetSlot - currentSlot);
        
        console.log(`📍 Moving ${personToMove.firstName} from slot ${currentSlot} to slot ${targetSlot} (x: ${newX}), jumped ${slotsMoved} slots`);
        
        if (slotsMoved > 1) {
          // Check if we jumped over any spouse pairs
          const jumpedOverSpouses = spousePairs.some(pair => 
            (currentSlot < pair.leftSlot && targetSlot > pair.rightSlot) || 
            (currentSlot > pair.rightSlot && targetSlot < pair.leftSlot)
          );
          
          if (jumpedOverSpouses) {
            toast.success(`🦘 ${personToMove.firstName} jumped over spouse pair(s) to avoid interference!`);
          } else {
            toast.success(`✅ Moved ${personToMove.firstName} ${direction} (${slotsMoved} slots)`);
          }
        } else {
          toast.success(`✅ Moved ${personToMove.firstName} ${direction}`);
        }
        
        return {
          ...prev,
          people: prev.people.map(person => 
            person.id === id 
              ? { 
                  ...person, 
                  gridSlot: targetSlot,
                  position: { ...person.position, x: newX }
                } 
              : person
          )
        };
      }
    });
  }, []);

  // Handle quick menu open/close
  const handleQuickMenuOpen = useCallback((personId: string, isOpen: boolean) => {
    if (isOpen) {
      setQuickMenuPersonId(personId);
      setSelectedPersonId(null); // Deselect when opening quick menu
    } else {
      setQuickMenuPersonId(null);
    }
  }, []);

  // Handle person selection (updated for smart connection flow)
  const handlePersonSelect = useCallback((id: string) => {
    if (isConnecting) {
      // In connection mode, clicking a node creates a connection
      if (connectionFrom && connectionFrom !== id) {
        const sourcePerson = familyTree.people.find(p => p.id === connectionFrom);
        const targetPerson = familyTree.people.find(p => p.id === id);
        
        if (!sourcePerson || !targetPerson) {
          toast.error('Person not found');
          return;
        }

        // Check if already connected
        const existingRelationship = familyTree.relationships.find(rel =>
          (rel.from === connectionFrom && rel.to === id) ||
          (rel.from === id && rel.to === connectionFrom)
        );

        if (existingRelationship) {
          toast.warning(`Already connected as ${existingRelationship.type === 'spouse' ? 'Spouse' : 'Parent-Child'}`);
          return;
        }

        // Auto-detect relationship type based on generation
        let relationshipType: 'spouse' | 'parent-child';
        let finalFrom: string;
        let finalTo: string;

        if (sourcePerson.generation === targetPerson.generation) {
          relationshipType = 'spouse';
          finalFrom = connectionFrom;
          finalTo = id;
        } else if (sourcePerson.generation < targetPerson.generation) {
          // Source is older generation (parent), target is younger (child)
          relationshipType = 'parent-child';
          finalFrom = connectionFrom;
          finalTo = id;
        } else {
          // Target is older generation (parent), source is younger (child)
          relationshipType = 'parent-child';
          finalFrom = id;
          finalTo = connectionFrom;
        }

        // Validate and create the relationship
        const validator = new RelationshipValidator(familyTree.people, familyTree.relationships);
        const validation = validator.validateNewRelationship(finalFrom, finalTo, relationshipType);

        if (!validation.isValid) {
          toast.error(`Cannot create relationship: ${validation.issues[0]}`);
          setIsConnecting(false);
          setConnectionFrom(null);
          return;
        }

        // Create the relationship
        const newRelationship: Relationship = {
          id: `rel_${Date.now()}`,
          type: relationshipType,
          from: finalFrom,
          to: finalTo
        };

        setFamilyTree(prev => {
          let relationshipsToAdd = [newRelationship];
          
          // AUTOMATIC SPOUSE RELATIONSHIP PROPAGATION (CHILDREN ONLY)
          if (relationshipType === 'parent-child') {
            const existingSpouseRelationships = prev.relationships.filter(rel => rel.type === 'spouse');
            
            // Determine parent and child
            const parentId = finalFrom;
            const childId = finalTo;
            
            // Check if the PARENT has a spouse
            const parentSpouseRel = existingSpouseRelationships.find(rel => 
              rel.from === parentId || rel.to === parentId
            );
            
            if (parentSpouseRel) {
              const spouseId = parentSpouseRel.from === parentId ? parentSpouseRel.to : parentSpouseRel.from;
              
              // Create automatic stepparent relationship
              const automaticRelationship: Relationship = {
                id: `rel_${Date.now()}_stepparent`,
                type: 'parent-child',
                from: spouseId,
                to: childId
              };
              relationshipsToAdd.push(automaticRelationship);
            }
          }
          
          return {
            ...prev,
            relationships: [...prev.relationships, ...relationshipsToAdd]
          };
        });

        toast.success(`${relationshipType === 'spouse' ? '💑 Spouse' : '👶 Parent-child'} relationship created!`);
        
        // Exit connection mode
        setIsConnecting(false);
        setConnectionFrom(null);
      } else if (connectionFrom === id) {
        // Clicking the same person again cancels
        toast.info('Connection cancelled');
        setIsConnecting(false);
        setConnectionFrom(null);
      } else {
        // First click in connection mode - set as source
        setConnectionFrom(id);
        toast.info('📍 Click another person to connect them');
      }
    } else {
      // Not in connection mode - toggle quick action menu
      if (quickMenuPersonId === id) {
        // Clicking same person again - close the menu
        setQuickMenuPersonId(null);
        setSelectedPersonId(null);
      } else {
        // Clicking different person - open menu for them
        setQuickMenuPersonId(id);
        setSelectedPersonId(id);
      }
    }
  }, [isConnecting, connectionFrom, familyTree.people, familyTree.relationships, quickMenuPersonId]);

  // Handle person deletion with history tracking
  const handlePersonDelete = useCallback((id: string) => {
    const personToDelete = familyTree.people.find(p => p.id === id);
    if (!personToDelete) return;
    
    // Track deleted relationships for undo
    const deletedRelationships = familyTree.relationships.filter(r => r.from === id || r.to === id);
    
    // Record in history
    const action: HistoryAction = {
      type: 'DELETE_PERSON',
      person: personToDelete,
      relationships: deletedRelationships
    };
    setHistory(prev => addToHistory(prev, action));
    
    setFamilyTree(prev => {
      const newPeople = prev.people.filter(p => p.id !== id);
      const newRelationships = prev.relationships.filter(r => r.from !== id && r.to !== id);
      const counts = updateGenerationCounts(newPeople);
      
      return {
        ...prev,
        people: newPeople,
        relationships: newRelationships,
        generationLimits: Object.keys(prev.generationLimits).reduce((acc, gen) => ({
          ...acc,
          [gen]: { current: counts[gen as keyof typeof counts], max: prev.generationLimits[gen as keyof typeof prev.generationLimits].max }
        }), {} as typeof prev.generationLimits)
      };
    });
    
    toast.success(`Deleted ${personToDelete.firstName}`, {
      action: {
        label: 'Undo',
        onClick: () => {
          if (canUndo(history)) {
            handleUndo();
          }
        }
      }
    });
  }, [familyTree.people, familyTree.relationships, updateGenerationCounts, history]);

  // Handle opening profile
  const handleOpenProfile = useCallback((personId: string) => {
    const person = familyTree.people.find(p => p.id === personId);
    if (person) {
      setSelectedPersonForProfile(person);
      if (isMobile) hapticFeedback.select();
    }
  }, [familyTree.people, isMobile]);

  // Handle saving profile with bidirectional sync
  const handleSaveProfile = useCallback(async (updatedPerson: InteractivePerson, marriageData?: any) => {
    const existingPersonCheck = familyTree.people.find(p => p.id === updatedPerson.id);
    console.log('🔵 handleSaveProfile called');
    console.log('   📥 Received data:', {
      personId: updatedPerson.id,
      firstName: updatedPerson.firstName,
      dateOfBirth: updatedPerson.dateOfBirth,
      deathDate: updatedPerson.deathDate,
      allFields: Object.keys(updatedPerson)
    });
    console.log('   📂 Existing in tree:', {
      personId: existingPersonCheck?.id,
      firstName: existingPersonCheck?.firstName,
      dateOfBirth: existingPersonCheck?.dateOfBirth,
      deathDate: existingPersonCheck?.deathDate
    });
    
    // Helper function to normalize gender (capitalize first letter)
    const normalizeGender = (gender: string): string => {
      if (!gender) return 'Male';
      const lower = gender.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    };

    // 🔧 CRITICAL FIX: Calculate the merged person data BEFORE state updates
    // This ensures we have the complete, merged data to pass to setSelectedPersonForProfile
    const existingPerson = familyTree.people.find(p => p.id === updatedPerson.id);
    const mergedPersonForProfile = existingPerson ? {
      ...existingPerson,  // Keep ALL existing data
      ...updatedPerson,  // Apply updates
      gender: normalizeGender(updatedPerson.gender)
    } : updatedPerson;
    
    console.log('🔧 Merged person for profile (BEFORE state update):', {
      personId: mergedPersonForProfile.id,
      firstName: mergedPersonForProfile.firstName,
      dateOfBirth: mergedPersonForProfile.dateOfBirth,
      deathDate: mergedPersonForProfile.deathDate
    });

    // 1. Update family tree - PRESERVE ALL EXISTING DATA + UPDATE MARRIAGE METADATA
    setFamilyTree(prev => {
      const updatedPeople = prev.people.map(p => {
        if (p.id === updatedPerson.id) {
          // CRITICAL: Preserve ALL existing fields, only update changed fields
          const mergedPerson = {
            ...p,  // Keep ALL existing data (relationships, position, gridSlot, etc.)
            ...updatedPerson,  // Apply updates
            gender: normalizeGender(updatedPerson.gender) // Ensure gender is normalized
          };
          
          console.log('🟢 Person updated in tree state:', {
            personId: mergedPerson.id,
            firstName: mergedPerson.firstName,
            dateOfBirth: mergedPerson.dateOfBirth,
            deathDate: mergedPerson.deathDate,
            gender: mergedPerson.gender,
            oldGender: p.gender,
            newGender: updatedPerson.gender
          });
          
          return mergedPerson;
        }
        return p;
      });
      
      // 🔧 CRITICAL FIX: Update marriage metadata in relationships if provided
      let updatedRelationships = prev.relationships;
      if (marriageData) {
        updatedRelationships = prev.relationships.map(rel => {
          // Find the spouse relationship for this person
          if (rel.type === 'spouse' && (rel.from === updatedPerson.id || rel.to === updatedPerson.id)) {
            console.log('💍 Updating marriage metadata in tree state for relationship:', rel.id);
            return {
              ...rel,
              marriageMetadata: {
                anniversaryDate: marriageData.anniversaryDate || '',
                marriagePlace: marriageData.place || '',
                notes: marriageData.notes || '',
                updated_at: new Date().toISOString()
              }
            };
          }
          return rel;
        });
      }
      
      return {
        ...prev,
        people: updatedPeople,
        relationships: updatedRelationships
      };
    });
    
    // 🔧 CRITICAL FIX: Dispatch event to trigger relationship engine re-initialization
    // This ensures relationship labels update when gender changes
    console.log('📡 Dispatching familyTreeUpdated event to refresh relationship engine');
    window.dispatchEvent(new CustomEvent('familyTreeUpdated', {
      detail: { source: 'profile-edit', personId: updatedPerson.id }
    }));
    
    // 2. If this is the root user, sync changes to main user profile
    const currentUserId = localStorage.getItem('current_user_id');
    if (currentUserId && updatedPerson.id === currentUserId) {
      console.log('🔄 ROOT USER EDITED IN TREE - Syncing to main profile...');
      
      const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
      if (userProfile) {
        const userData = JSON.parse(userProfile);
        
        // Construct full name from parts
        const fullName = [
          updatedPerson.firstName,
          updatedPerson.middleName,
          updatedPerson.lastName
        ].filter(Boolean).join(' ');
        
        // Update user profile with tree changes
        // 🔧 COMPLETE SYNC FIX: Always update all fields from Tree to Profile
        const updatedUserProfile = {
          ...userData,
          firstName: updatedPerson.firstName,
          first_name: updatedPerson.firstName,
          middleName: updatedPerson.middleName || '',
          middle_name: updatedPerson.middleName || '',
          lastName: updatedPerson.lastName || '',
          last_name: updatedPerson.lastName || '',
          maidenName: updatedPerson.maidenName || '',
          maiden_name: updatedPerson.maidenName || '',
          name: fullName,
          display_name: fullName,
          gender: normalizeGender(updatedPerson.gender),
          status: updatedPerson.status || 'Living',
          date_of_birth: updatedPerson.dateOfBirth || '',
          dateOfBirth: updatedPerson.dateOfBirth || '',
          place_of_birth: updatedPerson.birthPlace || '',
          placeOfBirth: updatedPerson.birthPlace || '',
          deathDate: updatedPerson.deathDate || '',
          death_date: updatedPerson.deathDate || '',
          deathPlace: updatedPerson.deathPlace || '',
          death_place: updatedPerson.deathPlace || '',
          phone: updatedPerson.phone || '',
          email: updatedPerson.email || '',
          bio: updatedPerson.bio || '',
          photo: updatedPerson.profilePicture || '',
          photo_storage_path: updatedPerson.photo_storage_path || '', // 🔒 PRIVATE BUCKET: Sync storage path
          avatar: updatedPerson.profilePicture || '',
          updated_at: new Date().toISOString()
        };
        
        // Save updated profile to localStorage
        localStorage.setItem(`user:${currentUserId}:profile`, JSON.stringify(updatedUserProfile));
        console.log('✅ Root user profile synced: Tree → Profile (localStorage)');
        
        // 🔧 DATABASE-FIRST FIX: Save to Supabase database
        try {
          const { DatabaseService } = await import('../utils/supabase/persistent-database');
          await DatabaseService.updateUserProfile(currentUserId, updatedUserProfile);
          console.log('✅ Root user profile synced: Tree → Database');
        } catch (dbError) {
          console.warn('⚠️ Database save failed (using localStorage only):', dbError);
          // Non-fatal - localStorage is the backup
        }
        console.log('   Name:', fullName);
        console.log('   Gender:', normalizeGender(updatedPerson.gender));
        
        // Also save to family tree in localStorage for persistence
        if (userData.family_id) {
          const treeKey = `familyTree_${userData.family_id}`;
          const existingTreeData = localStorage.getItem(treeKey);
          
          if (existingTreeData) {
            try {
              const parsedData = JSON.parse(existingTreeData);
              
              // 🔧 FIX: Handle both array format and object format
              const isOldFormat = Array.isArray(parsedData);
              const peopleArray = isOldFormat ? parsedData : (parsedData.people || []);
              const relationshipsArray = isOldFormat ? [] : (parsedData.relationships || []);
              
              const rootUserIndex = peopleArray.findIndex((p: any) => 
                p.id === currentUserId || p.isRoot === true
              );
              
              if (rootUserIndex !== -1) {
                // CRITICAL: Preserve ALL existing fields
                // 🔧 COMPLETE SYNC FIX: Always update all fields from tree
                peopleArray[rootUserIndex] = {
                  ...peopleArray[rootUserIndex],  // Keep ALL existing data
                  firstName: updatedPerson.firstName,
                  middleName: updatedPerson.middleName || '',
                  lastName: updatedPerson.lastName || '',
                  maidenName: updatedPerson.maidenName || '',
                  name: fullName,
                  gender: normalizeGender(updatedPerson.gender),
                  status: updatedPerson.status || 'alive',
                  dateOfBirth: updatedPerson.dateOfBirth || '',
                  birthPlace: updatedPerson.birthPlace || '',
                  placeOfBirth: updatedPerson.birthPlace || '',
                  deathDate: updatedPerson.deathDate || '',
                  deathPlace: updatedPerson.deathPlace || '',
                  phone: updatedPerson.phone || '',
                  email: updatedPerson.email || '',
                  bio: updatedPerson.bio || '',
                  photo: updatedPerson.profilePicture || '',
                  photo_storage_path: updatedPerson.photo_storage_path || '', // 🔒 PRIVATE BUCKET: Sync storage path
                  profilePicture: updatedPerson.profilePicture || '',
                  updated_at: new Date().toISOString()
                };
                
                // Save back in the original format
                const saveData = isOldFormat ? peopleArray : { people: peopleArray, relationships: relationshipsArray };
                localStorage.setItem(treeKey, JSON.stringify(saveData));
                console.log('✅ Family tree persisted to localStorage (ALL', peopleArray.length, 'members preserved)');
                
                // 🔧 CRITICAL FIX: Also sync tree to database for bidirectional sync
                // This ensures profile edits in tree nodes are saved to database
                try {
                  const { DatabaseService } = await import('../utils/supabase/persistent-database');
                  await DatabaseService.saveFamilyTree(userData.family_id, saveData);
                  console.log('✅ Profile edit synced: Tree → Database (bidirectional sync complete)');
                } catch (treeDbError) {
                  console.warn('⚠️ Database tree sync failed (using localStorage only):', treeDbError);
                  // Non-fatal - localStorage is the backup
                }
              }
            } catch (e) {
              console.error('❌ ❌ Failed to sync tree to localStorage:', e);
            }
          }
        }
      }
    }
    
    // 3. 🔧 CRITICAL FIX: Use the pre-calculated merged person instead of updatedPerson
    // This ensures ALL fields including dates are preserved when the component re-renders
    console.log('🟣 Updating selectedPersonForProfile with MERGED data:', {
      personId: mergedPersonForProfile.id,
      dateOfBirth: mergedPersonForProfile.dateOfBirth,
      deathDate: mergedPersonForProfile.deathDate,
      allFields: Object.keys(mergedPersonForProfile)
    });
    setSelectedPersonForProfile(mergedPersonForProfile);
    
    toast.success('✅ Profile updated successfully!');
  }, [familyTree.people]); // 🔧 Add dependency to access current tree state

  // Handle closing profile
  const handleCloseProfile = useCallback(() => {
    setSelectedPersonForProfile(null);
  }, []);

  // Handle zoom to generation
  const handleZoomToGeneration = useCallback((generation: number) => {
    const scrollContainer = document.getElementById('canvas-scroll-container');
    if (!scrollContainer) return;

    const generationY = GENERATION_Y_POSITIONS[generation.toString() as keyof typeof GENERATION_Y_POSITIONS];
    const containerHeight = scrollContainer.clientHeight;
    
    // Account for zoom level when calculating scroll position
    const currentZoom = isMobile ? mobileZoomLevel : desktopZoomLevel;
    const scaledY = generationY * currentZoom;
    const scrollTop = scaledY - (containerHeight / 2);
    
    scrollContainer.scrollTo({
      top: Math.max(0, scrollTop),
      behavior: 'smooth'
    });
    
    toast.success(`📍 Zoomed to Generation ${generation > 0 ? '+' : ''}${generation}`);
  }, [isMobile, mobileZoomLevel, desktopZoomLevel]);

  // Handle mobile tutorial dismiss
  const handleDismissMobileTutorial = useCallback(() => {
    setShowMobileTutorial(false);
    localStorage.setItem('familyTree_hasSeenMobileTutorial', 'true');
  }, []);

  // Handle collapse/expand of a person and their descendants
  const handleToggleCollapse = useCallback((personId: string) => {
    const person = familyTree.people.find(p => p.id === personId);
    if (!person) return;

    // Check if already collapsed
    if (collapsedNodes[personId]) {
      // EXPAND
      setCollapsedNodes(prev => {
        const newState = { ...prev };
        delete newState[personId];
        return newState;
      });
      toast.success(`✅ Expanded ${person.firstName}'s branch`);
    } else {
      // COLLAPSE
      // Collect all descendants recursively
      const descendants = getAllDescendants(personId);
      
      // If person has spouse, include them
      const spouse = getSpouse(personId);
      
      // Build list of all people to hide
      const toHide = [personId];
      if (spouse) toHide.push(spouse.id);
      descendants.forEach(d => toHide.push(d.id));
      
      // Store collapse state
      setCollapsedNodes(prev => ({
        ...prev,
        [personId]: {
          hidden: toHide,
          timestamp: Date.now()
        }
      }));
      
      const count = toHide.length;
      toast.success(`📦 Collapsed ${person.firstName}'s branch (${count} ${count === 1 ? 'person' : 'people'} hidden)`);
    }
  }, [familyTree.people, collapsedNodes, getAllDescendants, getSpouse]);

  // Handle adding new person with grid positioning
  const handleAddPerson = useCallback((personData: {
    firstName: string;
    lastName: string;
    gender: 'male' | 'female';
    generation: -2 | -1 | 0 | 1 | 2;
    status: 'alive' | 'deceased';
    dateOfBirth: string;
  }) => {
    console.log('🆕 handleAddPerson called with data:', personData);
    
    const currentCount = familyTree.generationLimits[personData.generation.toString() as keyof typeof familyTree.generationLimits].current;
    const maxCount = familyTree.generationLimits[personData.generation.toString() as keyof typeof familyTree.generationLimits].max;
    
    if (currentCount >= maxCount) {
      toast.error(`Cannot add more people to generation ${personData.generation}. Limit reached.`);
      return;
    }

    const newSlot = findNextAvailableSlot(personData.generation);
    const newPerson: InteractivePerson = {
      id: generateId(),
      firstName: personData.firstName,
      lastName: personData.lastName,
      gender: personData.gender,
      status: personData.status,
      generation: personData.generation,
      dateOfBirth: personData.dateOfBirth || undefined,
      gridSlot: newSlot,
      position: { 
        x: GRID_CONFIG.getSlotX(newSlot), 
        y: GENERATION_Y_POSITIONS[personData.generation.toString() as keyof typeof GENERATION_Y_POSITIONS] 
      }
    };

    console.log('👤 New person created at slot:', newSlot, 'position:', newPerson.position);

    // Record in history
    const action: HistoryAction = {
      type: 'ADD_PERSON',
      person: newPerson
    };
    setHistory(prev => addToHistory(prev, action));
    
    setFamilyTree(prev => {
      const newPeople = [...prev.people, newPerson];
      const counts = updateGenerationCounts(newPeople);
      
      return {
        ...prev,
        people: newPeople,
        generationLimits: Object.keys(prev.generationLimits).reduce((acc, gen) => ({
          ...acc,
          [gen]: { current: counts[gen as keyof typeof counts], max: prev.generationLimits[gen as keyof typeof prev.generationLimits].max }
        }), {} as typeof prev.generationLimits)
      };
    });

    toast.success(`Added ${newPerson.firstName} to your family tree!`);
    
    // Auto-center on the newly added person (both X and Y axis with zoom consideration)
    setTimeout(() => {
      const container = document.getElementById('canvas-scroll-container');
      if (container) {
        const currentZoom = isMobile ? mobileZoomLevel : desktopZoomLevel;
        const scaledX = newPerson.position.x * currentZoom;
        const scaledY = newPerson.position.y * currentZoom;
        
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const bottomNavOffset = isMobile ? 40 : 0; // Account for bottom navigation
        
        const scrollLeft = scaledX - (containerWidth / 2);
        const scrollTop = scaledY - (containerHeight / 2) + bottomNavOffset;
        
        console.log('📍 Auto-centering on new person:', {
          position: newPerson.position,
          zoom: currentZoom,
          scrollTo: { left: scrollLeft, top: scrollTop }
        });
        
        container.scrollTo({ 
          left: Math.max(0, scrollLeft), 
          top: Math.max(0, scrollTop),
          behavior: 'smooth' 
        });
      }
    }, 100);
  }, [familyTree.generationLimits, updateGenerationCounts, findNextAvailableSlot, isMobile, mobileZoomLevel, desktopZoomLevel]);

  // Handle adding person from contextual grid button (with specific slot)
  const handleContextualAddPerson = useCallback((personData: {
    firstName: string;
    lastName: string;
    gender: 'male' | 'female';
    generation: -2 | -1 | 0 | 1 | 2;
    status: 'alive' | 'deceased';
    dateOfBirth: string;
    relationshipType?: string;
  }, targetSlot: number) => {
    console.log('🆕 handleContextualAddPerson called with data:', personData, 'targetSlot:', targetSlot);
    
    const currentCount = familyTree.generationLimits[personData.generation.toString() as keyof typeof familyTree.generationLimits].current;
    const maxCount = familyTree.generationLimits[personData.generation.toString() as keyof typeof familyTree.generationLimits].max;
    
    if (currentCount >= maxCount) {
      toast.error(`Cannot add more people to generation ${personData.generation}. Limit reached.`);
      return;
    }

    const newPerson: InteractivePerson = {
      id: generateId(),
      firstName: personData.firstName,
      lastName: personData.lastName,
      gender: personData.gender,
      status: personData.status,
      generation: personData.generation,
      dateOfBirth: personData.dateOfBirth || undefined,
      gridSlot: targetSlot,
      position: { 
        x: GRID_CONFIG.getSlotX(targetSlot), 
        y: GENERATION_Y_POSITIONS[personData.generation.toString() as keyof typeof GENERATION_Y_POSITIONS] 
      }
    };

    console.log('👤 New person created at specific slot:', targetSlot, 'position:', newPerson.position);

    setFamilyTree(prev => {
      const newPeople = [...prev.people, newPerson];
      const counts = updateGenerationCounts(newPeople);
      
      return {
        ...prev,
        people: newPeople,
        generationLimits: Object.keys(prev.generationLimits).reduce((acc, gen) => ({
          ...acc,
          [gen]: { current: counts[gen as keyof typeof counts], max: prev.generationLimits[gen as keyof typeof prev.generationLimits].max }
        }), {} as typeof prev.generationLimits)
      };
    });

    const relationshipTypeText = personData.relationshipType ? ` as ${personData.relationshipType}` : '';
    toast.success(`Added ${newPerson.firstName}${relationshipTypeText} to your family tree!`);
    
    // Auto-center on the newly added person (both X and Y axis with zoom consideration)
    setTimeout(() => {
      const container = document.getElementById('canvas-scroll-container');
      if (container) {
        const currentZoom = isMobile ? mobileZoomLevel : desktopZoomLevel;
        const scaledX = newPerson.position.x * currentZoom;
        const scaledY = newPerson.position.y * currentZoom;
        
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const bottomNavOffset = isMobile ? 40 : 0; // Account for bottom navigation
        
        const scrollLeft = scaledX - (containerWidth / 2);
        const scrollTop = scaledY - (containerHeight / 2) + bottomNavOffset;
        
        console.log('📍 Auto-centering on new person (contextual):', {
          position: newPerson.position,
          zoom: currentZoom,
          scrollTo: { left: scrollLeft, top: scrollTop }
        });
        
        container.scrollTo({ 
          left: Math.max(0, scrollLeft), 
          top: Math.max(0, scrollTop),
          behavior: 'smooth' 
        });
      }
    }, 100);
  }, [familyTree.generationLimits, updateGenerationCounts, isMobile, mobileZoomLevel, desktopZoomLevel]);

  // Handle creating relationships with validation
  const handleCreateRelationship = useCallback((type: 'spouse' | 'parent-child' | 'sibling') => {
    console.log('🔗 handleCreateRelationship called:', { type, connectionFrom, connectionTo });
    
    if (!connectionFrom || !connectionTo) {
      toast.error('Connection data missing');
      return;
    }

    const validator = new RelationshipValidator(familyTree.people, familyTree.relationships);
    const validation = validator.validateNewRelationship(connectionFrom, connectionTo, type);

    if (!validation.isValid) {
      toast.error(`Cannot create relationship: ${validation.issues[0]}`);
      return;
    }

    if (validation.warnings.length > 0) {
      validation.warnings.forEach(warning => {
        toast.warning(warning);
      });
    }

    const newRelationship: Relationship = {
      id: `rel_${Date.now()}`,
      type,
      from: connectionFrom,
      to: connectionTo
    };

    console.log('💍 Creating new relationship:', newRelationship);

    // Record in history (record the primary relationship, automatic ones will be re-created on redo)
    const action: HistoryAction = {
      type: 'ADD_RELATIONSHIP',
      relationship: newRelationship
    };
    setHistory(prev => addToHistory(prev, action));
    
    setFamilyTree(prev => {
      let relationshipsToAdd = [newRelationship];
      
      // AUTOMATIC RELATIONSHIP PROPAGATION FOR PARENT-CHILD
      if (type === 'parent-child') {
        console.log('🔍 Checking for automatic relationship propagation...');
        
        const existingSpouseRelationships = prev.relationships.filter(rel => rel.type === 'spouse');
        const fromPerson = prev.people.find(p => p.id === connectionFrom);
        const toPerson = prev.people.find(p => p.id === connectionTo);
        
        if (!fromPerson || !toPerson) return prev;
        
        // Determine who is the parent and who is the child based on generation
        let parentId: string | null = null;
        let childId: string | null = null;
        
        if (fromPerson.generation < toPerson.generation) {
          // fromPerson is older generation (parent), toPerson is younger (child)
          parentId = connectionFrom;
          childId = connectionTo;
        } else if (toPerson.generation < fromPerson.generation) {
          // toPerson is older generation (parent), fromPerson is younger (child)  
          parentId = connectionTo;
          childId = connectionFrom;
        }
        
        // Only propagate if we can clearly identify parent and child
        if (parentId && childId) {
          console.log(`👨‍👩‍👧‍👦 Parent: ${parentId}, Child: ${childId}`);
          
          // 1️⃣ AUTOMATIC SPOUSE PROPAGATION
          // If the PARENT has a spouse, automatically connect spouse to child
          const parentSpouseRel = existingSpouseRelationships.find(rel => 
            rel.from === parentId || rel.to === parentId
          );
          
          if (parentSpouseRel) {
            const spouseId = parentSpouseRel.from === parentId ? parentSpouseRel.to : parentSpouseRel.from;
            
            // Check if spouse->child relationship already exists
            const spouseChildExists = prev.relationships.some(rel =>
              rel.type === 'parent-child' &&
              rel.from === spouseId &&
              rel.to === childId
            );
            
            if (!spouseChildExists) {
              console.log(`💕 Parent ${parentId} has spouse ${spouseId}, creating relationship with child ${childId}`);
              
              const automaticSpouseRelationship: Relationship = {
                id: `rel_${Date.now()}_stepparent`,
                type: 'parent-child',
                from: spouseId,
                to: childId
              };
              relationshipsToAdd.push(automaticSpouseRelationship);
            }
          }
          
          // 2️⃣ NEW: AUTOMATIC SIBLING PROPAGATION
          // If the CHILD has siblings, automatically connect parent to all siblings
          // Find all siblings of the child (people who share at least one parent with the child)
          const childParentRels = prev.relationships.filter(rel =>
            rel.type === 'parent-child' && rel.to === childId
          );
          
          const childParentIds = childParentRels.map(rel => rel.from);
          console.log(`🔍 Child ${childId} has ${childParentIds.length} existing parent(s)`);
          
          // Find siblings: children who share at least one parent with the child
          const siblings: string[] = [];
          prev.relationships.forEach(rel => {
            if (rel.type === 'parent-child' && 
                rel.to !== childId && // Not the child itself
                childParentIds.includes(rel.from)) { // Shares a parent
              
              // Check if this sibling is already in the list
              if (!siblings.includes(rel.to)) {
                siblings.push(rel.to);
              }
            }
          });
          
          // 🔧 CRITICAL FIX: Also check if parent's SPOUSE has existing children
          // These are siblings too! (e.g., Brother connected to Mother, User connecting to Father)
          if (parentSpouseRel) {
            const spouseId = parentSpouseRel.from === parentId ? parentSpouseRel.to : parentSpouseRel.from;
            console.log(`🔍 Checking spouse ${spouseId} for existing children (potential siblings)`);
            
            // Find all children of the spouse
            const spouseChildren = prev.relationships.filter(rel =>
              rel.type === 'parent-child' && 
              rel.from === spouseId &&
              rel.to !== childId // Not the child itself
            );
            
            if (spouseChildren.length > 0) {
              console.log(`👥 Found ${spouseChildren.length} existing children of spouse (siblings via spouse parent)`);
              
              spouseChildren.forEach(rel => {
                const spouseChildId = rel.to;
                
                // Add to siblings list if not already there
                if (!siblings.includes(spouseChildId)) {
                  const spouseChildPerson = prev.people.find(p => p.id === spouseChildId);
                  console.log(`   ✨ Adding spouse's child ${spouseChildId} (${spouseChildPerson?.firstName}) as sibling`);
                  siblings.push(spouseChildId);
                }
              });
            }
          }
          
          if (siblings.length > 0) {
            console.log(`👥 Found ${siblings.length} sibling(s) of child ${childId}:`, siblings);
            
            // For each sibling, create parent-child relationship if it doesn't exist
            siblings.forEach(siblingId => {
              const siblingPerson = prev.people.find(p => p.id === siblingId);
              
              // Check if parent->sibling relationship already exists
              const parentSiblingExists = prev.relationships.some(rel =>
                rel.type === 'parent-child' &&
                rel.from === parentId &&
                rel.to === siblingId
              );
              
              if (!parentSiblingExists) {
                console.log(`✨ Auto-connecting parent ${parentId} to sibling ${siblingId} (${siblingPerson?.firstName})`);
                
                const automaticSiblingRelationship: Relationship = {
                  id: `rel_${Date.now()}_sibling_${siblingId}`,
                  type: 'parent-child',
                  from: parentId,
                  to: siblingId
                };
                relationshipsToAdd.push(automaticSiblingRelationship);
                
                // 3️⃣ ALSO CONNECT PARENT'S SPOUSE TO SIBLING (if spouse exists)
                if (parentSpouseRel) {
                  const spouseId = parentSpouseRel.from === parentId ? parentSpouseRel.to : parentSpouseRel.from;
                  
                  const spouseSiblingExists = prev.relationships.some(rel =>
                    rel.type === 'parent-child' &&
                    rel.from === spouseId &&
                    rel.to === siblingId
                  );
                  
                  if (!spouseSiblingExists) {
                    console.log(`✨ Auto-connecting spouse ${spouseId} to sibling ${siblingId}`);
                    
                    const automaticSpouseSiblingRelationship: Relationship = {
                      id: `rel_${Date.now()}_spouse_sibling_${siblingId}`,
                      type: 'parent-child',
                      from: spouseId,
                      to: siblingId
                    };
                    relationshipsToAdd.push(automaticSpouseSiblingRelationship);
                  }
                }
              }
            });
          } else {
            console.log('ℹ️ No siblings found for automatic propagation');
          }
        } else {
          console.log('⚠️ Could not determine parent/child roles - no automatic propagation');
        }
      }
      
      const updated = {
        ...prev,
        relationships: [...prev.relationships, ...relationshipsToAdd]
      };
      
      if (relationshipsToAdd.length > 1) {
        console.log('📊 Automatic relationship propagation complete!');
        console.log(`   ✅ Created ${relationshipsToAdd.length} total relationships:`);
        console.log(`      • 1 primary (manual)`);
        console.log(`      • ${relationshipsToAdd.length - 1} automatic (spouse + siblings)`);
      }
      
      return updated;
    });

    setConnectionFrom(null);
    setConnectionTo(null);
    setShowConnectionDialog(false);

    const fromPerson = familyTree.people.find(p => p.id === connectionFrom);
    const toPerson = familyTree.people.find(p => p.id === connectionTo);
    
    // Calculate how many automatic relationships were created
    const totalRelationshipsCreated = type === 'parent-child' ? (() => {
      let count = 1; // The main relationship
      
      // Count spouse propagation
      const hasParentSpouse = familyTree.relationships.some(rel => 
        rel.type === 'spouse' && (rel.from === connectionFrom || rel.to === connectionFrom || rel.from === connectionTo || rel.to === connectionTo)
      );
      if (hasParentSpouse) count++;
      
      // Count sibling propagation (estimate based on shared parents)
      const childId = fromPerson && toPerson && fromPerson.generation < toPerson.generation ? connectionTo : connectionFrom;
      const childParentRels = familyTree.relationships.filter(rel => rel.type === 'parent-child' && rel.to === childId);
      const childParentIds = childParentRels.map(rel => rel.from);
      const siblings = new Set<string>();
      
      familyTree.relationships.forEach(rel => {
        if (rel.type === 'parent-child' && rel.to !== childId && childParentIds.includes(rel.from)) {
          siblings.add(rel.to);
        }
      });
      
      if (siblings.size > 0) {
        count += siblings.size; // One per sibling
        if (hasParentSpouse) count += siblings.size; // Plus spouse connections
      }
      
      return count;
    })() : 1;
    
    // Show appropriate success message
    if (totalRelationshipsCreated > 1) {
      toast.success(`✨ ${totalRelationshipsCreated} relationships created! ${fromPerson?.firstName} connected to ${toPerson?.firstName} and family members automatically.`);
    } else {
      toast.success(`${type === 'spouse' ? 'Marriage' : 'Parent-child'} relationship created for ${fromPerson?.firstName} and ${toPerson?.firstName}!`);
    }
    
    // Auto-scroll to show the relationship
    setTimeout(() => {
      const container = document.getElementById('canvas-scroll-container');
      if (container && fromPerson && toPerson) {
        const centerX = (fromPerson.position.x + toPerson.position.x) / 2;
        const scrollX = centerX - container.clientWidth / 2;
        container.scrollTo({ left: Math.max(0, scrollX), behavior: 'smooth' });
        console.log('📍 Auto-scrolling to show relationship at x:', centerX);
      }
    }, 100);
  }, [connectionFrom, connectionTo, familyTree.people, familyTree.relationships]);

  // Hide main scrollbar on mobile for cleaner UX
  useEffect(() => {
    if (isMobile) {
      document.body.classList.add('scrollbar-hide');
    } else {
      document.body.classList.remove('scrollbar-hide');
    }
    
    // Cleanup on unmount
    return () => {
      document.body.classList.remove('scrollbar-hide');
    };
  }, [isMobile]);

  // Auto-center on root user when zoom level changes
  useEffect(() => {
    const currentZoom = isMobile ? mobileZoomLevel : desktopZoomLevel;
    
    // Detect significant zoom change (more than 0.1 difference)
    const zoomDelta = Math.abs(currentZoom - previousZoomLevel.current);
    if (zoomDelta > 0.1) {
      // Auto-center on root user after zoom to prevent viewing empty canvas
      setTimeout(() => {
        centerOnUser(false); // Don't show toast for auto-centering
      }, 100);
      
      // Update previous zoom level
      previousZoomLevel.current = currentZoom;
    }
  }, [mobileZoomLevel, desktopZoomLevel, isMobile, centerOnUser]);

  // Handle desktop zoom with Ctrl+Scroll
  useEffect(() => {
    if (isMobile) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const newZoom = Math.max(0.5, Math.min(3, desktopZoomLevel + delta));
        setDesktopZoomLevel(newZoom);
      }
    };

    const canvas = document.getElementById('canvas-scroll-container');
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false });
      return () => canvas.removeEventListener('wheel', handleWheel);
    }
  }, [desktopZoomLevel, isMobile]);

  // Start connecting mode
  const startConnecting = () => {
    setIsConnecting(true);
    setConnectionFrom(null);
    setConnectionTo(null);
    setShowConnectionDialog(false);
    toast.info('Connection mode activated! Click the first person, then click the second person to connect them.');
  };

  // Cancel connecting mode
  const cancelConnecting = () => {
    setIsConnecting(false);
    setConnectionFrom(null);
    setConnectionTo(null);
    setShowConnectionDialog(false);
  };

  // Start connection mode from a specific person (from quick menu)
  const handleStartConnectionFrom = useCallback((personId: string) => {
    setIsConnecting(true);
    setConnectionFrom(personId);
    setConnectionTo(null);
    setShowConnectionDialog(false);
    setQuickMenuPersonId(null);
    toast.info('📍 Click another person to connect them');
  }, []);

  // Handle grid add button click
  const handleGridAddClick = useCallback((generation: -2 | -1 | 0 | 1 | 2, gridSlot: number) => {
    console.log('➕ Grid add button clicked:', { generation, gridSlot });
    setContextualAddGeneration(generation);
    setContextualAddGridSlot(gridSlot);
    setShowContextualAddDialog(true);
  }, []);

  // Handle welcome wizard completion
  const handleWizardComplete = useCallback((wizardData: any) => {
    console.log('🎉 Welcome wizard completed with data:', wizardData);
    
    const rootUser = familyTree.people.find(p => p.isRoot);
    if (!rootUser) {
      toast.error('Root user not found');
      return;
    }

    const rootSlot = rootUser.gridSlot || Math.floor(GRID_CONFIG.getSlotCount() / 2);
    const newPeople: InteractivePerson[] = [];
    const newRelationships: Relationship[] = [];

    // Calculate positions for family members
    // Spouse: +2 slots to the right
    // Siblings: -2, -4, -6... slots to the left
    // Parents: centered above user and siblings
    // Children: centered below user and spouse

    // Add Spouse
    if (wizardData.hasSpouse && wizardData.spouse) {
      const spouseSlot = rootSlot + 2;
      const spouse: InteractivePerson = {
        id: generateId(),
        firstName: wizardData.spouse.split(' ')[0] || wizardData.spouse,
        lastName: wizardData.spouse.split(' ').slice(1).join(' ') || undefined,
        gender: wizardData.spouseGender,
        status: 'alive',
        generation: 0,
        dateOfBirth: undefined, // 🔧 FIX: Explicit undefined - wizards don't collect DOB (add later via profile)
        gridSlot: spouseSlot,
        position: {
          x: GRID_CONFIG.getSlotX(spouseSlot),
          y: GENERATION_Y_POSITIONS['0']
        }
      };
      newPeople.push(spouse);
      
      // Create spouse relationship
      newRelationships.push({
        id: `rel_${Date.now()}_spouse`,
        type: 'spouse',
        from: rootUser.id,
        to: spouse.id
      });
    }

    // Add Siblings (with their spouses to the LEFT, no gaps between sibling units)
    const siblings: InteractivePerson[] = [];
    const siblingsWithNames = wizardData.siblings.filter((s: any) => s.name);
    const siblingCount = siblingsWithNames.length;
    
    // Calculate initial offset for first sibling based on USER'S CHILDREN COUNT (not sibling count)
    // Pattern: 1-2 children: -1, 3 children: -4, 4 children: -7, etc.
    const childrenWithNames = wizardData.children.filter((c: any) => c.name);
    const childCount = childrenWithNames.length;
    const firstSiblingOffset = -1 - Math.max(0, (childCount - 2) * 3);
    let currentSlot = rootSlot + firstSiblingOffset;
    
    console.log('👨‍👩‍👧‍👦 Starting sibling positioning. Root user at slot:', rootSlot);
    console.log(`📊 User has ${childCount} children, Total siblings: ${siblingCount}, First sibling offset: ${firstSiblingOffset}, Starting at slot: ${currentSlot}`);
    
    wizardData.siblings.forEach((siblingData: any, index: number) => {
      if (siblingData.name) {
        // First sibling uses the calculated starting slot, others placed with +1 gap to the left
        const siblingSlot = index === 0 ? currentSlot : currentSlot - 2; // -2 = 1 gap + 1 sibling position
        
        console.log(`  Sibling ${index + 1} (${siblingData.name}): Placed at slot ${siblingSlot}`);
        
        const sibling: InteractivePerson = {
          id: generateId(),
          firstName: siblingData.name.split(' ')[0] || siblingData.name,
          lastName: siblingData.name.split(' ').slice(1).join(' ') || undefined,
          gender: siblingData.gender,
          status: 'alive',
          generation: 0,
          dateOfBirth: undefined, // 🔧 FIX: Explicit undefined - wizards don't collect DOB (add later via profile)
          gridSlot: siblingSlot,
          position: {
            x: GRID_CONFIG.getSlotX(siblingSlot),
            y: GENERATION_Y_POSITIONS['0']
          }
        };
        newPeople.push(sibling);
        siblings.push(sibling);

        // Add sibling's spouse if married
        if (siblingData.isMarried && siblingData.spouseName) {
          // Spouse is 2 slots to the left of sibling (gap at siblingSlot-1 for connector)
          const spouseSlot = siblingSlot - 2;
          
          console.log(`    ↳ Sibling is married: spouse at slot ${spouseSlot} (connector gap at ${siblingSlot - 1})`);
          
          const siblingSpouse: InteractivePerson = {
            id: generateId(),
            firstName: siblingData.spouseName.split(' ')[0] || siblingData.spouseName,
            lastName: siblingData.spouseName.split(' ').slice(1).join(' ') || undefined,
            gender: siblingData.spouseGender,
            status: 'alive',
            generation: 0,
            dateOfBirth: undefined, // 🔧 FIX: Explicit undefined - wizards don't collect DOB (add later via profile)
            gridSlot: spouseSlot,
            position: {
              x: GRID_CONFIG.getSlotX(spouseSlot),
              y: GENERATION_Y_POSITIONS['0']
            }
          };
          newPeople.push(siblingSpouse);

          // Create spouse relationship
          newRelationships.push({
            id: `rel_${Date.now()}_sibling_${index}_spouse`,
            type: 'spouse',
            from: sibling.id,
            to: siblingSpouse.id
          });
          
          // Next sibling will be placed with +1 gap left of spouse
          currentSlot = spouseSlot; // Next sibling at spouseSlot - 2 (gap at -1, sibling at -2)
          console.log(`    ↳ Next sibling will start from slot ${currentSlot} (with +1 gap)`);
        } else {
          // Next sibling will be placed with +1 gap left of this sibling
          currentSlot = siblingSlot; // Next sibling at siblingSlot - 2 (gap at -1, sibling at -2)
          console.log(`    ↳ Sibling unmarried, next sibling will start from slot ${currentSlot} (with +1 gap)`);
        }
      }
    });

    // Add Father (directly above user at same slot)
    if (wizardData.father) {
      const fatherSlot = rootSlot;  // Same slot as root user
      const father: InteractivePerson = {
        id: generateId(),
        firstName: wizardData.father.split(' ')[0] || wizardData.father,
        lastName: wizardData.father.split(' ').slice(1).join(' ') || undefined,
        gender: 'male',
        status: 'alive',
        generation: -1,
        dateOfBirth: undefined, // 🔧 FIX: Explicit undefined - wizards don't collect DOB (add later via profile)
        gridSlot: fatherSlot,
        position: {
          x: GRID_CONFIG.getSlotX(fatherSlot),
          y: GENERATION_Y_POSITIONS['-1']
        }
      };
      newPeople.push(father);

      // Create parent-child relationships with user and siblings
      newRelationships.push({
        id: `rel_${Date.now()}_father_user`,
        type: 'parent-child',
        from: father.id,
        to: rootUser.id
      });

      siblings.forEach(sibling => {
        newRelationships.push({
          id: `rel_${Date.now()}_father_${sibling.id}`,
          type: 'parent-child',
          from: father.id,
          to: sibling.id
        });
      });
    }

    // Add Mother (2 slots to the left of father)
    if (wizardData.mother) {
      const motherSlot = rootSlot - 2;  // 2 slots left of father/user
      const mother: InteractivePerson = {
        id: generateId(),
        firstName: wizardData.mother.split(' ')[0] || wizardData.mother,
        lastName: wizardData.mother.split(' ').slice(1).join(' ') || undefined,
        gender: 'female',
        status: 'alive',
        generation: -1,
        dateOfBirth: undefined, // 🔧 FIX: Explicit undefined - wizards don't collect DOB (add later via profile)
        gridSlot: motherSlot,
        position: {
          x: GRID_CONFIG.getSlotX(motherSlot),
          y: GENERATION_Y_POSITIONS['-1']
        }
      };
      newPeople.push(mother);

      // Create parent-child relationships with user and siblings
      newRelationships.push({
        id: `rel_${Date.now()}_mother_user`,
        type: 'parent-child',
        from: mother.id,
        to: rootUser.id
      });

      siblings.forEach(sibling => {
        newRelationships.push({
          id: `rel_${Date.now()}_mother_${sibling.id}`,
          type: 'parent-child',
          from: mother.id,
          to: sibling.id
        });
      });
    }

    // 🔧 NEW FIX: Create explicit sibling relationships between root user and all siblings
    // This ensures the relationship engine doesn't have to infer relationships
    siblings.forEach((sibling, index) => {
      // Create relationship between root user and this sibling
      newRelationships.push({
        id: `rel_${Date.now()}_sibling_root_${index}`,
        type: 'sibling',
        from: rootUser.id,
        to: sibling.id
      });
      
      // Create relationships between this sibling and all previous siblings
      for (let i = 0; i < index; i++) {
        newRelationships.push({
          id: `rel_${Date.now()}_sibling_${i}_${index}`,
          type: 'sibling',
          from: siblings[i].id,
          to: sibling.id
        });
      }
    });
    console.log(`✅ Created ${siblings.length} explicit sibling relationships with root user`);

    if (wizardData.father && wizardData.mother) {
      // Create spouse relationship between parents if both exist
      if (!wizardData.parentsNotTogether) {
        const fatherId = newPeople.find(p => p.firstName === wizardData.father.split(' ')[0] && p.generation === -1)?.id;
        const motherId = newPeople.find(p => p.firstName === wizardData.mother.split(' ')[0] && p.generation === -1)?.id;
        if (fatherId && motherId) {
          newRelationships.push({
            id: `rel_${Date.now()}_parents_spouse`,
            type: 'spouse',
            from: motherId,
            to: fatherId
          });
        }
      }
    }

    // Add Children with smart positioning and collision avoidance
    const spouse = newPeople.find(p => p.generation === 0 && p.id !== rootUser.id && !siblings.includes(p));
    // childrenWithNames already declared above for sibling positioning calculations
    
    console.log('👶 Starting children positioning. Root user at slot:', rootSlot);
    
    // Track positions as we build the children
    let rightSidePosition = rootSlot + 2; // Tracks next available starting slot on right side
    let leftSidePosition = rootSlot; // Will be set after first child
    
    wizardData.children.forEach((childData: any, index: number) => {
      if (childData.name) {
        let childSlot: number;
        let childSpouseSlot: number | null = null;
        
        if (index === 0) {
          // FIRST CHILD: Always directly below root user
          childSlot = rootSlot;
          console.log(`  Child ${index + 1} (${childData.name}): Placed at slot ${childSlot} (directly below root)`);
          
          // If first child is married, reserve space for spouse and connector
          if (childData.isMarried && childData.spouseName) {
            childSpouseSlot = rootSlot - 2; // Spouse at -2 (gap at -1 for connector)
            leftSidePosition = rootSlot - 3; // Next left-side child starts at -3 (accounts for spouse area)
            console.log(`    ↳ First child is married: spouse at ${childSpouseSlot}, next left child will start at ${leftSidePosition}`);
          } else {
            leftSidePosition = rootSlot - 2; // Next left-side child starts at -2
            console.log(`    ↳ First child is unmarried: next left child will start at ${leftSidePosition}`);
          }
          
          console.log(`    ↳ Right side positioning starts at ${rightSidePosition}`);
        } 
        else if (index % 2 === 1) {
          // ODD INDEX (2nd, 4th, 6th...) = RIGHT SIDE
          if (childData.isMarried && childData.spouseName) {
            // For married children: spouse at rightSidePosition - 1, gap at rightSidePosition, child at rightSidePosition + 1
            childSlot = rightSidePosition + 1;
            childSpouseSlot = rightSidePosition - 1;
            console.log(`  Child ${index + 1} (${childData.name}): RIGHT side, married - spouse at ${childSpouseSlot}, gap at ${rightSidePosition}, child at ${childSlot}`);
            rightSidePosition = childSlot + 2; // Next right child starts 2 slots further from THIS child
          } else {
            // Unmarried child placed at rightSidePosition
            childSlot = rightSidePosition;
            console.log(`  Child ${index + 1} (${childData.name}): RIGHT side, unmarried - placed at ${childSlot}`);
            rightSidePosition = childSlot + 2; // Next right child starts 2 slots further
          }
        } 
        else {
          // EVEN INDEX (3rd, 5th, 7th...) = LEFT SIDE
          childSlot = leftSidePosition;
          
          if (childData.isMarried && childData.spouseName) {
            // Married child on left: spouse 2 slots to the left (gap in between)
            childSpouseSlot = leftSidePosition - 2;
            console.log(`  Child ${index + 1} (${childData.name}): LEFT side, married - child at ${childSlot}, gap at ${leftSidePosition - 1}, spouse at ${childSpouseSlot}`);
            leftSidePosition = childSpouseSlot - 2; // Next left child starts 2 slots left of the spouse
          } else {
            // Unmarried child on left
            console.log(`  Child ${index + 1} (${childData.name}): LEFT side, unmarried - placed at ${childSlot}`);
            leftSidePosition = childSlot - 2; // Next left child starts 2 slots further left
          }
        }
        
        // Create the child
        const child: InteractivePerson = {
          id: generateId(),
          firstName: childData.name.split(' ')[0] || childData.name,
          lastName: childData.name.split(' ').slice(1).join(' ') || undefined,
          gender: childData.gender,
          status: 'alive',
          generation: 1,
          dateOfBirth: undefined, // 🔧 FIX: Explicit undefined - wizards don't collect DOB (add later via profile)
          gridSlot: childSlot,
          position: {
            x: GRID_CONFIG.getSlotX(childSlot),
            y: GENERATION_Y_POSITIONS['1']
          }
        };
        newPeople.push(child);

        // Create parent-child relationship with user
        newRelationships.push({
          id: `rel_${Date.now()}_user_child_${index}`,
          type: 'parent-child',
          from: rootUser.id,
          to: child.id
        });

        // Create parent-child relationship with user's spouse if exists
        if (spouse) {
          newRelationships.push({
            id: `rel_${Date.now()}_spouse_child_${index}`,
            type: 'parent-child',
            from: spouse.id,
            to: child.id
          });
        }

        // Add child's spouse if married
        if (childData.isMarried && childData.spouseName && childSpouseSlot !== null) {
          const childSpouse: InteractivePerson = {
            id: generateId(),
            firstName: childData.spouseName.split(' ')[0] || childData.spouseName,
            lastName: childData.spouseName.split(' ').slice(1).join(' ') || undefined,
            gender: childData.spouseGender,
            status: 'alive',
            generation: 1,
            dateOfBirth: undefined, // 🔧 FIX: Explicit undefined - wizards don't collect DOB (add later via profile)
            gridSlot: childSpouseSlot,
            position: {
              x: GRID_CONFIG.getSlotX(childSpouseSlot),
              y: GENERATION_Y_POSITIONS['1']
            }
          };
          newPeople.push(childSpouse);

          // Create spouse relationship ONLY - child's spouse is NOT a child of the user!
          newRelationships.push({
            id: `rel_${Date.now()}_child_${index}_spouse`,
            type: 'spouse',
            from: child.id,
            to: childSpouse.id
          });
          
          console.log(`💑 Added spouse ${childSpouse.firstName} for child ${child.firstName} - NO parent-child links to user`);
        }
      }
    });

    // Update family tree
    setFamilyTree(prev => {
      const allPeople = [...prev.people, ...newPeople];
      const allRelationships = [...prev.relationships, ...newRelationships];
      const counts = updateGenerationCounts(allPeople);

      return {
        ...prev,
        people: allPeople,
        relationships: allRelationships,
        generationLimits: Object.keys(prev.generationLimits).reduce((acc, gen) => ({
          ...acc,
          [gen]: { 
            current: counts[gen as keyof typeof counts], 
            max: prev.generationLimits[gen as keyof typeof prev.generationLimits].max 
          }
        }), {} as typeof prev.generationLimits)
      };
    });

    // Mark onboarding as complete
    localStorage.setItem('familyTree_onboardingComplete', 'true');
    setShowWelcomeWizard(false);
    setWizardCompletions(prev => ({ ...prev, welcome: true }));

    // 🎉 Celebrate first family member(s) added via wizard!
    import('../utils/confettiService').then(({ celebrateFirstMember }) => {
      celebrateFirstMember();
    });
    
    toast.success(`🎉 Created your nuclear family with ${newPeople.length + 1} people and ${newRelationships.length} relationships!`);
    
    // Inform user about manual addition for future members
    setTimeout(() => {
      toast.info('💡 Wizard completed! Use the + buttons on canvas to add more family members.', {
        duration: 5000
      });
    }, 2000);

    // Auto-center on root user
    setTimeout(() => {
      centerOnUser();
    }, 500);
  }, [familyTree.people, updateGenerationCounts, centerOnUser]);

  // Handle welcome wizard skip
  const handleWizardSkip = useCallback(() => {
    localStorage.setItem('familyTree_onboardingComplete', 'true');
    setShowWelcomeWizard(false);
    setWizardCompletions(prev => ({ ...prev, welcome: true }));
    toast.info('Welcome wizard skipped. Use the + buttons on canvas to add family members!');
  }, []);

  // Helper functions to detect family members
  const getRootUser = useCallback(() => {
    return familyTree.people.find(p => p.isRoot);
  }, [familyTree.people]);

  const getUserSpouse = useCallback(() => {
    const rootUser = getRootUser();
    if (!rootUser) return null;
    
    const spouseRel = familyTree.relationships.find(rel => 
      rel.type === 'spouse' && (rel.from === rootUser.id || rel.to === rootUser.id)
    );
    
    if (!spouseRel) return null;
    
    const spouseId = spouseRel.from === rootUser.id ? spouseRel.to : spouseRel.from;
    return familyTree.people.find(p => p.id === spouseId);
  }, [familyTree.people, familyTree.relationships, getRootUser]);

  const getUserMother = useCallback(() => {
    const rootUser = getRootUser();
    if (!rootUser) return null;
    
    const parentRels = familyTree.relationships.filter(rel => 
      rel.type === 'parent-child' && rel.to === rootUser.id
    );
    
    const mothers = parentRels
      .map(rel => familyTree.people.find(p => p.id === rel.from && p.gender === 'female'))
      .filter(Boolean);
    
    return mothers[0] || null;
  }, [familyTree.people, familyTree.relationships, getRootUser]);

  const getUserFather = useCallback(() => {
    const rootUser = getRootUser();
    if (!rootUser) return null;
    
    const parentRels = familyTree.relationships.filter(rel => 
      rel.type === 'parent-child' && rel.to === rootUser.id
    );
    
    const fathers = parentRels
      .map(rel => familyTree.people.find(p => p.id === rel.from && p.gender === 'male'))
      .filter(Boolean);
    
    return fathers[0] || null;
  }, [familyTree.people, familyTree.relationships, getRootUser]);

  // Handle In-Laws Wizard completion
  const handleInLawsComplete = useCallback((data: InLawsWizardData) => {
    console.log('💑 In-Laws wizard completed with data:', data);
    
    const spouse = getUserSpouse();
    if (!spouse) {
      toast.error('Spouse not found');
      return;
    }

    const spouseSlot = spouse.gridSlot || Math.floor(GRID_CONFIG.getSlotCount() / 2);
    const newPeople: InteractivePerson[] = [];
    const newRelationships: Relationship[] = [];

    console.log('👰 Spouse position:', { spouseSlot, spouseName: spouse.firstName });

    // Add mother-in-law (directly above spouse's node at same slot)
    if (data.motherInLaw) {
      const motherSlot = spouseSlot; // Same slot as spouse
      console.log('👩 Mother-in-law positioned at slot:', motherSlot, '(above spouse)');
      
      const motherInLaw: InteractivePerson = {
        id: generateId(),
        firstName: data.motherInLaw.split(' ')[0] || data.motherInLaw,
        lastName: data.motherInLaw.split(' ').slice(1).join(' ') || undefined,
        gender: 'female',
        status: 'alive',
        generation: -1,
        gridSlot: motherSlot,
        position: {
          x: GRID_CONFIG.getSlotX(motherSlot),
          y: GENERATION_Y_POSITIONS['-1']
        }
      };
      newPeople.push(motherInLaw);

      // Create parent-child relationship with spouse
      newRelationships.push({
        id: `rel_${Date.now()}_mother_inlaw`,
        type: 'parent-child',
        from: motherInLaw.id,
        to: spouse.id
      });
    }

    // Add father-in-law (+2 from mother-in-law, with connector gap at +1)
    if (data.fatherInLaw) {
      const fatherSlot = data.motherInLaw ? spouseSlot + 2 : spouseSlot; // +2 from mother, gap at +1 for connector
      console.log('👨 Father-in-law positioned at slot:', fatherSlot, '(+2 from mother-in-law)');
      
      const fatherInLaw: InteractivePerson = {
        id: generateId(),
        firstName: data.fatherInLaw.split(' ')[0] || data.fatherInLaw,
        lastName: data.fatherInLaw.split(' ').slice(1).join(' ') || undefined,
        gender: 'male',
        status: 'alive',
        generation: -1,
        gridSlot: fatherSlot,
        position: {
          x: GRID_CONFIG.getSlotX(fatherSlot),
          y: GENERATION_Y_POSITIONS['-1']
        }
      };
      newPeople.push(fatherInLaw);

      // Create parent-child relationship with spouse
      newRelationships.push({
        id: `rel_${Date.now()}_father_inlaw`,
        type: 'parent-child',
        from: fatherInLaw.id,
        to: spouse.id
      });

      // Create spouse relationship between in-laws if both exist and not separated
      if (data.motherInLaw && !data.parentsNotTogether) {
        const motherInLaw = newPeople.find(p => p.firstName === data.motherInLaw!.split(' ')[0] && p.generation === -1);
        if (motherInLaw) {
          newRelationships.push({
            id: `rel_${Date.now()}_inlaws_spouse`,
            type: 'spouse',
            from: motherInLaw.id,
            to: fatherInLaw.id
          });
          console.log('💑 In-laws married: connector line at slot', spouseSlot + 1);
        }
      }
    }

    // Get user's children count to determine spacing pattern
    const rootUser = familyTree.people.find(p => p.isRoot);
    const userChildren = rootUser ? familyTree.relationships.filter(rel => 
      rel.type === 'parent-child' && rel.from === rootUser.id
    ).map(rel => familyTree.people.find(p => p.id === rel.to)).filter(Boolean) : [];
    const childCount = userChildren.length;
    
    // Calculate initial offset for first sibling's spouse based on USER & SPOUSE's CHILDREN COUNT
    // Pattern: 1-2 children: +1, 3+ children: +2
    const firstSiblingSpouseOffset = childCount >= 3 ? 2 : 1;
    
    // Add spouse's siblings - starting from spouse and working to the right
    let currentPosition = spouseSlot; // Track the rightmost occupied position
    
    console.log('👨‍👩‍👧‍👦 Starting spouse siblings placement from slot:', currentPosition);
    console.log(`📊 User & spouse have ${childCount} children, first sibling's spouse offset: +${firstSiblingSpouseOffset}`);
    
    data.siblings.forEach((siblingData, index) => {
      if (siblingData.name) {
        if (siblingData.isMarried && siblingData.spouseName) {
          // MARRIED sibling: spouse first, gap, then sibling
          // First sibling uses calculated offset, others use +1 gap from previous sibling
          const siblingSpouseSlot = index === 0 
            ? currentPosition + firstSiblingSpouseOffset 
            : currentPosition + 2; // +2 = 1 gap + 1 for spouse position
          const connectorSlot = siblingSpouseSlot + 1; // Gap for connector line
          const siblingSlot = connectorSlot + 1; // Sibling to the right of connector
          
          console.log(`  Sibling ${index + 1} (${siblingData.name}) - MARRIED:`);
          console.log(`    Spouse at slot ${siblingSpouseSlot}, connector gap at ${connectorSlot}, sibling at ${siblingSlot}`);
          
          // Add sibling's spouse
          const siblingSpouse: InteractivePerson = {
            id: generateId(),
            firstName: siblingData.spouseName.split(' ')[0] || siblingData.spouseName,
            lastName: siblingData.spouseName.split(' ').slice(1).join(' ') || undefined,
            gender: siblingData.spouseGender || (siblingData.gender === 'male' ? 'female' : 'male'),
            status: 'alive',
            generation: 0,
            gridSlot: siblingSpouseSlot,
            position: {
              x: GRID_CONFIG.getSlotX(siblingSpouseSlot),
              y: GENERATION_Y_POSITIONS['0']
            }
          };
          newPeople.push(siblingSpouse);
          
          // Add sibling
          const sibling: InteractivePerson = {
            id: generateId(),
            firstName: siblingData.name.split(' ')[0] || siblingData.name,
            lastName: siblingData.name.split(' ').slice(1).join(' ') || undefined,
            gender: siblingData.gender,
            status: 'alive',
            generation: 0,
            gridSlot: siblingSlot,
            position: {
              x: GRID_CONFIG.getSlotX(siblingSlot),
              y: GENERATION_Y_POSITIONS['0']
            }
          };
          newPeople.push(sibling);

          // Create spouse relationship
          newRelationships.push({
            id: `rel_${Date.now()}_inlaw_sibling_spouse_${index}`,
            type: 'spouse',
            from: siblingSpouse.id,
            to: sibling.id
          });

          // Create parent-child relationships with in-laws
          newPeople.filter(p => p.generation === -1 && newRelationships.some(r => r.to === spouse.id && r.from === p.id)).forEach(parent => {
            newRelationships.push({
              id: `rel_${Date.now()}_${parent.id}_inlaw_sibling_${index}`,
              type: 'parent-child',
              from: parent.id,
              to: sibling.id
            });
          });
          
          currentPosition = siblingSlot; // Next sibling starts after this sibling
        } else {
          // UNMARRIED sibling: first sibling uses calculated offset, others use +2 for gap
          const siblingSlot = index === 0 
            ? currentPosition + 1  // First unmarried sibling: immediate right of spouse
            : currentPosition + 2; // Subsequent: +2 = 1 gap + 1 for position
          
          console.log(`  Sibling ${index + 1} (${siblingData.name}) - UNMARRIED: placed at slot ${siblingSlot}`);
          
          const sibling: InteractivePerson = {
            id: generateId(),
            firstName: siblingData.name.split(' ')[0] || siblingData.name,
            lastName: siblingData.name.split(' ').slice(1).join(' ') || undefined,
            gender: siblingData.gender,
            status: 'alive',
            generation: 0,
            gridSlot: siblingSlot,
            position: {
              x: GRID_CONFIG.getSlotX(siblingSlot),
              y: GENERATION_Y_POSITIONS['0']
            }
          };
          newPeople.push(sibling);

          // Create parent-child relationships with in-laws
          newPeople.filter(p => p.generation === -1 && newRelationships.some(r => r.to === spouse.id && r.from === p.id)).forEach(parent => {
            newRelationships.push({
              id: `rel_${Date.now()}_${parent.id}_inlaw_sibling_${index}`,
              type: 'parent-child',
              from: parent.id,
              to: sibling.id
            });
          });
          
          currentPosition = siblingSlot; // Next sibling starts after this sibling
        }
      }
    });

    // Update family tree
    setFamilyTree(prev => {
      const allPeople = [...prev.people, ...newPeople];
      const allRelationships = [...prev.relationships, ...newRelationships];
      const counts = updateGenerationCounts(allPeople);

      return {
        ...prev,
        people: allPeople,
        relationships: allRelationships,
        generationLimits: Object.keys(prev.generationLimits).reduce((acc, gen) => ({
          ...acc,
          [gen]: { 
            current: counts[gen as keyof typeof counts], 
            max: prev.generationLimits[gen as keyof typeof prev.generationLimits].max 
          }
        }), {} as typeof prev.generationLimits)
      };
    });

    setShowInLawsWizard(false);
    setWizardCompletions(prev => ({ ...prev, inLaws: true }));
    toast.success(`✨ Added ${spouse.firstName}'s family: ${newPeople.length} people and ${newRelationships.length} relationships!`);
    
    // Inform user about manual addition for future members
    setTimeout(() => {
      toast.info('💡 Wizard completed! Use the + buttons on canvas to add more in-laws.', {
        duration: 5000
      });
    }, 2000);

    // Auto-center on the new family
    setTimeout(() => {
      centerOnUser();
    }, 500);
  }, [familyTree.people, updateGenerationCounts, centerOnUser, getUserSpouse]);

  // Handle Maternal Family Wizard completion
  const handleMaternalComplete = useCallback((data: MaternalWizardData) => {
    console.log('👵 Maternal wizard completed with data:', data);
    
    const mother = getUserMother();
    if (!mother) {
      toast.error('Mother not found');
      return;
    }

    const motherSlot = mother.gridSlot || Math.floor(GRID_CONFIG.getSlotCount() / 2);
    const newPeople: InteractivePerson[] = [];
    const newRelationships: Relationship[] = [];

    console.log('👩 Mother position:', { motherSlot, motherName: mother.firstName });

    // Add maternal grandfather (placed -2 node above user's mother)
    if (data.maternalGrandfather) {
      const grandfatherSlot = motherSlot - 2;
      console.log('👴 Maternal grandfather positioned at slot:', grandfatherSlot, '(motherSlot - 2)');
      
      const grandfather: InteractivePerson = {
        id: generateId(),
        firstName: data.maternalGrandfather.split(' ')[0] || data.maternalGrandfather,
        lastName: data.maternalGrandfather.split(' ').slice(1).join(' ') || undefined,
        gender: 'male',
        status: 'alive',
        generation: -2,
        gridSlot: grandfatherSlot,
        position: {
          x: GRID_CONFIG.getSlotX(grandfatherSlot),
          y: GENERATION_Y_POSITIONS['-2']
        }
      };
      newPeople.push(grandfather);

      // Create parent-child relationship with mother
      newRelationships.push({
        id: `rel_${Date.now()}_maternal_grandfather`,
        type: 'parent-child',
        from: grandfather.id,
        to: mother.id
      });
    }

    // Add maternal grandmother (always positioned LEFT of grandfather at grandfatherSlot - 2)
    if (data.maternalGrandmother) {
      const grandfatherSlot = motherSlot - 2;
      const grandmotherSlot = grandfatherSlot - 2; // LEFT of grandfather
      console.log('👵 Maternal grandmother positioned at slot:', grandmotherSlot, '(grandfatherSlot - 2)');
      
      const grandmother: InteractivePerson = {
        id: generateId(),
        firstName: data.maternalGrandmother.split(' ')[0] || data.maternalGrandmother,
        lastName: data.maternalGrandmother.split(' ').slice(1).join(' ') || undefined,
        gender: 'female',
        status: 'alive',
        generation: -2,
        gridSlot: grandmotherSlot,
        position: {
          x: GRID_CONFIG.getSlotX(grandmotherSlot),
          y: GENERATION_Y_POSITIONS['-2']
        }
      };
      newPeople.push(grandmother);

      // Create parent-child relationship with mother
      newRelationships.push({
        id: `rel_${Date.now()}_maternal_grandmother`,
        type: 'parent-child',
        from: grandmother.id,
        to: mother.id
      });

      // Create spouse relationship between grandparents if both exist and not separated
      if (data.maternalGrandfather && !data.grandparentsNotTogether) {
        const grandfather = newPeople.find(p => p.firstName === data.maternalGrandfather.split(' ')[0] && p.generation === -2);
        if (grandfather) {
          newRelationships.push({
            id: `rel_${Date.now()}_maternal_grandparents_spouse`,
            type: 'spouse',
            from: grandmother.id,
            to: grandfather.id
          });
          console.log('💑 Maternal grandparents married: connector line at slot', grandmotherSlot + 1);
        }
      }
    }

    // Get user's last sibling to determine mother's first sibling placement
    const rootUser = familyTree.people.find(p => p.isRoot);
    const userSiblings = rootUser ? familyTree.people.filter(p => 
      p.generation === 0 && p.id !== rootUser.id && 
      familyTree.relationships.some(rel => 
        rel.type === 'parent-child' && rel.to === p.id &&
        familyTree.relationships.some(r => r.type === 'parent-child' && r.to === rootUser.id && r.from === rel.from)
      )
    ).sort((a, b) => (a.gridSlot || 0) - (b.gridSlot || 0)) : [];
    
    const lastUserSibling = userSiblings.length > 0 ? userSiblings[0] : null; // Leftmost sibling (last in chain)
    
    let motherSiblingStartSlot: number;
    if (lastUserSibling) {
      // Check if last user sibling is married
      const siblingSpouseRel = familyTree.relationships.find(rel => 
        rel.type === 'spouse' && (rel.from === lastUserSibling.id || rel.to === lastUserSibling.id)
      );
      
      if (siblingSpouseRel) {
        const spouseId = siblingSpouseRel.from === lastUserSibling.id ? siblingSpouseRel.to : siblingSpouseRel.from;
        const spouse = familyTree.people.find(p => p.id === spouseId);
        if (spouse && spouse.gridSlot) {
          // Last sibling is married: mother's first sibling placed -1 node to spouse
          motherSiblingStartSlot = spouse.gridSlot - 1;
          console.log(`📍 Last user sibling (${lastUserSibling.firstName}) is married, spouse at ${spouse.gridSlot}, mother's first sibling starts at ${motherSiblingStartSlot}`);
        } else {
          motherSiblingStartSlot = (lastUserSibling.gridSlot || 0) - 1;
        }
      } else {
        // Last sibling is unmarried: mother's first sibling placed -1 node to last sibling
        motherSiblingStartSlot = (lastUserSibling.gridSlot || 0) - 1;
        console.log(`📍 Last user sibling (${lastUserSibling.firstName}) is unmarried at ${lastUserSibling.gridSlot}, mother's first sibling starts at ${motherSiblingStartSlot}`);
      }
    } else {
      // No user siblings: start from mother's position and go left
      motherSiblingStartSlot = motherSlot - 1;
      console.log(`📍 No user siblings found, mother's first sibling starts at ${motherSiblingStartSlot} (motherSlot - 1)`);
    }

    // Add mother's siblings (positioned to the LEFT, extending leftward)
    let currentSlot = motherSiblingStartSlot;
    console.log('👨‍👩‍👧‍👦 Starting mother siblings placement from slot:', currentSlot);
    data.motherSiblings.forEach((siblingData, index) => {
      if (siblingData.name) {
        if (siblingData.isMarried && siblingData.spouseName) {
          // MARRIED sibling: spouse on LEFT, connector gap, then sibling
          // First sibling uses starting slot, others use -2 from previous (includes +1 gap)
          const siblingSlot = index === 0 ? currentSlot : currentSlot - 2;
          const connectorSlot = siblingSlot - 1; // Gap for connector line
          const siblingSpouseSlot = connectorSlot - 1; // Spouse to the left of connector
          
          console.log(`  Mother's sibling ${index + 1} (${siblingData.name}) - MARRIED:`);
          console.log(`    Sibling at slot ${siblingSlot}, connector gap at ${connectorSlot}, spouse at ${siblingSpouseSlot}`);
          
          // Add sibling
          const sibling: InteractivePerson = {
            id: generateId(),
            firstName: siblingData.name.split(' ')[0] || siblingData.name,
            lastName: siblingData.name.split(' ').slice(1).join(' ') || undefined,
            gender: siblingData.gender,
            status: 'alive',
            generation: -1,
            gridSlot: siblingSlot,
            position: {
              x: GRID_CONFIG.getSlotX(siblingSlot),
              y: GENERATION_Y_POSITIONS['-1']
            }
          };
          newPeople.push(sibling);

          // Add sibling's spouse
          const siblingSpouse: InteractivePerson = {
            id: generateId(),
            firstName: siblingData.spouseName.split(' ')[0] || siblingData.spouseName,
            lastName: siblingData.spouseName.split(' ').slice(1).join(' ') || undefined,
            gender: siblingData.spouseGender || (siblingData.gender === 'male' ? 'female' : 'male'),
            status: 'alive',
            generation: -1,
            gridSlot: siblingSpouseSlot,
            position: {
              x: GRID_CONFIG.getSlotX(siblingSpouseSlot),
              y: GENERATION_Y_POSITIONS['-1']
            }
          };
          newPeople.push(siblingSpouse);

          // Create spouse relationship
          newRelationships.push({
            id: `rel_${Date.now()}_maternal_sibling_spouse_${index}`,
            type: 'spouse',
            from: siblingSpouse.id,
            to: sibling.id
          });

          // Create parent-child relationships with maternal grandparents
          newPeople.filter(p => p.generation === -2 && newRelationships.some(r => r.to === mother.id && r.from === p.id)).forEach(grandparent => {
            newRelationships.push({
              id: `rel_${Date.now()}_${grandparent.id}_maternal_sibling_${index}`,
              type: 'parent-child',
              from: grandparent.id,
              to: sibling.id
            });
          });
          
          // Next sibling starts from spouse position with -2 offset
          currentSlot = siblingSpouseSlot;
          console.log(`    ↳ Next sibling will start from slot ${currentSlot} (with +1 gap)`);
        } else {
          // UNMARRIED sibling: First sibling uses starting slot, others use -2 for gap
          const siblingSlot = index === 0 ? currentSlot : currentSlot - 2;
          
          console.log(`  Mother's sibling ${index + 1} (${siblingData.name}) - UNMARRIED: placed at slot ${siblingSlot}`);
          
          const sibling: InteractivePerson = {
            id: generateId(),
            firstName: siblingData.name.split(' ')[0] || siblingData.name,
            lastName: siblingData.name.split(' ').slice(1).join(' ') || undefined,
            gender: siblingData.gender,
            status: 'alive',
            generation: -1,
            gridSlot: siblingSlot,
            position: {
              x: GRID_CONFIG.getSlotX(siblingSlot),
              y: GENERATION_Y_POSITIONS['-1']
            }
          };
          newPeople.push(sibling);

          // Create parent-child relationships with maternal grandparents
          newPeople.filter(p => p.generation === -2 && newRelationships.some(r => r.to === mother.id && r.from === p.id)).forEach(grandparent => {
            newRelationships.push({
              id: `rel_${Date.now()}_${grandparent.id}_maternal_sibling_${index}`,
              type: 'parent-child',
              from: grandparent.id,
              to: sibling.id
            });
          });
          
          // Next sibling starts from this sibling with -2 offset
          currentSlot = siblingSlot;
          console.log(`    ↳ Sibling unmarried, next sibling will start from slot ${currentSlot} (with +1 gap)`);
        }
      }
    });

    // Update family tree
    setFamilyTree(prev => {
      const allPeople = [...prev.people, ...newPeople];
      const allRelationships = [...prev.relationships, ...newRelationships];
      const counts = updateGenerationCounts(allPeople);

      return {
        ...prev,
        people: allPeople,
        relationships: allRelationships,
        generationLimits: Object.keys(prev.generationLimits).reduce((acc, gen) => ({
          ...acc,
          [gen]: { 
            current: counts[gen as keyof typeof counts], 
            max: prev.generationLimits[gen as keyof typeof prev.generationLimits].max 
          }
        }), {} as typeof prev.generationLimits)
      };
    });

    setShowMaternalWizard(false);
    setWizardCompletions(prev => ({ ...prev, maternal: true }));
    toast.success(`✨ Added ${mother.firstName}'s family: ${newPeople.length} people and ${newRelationships.length} relationships!`);
    
    // Inform user about manual addition for future members
    setTimeout(() => {
      toast.info("💡 Wizard completed! Use the + buttons on canvas to add more maternal family members.", {
        duration: 5000
      });
    }, 2000);

    // Auto-center on the new family
    setTimeout(() => {
      centerOnUser();
    }, 500);
  }, [familyTree.people, updateGenerationCounts, centerOnUser, getUserMother]);

  // Handle Paternal Family Wizard completion
  const handlePaternalComplete = useCallback((data: PaternalWizardData) => {
    console.log('👴 Paternal wizard completed with data:', data);
    
    const father = getUserFather();
    if (!father) {
      toast.error('Father not found');
      return;
    }

    const fatherSlot = father.gridSlot || Math.floor(GRID_CONFIG.getSlotCount() / 2);
    const newPeople: InteractivePerson[] = [];
    const newRelationships: Relationship[] = [];

    console.log('👨 Father position:', { fatherSlot, fatherName: father.firstName });

    // Add paternal grandmother (placed +2 node above father, positioned LEFT of grandfather)
    if (data.paternalGrandmother) {
      const grandmotherSlot = fatherSlot + 2; // +2 from father (to the RIGHT)
      console.log('👵 Paternal grandmother positioned at slot:', grandmotherSlot, '(fatherSlot + 2)');
      
      const grandmother: InteractivePerson = {
        id: generateId(),
        firstName: data.paternalGrandmother.split(' ')[0] || data.paternalGrandmother,
        lastName: data.paternalGrandmother.split(' ').slice(1).join(' ') || undefined,
        gender: 'female',
        status: 'alive',
        generation: -2,
        gridSlot: grandmotherSlot,
        position: {
          x: GRID_CONFIG.getSlotX(grandmotherSlot),
          y: GENERATION_Y_POSITIONS['-2']
        }
      };
      newPeople.push(grandmother);

      // Create parent-child relationship with father
      newRelationships.push({
        id: `rel_${Date.now()}_paternal_grandmother`,
        type: 'parent-child',
        from: grandmother.id,
        to: father.id
      });
    }

    // Add paternal grandfather (always positioned RIGHT of grandmother at grandmotherSlot + 2)
    if (data.paternalGrandfather) {
      const grandmotherSlot = fatherSlot + 2;
      const grandfatherSlot = grandmotherSlot + 2; // RIGHT of grandmother (fatherSlot + 4)
      console.log('👴 Paternal grandfather positioned at slot:', grandfatherSlot, '(grandmotherSlot + 2 = fatherSlot + 4)');
      
      const grandfather: InteractivePerson = {
        id: generateId(),
        firstName: data.paternalGrandfather.split(' ')[0] || data.paternalGrandfather,
        lastName: data.paternalGrandfather.split(' ').slice(1).join(' ') || undefined,
        gender: 'male',
        status: 'alive',
        generation: -2,
        gridSlot: grandfatherSlot,
        position: {
          x: GRID_CONFIG.getSlotX(grandfatherSlot),
          y: GENERATION_Y_POSITIONS['-2']
        }
      };
      newPeople.push(grandfather);

      // Create parent-child relationship with father
      newRelationships.push({
        id: `rel_${Date.now()}_paternal_grandfather`,
        type: 'parent-child',
        from: grandfather.id,
        to: father.id
      });

      // Create spouse relationship between grandparents if both exist and not separated
      if (data.paternalGrandmother && !data.grandparentsNotTogether) {
        const grandmother = newPeople.find(p => p.firstName === data.paternalGrandmother.split(' ')[0] && p.generation === -2);
        if (grandmother) {
          newRelationships.push({
            id: `rel_${Date.now()}_paternal_grandparents_spouse`,
            type: 'spouse',
            from: grandmother.id,
            to: grandfather.id
          });
          console.log('💑 Paternal grandparents married: connector line at slot', grandmotherSlot + 1);
        }
      }
    }

    // Get user's spouse's last (rightmost) sibling to determine father's first sibling placement
    const rootUser = familyTree.people.find(p => p.isRoot);
    const spouse = rootUser ? getUserSpouse() : null;
    
    // Check if father's FIRST sibling is married (this determines the offset)
    const fatherFirstSibling = data.fatherSiblings[0];
    const isFirstSiblingMarried = fatherFirstSibling?.name && fatherFirstSibling?.isMarried && fatherFirstSibling?.spouseName;
    
    let fatherSiblingStartSlot: number;
    
    if (spouse) {
      // Get spouse's siblings (in-laws)
      const inLawSiblings = familyTree.people.filter(p => 
        p.generation === 0 && p.id !== rootUser?.id && p.id !== spouse.id &&
        familyTree.relationships.some(rel => 
          rel.type === 'parent-child' && rel.to === p.id &&
          familyTree.relationships.some(r => r.type === 'parent-child' && r.to === spouse.id && r.from === rel.from)
        )
      ).sort((a, b) => (b.gridSlot || 0) - (a.gridSlot || 0)); // Sort descending to get rightmost
      
      const lastInLawSibling = inLawSiblings.length > 0 ? inLawSiblings[0] : null; // Rightmost in-law sibling
      
      // IMPORTANT: Reference point is ALWAYS the last in-law SIBLING's position (not their spouse)
      let lastInLawSiblingPosition: number;
      
      if (lastInLawSibling) {
        // Always use the sibling's position as reference
        lastInLawSiblingPosition = lastInLawSibling.gridSlot || 0;
        console.log(`📍 Last in-law sibling: ${lastInLawSibling.firstName} at slot ${lastInLawSiblingPosition}`);
      } else {
        // No in-law siblings: use spouse's position
        lastInLawSiblingPosition = spouse.gridSlot || 0;
        console.log(`📍 No in-law siblings found, using spouse position: ${lastInLawSiblingPosition}`);
      }
      
      // Apply the offset based on father's FIRST sibling's marital status
      // IMPORTANT: fatherSiblingStartSlot represents where to place the SPOUSE (if married) or SIBLING (if unmarried)
      if (isFirstSiblingMarried) {
        // First sibling is MARRIED: spouse at +1, connector at +2, sibling at +3
        fatherSiblingStartSlot = lastInLawSiblingPosition + 1;
        console.log(`📍 Father's first sibling is MARRIED: starting with spouse at ${fatherSiblingStartSlot} (lastInLawSibling + 1), sibling will be at ${fatherSiblingStartSlot + 2}`);
      } else {
        // First sibling is UNMARRIED: +1 offset from last in-law sibling
        fatherSiblingStartSlot = lastInLawSiblingPosition + 1;
        console.log(`📍 Father's first sibling is UNMARRIED: starting at ${fatherSiblingStartSlot} (lastInLawSibling + 1)`);
      }
    } else {
      // No spouse: start from father's position and go right
      if (isFirstSiblingMarried) {
        fatherSiblingStartSlot = fatherSlot + 3;
        console.log(`📍 No spouse, father's first sibling is MARRIED: starting at ${fatherSiblingStartSlot} (fatherSlot + 3)`);
      } else {
        fatherSiblingStartSlot = fatherSlot + 1;
        console.log(`📍 No spouse, father's first sibling is UNMARRIED: starting at ${fatherSiblingStartSlot} (fatherSlot + 1)`);
      }
    }

    // Add father's siblings (positioned to the RIGHT, extending rightward)
    let currentSlot = fatherSiblingStartSlot;
    console.log('👨‍👩‍👧‍👦 Starting father siblings placement from slot:', currentSlot);
    
    data.fatherSiblings.forEach((siblingData, index) => {
      if (siblingData.name) {
        if (siblingData.isMarried && siblingData.spouseName) {
          // MARRIED sibling: spouse on LEFT, connector gap, then sibling on RIGHT
          // First sibling: if married, use starting slot for spouse
          // Others: +2 from previous position (includes +1 gap)
          const siblingSpouseSlot = index === 0 ? currentSlot : currentSlot + 2;
          const connectorSlot = siblingSpouseSlot + 1; // Gap for connector line (sibling - 1)
          const siblingSlot = connectorSlot + 1; // Sibling to the right of connector
          
          console.log(`  Father's sibling ${index + 1} (${siblingData.name}) - MARRIED:`);
          console.log(`    Spouse at slot ${siblingSpouseSlot}, connector gap at ${connectorSlot}, sibling at ${siblingSlot}`);
          
          // Add sibling's spouse
          const siblingSpouse: InteractivePerson = {
            id: generateId(),
            firstName: siblingData.spouseName.split(' ')[0] || siblingData.spouseName,
            lastName: siblingData.spouseName.split(' ').slice(1).join(' ') || undefined,
            gender: siblingData.spouseGender || (siblingData.gender === 'male' ? 'female' : 'male'),
            status: 'alive',
            generation: -1,
            gridSlot: siblingSpouseSlot,
            position: {
              x: GRID_CONFIG.getSlotX(siblingSpouseSlot),
              y: GENERATION_Y_POSITIONS['-1']
            }
          };
          newPeople.push(siblingSpouse);
          
          // Add sibling
          const sibling: InteractivePerson = {
            id: generateId(),
            firstName: siblingData.name.split(' ')[0] || siblingData.name,
            lastName: siblingData.name.split(' ').slice(1).join(' ') || undefined,
            gender: siblingData.gender,
            status: 'alive',
            generation: -1,
            gridSlot: siblingSlot,
            position: {
              x: GRID_CONFIG.getSlotX(siblingSlot),
              y: GENERATION_Y_POSITIONS['-1']
            }
          };
          newPeople.push(sibling);

          // Create spouse relationship
          newRelationships.push({
            id: `rel_${Date.now()}_paternal_sibling_spouse_${index}`,
            type: 'spouse',
            from: siblingSpouse.id,
            to: sibling.id
          });

          // Create parent-child relationships with paternal grandparents
          newPeople.filter(p => p.generation === -2 && newRelationships.some(r => r.to === father.id && r.from === p.id)).forEach(grandparent => {
            newRelationships.push({
              id: `rel_${Date.now()}_${grandparent.id}_paternal_sibling_${index}`,
              type: 'parent-child',
              from: grandparent.id,
              to: sibling.id
            });
          });
          
          // Next sibling starts from this sibling position with +2 offset (includes +1 gap)
          currentSlot = siblingSlot;
          console.log(`    ↳ Next sibling will start from slot ${currentSlot} (with +1 gap)`);
        } else {
          // UNMARRIED sibling: First sibling uses starting slot, others use +2 for gap
          const siblingSlot = index === 0 ? currentSlot : currentSlot + 2;
          
          console.log(`  Father's sibling ${index + 1} (${siblingData.name}) - UNMARRIED: placed at slot ${siblingSlot}`);
          
          const sibling: InteractivePerson = {
            id: generateId(),
            firstName: siblingData.name.split(' ')[0] || siblingData.name,
            lastName: siblingData.name.split(' ').slice(1).join(' ') || undefined,
            gender: siblingData.gender,
            status: 'alive',
            generation: -1,
            gridSlot: siblingSlot,
            position: {
              x: GRID_CONFIG.getSlotX(siblingSlot),
              y: GENERATION_Y_POSITIONS['-1']
            }
          };
          newPeople.push(sibling);

          // Create parent-child relationships with paternal grandparents
          newPeople.filter(p => p.generation === -2 && newRelationships.some(r => r.to === father.id && r.from === p.id)).forEach(grandparent => {
            newRelationships.push({
              id: `rel_${Date.now()}_${grandparent.id}_paternal_sibling_${index}`,
              type: 'parent-child',
              from: grandparent.id,
              to: sibling.id
            });
          });
          
          // Next sibling starts from this sibling with +2 offset (includes +1 gap)
          currentSlot = siblingSlot;
          console.log(`    ↳ Sibling unmarried, next sibling will start from slot ${currentSlot} (with +1 gap)`);
        }
      }
    });

    // Update family tree
    setFamilyTree(prev => {
      const allPeople = [...prev.people, ...newPeople];
      const allRelationships = [...prev.relationships, ...newRelationships];
      const counts = updateGenerationCounts(allPeople);

      return {
        ...prev,
        people: allPeople,
        relationships: allRelationships,
        generationLimits: Object.keys(prev.generationLimits).reduce((acc, gen) => ({
          ...acc,
          [gen]: { 
            current: counts[gen as keyof typeof counts], 
            max: prev.generationLimits[gen as keyof typeof prev.generationLimits].max 
          }
        }), {} as typeof prev.generationLimits)
      };
    });

    setShowPaternalWizard(false);
    setWizardCompletions(prev => ({ ...prev, paternal: true }));
    toast.success(`✨ Added ${father.firstName}'s family: ${newPeople.length} people and ${newRelationships.length} relationships!`);
    
    // Inform user about manual addition for future members
    setTimeout(() => {
      toast.info("💡 Wizard completed! Use the + buttons on canvas to add more paternal family members.", {
        duration: 5000
      });
    }, 2000);

    // Auto-center on the new family
    setTimeout(() => {
      centerOnUser();
    }, 500);
  }, [familyTree.people, familyTree.relationships, updateGenerationCounts, centerOnUser, getUserFather, getUserSpouse]);

  // Handle Undo
  const handleUndo = useCallback(() => {
    if (!canUndo(history)) return;
    
    const { history: newHistory, action } = undo(history);
    if (!action) return;
    
    setHistory(newHistory);
    
    // Reverse the action
    switch (action.type) {
      case 'DELETE_PERSON':
        // Restore deleted person and their relationships
        setFamilyTree(prev => {
          const restoredPeople = [...prev.people, action.person];
          const restoredRelationships = [...prev.relationships, ...action.relationships];
          const counts = updateGenerationCounts(restoredPeople);
          
          return {
            ...prev,
            people: restoredPeople,
            relationships: restoredRelationships,
            generationLimits: Object.keys(prev.generationLimits).reduce((acc, gen) => ({
              ...acc,
              [gen]: { current: counts[gen as keyof typeof counts], max: prev.generationLimits[gen as keyof typeof prev.generationLimits].max }
            }), {} as typeof prev.generationLimits)
          };
        });
        toast.success(`↩️ Restored ${action.person.firstName}`);
        break;
        
      case 'ADD_PERSON':
        // Remove the added person
        setFamilyTree(prev => {
          const newPeople = prev.people.filter(p => p.id !== action.person.id);
          const counts = updateGenerationCounts(newPeople);
          
          return {
            ...prev,
            people: newPeople,
            generationLimits: Object.keys(prev.generationLimits).reduce((acc, gen) => ({
              ...acc,
              [gen]: { current: counts[gen as keyof typeof counts], max: prev.generationLimits[gen as keyof typeof prev.generationLimits].max }
            }), {} as typeof prev.generationLimits)
          };
        });
        toast.success(`↩️ Removed ${action.person.firstName}`);
        break;
        
      case 'MOVE_PERSON':
        // Restore original position
        setFamilyTree(prev => ({
          ...prev,
          people: prev.people.map(p =>
            p.id === action.personId
              ? { ...p, gridSlot: action.fromSlot, position: { ...p.position, x: action.fromX } }
              : p
          )
        }));
        toast.success(`↩️ Moved person back`);
        break;
        
      case 'MOVE_SPOUSE_PAIR':
        // Restore both spouses' original positions
        setFamilyTree(prev => ({
          ...prev,
          people: prev.people.map(p => {
            if (p.id === action.person1.id) {
              return { ...p, gridSlot: action.person1.fromSlot, position: { ...p.position, x: action.person1.fromX } };
            } else if (p.id === action.person2.id) {
              return { ...p, gridSlot: action.person2.fromSlot, position: { ...p.position, x: action.person2.fromX } };
            }
            return p;
          })
        }));
        toast.success(`↩️ Moved couple back`);
        break;
        
      case 'ADD_RELATIONSHIP':
        // Remove the relationship
        setFamilyTree(prev => ({
          ...prev,
          relationships: prev.relationships.filter(r => r.id !== action.relationship.id)
        }));
        toast.success(`↩️ Removed relationship`);
        break;
        
      case 'DELETE_RELATIONSHIP':
        // Restore the relationship
        setFamilyTree(prev => ({
          ...prev,
          relationships: [...prev.relationships, action.relationship]
        }));
        toast.success(`↩️ Restored relationship`);
        break;
    }
    
    if (isMobile) hapticFeedback.success();
  }, [history, updateGenerationCounts, isMobile]);

  // Handle Redo
  const handleRedo = useCallback(() => {
    if (!canRedo(history)) return;
    
    const { history: newHistory, action } = redo(history);
    if (!action) return;
    
    setHistory(newHistory);
    
    // Replay the action
    switch (action.type) {
      case 'DELETE_PERSON':
        // Re-delete the person
        setFamilyTree(prev => {
          const newPeople = prev.people.filter(p => p.id !== action.person.id);
          const newRelationships = prev.relationships.filter(r => 
            !action.relationships.some(ar => ar.id === r.id)
          );
          const counts = updateGenerationCounts(newPeople);
          
          return {
            ...prev,
            people: newPeople,
            relationships: newRelationships,
            generationLimits: Object.keys(prev.generationLimits).reduce((acc, gen) => ({
              ...acc,
              [gen]: { current: counts[gen as keyof typeof counts], max: prev.generationLimits[gen as keyof typeof prev.generationLimits].max }
            }), {} as typeof prev.generationLimits)
          };
        });
        toast.success(`↪️ Deleted ${action.person.firstName} again`);
        break;
        
      case 'ADD_PERSON':
        // Re-add the person
        setFamilyTree(prev => {
          const restoredPeople = [...prev.people, action.person];
          const counts = updateGenerationCounts(restoredPeople);
          
          return {
            ...prev,
            people: restoredPeople,
            generationLimits: Object.keys(prev.generationLimits).reduce((acc, gen) => ({
              ...acc,
              [gen]: { current: counts[gen as keyof typeof counts], max: prev.generationLimits[gen as keyof typeof prev.generationLimits].max }
            }), {} as typeof prev.generationLimits)
          };
        });
        toast.success(`↪️ Re-added ${action.person.firstName}`);
        break;
        
      case 'MOVE_PERSON':
        // Re-apply the move
        setFamilyTree(prev => ({
          ...prev,
          people: prev.people.map(p =>
            p.id === action.personId
              ? { ...p, gridSlot: action.toSlot, position: { ...p.position, x: action.toX } }
              : p
          )
        }));
        toast.success(`↪️ Moved person again`);
        break;
        
      case 'MOVE_SPOUSE_PAIR':
        // Re-apply both spouses' moves
        setFamilyTree(prev => ({
          ...prev,
          people: prev.people.map(p => {
            if (p.id === action.person1.id) {
              return { ...p, gridSlot: action.person1.toSlot, position: { ...p.position, x: action.person1.toX } };
            } else if (p.id === action.person2.id) {
              return { ...p, gridSlot: action.person2.toSlot, position: { ...p.position, x: action.person2.toX } };
            }
            return p;
          })
        }));
        toast.success(`↪️ Moved couple again`);
        break;
        
      case 'ADD_RELATIONSHIP':
        // Re-add the relationship
        setFamilyTree(prev => ({
          ...prev,
          relationships: [...prev.relationships, action.relationship]
        }));
        toast.success(`↪️ Re-created relationship`);
        break;
        
      case 'DELETE_RELATIONSHIP':
        // Re-delete the relationship
        setFamilyTree(prev => ({
          ...prev,
          relationships: prev.relationships.filter(r => r.id !== action.relationship.id)
        }));
        toast.success(`↪️ Removed relationship again`);
        break;
    }
    
    if (isMobile) hapticFeedback.success();
  }, [history, updateGenerationCounts, isMobile]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo: Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo(history)) {
          handleUndo();
        }
      }
      
      // Redo: Ctrl+Y or Cmd+Shift+Z
      if (((e.ctrlKey || e.metaKey) && e.key === 'y') || 
          ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        if (canRedo(history)) {
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, handleUndo, handleRedo]);

  return (
    <div className={`min-h-screen bg-background vibrant-texture p-2 md:p-4 pb-28 md:pb-32 ${isMobile ? 'scrollbar-hide' : ''}`}>
      <div className="w-full mx-auto">
        <div className={`flex gap-2 md:gap-4 ${isMobile ? 'flex-col' : 'flex-col lg:flex-row'}`}>
          {/* Main Canvas */}
          <div className="flex-1 min-w-0">
            <Card className="memory-card p-3 md:p-4">
              <div className={`${isMobile ? 'space-y-3' : 'space-y-4'} mb-4`}>
                <div className="text-center">
                  <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'}`} style={{ fontFamily: 'Playfair Display, serif' }}>Interactive Family Tree Builder</h1>
                </div>
                
                {/* Wizard Progress Tracker */}
                <WizardProgressTracker
                  hasCompletedWelcome={wizardCompletions.welcome}
                  hasSpouse={!!getUserSpouse()}
                  hasCompletedInLaws={wizardCompletions.inLaws}
                  hasMother={!!getUserMother()}
                  hasFather={!!getUserFather()}
                  hasCompletedMaternal={wizardCompletions.maternal}
                  hasCompletedPaternal={wizardCompletions.paternal}
                  onStartWelcome={openWelcomeWizard}
                  onStartInLaws={openInLawsWizard}
                  onStartMaternal={openMaternalWizard}
                  onStartPaternal={openPaternalWizard}
                  isMobile={isMobile}
                />
                
                {/* Search and Filter */}
                <SearchAndFilter
                  people={familyTree.people}
                  relationships={familyTree.relationships}
                  onSelectPerson={(personId) => {
                    // Center on selected person with highlight
                    const person = familyTree.people.find(p => p.id === personId);
                    if (person) {
                      const scrollContainer = document.getElementById('canvas-scroll-container');
                      if (scrollContainer) {
                        const currentZoom = isMobile ? mobileZoomLevel : desktopZoomLevel;
                        const scaledX = person.position.x * currentZoom;
                        const scaledY = person.position.y * currentZoom;
                        const scrollLeft = scaledX - (scrollContainer.clientWidth / 2);
                        const scrollTop = scaledY - (scrollContainer.clientHeight / 2);
                        
                        scrollContainer.scrollTo({
                          left: Math.max(0, scrollLeft),
                          top: Math.max(0, scrollTop),
                          behavior: 'smooth'
                        });
                        
                        // Highlight the person briefly
                        setSelectedPersonId(personId);
                        setTimeout(() => setSelectedPersonId(null), 2000);
                        
                        toast.success(`Found ${person.firstName} ${person.lastName || ''}!`);
                      }
                    }
                  }}
                  isMobile={isMobile}
                />
                
                <div className={`flex gap-2 ${isMobile ? 'justify-center flex-wrap' : 'items-center flex-wrap'}`}>
                  {/* Undo/Redo Buttons */}
                  <div className="flex gap-1 border border-gray-200 rounded-lg p-1 bg-gray-50">
                    <Button
                      variant="ghost"
                      size={isMobile ? "sm" : "sm"}
                      onClick={handleUndo}
                      disabled={!canUndo(history)}
                      className={`${isMobile ? 'h-9 w-9' : 'h-8 w-8'} p-0 ${canUndo(history) ? 'hover:bg-blue-100' : 'opacity-40'}`}
                      title="Undo (Ctrl+Z)"
                    >
                      <Undo2 className={`w-4 h-4 ${canUndo(history) ? 'text-blue-600' : 'text-gray-400'}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size={isMobile ? "sm" : "sm"}
                      onClick={handleRedo}
                      disabled={!canRedo(history)}
                      className={`${isMobile ? 'h-9 w-9' : 'h-8 w-8'} p-0 ${canRedo(history) ? 'hover:bg-blue-100' : 'opacity-40'}`}
                      title="Redo (Ctrl+Y)"
                    >
                      <Redo2 className={`w-4 h-4 ${canRedo(history) ? 'text-blue-600' : 'text-gray-400'}`} />
                    </Button>
                  </div>
                  <PersonPalette
                    onAddPerson={handleAddPerson}
                    generationLimits={familyTree.generationLimits}
                    isOpen={showAddDialog}
                    onOpenChange={setShowAddDialog}
                    suggestedGeneration={0}
                  />
                  
                  <FamilyTemplateMenu
                    hasSpouse={!!getUserSpouse()}
                    hasMother={!!getUserMother()}
                    hasFather={!!getUserFather()}
                    hasCompletedWelcome={isNuclearFamilyActuallyComplete()}
                    hasCompletedInLaws={wizardCompletions.inLaws}
                    hasCompletedMaternal={wizardCompletions.maternal}
                    hasCompletedPaternal={wizardCompletions.paternal}
                    onSelectWelcome={openWelcomeWizard}
                    onSelectInLaws={openInLawsWizard}
                    onSelectMaternal={openMaternalWizard}
                    onSelectPaternal={openPaternalWizard}
                    isMobile={isMobile}
                    open={showFamilyTemplateMenu}
                    onOpenChange={setShowFamilyTemplateMenu}
                  />
                  
                  {!isConnecting ? (
                    <Button variant="outline" size={isMobile ? "sm" : "default"} onClick={startConnecting}>
                      <Link className="w-4 h-4 mr-2" />
                      {isMobile ? "Connect" : "Connect People"}
                    </Button>
                  ) : (
                    <Button variant="destructive" size={isMobile ? "sm" : "default"} onClick={cancelConnecting} className="animate-pulse">
                      <X className="w-4 h-4 mr-2" />
                      {isMobile ? "Cancel" : "✖ Cancel Connection"}
                    </Button>
                  )}
                  
                  <Button 
                    variant="default" 
                    size={isMobile ? "sm" : "default"} 
                    onClick={() => centerOnUser(true)}
                    className="bg-aqua hover:bg-aqua/90 text-white font-bold"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    {isMobile ? "Find Root!" : "🎯 Find My Root Node!"}
                  </Button>

                  {/* Zoom Controls - Inline and Subtle */}
                  <div className={isMobile ? 'w-full flex justify-center mt-1' : ''}>
                    <ZoomControls
                      zoomLevel={isMobile ? mobileZoomLevel : desktopZoomLevel}
                      onZoomChange={isMobile ? setMobileZoomLevel : setDesktopZoomLevel}
                      minZoom={0.5}
                      maxZoom={3}
                      isMobile={isMobile}
                    />
                  </div>
                </div>

                {/* Grid System Info */}
                <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span>📏 Grid System: {GRID_CONFIG.getSlotCount()} slots per generation</span>
                    <span>➕ Click <strong>+</strong> buttons to add family members</span>
                    <span>🎯 Click person → Quick menu appears</span>
                    <span>🔗 Connect → Auto-detects relationship type!</span>
                    {isConnecting && (
                      <span className="text-green-600 font-medium animate-pulse">
                        🔗 Connection mode active - Click target person
                      </span>
                    )}
                    {selectedPersonId && !isConnecting && (
                      <span className="text-blue-600 font-medium">
                        Person selected - use ← → buttons to move
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Canvas Area - Full height for all generation bands */}
              <div 
                className={`relative border-2 border-gray-300 ${
                  isMobile 
                    ? 'overflow-auto scrollbar-hide' 
                    : 'overflow-auto'
                }`}
                style={{ 
                  width: '100%',
                  maxWidth: isMobile ? '100vw' : 'calc(100vw - 2rem)',
                  height: isMobile ? `${1000 * mobileZoomLevel}px` : '1000px',
                  maxHeight: isMobile ? 'calc(100vh - 200px)' : 'none',
                  contain: 'layout size style'
                }}
                id="canvas-scroll-container"
              >
                <FamilyTreeCanvas
                  familyTree={familyTree}
                  selectedPersonId={selectedPersonId}
                  isConnecting={isConnecting}
                  connectionFrom={connectionFrom}
                  onPersonMove={handlePersonMove}
                  onPersonSelect={handlePersonSelect}
                  onPersonDelete={handlePersonDelete}
                  onGridAddClick={handleGridAddClick}
                  quickMenuPersonId={quickMenuPersonId}
                  onQuickMenuOpen={handleQuickMenuOpen}
                  onStartConnectionFrom={handleStartConnectionFrom}
                  collapsedNodes={collapsedNodes}
                  onToggleCollapse={handleToggleCollapse}
                  onGetDescendants={getAllDescendants}
                  onOpenProfile={handleOpenProfile}
                  onZoomToGeneration={handleZoomToGeneration}
                  mobileZoomLevel={isMobile ? mobileZoomLevel : desktopZoomLevel}
                  onMobileZoomChange={isMobile ? setMobileZoomLevel : setDesktopZoomLevel}
                />
              </div>
              
              {/* Generation Guide */}
              {isMobile && (
                <div className="mt-4 p-4 bg-violet/5 border border-violet/20 rounded-lg">
                  <h4 className="text-sm font-medium text-ink mb-3">Generation Guide</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-sm bg-violet/10 border border-violet/20"></div>
                      <span className="text-ink">Gen -2: Grandparents</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-sm bg-aqua/10 border border-aqua/30"></div>
                      <span className="text-ink">Gen -1: Parents & Aunts/Uncles</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-sm bg-coral/10 border border-coral/30"></div>
                      <span className="text-ink">Gen 0: Your Generation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-sm bg-violet/5 border border-violet/20"></div>
                      <span className="text-ink">Gen +1: Children</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-sm bg-aqua/5 border border-aqua/20"></div>
                      <span className="text-ink">Gen +2: Grandchildren</span>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className={`w-full ${isMobile ? '' : 'lg:w-80'}`}>
            <Card className={`memory-card p-3 md:p-4 ${isMobile ? '' : 'sticky top-4'}`}>
              {/* Mobile sidebar toggle */}
              {isMobile && (
                <button
                  onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                  className="w-full flex items-center justify-between p-3 mb-2 bg-violet/5 rounded-lg hover:bg-violet/10 transition-colors border border-violet/20"
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-violet" />
                    <span className="font-medium text-ink">Family Tree Stats</span>
                  </div>
                  <ChevronUp className={`w-5 h-5 text-violet transition-transform ${isMobileSidebarOpen ? 'rotate-180' : ''}`} />
                </button>
              )}

              <div className={isMobile && !isMobileSidebarOpen ? 'hidden' : ''}>
                <h3 className="text-lg mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>Family Tree Stats</h3>
                  <div className="space-y-3">
                    {['-2', '-1', '0', '1', '2'].map((gen) => {
                      const config = GENERATION_LIMITS[gen as keyof typeof GENERATION_LIMITS];
                      // 🔧 CRITICAL FIX: Calculate current count dynamically from actual people in tree
                      // This ensures stats update immediately when members are added via wizard OR manually
                      const current = familyTree.people.filter(p => p.generation === parseInt(gen)).length;
                      const max = config.max;
                      const percentage = (current / max) * 100;
                      
                      return (
                        <div key={gen} className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">{config.title}</span>
                            <Badge variant={current >= max ? 'destructive' : current >= max * 0.8 ? 'secondary' : 'default'}>
                              {current}/{max}
                            </Badge>
                          </div>
                          <div className="w-full bg-violet/10 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                percentage >= 100 ? 'bg-coral' : percentage >= 80 ? 'bg-aqua' : 'bg-violet'
                              }`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total People</span>
                      <Badge>{familyTree.people.length}/162</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Relationships</span>
                      <Badge variant="outline">{familyTree.relationships.length}</Badge>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="text-xs text-gray-600 space-y-1">
                    <p><span className="w-3 h-0.5 bg-red-500 inline-block mr-2"></span>Marriage/Partnership</p>
                    <p><span className="w-3 h-0.5 bg-blue-500 inline-block mr-2" style={{background: 'repeating-linear-gradient(to right, #3b82f6 0px, #3b82f6 3px, transparent 3px, transparent 6px)'}}></span>Parent-Child</p>
                    <p className="mt-2">🎯 Click a person to open quick menu</p>
                    <p>🔗 Click "Connect" → then click target person</p>
                    <p>↔️ Relationships auto-detected by generation!</p>
                    <p>🔄 Use ← → buttons to move selected person</p>
                    <p>📦 Hover person → Click blue button to collapse branch</p>
                  </div>

                  {/* Generation Guide - Desktop Only */}
                  {!isMobile && (
                    <>
                      <Separator className="my-4" />
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Generation Guide</h4>
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-sm bg-purple-50 border border-purple-200 flex-shrink-0"></div>
                            <span className="text-gray-700">Gen -2: Grandparents</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-sm bg-blue-50 border border-blue-200 flex-shrink-0"></div>
                            <span className="text-gray-700">Gen -1: Parents & Aunts/Uncles</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-sm bg-green-50 border border-green-200 flex-shrink-0"></div>
                            <span className="text-gray-700">Gen 0: Your Generation</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-sm bg-yellow-50 border border-yellow-200 flex-shrink-0"></div>
                            <span className="text-gray-700">Gen +1: Children</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-sm bg-orange-50 border border-orange-200 flex-shrink-0"></div>
                            <span className="text-gray-700">Gen +2: Grandchildren</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile Floating Action Button - HIDDEN when wizards or dialogs are open for better UX */}
      {isMobile && (
        <FloatingActionButton
          onAddPerson={() => setShowAddDialog(true)}
          onConnect={isConnecting ? cancelConnecting : startConnecting}
          onOpenWizardMenu={() => setShowFamilyTemplateMenu(true)}
          isConnecting={isConnecting}
          hideButton={showWelcomeWizard || showInLawsWizard || showMaternalWizard || showPaternalWizard || showAddDialog || showContextualAddDialog}
        />
      )}

      {/* Mobile Gesture Tutorial */}
      {showMobileTutorial && (
        <MobileGestureTutorial onDismiss={handleDismissMobileTutorial} />
      )}
      
      {/* Connection Type Dialog */}
      <ConnectionTypeDialog
        isOpen={showConnectionDialog}
        onOpenChange={setShowConnectionDialog}
        fromPerson={connectionFrom ? familyTree.people.find(p => p.id === connectionFrom) || null : null}
        toPerson={connectionTo ? familyTree.people.find(p => p.id === connectionTo) || null : null}
        onCreateConnection={handleCreateRelationship}
        existingRelationships={familyTree.relationships}
      />

      {/* Contextual Person Add Dialog - From Grid Button */}
      <ContextualPersonDialog
        isOpen={showContextualAddDialog}
        onOpenChange={setShowContextualAddDialog}
        generation={contextualAddGeneration}
        gridSlot={contextualAddGridSlot}
        onAddPerson={handleContextualAddPerson}
      />

      {/* Welcome Wizard - First-time user onboarding */}
      <WelcomeWizard
        isOpen={showWelcomeWizard}
        onComplete={handleWizardComplete}
        onSkip={handleWizardSkip}
        userGender={familyTree.people.find(p => p.isRoot)?.gender || 'male'}
      />

      {/* In-Laws Wizard - Add spouse's family */}
      {getUserSpouse() && (
        <InLawsWizard
          isOpen={showInLawsWizard}
          onComplete={handleInLawsComplete}
          onSkip={() => {
            setShowInLawsWizard(false);
            setWizardCompletions(prev => ({ ...prev, inLaws: true }));
            toast.info('In-Laws wizard skipped. Use the + buttons on canvas to add in-laws!');
          }}
          spouseName={getUserSpouse()!.firstName}
          spouseGender={getUserSpouse()!.gender}
        />
      )}

      {/* Maternal Family Wizard - Add mother's family */}
      {getUserMother() && (
        <MaternalWizard
          isOpen={showMaternalWizard}
          onComplete={handleMaternalComplete}
          onSkip={() => {
            setShowMaternalWizard(false);
            setWizardCompletions(prev => ({ ...prev, maternal: true }));
            toast.info("Maternal wizard skipped. Use the + buttons on canvas to add mother's family!");
          }}
          motherName={getUserMother()!.firstName}
        />
      )}

      {/* Paternal Family Wizard - Add father's family */}
      {getUserFather() && (
        <PaternalWizard
          isOpen={showPaternalWizard}
          onComplete={handlePaternalComplete}
          onSkip={() => {
            setShowPaternalWizard(false);
            setWizardCompletions(prev => ({ ...prev, paternal: true }));
            toast.info("Paternal wizard skipped. Use the + buttons on canvas to add father's family!");
          }}
          fatherName={getUserFather()!.firstName}
        />
      )}

      {/* Family Member Profile */}
      {selectedPersonForProfile && (() => {
        // Get family_id from current user
        const currentUserId = localStorage.getItem('current_user_id');
        let familyId: string | undefined = undefined;
        
        if (currentUserId) {
          const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
          if (userProfile) {
            const userData = JSON.parse(userProfile);
            familyId = userData.family_id;
          }
        }
        
        return (
          <FamilyMemberProfile
            person={selectedPersonForProfile}
            onClose={handleCloseProfile}
            onSave={handleSaveProfile}
            isMobile={isMobile}
            familyId={familyId}
          />
        );
      })()}
    </div>
  );
};

// Named export for router integration
export const FamilyTreeApp = InteractiveFamilyTreeApp;

export default InteractiveFamilyTreeApp;