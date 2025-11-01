import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Checkbox } from './ui/checkbox';
import { MultiSelectDropdown } from './MultiSelectDropdown';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar as CalendarComponent } from './ui/calendar';
import { DatabaseService } from '../utils/supabase/persistent-database';
import type { UserProfile, FamilyData } from '../utils/supabase/client';
import { toast } from "sonner@2.0.3";
import { 
  getJourneyContext, 
  clearJourneyContext, 
  getJourneyDisplayName, 
  getJourneyIcon,
  getJourneyColors,
  validateJourneyContext 
} from '../utils/journey-helpers';
import { 
  Heart, 
  Camera, 
  Video, 
  Mic, 
  FileText, 
  Upload,
  X,
  Star,
  MessageSquare,
  BookOpen,
  Trophy,
  Coffee,
  Plus,
  Users,
  MapPin,
  Calendar,
  Tag,
  Sparkles,
  Save,
  Eye,
  EyeOff,
  Clock,
  FileAudio,
  Play,
  Square,
  UserPlus,
  Smile,
  Laugh,
  Zap,
  ThumbsUp,
  Crown,
  Gift,
  Baby,
  PartyPopper,
  Frown,
  CheckCircle2,
  Circle,
  Image,
  Wand2,
  Flame,
  Mic2,
  Volume2,
  Globe,
  Lock,
  UserCheck,
  Search,
  CalendarDays,
  Database,
  ArrowUp,
  AlertTriangle,
  RefreshCw,
  Shield,
  UserMinus,
  File,
  ArrowLeft,
  MicOff,
  Info,
  ExternalLink,
  Database,
  Trash2,
  Archive,
  Settings,
  FilePlus,
  ChevronDown
} from 'lucide-react';
import { formatDateForDisplay, formatDateForStorage, isValidDDMMYYYY, formatDateInput } from '../utils/dateHelpers';
import { PregnancyChildSelector } from './PregnancyChildSelector';

interface MemoryCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  gradient: string;
}

interface FormatOption {
  type: 'text' | 'photo' | 'video' | 'audio';
  icon: React.ComponentType<any>;
  label: string;
  color: string;
  gradient: string;
}

interface FamilyMember {
  id: string;
  name: string;
  relationship?: string;
  added_by?: string;
  created_by?: string;
  avatar?: string;
}

interface UploadedFile {
  file: File;
  preview?: string;
  type: 'photo' | 'video' | 'audio' | 'text';
  compressed?: boolean;
  originalSize?: number;
}

interface MemoryUploadPageProps {
  onBack: () => void;
  onSuccess: () => void;
  user: UserProfile | null;
  family: FamilyData | null;
  familyMembers?: FamilyMember[];
  editMemory?: any; // Memory object when in edit mode
}

// 🔧 COMPLETELY FIXED: Enhanced storage utilities with bulletproof constructor handling
class StorageManager {
  // Safe timestamp generation with multiple fallbacks
  static getCurrentTimestamp(): number {
    try {
      return Date.now();
    } catch (error) {
      console.warn('Date.now() failed, using fallback:', error);
      try {
        return new Date().getTime();
      } catch (secondError) {
        console.warn('new Date().getTime() failed, using performance fallback:', secondError);
        try {
          return performance.now() + performance.timeOrigin;
        } catch (finalError) {
          console.warn('All timestamp methods failed, using static fallback:', finalError);
          return 1640995200000; // Fixed fallback timestamp
        }
      }
    }
  }

  // Safe ISO string generation
  static getCurrentISOString(): string {
    try {
      return new Date().toISOString();
    } catch (error) {
      console.warn('toISOString() failed, using fallback:', error);
      const timestamp = this.getCurrentTimestamp();
      try {
        return new Date(timestamp).toISOString();
      } catch (secondError) {
        console.warn('ISO string generation failed, using fallback format:', secondError);
        return new Date().toDateString(); // Basic fallback
      }
    }
  }

  // 🔧 ROBUST: Safe File/Blob creator with silent error handling
  static createSafeFile(
    data: BlobPart[], 
    filename: string, 
    options: FilePropertyBag = {}
  ): File | Blob {
    const safeOptions = {
      type: options.type || 'application/octet-stream',
      lastModified: options.lastModified || this.getCurrentTimestamp()
    };

    // Approach 1: Try creating a proper File object
    try {
      // Check if File constructor is available and working
      if (typeof File === 'function') {
        return new File(data, filename, safeOptions);
      }
    } catch (e) {
      // Silently continue to fallback - this is expected in some environments
    }

    // Approach 2: Create Blob with File-like properties (universal fallback)
    try {
      const blob = new Blob(data, { type: safeOptions.type });
      
      // Extend blob with File interface properties
      Object.defineProperty(blob, 'name', {
        value: filename,
        writable: false,
        enumerable: true
      });
      
      Object.defineProperty(blob, 'lastModified', {
        value: safeOptions.lastModified,
        writable: false,
        enumerable: true
      });
      
      Object.defineProperty(blob, 'webkitRelativePath', {
        value: '',
        writable: false,
        enumerable: true
      });
      
      return blob as File;
    } catch (e) {
      // Absolute fallback - return basic Blob (should never fail)
      console.warn('Using basic Blob fallback for:', filename);
      return new Blob(data, { type: safeOptions.type });
    }
  }

  // Check available localStorage space
  static getStorageInfo() {
    try {
      const testKey = 'storage_test_key_' + Math.random().toString(36).substr(2, 9);
      let used = 0;
      let available = 0;
      
      // Calculate used space safely
      try {
        for (const key in localStorage) {
          if (localStorage.hasOwnProperty(key)) {
            const value = localStorage.getItem(key);
            if (value) {
              used += value.length;
            }
          }
        }
      } catch (iterationError) {
        console.warn('Error calculating used space:', iterationError);
        used = 0;
      }
      
      // Estimate available space with safer testing
      let testSize = 1024; // Start with 1KB
      const maxTestSize = 10 * 1024 * 1024; // Max 10MB test
      
      while (testSize < maxTestSize) {
        try {
          const testData = new Array(testSize).fill('x').join('');
          localStorage.setItem(testKey, testData);
          localStorage.removeItem(testKey);
          available = testSize;
          testSize *= 2;
        } catch (e) {
          // Clean up test key if it exists
          try {
            localStorage.removeItem(testKey);
          } catch (cleanupError) {
            console.warn('Error cleaning up test key:', cleanupError);
          }
          break;
        }
      }
      
      return {
        used: used,
        available: available,
        remaining: Math.max(0, available - used),
        usedMB: (used / 1024 / 1024).toFixed(2),
        availableMB: (available / 1024 / 1024).toFixed(2),
        remainingMB: (Math.max(0, available - used) / 1024 / 1024).toFixed(2)
      };
    } catch (error) {
      console.error('Error checking storage info:', error);
      return {
        used: 0,
        available: 0,
        remaining: 0,
        usedMB: '0',
        availableMB: '0',
        remainingMB: '0'
      };
    }
  }

  // 🔧 COMPLETELY FIXED: Safe image compression with bulletproof blob-to-file conversion
  static async compressImage(file: File, maxSizeMB: number = 1): Promise<{ file: File | Blob; compressed: boolean; originalSize: number }> {
    return new Promise((resolve) => {
      try {
        console.log(`🖼️ Starting image compression for ${file.name}...`);
        
        // Check if compression is needed
        const fileSizeMB = file.size / 1024 / 1024;
        if (fileSizeMB <= maxSizeMB * 0.8) {
          console.log(`📦 File ${file.name} is already small enough (${fileSizeMB.toFixed(2)}MB), skipping compression`);
          resolve({ file, compressed: false, originalSize: file.size });
          return;
        }

        // Create canvas and context with error handling
        let canvas: HTMLCanvasElement;
        let ctx: CanvasRenderingContext2D | null;
        
        try {
          canvas = document.createElement('canvas');
          ctx = canvas.getContext('2d');
          
          if (!ctx) {
            throw new Error('Could not get canvas 2D context');
          }
        } catch (canvasError) {
          console.error('Error creating canvas:', canvasError);
          resolve({ file, compressed: false, originalSize: file.size });
          return;
        }

        // Safe Image constructor with comprehensive error handling
        let img: HTMLImageElement;
        
        try {
          // Method 1: Try standard Image constructor
          img = new window.Image();
        } catch (imageError1) {
          console.warn('Standard Image constructor failed:', imageError1);
          
          try {
            // Method 2: Try document.createElement approach
            img = document.createElement('img') as HTMLImageElement;
          } catch (imageError2) {
            console.warn('document.createElement img failed:', imageError2);
            
            try {
              // Method 3: Try alternative constructor
              img = new (window as any).Image();
            } catch (imageError3) {
              console.error('All Image constructor methods failed:', imageError3);
              resolve({ file, compressed: false, originalSize: file.size });
              return;
            }
          }
        }

        // Set up image event handlers with timeout
        const timeoutId = setTimeout(() => {
          console.warn('Image compression timeout for', file.name);
          resolve({ file, compressed: false, originalSize: file.size });
        }, 30000); // 30 second timeout

        img.onload = () => {
          try {
            clearTimeout(timeoutId);
            console.log(`🖼️ Image loaded: ${img.width}x${img.height}`);
            
            // Calculate new dimensions while maintaining aspect ratio
            const maxDimension = maxSizeMB <= 0.5 ? 800 : maxSizeMB <= 1 ? 1200 : 1600;
            let { width, height } = img;
            
            if (width > height && width > maxDimension) {
              height = (height * maxDimension) / width;
              width = maxDimension;
            } else if (height > maxDimension) {
              width = (width * maxDimension) / height;
              height = maxDimension;
            }
            
            // Set canvas dimensions
            canvas.width = width;
            canvas.height = height;
            
            console.log(`🖼️ Resizing to: ${width}x${height}`);
            
            // Draw image on canvas
            if (ctx) {
              // Set high quality scaling
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              
              // Clear canvas and draw image
              ctx.clearRect(0, 0, width, height);
              ctx.drawImage(img, 0, 0, width, height);
            }
            
            // Convert to blob with quality control
            const quality = maxSizeMB <= 0.5 ? 0.7 : 0.8;
            
            canvas.toBlob(
              (blob) => {
                try {
                  if (blob && blob.size < file.size) {
                    // 🔧 FIXED: Use safe File creation with comprehensive fallbacks
                    console.log(`🔧 Converting compressed blob to file...`);
                    
                    try {
                      const compressedFile = this.createSafeFile(
                        [blob], 
                        file.name, 
                        {
                          type: 'image/jpeg',
                          lastModified: this.getCurrentTimestamp()
                        }
                      );
                      
                      const originalMB = (file.size / 1024 / 1024).toFixed(2);
                      const compressedMB = (blob.size / 1024 / 1024).toFixed(2);
                      const savings = (((file.size - blob.size) / file.size) * 100).toFixed(1);
                      
                      console.log(`✅ Image compressed successfully: ${originalMB}MB → ${compressedMB}MB (${savings}% reduction)`);
                      resolve({ 
                        file: compressedFile as File, 
                        compressed: true, 
                        originalSize: file.size 
                      });
                      
                    } catch (fileCreationError) {
                      console.error('Error creating compressed file:', fileCreationError);
                      
                      // Fallback: Use the blob directly with file properties
                      try {
                        const blobWithFileProps = Object.assign(blob, {
                          name: file.name,
                          lastModified: this.getCurrentTimestamp(),
                          webkitRelativePath: ''
                        });
                        
                        console.log(`⚠️ Using blob with file properties as fallback`);
                        resolve({ 
                          file: blobWithFileProps as File, 
                          compressed: true, 
                          originalSize: file.size 
                        });
                      } catch (blobFallbackError) {
                        console.error('Blob fallback failed:', blobFallbackError);
                        resolve({ file, compressed: false, originalSize: file.size });
                      }
                    }
                  } else {
                    console.log(`📦 Compression didn't reduce size for ${file.name}, using original`);
                    resolve({ file, compressed: false, originalSize: file.size });
                  }
                } catch (blobError) {
                  console.error('Error processing compressed blob:', blobError);
                  resolve({ file, compressed: false, originalSize: file.size });
                }
              },
              'image/jpeg',
              quality
            );
          } catch (processingError) {
            clearTimeout(timeoutId);
            console.error('Error processing image:', processingError);
            resolve({ file, compressed: false, originalSize: file.size });
          }
        };
        
        img.onerror = (error) => {
          clearTimeout(timeoutId);
          console.error('Error loading image for compression:', error);
          resolve({ file, compressed: false, originalSize: file.size });
        };
        
        // Create object URL safely
        try {
          const objectUrl = URL.createObjectURL(file);
          img.src = objectUrl;
          
          // Clean up object URL after a delay
          setTimeout(() => {
            try {
              URL.revokeObjectURL(objectUrl);
            } catch (revokeError) {
              console.warn('Error revoking object URL:', revokeError);
            }
          }, 35000);
          
        } catch (urlError) {
          clearTimeout(timeoutId);
          console.error('Error creating object URL:', urlError);
          resolve({ file, compressed: false, originalSize: file.size });
        }
        
      } catch (setupError) {
        console.error('Error setting up image compression:', setupError);
        resolve({ file, compressed: false, originalSize: file.size });
      }
    });
  }

  // Check video file size with robust error handling
  static async checkVideoSize(file: File): Promise<{ shouldCompress: boolean; reason: string }> {
    try {
      const fileSizeMB = file.size / 1024 / 1024;
      const storageInfo = this.getStorageInfo();
      const remainingMB = parseFloat(storageInfo.remainingMB);
      
      if (fileSizeMB > 10) {
        return { shouldCompress: true, reason: `Video is ${fileSizeMB.toFixed(1)}MB - very large for web storage` };
      }
      
      if (fileSizeMB > remainingMB * 0.8) {
        return { shouldCompress: true, reason: `Video uses ${fileSizeMB.toFixed(1)}MB of ${remainingMB.toFixed(1)}MB available space` };
      }
      
      return { shouldCompress: false, reason: `Video size ${fileSizeMB.toFixed(1)}MB is acceptable` };
    } catch (error) {
      console.error('Error checking video size:', error);
      return { shouldCompress: false, reason: 'Unable to check video size' };
    }
  }

  // Clean up old memories to free space
  static cleanupOldMemories(userId: string, keepCount: number = 20): number {
    try {
      // Use the correct localStorage key that matches what VaultPage expects
      const storageKey = `family:${userId.split('_')[0]}:memories`;
      const fallbackKey = `memorybox_memories_${userId}`;
      
      let existingMemories = [];
      let keyToUse = '';
      
      // Try both storage keys
      try {
        const primaryData = localStorage.getItem(storageKey);
        if (primaryData) {
          existingMemories = JSON.parse(primaryData);
          keyToUse = storageKey;
        }
      } catch (primaryError) {
        console.warn('Error reading primary storage key:', primaryError);
      }
      
      if (!keyToUse) {
        try {
          const fallbackData = localStorage.getItem(fallbackKey);
          if (fallbackData) {
            existingMemories = JSON.parse(fallbackData);
            keyToUse = fallbackKey;
          }
        } catch (fallbackError) {
          console.warn('Error reading fallback storage key:', fallbackError);
        }
      }
      
      if (!keyToUse || existingMemories.length <= keepCount) {
        return 0;
      }
      
      // Sort by creation date and keep most recent with safe date handling
      try {
        const sortedMemories = existingMemories.sort((a: any, b: any) => {
          try {
            const dateA = new Date(a.createdAt || a.created_at || 0).getTime();
            const dateB = new Date(b.createdAt || b.created_at || 0).getTime();
            return dateB - dateA;
          } catch (sortError) {
            console.warn('Error sorting memories by date:', sortError);
            return 0;
          }
        });
        
        const memoriesToKeep = sortedMemories.slice(0, keepCount);
        const removedCount = sortedMemories.length - keepCount;
        
        localStorage.setItem(keyToUse, JSON.stringify(memoriesToKeep));
        
        console.log(`🧹 Cleaned up ${removedCount} old memories to free space from ${keyToUse}`);
        return removedCount;
      } catch (sortingError) {
        console.error('Error sorting and saving memories:', sortingError);
        return 0;
      }
    } catch (error) {
      console.error('Error cleaning up old memories:', error);
      return 0;
    }
  }

  // Save with fallback strategies and robust error handling
  static async saveWithFallbacks(key: string, data: any, userId: string): Promise<{ success: boolean; savedWithoutFiles?: boolean; message?: string }> {
    try {
      const dataString = JSON.stringify(data);
      const dataSizeMB = (dataString.length / 1024 / 1024).toFixed(2);
      
      console.log(`💾 Attempting to save ${dataSizeMB}MB of data to ${key}...`);
      
      // Strategy 1: Try direct save
      try {
        localStorage.setItem(key, dataString);
        console.log(`✅ Direct save successful (${dataSizeMB}MB)`);
        return { success: true, message: `Memory saved successfully (${dataSizeMB}MB)` };
      } catch (error: any) {
        if (error?.name === 'QuotaExceededError') {
          console.log(`⚠️ Quota exceeded with ${dataSizeMB}MB, trying fallback strategies...`);
          
          // Strategy 2: Clean up old memories and try again
          const removedCount = this.cleanupOldMemories(userId, 15);
          if (removedCount > 0) {
            try {
              localStorage.setItem(key, dataString);
              console.log(`✅ Save successful after cleanup (${dataSizeMB}MB, removed ${removedCount} old memories)`);
              return { success: true, message: `Memory saved after cleaning up ${removedCount} old memories` };
            } catch (secondError) {
              console.log(`❌ Save failed even after cleanup`);
            }
          }
          
          // Strategy 3: Aggressive cleanup and try again
          const moreRemoved = this.cleanupOldMemories(userId, 8);
          if (moreRemoved > 0) {
            try {
              localStorage.setItem(key, dataString);
              console.log(`✅ Save successful after aggressive cleanup (${dataSizeMB}MB, removed ${moreRemoved} more memories)`);
              return { success: true, message: `Memory saved after aggressive cleanup` };
            } catch (thirdError) {
              console.log(`❌ Save failed even after aggressive cleanup`);
            }
          }
          
          // Strategy 4: Save without large file data (metadata only)
          try {
            const metadataOnly = {
              ...data,
              files: data.files?.map((f: any) => ({
                name: f.name,
                type: f.type,
                size: f.size,
                sizeMB: f.sizeMB,
                compressed: f.compressed,
                note: `File too large for storage (${f.sizeMB || 'unknown size'}MB)`,
                preview: f.type === 'photo' && f.size < 500000 ? f.preview : undefined // Keep small image previews only
              })) || [],
              storageNote: `Large files (${dataSizeMB}MB total) removed due to storage limitations`
            };
            
            const metadataString = JSON.stringify(metadataOnly);
            localStorage.setItem(key, metadataString);
            console.log(`✅ Metadata-only save successful (files stripped due to size)`);
            return { 
              success: true, 
              savedWithoutFiles: true, 
              message: `Memory details saved but large files removed due to storage limits` 
            };
          } catch (finalError) {
            console.error(`❌ All save strategies failed:`, finalError);
            return { success: false, message: 'Unable to save due to storage limitations' };
          }
        } else {
          console.error(`❌ Non-quota error during save:`, error);
          return { success: false, message: `Save failed: ${error?.message || 'Unknown error'}` };
        }
      }
    } catch (error: any) {
      console.error('Error in saveWithFallbacks:', error);
      return { success: false, message: `Save failed: ${error?.message || 'Unknown error'}` };
    }
  }
}

export function MemoryUploadPage({ onBack, onSuccess, user, family, familyMembers: propFamilyMembers = [], editMemory }: MemoryUploadPageProps) {
  const navigationState = useLocation();
  const editMemoryFromState = (navigationState.state as any)?.editMemory;
  const [memoryToEdit, setMemoryToEdit] = useState<any>(editMemory || editMemoryFromState || null);
  const isEditMode = !!memoryToEdit;
  const milestoneContext = (navigationState.state as any)?.milestoneContext;
  
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [generalTags, setGeneralTags] = useState<string[]>([]);
  const [newGeneralTag, setNewGeneralTag] = useState('');
  const [peopleInMemory, setPeopleInMemory] = useState<string[]>([]);
  const [emotionTags, setEmotionTags] = useState<string[]>([]);
  const [customEmotion, setCustomEmotion] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  // 🎭 DEFAULT: Share with 'Family' so memories appear on Family Wall
  const [sharedWith, setSharedWith] = useState<string[]>(['Family']);
  const [isPrivate, setIsPrivate] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [existingFiles, setExistingFiles] = useState<any[]>([]); // 🆕 Track existing files from memory being edited
  const [peopleSearchTerm, setPeopleSearchTerm] = useState('');
  const [completionProgress, setCompletionProgress] = useState(0);
  const [sharingSearchTerm, setSharingSearchTerm] = useState('');
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(propFamilyMembers);
  const [showStorageWarning, setShowStorageWarning] = useState(false);
  const [isLoadingFamilyMembers, setIsLoadingFamilyMembers] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // Track if any dropdown is open
  const [isCategoryOpen, setIsCategoryOpen] = useState(false); // Track if category selector is open
  
  // 👶 NEW: Pregnancy child selection for linking memories to specific children
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  
  // 🎯 NEW: Preserve original journeyType when editing memories (couple/pregnancy)
  // This ensures memories stay in their Book of Life even when edited from regular Vault
  const [originalJourneyType, setOriginalJourneyType] = useState<string | undefined>(undefined);

  // Note: Storage monitoring removed - using Supabase Storage now
  // const [storageInfo, setStorageInfo] = useState<any>(null);
  // const [showStorageWarning, setShowStorageWarning] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [videoCompressionNeeded, setVideoCompressionNeeded] = useState<{file: File; reason: string}[]>([]);

  // Audio recording state with permission handling
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordingTimer, setRecordingTimer] = useState<NodeJS.Timeout | null>(null);
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);
  const [microphonePermission, setMicrophonePermission] = useState<'prompt' | 'granted' | 'denied' | 'checking'>('prompt');
  const [showPermissionHelp, setShowPermissionHelp] = useState(false);

  // File input refs for different types
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  // Note: localStorage storage monitoring removed - now using Supabase Storage
  // useEffect(() => {
  //   const updateStorageInfo = () => {
  //     const info = StorageManager.getStorageInfo();
  //     setStorageInfo(info);
  //     const remainingMB = parseFloat(info.remainingMB);
  //     setShowStorageWarning(remainingMB < 2);
  //     console.log(`📊 Storage status: ${info.usedMB}MB used, ${info.remainingMB}MB remaining`);
  //   };
  //   updateStorageInfo();
  //   const interval = setInterval(updateStorageInfo, 10000);
  //   return () => clearInterval(interval);
  // }, [uploadedFiles]);

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Journey context handling
  const [journeyContext, setJourneyContext] = useState<any>(null);
  const [showJourneyPrompts, setShowJourneyPrompts] = useState(false);

  // Load milestone context from navigation state (NEW: direct from journey pages)
  useEffect(() => {
    if (milestoneContext) {
      console.log('📸 Milestone context detected:', milestoneContext);
      
      // Pre-fill title with milestone
      setTitle(milestoneContext.milestoneTitle);
      
      // Pre-fill description with first prompt
      if (milestoneContext.prompts && milestoneContext.prompts.length > 0) {
        setDescription(`💭 ${milestoneContext.prompts[0]}\n\n`);
      }
      
      // Add journey tags
      const journeyTags = [
        milestoneContext.journeyType === 'couple' ? 'Love Journey' : 'Pregnancy Journey',
        milestoneContext.phase,
        milestoneContext.milestoneTitle
      ];
      setGeneralTags(journeyTags);
      
      // 👶 FIX: Pre-select child for pregnancy journey
      // Priority: 1) editingMemory.child_id (from edit flow), 2) milestoneContext.childId (from add flow)
      if (milestoneContext.journeyType === 'pregnancy') {
        const childIdFromEdit = milestoneContext.editingMemory?.child_id;
        const childIdFromMilestone = milestoneContext.childId;
        const childIdToUse = childIdFromEdit || childIdFromMilestone;
        
        if (childIdToUse) {
          console.log('👶 Pre-selecting child from milestone context:', childIdToUse, {
            source: childIdFromEdit ? 'editingMemory' : 'milestoneContext'
          });
          setSelectedChildId(childIdToUse);
        }
      }
      
      // Pre-select suggested memory formats
      if (milestoneContext.suggestedTypes && milestoneContext.suggestedTypes.length > 0) {
        const formatMapping: { [key: string]: string } = {
          'Photo of the Place': 'photo',
          'Photo of Gift': 'photo',
          'Photos': 'photo',
          'Voice Note Retelling': 'audio',
          'Voice Note': 'audio',
          'Audio Recording': 'audio',
          'Video': 'video',
          'Videos': 'video',
          'Written Story': 'text',
          'Journal Entry': 'text',
          'Ultrasound Photos': 'photo',
          'Birth Photos': 'photo',
          'Ceremony Photos': 'photo'
        };
        
        const mappedFormats = milestoneContext.suggestedTypes
          .map((type: string) => formatMapping[type] || 'photo')
          .filter((format: string) => format);
        
        setSelectedFormats([...new Set(mappedFormats)]);
      }
      
      // Show toast to guide user
      toast.success(`📸 Capturing memory for: ${milestoneContext.milestoneTitle}`, {
        description: 'Form pre-filled with milestone details',
        duration: 4000
      });
    }
  }, [milestoneContext]);
  
  // Load journey context on component mount (LEGACY: from journey helpers)
  useEffect(() => {
    const context = getJourneyContext();
    if (context && validateJourneyContext(context)) {
      setJourneyContext(context);
      setShowJourneyPrompts(true);
      
      // Pre-fill form fields with journey-specific data
      if (context.milestone) {
        setTitle(context.milestone.title);
        setDescription(context.milestone.description);
      }
      
      // Set suggested memory types as selected formats
      if (context.suggestedTypes && context.suggestedTypes.length > 0) {
        const formatMapping: { [key: string]: string } = {
          'Photo': 'photo',
          'Video': 'video', 
          'Voice Note': 'audio',
          'Journal Entry': 'text',
          'Ultrasound Photo': 'photo',
          'Hospital Photos': 'photo',
          'Milestone Videos': 'video',
          'Voice Recording': 'audio',
          'Messages Screenshots': 'photo',
          'Ceremony Photos': 'photo',
          'Reception Videos': 'video'
        };
        
        const mappedFormats = context.suggestedTypes
          .map(type => formatMapping[type] || 'photo')
          .filter(format => format);
        
        setSelectedFormats([...new Set(mappedFormats)]);
      }
      
      console.log('🌟 Journey context loaded:', context.journey, '>', context.milestone.title);
    }
  }, []);
  
  // 🆕 PRE-POPULATE FIELDS WHEN IN EDIT MODE
  useEffect(() => {
    if (isEditMode && memoryToEdit) {
      console.log('✏️ EDIT MODE: Pre-populating fields from memory:', memoryToEdit);
      console.log('🔍 ALL FIELDS in memoryToEdit:', Object.keys(memoryToEdit));
      
      // Pre-fill all form fields
      setTitle(memoryToEdit.title || '');
      setDescription(memoryToEdit.description || '');
      setLocation(memoryToEdit.location || '');
      setDate(memoryToEdit.date || memoryToEdit.date_of_memory || memoryToEdit.memory_date || '');
      
      // Pre-fill category with extensive debugging
      // 🔧 CRITICAL FIX: Map legacy category IDs to NEW memoryCategories IDs
      const categoryMapping: { [key: string]: string } = {
        // Legacy mappings (for old memories)
        'milestone': 'milestones',
        'milestones': 'milestones',
        'everyday': 'moments-memories',
        'moments': 'moments-memories',
        'moments-memories': 'moments-memories',
        'tradition': 'rituals-traditions',
        'traditions': 'rituals-traditions',
        'rituals-traditions': 'rituals-traditions',
        'blessing': 'blessings-messages',
        'blessings': 'blessings-messages',
        'blessings-messages': 'blessings-messages',
        'recipe': 'recipes-wisdom',
        'recipes': 'recipes-wisdom',
        'recipes-wisdom': 'recipes-wisdom',
        'story': 'stories',
        'stories': 'stories',
        'time-capsule': 'time-capsule'
      };
      
      console.log('🔍 CATEGORY DEBUG - All possible category fields:', {
        'memoryToEdit.category': memoryToEdit.category,
        'memoryToEdit.memory_type': memoryToEdit.memory_type,
        'memoryToEdit.memory_category': memoryToEdit.memory_category,
        'memoryToEdit.type': memoryToEdit.type,
        'memoryToEdit.format': memoryToEdit.format
      });
      
      // 🔧 FIX: Check all possible category field names for backward compatibility
      const category = memoryToEdit.category || memoryToEdit.memory_type || memoryToEdit.memory_category || 'moments-memories';
      const mappedCategory = categoryMapping[category] || categoryMapping[category?.toLowerCase()] || 'moments-memories';
      
      console.log('📂 CATEGORY PRE-POPULATION:', { 
        raw: category, 
        mapped: mappedCategory,
        source: memoryToEdit.category ? 'category' : memoryToEdit.memory_type ? 'memory_type' : memoryToEdit.memory_category ? 'memory_category' : 'default',
        willSet: mappedCategory,
        availableCategories: memoryCategories.map(c => c.id)
      });
      
      setSelectedCategory(mappedCategory);
      
      // Verify it was set correctly
      setTimeout(() => {
        console.log('✅ VERIFICATION after setState - selectedCategory should now be:', mappedCategory);
        console.log('✅ Check if category exists in memoryCategories:', 
          memoryCategories.find(c => c.id === mappedCategory) ? '✓ FOUND' : '✗ NOT FOUND'
        );
      }, 100);
      
      // Pre-fill tags and people
      setGeneralTags(memoryToEdit.tags || []);
      
      // 🔧 CRITICAL FIX: Convert names to IDs (database has names, dropdown needs IDs)
      const peopleNames = memoryToEdit.people_involved || memoryToEdit.person_tags || [];
      const peopleIds = peopleNames.map((personName: string) => {
        const member = familyMembers.find(m => m.name === personName);
        return member ? member.id : personName; // Fallback to name if ID not found
      });
      console.log('👥 EDIT MODE: Converting people names → IDs:', {
        fromDatabase: peopleNames,
        converted: peopleIds,
        willDisplay: peopleIds.length + ' people selected'
      });
      setPeopleInMemory(peopleIds);
      
      setEmotionTags(memoryToEdit.emotionTags || memoryToEdit.emotion_tags || []);
      
      // Pre-fill privacy settings
      setIsPrivate(memoryToEdit.is_private || false);
      setSharedWith(memoryToEdit.sharedWith || ['Family']);
      
      // Pre-fill format/type
      const memoryType = memoryToEdit.type || memoryToEdit.format || memoryToEdit.memory_type || 'photo';
      setSelectedFormats([memoryType]);
      
      // 👶 NEW: Load child_id for pregnancy memories
      if (memoryToEdit.child_id) {
        console.log('👶 Loading child_id for pregnancy memory:', memoryToEdit.child_id);
        setSelectedChildId(memoryToEdit.child_id);
      }
      
      // 🎯 CRITICAL FIX: Preserve original journeyType (couple/pregnancy) when editing
      // This ensures the memory stays in its Book of Life even when edited from regular Vault
      // 🔧 FIX: Check BOTH camelCase (journeyType) AND snake_case (journey_type) for database compatibility
      const journeyTypeFromDb = memoryToEdit.journeyType || memoryToEdit.journey_type;
      if (journeyTypeFromDb) {
        console.log('🎯 Preserving original journeyType:', journeyTypeFromDb, 
          `(from ${memoryToEdit.journeyType ? 'journeyType' : 'journey_type'} field)`);
        setOriginalJourneyType(journeyTypeFromDb);
        
        // 🔧 FIX: If it's a pregnancy journey, also preserve/load child_id
        if (journeyTypeFromDb === 'pregnancy' && memoryToEdit.child_id) {
          console.log('👶 Also loading child_id for pregnancy journey:', memoryToEdit.child_id);
          setSelectedChildId(memoryToEdit.child_id);
        }
      } else {
        // Reset if editing a regular memory
        setOriginalJourneyType(undefined);
      }
      
      // 🔧 CRITICAL FIX: Load existing files from memory
      const files = memoryToEdit.files || [];
      if (files.length > 0) {
        console.log(`📂 Loading ${files.length} existing files from memory:`, files);
        setExistingFiles(files);
      } else {
        setExistingFiles([]);
      }
      
      toast.success('✏️ Editing Memory', {
        description: `"${memoryToEdit.title}" - Make your changes and save`
      });
    }
  }, [isEditMode, memoryToEdit]);
  
  // 🆕 Listen for editMemory event from VaultPage
  useEffect(() => {
    const handleEditMemory = (event: any) => {
      const { memory } = event.detail;
      console.log('📡 Received editMemory event:', memory);
      console.log('📡 Category fields in received memory:', {
        category: memory.category,
        memory_type: memory.memory_type,
        memory_category: memory.memory_category
      });
      
      // Update memoryToEdit state to trigger re-population
      setMemoryToEdit(memory);
    };

    window.addEventListener('editMemory', handleEditMemory);
    return () => window.removeEventListener('editMemory', handleEditMemory);
  }, []);

  // 🐛 DEBUG: Track selectedCategory state changes
  useEffect(() => {
    console.log('🎯 selectedCategory state changed to:', selectedCategory);
  }, [selectedCategory]);

  // Check microphone permission on component mount
  useEffect(() => {
    const checkMicrophonePermission = async () => {
      try {
        const isSecureContext = window.location.protocol === 'https:' || 
                               window.location.hostname === 'localhost' ||
                               window.location.hostname === '127.0.0.1';
        
        if (!isSecureContext) {
          setMicrophonePermission('denied');
          return;
        }

        if (!window.MediaRecorder || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setMicrophonePermission('denied');
          return;
        }

        setMicrophonePermission('checking');

        if (navigator.permissions) {
          try {
            const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
            
            if (permission.state === 'granted') {
              setMicrophonePermission('granted');
            } else if (permission.state === 'denied') {
              setMicrophonePermission('denied');
            } else {
              setMicrophonePermission('prompt');
            }

            permission.onchange = () => {
              setMicrophonePermission(permission.state as 'granted' | 'denied' | 'prompt');
            };
          } catch (error) {
            setMicrophonePermission('prompt');
          }
        } else {
          setMicrophonePermission('prompt');
        }
      } catch (error) {
        setMicrophonePermission('prompt');
      }
    };

    checkMicrophonePermission();
  }, []);

  // Load family members - use prop if available, otherwise load from database
  useEffect(() => {
    const loadAllFamilyMembers = async () => {
      if (!user || !family) {
        return;
      }

      setIsLoadingFamilyMembers(true);
      
      try {
        // If family members provided as prop from family tree, use those
        if (propFamilyMembers && propFamilyMembers.length > 0) {
          console.log(`✅ MemoryUploadPage: Using ${propFamilyMembers.length} family members from prop (family tree)`);
          setFamilyMembers(propFamilyMembers);
          
          // 🔧 FIX: Only set default root user if peopleInMemory is empty AND not in edit mode
          if (!isEditMode && peopleInMemory.length === 0 && !peopleInMemory.includes(user.name)) {
            setPeopleInMemory([user.name]);
          }

          if (!sharedWith.includes(user.name) && !sharedWith.includes('Family')) {
            setSharedWith([user.name]);
          }
          
          setIsLoadingFamilyMembers(false);
          return;
        }

        // Fallback: Demo members for demo user
        if (user.email === 'ilicachauhan87@gmail.com') {
          const demoMembers = [
            { id: 'demo-user', name: 'Ilica Chauhan', relationship: 'self', added_by: user.id, avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b77c?w=100&h=100&fit=crop&crop=face' },
            { id: 'demo-spouse', name: 'Priyam Alok', relationship: 'spouse', added_by: user.id, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face' },
            { id: 'demo-father', name: 'Rajeev Chauhan', relationship: 'father', added_by: user.id, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face' },
            { id: 'demo-mother', name: 'Priti Chauhan', relationship: 'mother', added_by: user.id, avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b77c?w=100&h=100&fit=crop&crop=face' },
            { id: 'demo-daughter', name: 'Miraya Sinha', relationship: 'daughter', added_by: user.id, avatar: 'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=100&h=100&fit=crop&crop=face' },
            { id: 'demo-brother', name: 'Ishan Chauhan', relationship: 'brother', added_by: user.id, avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face' },
          ];
          setFamilyMembers(demoMembers);
          
          // 🔧 FIX: Only set default root user if peopleInMemory is empty AND not in edit mode
          if (!isEditMode && peopleInMemory.length === 0 && !peopleInMemory.includes(user.name)) {
            setPeopleInMemory([user.name]);
          }

          if (!sharedWith.includes(user.name) && !sharedWith.includes('Family')) {
            setSharedWith([user.name]);
          }
          
          setIsLoadingFamilyMembers(false);
          return;
        }
        
        // Fallback: Load from family tree
        const treeData = await DatabaseService.getFamilyTree(user.family_id!);
        
        // Handle both old format (array) and new format (object with people array)
        const peopleArray = Array.isArray(treeData) ? treeData : treeData?.people || [];
        
        // Convert tree data to family member format
        const members = peopleArray.map((person: any) => ({
          id: person.id,
          name: person.name,
          relationship: person.relationship || person.role || 'family member',
          added_by: user.id,
          created_by: user.id,
          avatar: person.photo || person.profilePicture || undefined
        })).filter((m: any) => m.name); // Include everyone with a name

        setFamilyMembers(members);
        console.log(`✅ MemoryUploadPage: Loaded ${members.length} family members from tree fallback`);
        
        // 🔧 FIX: Only set default root user if peopleInMemory is empty AND not in edit mode
        if (!isEditMode && members.length > 0 && peopleInMemory.length === 0 && !peopleInMemory.includes(user.name)) {
          setPeopleInMemory([user.name]);
        }

        if (!sharedWith.includes(user.name) && !sharedWith.includes('Family')) {
          setSharedWith([user.name]);
        }

      } catch (error) {
        console.error('Failed to load family members:', error);
        
        const fallbackMembers: FamilyMember[] = user ? [{
          id: user.id,
          name: user.name,
          relationship: 'self',
          added_by: user.id,
          avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b77c?w=100&h=100&fit=crop&crop=face'
        }] : [];
        
        setFamilyMembers(fallbackMembers);
        
        // 🔧 FIX: Only set default root user if peopleInMemory is empty AND not in edit mode
        if (!isEditMode && user && peopleInMemory.length === 0 && !peopleInMemory.includes(user.name)) {
          setPeopleInMemory([user.name]);
        }

        if (user && !sharedWith.includes(user.name) && !sharedWith.includes('Family')) {
          setSharedWith([user.name]);
        }
      } finally {
        setIsLoadingFamilyMembers(false);
      }
    };

    loadAllFamilyMembers();
  }, [user, family, propFamilyMembers]);

  // Check if this memory is being added for a specific person
  useEffect(() => {
    const selectedPersonId = sessionStorage.getItem('selectedPersonId');
    const selectedPersonName = sessionStorage.getItem('selectedPersonName');
    
    if (selectedPersonId && selectedPersonName && user) {
      const isValidSelection = familyMembers.some(member => 
        member.id === selectedPersonId || member.name === selectedPersonName
      );
      
      if (isValidSelection) {
        const initialPeople = [user.name, selectedPersonName];
        setPeopleInMemory([...new Set(initialPeople)]);
        setTitle(`Memory with ${selectedPersonName}`);
      }
      
      sessionStorage.removeItem('selectedPersonId');
      sessionStorage.removeItem('selectedPersonName');
    }
  }, [user, familyMembers]);

  const memoryCategories: MemoryCategory[] = [
    {
      id: 'moments-memories',
      title: 'Moments & Memories',
      description: 'Everyday life, special occasions, and precious family moments',
      icon: Heart,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      gradient: 'from-pink-400 to-rose-500'
    },
    {
      id: 'rituals-traditions',
      title: 'Rituals & Traditions',
      description: 'Cultural practices, festivals, and family customs',
      icon: Star,
      color: 'text-violet-600',
      bgColor: 'bg-violet-50',
      gradient: 'from-violet-500 to-purple-600'
    },
    {
      id: 'blessings-messages',
      title: 'Blessings & Messages',
      description: 'Heartfelt wishes, prayers, and words of love',
      icon: MessageSquare,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'recipes-wisdom',
      title: 'Recipes & Wisdom',
      description: 'Family recipes, cooking secrets, and life wisdom',
      icon: Coffee,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      gradient: 'from-amber-500 to-orange-500'
    },
    {
      id: 'stories',
      title: 'Stories',
      description: 'Family history, tales from the past, and shared narratives',
      icon: BookOpen,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      gradient: 'from-emerald-500 to-teal-500'
    },
    {
      id: 'milestones',
      title: 'Milestones',
      description: 'Important life events, achievements, and significant moments',
      icon: Trophy,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      gradient: 'from-yellow-500 to-amber-500'
    },
    {
      id: 'time-capsule',
      title: 'Time Capsule',
      description: 'Future messages & memories to unlock on special dates',
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      gradient: 'from-purple-500 to-indigo-600'
    }
  ];

  const formatOptions: FormatOption[] = [
    {
      type: 'text',
      icon: FileText,
      label: 'Text',
      color: 'text-slate-600',
      gradient: 'from-slate-500 to-gray-600'
    },
    {
      type: 'photo',
      icon: Camera,
      label: 'Photo',
      color: 'text-indigo-600',
      gradient: 'from-indigo-500 to-purple-500'
    },
    {
      type: 'video',
      icon: Video,
      label: 'Video',
      color: 'text-red-600',
      gradient: 'from-red-500 to-pink-500'
    },
    {
      type: 'audio',
      icon: Mic,
      label: 'Audio',
      color: 'text-green-600',
      gradient: 'from-green-500 to-emerald-500'
    }
  ];

  const predefinedEmotions = [
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

  // Get list of family member names for filtering
  const familyMemberNames = familyMembers.map(member => member.name);

  const filteredFamilyMembers = familyMemberNames.filter(member =>
    member.toLowerCase().includes(peopleSearchTerm.toLowerCase())
  );

  const filteredSharingMembers = familyMemberNames.filter(member =>
    member.toLowerCase().includes(sharingSearchTerm.toLowerCase())
  );

  // Calculate completion progress
  useEffect(() => {
    let progress = 0;
    
    if (selectedCategory.trim()) progress += 20;
    if (selectedFormats.length > 0) progress += 15;
    if (title.trim()) progress += 25;
    if (description.trim() || uploadedFiles.length > 0) progress += 25;
    if (peopleInMemory.length > 0) progress += 10;
    
    if (emotionTags.length > 0) progress += 2;
    if (date || location) progress += 2;
    if (generalTags.length > 0) progress += 1;
    
    progress = Math.min(progress, 100);
    setCompletionProgress(progress);
  }, [selectedCategory, selectedFormats, title, description, uploadedFiles, peopleInMemory, emotionTags, date, location, generalTags]);

  const handleToggleFormat = (formatType: string) => {
    if (selectedFormats.includes(formatType)) {
      setSelectedFormats(selectedFormats.filter(f => f !== formatType));
    } else {
      setSelectedFormats([...selectedFormats, formatType]);
    }
  };

  const handleTogglePerson = (person: string) => {
    const isValidPerson = familyMemberNames.includes(person);
    if (!isValidPerson) {
      return;
    }

    if (peopleInMemory.includes(person)) {
      setPeopleInMemory(peopleInMemory.filter(p => p !== person));
    } else {
      setPeopleInMemory([...peopleInMemory, person]);
    }
  };

  const handleToggleEmotion = (emotion: string) => {
    if (emotionTags.includes(emotion)) {
      setEmotionTags(emotionTags.filter(e => e !== emotion));
    } else {
      setEmotionTags([...emotionTags, emotion]);
    }
  };

  const handleAddCustomEmotion = () => {
    if (customEmotion.trim() && !emotionTags.includes(customEmotion.trim())) {
      setEmotionTags([...emotionTags, customEmotion.trim()]);
      setCustomEmotion('');
    }
  };

  // Video preview creation function with robust error handling
  const createVideoPreview = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          try {
            resolve(URL.createObjectURL(file));
          } catch (error) {
            console.error('Error creating video preview URL:', error);
            reject(error);
          }
        };
        video.onerror = (error) => {
          console.error('Error loading video for preview:', error);
          reject(error);
        };
        video.src = URL.createObjectURL(file);
      } catch (error) {
        console.error('Error setting up video preview:', error);
        reject(error);
      }
    });
  };

  // 🔧 FIXED: Robust file upload handling with comprehensive error management
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, fileType: 'photo' | 'video' | 'audio' | 'text') => {
    const files = event.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    setIsCompressing(true);
    
    try {
      console.log(`📁 Processing ${newFiles.length} file(s) for smart upload...`);
      
      const processedFiles: UploadedFile[] = [];
      const storageInfo = StorageManager.getStorageInfo();
      const remainingSpaceMB = parseFloat(storageInfo.remainingMB);
      
      // 🚀 OPTIMIZATION: Process files in parallel (5 at a time)
      console.log(`🚀 Processing ${newFiles.length} files in PARALLEL...`);
      const videoChecks: {file: File; reason: string}[] = [];
      const BATCH_SIZE = 5; // Process 5 files at once
      
      for (let i = 0; i < newFiles.length; i += BATCH_SIZE) {
        const batch = newFiles.slice(i, i + BATCH_SIZE);
        console.log(`📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(newFiles.length / BATCH_SIZE)} (${batch.length} files)...`);
        
        // Process batch in parallel
        const batchResults = await Promise.all(
          batch.map(async (file) => {
            try {
              console.log(`📄 Processing: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
              
              let finalFile: File | Blob = file;
              let compressed = false;
              let originalSize = file.size;
              
              // Enhanced video file handling
              if (fileType === 'video' && file.type.startsWith('video/')) {
                try {
                  const videoCheck = await StorageManager.checkVideoSize(file);
                  if (videoCheck.shouldCompress) {
                    videoChecks.push({ file, reason: videoCheck.reason });
                    toast.warning(`⚠️ Large video: ${file.name}`);
                  }
                } catch (videoError) {
                  console.warn('Error checking video size:', videoError);
                }
              }
              
              // Intelligent compression based on file type and available space
              if (fileType === 'photo' && file.type.startsWith('image/')) {
                const fileSizeMB = file.size / 1024 / 1024;
                if (fileSizeMB > 2 || remainingSpaceMB < 5) {
                  try {
                    const compressionTarget = remainingSpaceMB < 2 ? 0.5 : 1;
                    const result = await StorageManager.compressImage(file, compressionTarget);
                    finalFile = result.file;
                    compressed = result.compressed;
                    originalSize = result.originalSize;
                  } catch (compressionError) {
                    console.warn('Error compressing image:', compressionError);
                  }
                }
              }
              
              // Create preview with robust error handling
              let preview = '';
              try {
                if (fileType === 'photo' && finalFile.type.startsWith('image/')) {
                  preview = await createImagePreview(finalFile as File);
                } else if (fileType === 'video' && finalFile.type.startsWith('video/')) {
                  preview = await createVideoPreview(finalFile as File);
                }
              } catch (previewError) {
                console.warn(`⚠️ Preview creation failed for ${(finalFile as File).name}:`, previewError);
              }
              
              const finalSizeMB = (finalFile.size / 1024 / 1024).toFixed(2);
              const compressionInfo = compressed 
                ? ` (compressed from ${(originalSize / 1024 / 1024).toFixed(2)}MB)`
                : '';
              
              console.log(`✅ Processed: ${(finalFile as File).name || 'file'} - ${finalSizeMB}MB${compressionInfo}`);
              
              return {
                success: true,
                data: {
                  file: finalFile as File,
                  preview,
                  type: fileType,
                  compressed,
                  originalSize
                }
              };
            } catch (fileError: any) {
              console.error(`Error processing file ${file.name}:`, fileError);
              toast.error(`Failed to process ${file.name}`);
              return { success: false, error: fileError };
            }
          })
        );
        
        // Collect successful results
        batchResults.forEach(result => {
          if (result.success && result.data) {
            processedFiles.push(result.data);
          }
        });
      }

      if (processedFiles.length > 0) {
        setUploadedFiles([...uploadedFiles, ...processedFiles]);
        setVideoCompressionNeeded(videoChecks);
        
        const totalNewSize = processedFiles.reduce((sum, f) => sum + f.file.size, 0);
        const totalSizeMB = (totalNewSize / 1024 / 1024).toFixed(2);
        const compressedCount = processedFiles.filter(f => f.compressed).length;
        
        if (videoChecks.length > 0) {
          toast.warning(`📹 ${videoChecks.length} large video(s) uploaded. Memory may need to be saved without video content if storage is full.`);
        } else if (compressedCount > 0) {
          toast.success(`📁 ${processedFiles.length} file(s) uploaded! ${compressedCount} optimized to save space. Total: ${totalSizeMB}MB`);
        } else {
          toast.success(`📁 ${processedFiles.length} file(s) uploaded! Total: ${totalSizeMB}MB`);
        }
      }
        
    } catch (error: any) {
      console.error('Error processing files:', error);
      toast.error(`Error processing files: ${error?.message || 'Unknown error'}. Please try again.`);
    } finally {
      setIsCompressing(false);
    }
  };

  // Helper function to create image preview with robust error handling
  const createImagePreview = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const result = e.target?.result as string;
            if (result) {
              resolve(result);
            } else {
              reject(new Error('Failed to read file'));
            }
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = (error) => {
          console.error('FileReader error:', error);
          reject(new Error('Failed to read file'));
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('Error setting up FileReader:', error);
        reject(error);
      }
    });
  };

  const handleRemoveFile = (index: number) => {
    try {
      const fileToRemove = uploadedFiles[index];
      
      if (fileToRemove.preview && fileToRemove.type === 'video') {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      
      const removedFileName = fileToRemove.file.name;
      const removedFileSize = (fileToRemove.file.size / 1024 / 1024).toFixed(2);
      
      setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
      
      // Remove from video compression warnings if applicable
      setVideoCompressionNeeded(prev => prev.filter(v => v.file.name !== removedFileName));
      
      console.log(`🗑️ File removed: ${removedFileName} (${removedFileSize} MB)`);
      toast.success(`File removed: ${removedFileName}`);
    } catch (error: any) {
      console.error('Error removing file:', error);
      toast.error(`Error removing file: ${error?.message || 'Unknown error'}`);
    }
  };

  // 🆕 Handler to remove existing files (from memory being edited)
  const handleRemoveExistingFile = (index: number) => {
    try {
      const fileToRemove = existingFiles[index];
      const removedFileName = fileToRemove.name || 'Unknown file';
      
      setExistingFiles(existingFiles.filter((_, i) => i !== index));
      
      console.log(`🗑️ Existing file removed: ${removedFileName}`);
      toast.success(`Existing file removed: ${removedFileName}`);
    } catch (error: any) {
      console.error('Error removing existing file:', error);
      toast.error(`Error removing existing file: ${error?.message || 'Unknown error'}`);
    }
  };

  // Storage cleanup function
  const handleCleanupStorage = () => {
    if (!user) return;
    
    try {
      const removedCount = StorageManager.cleanupOldMemories(user.id, 10);
      if (removedCount > 0) {
        const info = StorageManager.getStorageInfo();
        // Note: setStorageInfo removed - using Supabase Storage now
        toast.success(`🧹 Cleaned up ${removedCount} old memories. ${info.remainingMB}MB space available.`);
      } else {
        toast.info('No old memories to clean up.');
      }
    } catch (error: any) {
      console.error('Error cleaning up storage:', error);
      toast.error(`Error cleaning up storage: ${error?.message || 'Unknown error'}`);
    }
  };

  // Request microphone permission with user guidance
  const requestMicrophonePermission = async () => {
    try {
      setMicrophonePermission('checking');

      const isSecureContext = window.location.protocol === 'https:' || 
                             window.location.hostname === 'localhost' ||
                             window.location.hostname === '127.0.0.1';
      
      if (!isSecureContext) {
        setMicrophonePermission('denied');
        setShowPermissionHelp(true);
        toast.error('🔒 Recording requires HTTPS. Please use a secure connection.');
        return false;
      }

      if (!window.MediaRecorder || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicrophonePermission('denied');
        setShowPermissionHelp(true);
        toast.error('❌ Your browser doesn\'t support audio recording.');
        return false;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
          channelCount: 1
        }
      });

      setMicrophonePermission('granted');
      setShowPermissionHelp(false);
      
      stream.getTracks().forEach(track => track.stop());
      
      return true;

    } catch (error: any) {
      setMicrophonePermission('denied');
      setShowPermissionHelp(true);
      
      if (error?.name === 'NotAllowedError') {
        toast.error('🚫 Microphone access denied. Please click the microphone icon in your browser and allow access.');
      } else if (error?.name === 'NotFoundError') {
        toast.error('🎤 No microphone found. Please check your device and try again.');
      } else if (error?.name === 'NotSupportedError') {
        toast.error('❌ Audio recording is not supported in this browser.');
      } else {
        toast.error('⚠️ Could not access microphone. Please check your settings.');
      }
      
      return false;
    }
  };

  // Working audio recording functionality with permission handling
  const startRecording = async () => {
    try {
      const hasPermission = microphonePermission === 'granted' || await requestMicrophonePermission();
      
      if (!hasPermission) {
        return;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
          channelCount: 1
        }
      });

      setRecordingStream(stream);

      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      }

      const recorder = new MediaRecorder(stream, { mimeType });

      const chunks: Blob[] = [];
      setAudioChunks(chunks);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        if (chunks.length === 0) {
          toast.error('No audio was recorded. Please try again.');
          return;
        }

        try {
          const audioBlob = new Blob(chunks, { type: mimeType });
          const audioUrl = URL.createObjectURL(audioBlob);
          setRecordedAudioUrl(audioUrl);
          
          // 🔧 FIXED: Use safe file creation for audio recording
          const audioFile = StorageManager.createSafeFile(
            [audioBlob], 
            `recording_${StorageManager.getCurrentTimestamp()}.webm`, 
            { type: mimeType }
          );
          
          const audioSizeMB = (audioBlob.size / 1024 / 1024).toFixed(2);
          
          console.log(`🎙️ Audio recording completed: ${audioSizeMB} MB`);
          
          const newUploadedFile: UploadedFile = {
            file: audioFile as File,
            preview: audioUrl,
            type: 'audio',
            compressed: false,
            originalSize: audioBlob.size
          };
          
          setUploadedFiles(prev => [...prev, newUploadedFile]);
          
          if (recordingStream) {
            recordingStream.getTracks().forEach(track => {
              track.stop();
            });
            setRecordingStream(null);
          }
          
          const duration = Math.floor(recordingDuration);
          toast.success(`🎙️ Recording saved! Duration: ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')} | Size: ${audioSizeMB} MB`);
        } catch (error: any) {
          console.error('Error processing recording:', error);
          toast.error(`Error processing recording: ${error?.message || 'Unknown error'}`);
        }
      };

      recorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        toast.error('Recording error occurred. Please try again.');
      };

      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingDuration(0);
      
      const timer = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      setRecordingTimer(timer);
      
      recorder.start(250);
      
      toast.success('🎙️ Recording started! Speak clearly.');
      
    } catch (error: any) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
      setMicrophonePermission('denied');
      setShowPermissionHelp(true);
      
      if (error?.name === 'NotAllowedError') {
        toast.error('🚫 Microphone permission denied. Please allow microphone access and try again.');
      } else if (error?.name === 'NotFoundError') {
        toast.error('🎤 No microphone found. Please check your device and try again.');
      } else {
        toast.error('⚠️ Could not start recording. Please check your microphone and try again.');
      }
    }
  };

  const stopRecording = () => {
    try {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
      
      setIsRecording(false);
      
      if (recordingTimer) {
        clearInterval(recordingTimer);
        setRecordingTimer(null);
      }
    } catch (error: any) {
      console.error('Error stopping recording:', error);
      toast.error(`Error stopping recording: ${error?.message || 'Unknown error'}`);
    }
  };

  const clearRecording = () => {
    try {
      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
        setRecordedAudioUrl(null);
      }
      setAudioChunks([]);
      setRecordingDuration(0);
      
      setUploadedFiles(prev => prev.filter(file => !file.file.name.startsWith('recording_')));
      
      toast.success('Recording cleared');
    } catch (error: any) {
      console.error('Error clearing recording:', error);
      toast.error(`Error clearing recording: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleToggleSharingWithMember = (memberName: string) => {
    const isValidMember = familyMemberNames.includes(memberName);
    if (!isValidMember) {
      return;
    }

    const member = familyMembers.find(m => m.name === memberName);
    if (member?.id === user?.id) {
      return;
    }

    // Clear private mode when selecting individual members
    setIsPrivate(false);

    const withoutFamily = sharedWith.filter(p => p !== 'Family');
    
    if (withoutFamily.includes(memberName)) {
      const updatedSharing = withoutFamily.filter(p => p !== memberName);
      if (user && !updatedSharing.includes(user.name)) {
        updatedSharing.push(user.name);
      }
      setSharedWith(updatedSharing);
    } else {
      const updatedSharing = [...withoutFamily, memberName];
      if (user && !updatedSharing.includes(user.name)) {
        updatedSharing.push(user.name);
      }
      setSharedWith(updatedSharing);
    }
  };

  const handleShareWithAllFamily = () => {
    // Clear private mode when sharing with family
    setIsPrivate(false);
    
    if (sharedWith.includes('Family') || sharedWith.length === familyMemberNames.length) {
      setSharedWith(user ? [user.name] : []);
    } else {
      setSharedWith(['Family']);
    }
  };

  const handleSetPrivate = () => {
    setIsPrivate(true);
    setSharedWith(user ? [user.name] : []);
  };

  const handleAddGeneralTag = () => {
    if (newGeneralTag.trim() && !generalTags.includes(newGeneralTag.trim())) {
      setGeneralTags([...generalTags, newGeneralTag.trim()]);
      setNewGeneralTag('');
    }
  };

  const handleRemoveGeneralTag = (tagToRemove: string) => {
    setGeneralTags(generalTags.filter(tag => tag !== tagToRemove));
  };

  // Enhanced save memory function with comprehensive error handling
  const handleSaveMemory = async () => {
    if (!user) {
      toast.error('User not found. Please sign in again.');
      return;
    }

    if (!selectedCategory) {
      toast.error('Please select a memory category');
      return;
    }

    if (!title.trim()) {
      toast.error('Please enter a memory title');
      return;
    }

    if (!description.trim() && uploadedFiles.length === 0 && existingFiles.length === 0) {
      toast.error('Please add a description or upload files');
      return;
    }

    // 👶 NEW: Validate child selection for pregnancy journeys
    if (milestoneContext?.journeyType === 'pregnancy' && !selectedChildId) {
      toast.error('Please select which child this pregnancy memory is for');
      return;
    }

    try {
      // Calculate total file size and prepare metadata
      const totalFileSize = uploadedFiles.reduce((sum, file) => sum + file.file.size, 0);
      const totalSizeMB = (totalFileSize / 1024 / 1024).toFixed(2);
      const compressedCount = uploadedFiles.filter(f => f.compressed).length;
      const hasLargeVideos = videoCompressionNeeded.length > 0;
      
      console.log(`💾 Saving memory with enhanced storage management:`);
      console.log(`📊 Total files: ${uploadedFiles.length}`);
      console.log(`📊 Total size: ${totalSizeMB} MB`);
      console.log(`📊 Compressed files: ${compressedCount}`);
      console.log(`📊 Large videos: ${videoCompressionNeeded.length}`);
      
      // 🆕 Log journey type if present
      if (milestoneContext?.journeyType) {
        console.log(`🎯 JOURNEY TYPE: ${milestoneContext.journeyType}`);
        console.log(`   Phase: ${milestoneContext.phase}`);
        console.log(`   Milestone: ${milestoneContext.milestoneTitle}`);
      }

      const currentTime = StorageManager.getCurrentISOString();

      // 🆕 CRITICAL: Extract and log journey type BEFORE creating memory object
      // 🎯 CRITICAL FIX: Preserve journeyType when editing (couple/pregnancy memories)
      // Priority: 1) originalJourneyType (from editing), 2) milestoneContext (from adding new)
      const extractedJourneyType = originalJourneyType || milestoneContext?.journeyType || undefined;
      console.log(`💾 JOURNEY TYPE EXTRACTION:`, {
        milestoneContextExists: !!milestoneContext,
        rawJourneyType: milestoneContext?.journeyType,
        extractedJourneyType: extractedJourneyType,
        willSaveAs: extractedJourneyType ? `"${extractedJourneyType}"` : 'undefined (regular memory)'
      });
      
      // 🐛 CRITICAL DEBUG: Check if peopleInMemory contains IDs vs names mismatch
      console.log('👥 PEOPLE DATA BEFORE SAVE:', {
        peopleInMemory,
        count: peopleInMemory.length,
        sample: peopleInMemory[0],
        familyMemberNames,
        nameSample: familyMemberNames[0],
        willFilterTo: peopleInMemory.filter(person => familyMemberNames.includes(person)),
        diagnosis: peopleInMemory.length > 0 && !familyMemberNames.includes(peopleInMemory[0]) 
          ? 'MISMATCH: peopleInMemory has IDs but filter expects NAMES' 
          : 'OK: Data types match'
      });

      // 🚀 CRITICAL FIX: Upload files to Supabase Storage FIRST, then save URLs to database
      // This prevents page hang from trying to save base64 data to PostgreSQL JSONB column
      let uploadedFileMetadata: any[] = [];
      let memoryId = isEditMode && memoryToEdit?.id 
        ? memoryToEdit.id 
        : `memory_${StorageManager.getCurrentTimestamp()}_${Math.random().toString(36).substr(2, 9)}`;
      
      if (uploadedFiles.length > 0) {
        console.log(`📤 Uploading ${uploadedFiles.length} NEW files to Supabase Storage IN PARALLEL...`);
        
        // Show initial upload toast
        const uploadToastId = toast.loading(`Uploading 0/${uploadedFiles.length} files...`);
        
        try {
          // Import storage upload function
          const { uploadMemoryFiles } = await import('../utils/supabase/storage');
          
          // Upload all files to Supabase Storage WITH PROGRESS TRACKING
          const actualFiles = uploadedFiles.map(uf => uf.file);
          const uploadResults = await uploadMemoryFiles(
            actualFiles,
            user,
            family || null,
            memoryId,
            (progress, message) => {
              // Update toast with live progress
              toast.loading(`📤 ${message}`, { id: uploadToastId });
            }
          );
          
          console.log(`✅ Uploaded ${uploadResults.length} NEW files to Supabase Storage`);
          
          // Create file metadata WITHOUT base64 previews - only storage URLs
          uploadedFileMetadata = uploadResults.map((result, index) => ({
            name: result.name,
            type: uploadedFiles[index].type,
            size: result.size,
            sizeMB: (result.size / 1024 / 1024).toFixed(2),
            url: result.url, // ✅ Supabase Storage URL (not base64)
            storage_path: result.storage_path,
            compressed: result.compressed || uploadedFiles[index].compressed || false,
            originalSize: result.originalSize || uploadedFiles[index].originalSize || result.size
          }));
          
          // Dismiss loading toast and show success
          toast.dismiss(uploadToastId);
          toast.success(`✅ ${uploadResults.length} file(s) uploaded!`);
        } catch (uploadError: any) {
          console.error('❌ File upload error:', uploadError);
          toast.error(`Failed to upload files: ${uploadError?.message || 'Unknown error'}`);
          return;
        }
      }

      // 🔧 CRITICAL FIX: Merge existing files with newly uploaded files
      const allFiles = [...existingFiles, ...uploadedFileMetadata];
      console.log(`📂 Total files for memory: ${allFiles.length} (${existingFiles.length} existing + ${uploadedFileMetadata.length} new)`);
      if (existingFiles.length > 0) {
        console.log('📂 Preserving existing files:', existingFiles.map(f => f.name));
      }

      const memory = {
        id: memoryId,
        
        // Use consistent field names that match what VaultPage expects
        title: title.trim(),
        description: description.trim(),
        type: selectedFormats[0] || 'photo', // Primary type
        format: selectedFormats[0] || 'photo', // Format alias
        memory_type: selectedFormats[0] || 'photo', // ✅ FIX: Use format (photo/video/audio/text) not category
        
        // 🔧 CRITICAL FIX: Save category field so it persists when editing
        category: selectedCategory || 'moments-memories',
        memory_category: selectedCategory || 'moments-memories', // Backward compatibility
        
        // 🆕 JOURNEY TYPE: Include journey type from milestone context
        // This is critical for VaultPage filtering (couple journey, pregnancy journey, or regular)
        // 🔧 FIX: Save BOTH camelCase AND snake_case for database compatibility
        journeyType: extractedJourneyType,
        journey_type: extractedJourneyType, // Database field (snake_case)
        
        // 👶 NEW: CHILD ID - Link pregnancy memories to specific children
        // This enables separate pregnancy books per child in Memory Vault
        child_id: extractedJourneyType === 'pregnancy' ? selectedChildId : undefined,
        
        // 🎬 CRITICAL: File and media data - Save STORAGE URLS not base64 previews!
        // This prevents massive JSONB inserts that hang the browser
        // 🔧 FIX: Use allFiles (existing + new) instead of just uploadedFileMetadata
        files: allFiles,
        
        // VaultPage expects these fields - use Supabase Storage URL (not base64)
        file_url: allFiles[0]?.url || null,
        thumbnail_url: allFiles[0]?.url || null,
        
        // People and tags
        tags: generalTags,
        // 🔧 CRITICAL FIX: Convert IDs to names (peopleInMemory has IDs from dropdown)
        people_involved: (() => {
          const names = peopleInMemory.map(personId => {
            const member = familyMembers.find(m => m.id === personId);
            return member ? member.name : personId; // Fallback to ID if name not found
          });
          console.log('👥 SAVE: Converting people IDs → names:', {
            fromDropdown: peopleInMemory,
            converted: names,
            willSaveToDatabase: names
          });
          return names;
        })(),
        person_tags: peopleInMemory.map(personId => {
          const member = familyMembers.find(m => m.id === personId);
          return member ? member.name : personId; // Fallback to ID if name not found
        }),
        emotionTags,
        
        // Location and date
        location: location.trim(),
        date: date,
        date_of_memory: date || currentTime,
        memory_date: date || currentTime,
        
        // Privacy settings
        is_private: isPrivate,
        privacy_level: isPrivate ? 'private' : 'family',
        sharedWith: sharedWith.filter(person => familyMemberNames.includes(person) || person === 'Family'),
        
        // User and family tracking
        created_by: user.id,
        uploaded_by: user.id,
        family_id: user.family_id || family?.id,
        
        // Storage metadata
        totalFileSize: totalFileSize,
        totalSizeMB: totalSizeMB,
        fileCount: allFiles.length, // 🔧 FIX: Use total file count (existing + new)
        compressionInfo: compressedCount > 0 ? `${compressedCount} files optimized` : null,
        largeVideoWarning: hasLargeVideos ? `${videoCompressionNeeded.length} large videos may be stripped if storage full` : null,
        
        // Timestamps
        created_at: currentTime,
        createdAt: currentTime, // Alias for compatibility
        updated_at: currentTime,
        updatedAt: currentTime // Alias for compatibility
      };

      // 🔧 CRITICAL FIX: Use DatabaseService.addMemory() or updateMemory() based on mode
      // This ensures:
      // 1. Memory is saved/updated to Supabase database (cross-device sync)
      // 2. Memory is cached to localStorage (fast access)
      // 3. memoryAdded/memoryUpdated event is automatically dispatched (VaultPage listens for this)
      console.log(`💾 ${isEditMode ? 'Updating' : 'Saving'} memory via DatabaseService...`);
      console.log(`🎬 Files array contains ${memory.files.length} files:`, memory.files);
      
      let saveResult;
      if (isEditMode && memoryToEdit?.id) {
        // UPDATE EXISTING MEMORY
        console.log(`✏️ Updating existing memory: ${memoryToEdit.id}`);
        saveResult = await DatabaseService.updateMemory(
          user.family_id || family?.id, 
          memoryToEdit.id, 
          memory
        );
      } else {
        // CREATE NEW MEMORY
        console.log(`➕ Creating new memory`);
        saveResult = await DatabaseService.addMemory(user.family_id || family?.id, memory);
      }
      
      if (saveResult.success) {
        // Event is already dispatched by DatabaseService.addMemory()
        // No need to dispatch again here
        
        // Note: Storage info update removed - using Supabase Storage now
        // const updatedStorageInfo = StorageManager.getStorageInfo();
        
        console.log(`✅ Memory ${isEditMode ? 'updated' : 'saved'} successfully with ${allFiles.length} total files (${existingFiles.length} existing + ${uploadedFileMetadata.length} new)`);
        
        // Provide clear feedback to user
        // DatabaseService.addMemory() / updateMemory() doesn't return savedWithoutFiles
        // It saves all data including files to database
        let successMessage = isEditMode ? '✅ Memory updated successfully!' : '🎉 Memory saved successfully!';
        if (isEditMode && existingFiles.length > 0) {
          successMessage += ` ${existingFiles.length} existing file(s) preserved.`;
        }
        if (compressedCount > 0) {
          successMessage += ` ${compressedCount} file(s) optimized.`;
        }
        if (allFiles.length > 0) {
          successMessage += ` Total: ${allFiles.length} file(s).`;
        }
        toast.success(successMessage);
        
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        // Save failed completely
        toast.error(saveResult.message || 'Unable to save memory due to storage limitations. Try removing some files or cleaning up old memories.');
      }

    } catch (error: any) {
      console.error('Failed to save memory:', error);
      
      if (error?.name === 'QuotaExceededError') {
        toast.error('⚠️ Storage full! Try compressing files or cleaning up old memories.');
        setShowStorageWarning(true);
      } else {
        toast.error(`Failed to save memory: ${error?.message || 'Unknown error'}. Please try again.`);
      }
    }
  };

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      uploadedFiles.forEach(file => {
        if (file.preview && file.type === 'video') {
          URL.revokeObjectURL(file.preview);
        }
      });
      
      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
      }
      
      if (recordingTimer) {
        clearInterval(recordingTimer);
      }
      
      if (recordingStream) {
        recordingStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // 🐛 DEBUG: Log peopleInMemory state right before render to help debug display issues
  console.log('👥 PEOPLE IN MEMORY STATE (Before Save):', {
    peopleInMemory,
    count: peopleInMemory.length,
    familyMemberNames: familyMembers.map(m => m.name),
    familyMembersCount: familyMembers.length,
    isEditMode,
    memoryToEdit: memoryToEdit?.title
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h3>Access Denied</h3>
          <p className="text-muted-foreground">Please sign in to add memories</p>
          <Button onClick={onBack} className="mt-4 vibrant-button">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background vibrant-texture pb-8">
      <div className="px-4 py-6 space-y-6">
        {/* Header - Page Title */}
        <div className="text-center space-y-4">
          <div>
            {journeyContext ? (
              <>
                <div className="text-center mb-3">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full border border-purple-200">
                    <span className="text-2xl">{getJourneyIcon(journeyContext.journey)}</span>
                    <span className="text-sm font-medium text-purple-700">
                      {getJourneyDisplayName(journeyContext.journey)}
                    </span>
                  </div>
                </div>
                <h1 className="text-3xl font-semibold text-primary flex items-center justify-center gap-2">
                  <span className="text-2xl">{journeyContext.milestone.icon}</span>
                  {journeyContext.milestone.title}
                </h1>
                <p className="text-muted-foreground">{journeyContext.milestone.description}</p>
                {journeyContext.culturalNote && (
                  <div className="mt-3 p-3 bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-800 italic flex items-start gap-2">
                      <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      {journeyContext.culturalNote}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <h1 className="text-3xl font-semibold text-primary flex items-center justify-center gap-2">
                  <Sparkles className="h-8 w-8 text-primary" />
                  Create Memory
                </h1>
                <p className="text-muted-foreground">Share your precious family moments with smart storage</p>
              </>
            )}
          </div>

          <div className="flex items-center justify-center gap-4">
            <div className="text-sm text-muted-foreground">
              {completionProgress}% Complete
            </div>
            <Progress value={completionProgress} className="w-32" />
          </div>
        </div>

        {/* Note: localStorage storage monitoring removed - now using Supabase Storage with much larger capacity */}

        {/* Large Video Warnings */}
        {videoCompressionNeeded.length > 0 && (
          <div className="memory-card p-4 border-orange-200 bg-orange-50">
            <div className="flex items-start gap-3">
              <Video className="h-5 w-5 text-orange-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-orange-800">Large Video Files Detected</h3>
                <p className="text-orange-700 text-sm mb-2">
                  {videoCompressionNeeded.length} video file(s) are quite large and may not save if storage is full.
                </p>
                <div className="space-y-1">
                  {videoCompressionNeeded.map((video, index) => (
                    <div key={index} className="text-xs text-orange-600 bg-white p-2 rounded border">
                      📹 {video.file.name} - {video.reason}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* File Processing Status */}
        {isCompressing && (
          <div className="memory-card p-4 border-blue-200 bg-blue-50">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
              <div>
                <h3 className="font-semibold text-blue-800">Processing Files</h3>
                <p className="text-blue-700 text-sm">Optimizing images and checking video sizes...</p>
              </div>
            </div>
          </div>
        )}

        {/* Microphone Permission Help Modal */}
        {showPermissionHelp && (
          <div className="memory-card p-6 mb-6 border-amber-200 bg-amber-50">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-amber-800 mb-2">Microphone Access Required</h3>
                <p className="text-amber-700 mb-4">
                  To record audio memories, please allow microphone access in your browser.
                </p>
                
                <div className="space-y-3 text-sm text-amber-700">
                  <div className="font-medium">How to enable microphone access:</div>
                  
                  <div className="bg-white p-3 rounded border">
                    <div className="font-medium mb-1">Chrome / Edge:</div>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>Click the microphone icon 🎤 in your browser's address bar</li>
                      <li>Select "Always allow" or "Allow"</li>
                      <li>Refresh the page and try recording again</li>
                    </ol>
                  </div>
                  
                  <div className="bg-white p-3 rounded border">
                    <div className="font-medium mb-1">Safari:</div>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>Go to Safari → Settings → Websites</li>
                      <li>Click "Microphone" in the left sidebar</li>
                      <li>Set this website to "Allow"</li>
                    </ol>
                  </div>
                  
                  <div className="bg-white p-3 rounded border">
                    <div className="font-medium mb-1">Firefox:</div>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>Click the shield icon in the address bar</li>
                      <li>Click "Allow" next to the microphone permission</li>
                      <li>Refresh the page and try again</li>
                    </ol>
                  </div>

                  {window.location.protocol !== 'https:' && 
                   !['localhost', '127.0.0.1'].includes(window.location.hostname) && (
                    <div className="bg-red-50 p-3 rounded border border-red-200">
                      <div className="font-medium text-red-800 mb-1">⚠️ Secure Connection Required</div>
                      <p className="text-red-700 text-xs">
                        Recording requires HTTPS. Please access this site through a secure connection (https://).
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button 
                    onClick={() => requestMicrophonePermission()}
                    className="aqua-button"
                    size="sm"
                  >
                    <Mic className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                  <Button 
                    onClick={() => setShowPermissionHelp(false)}
                    variant="outline"
                    size="sm"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ALL SECTIONS VISIBLE - Single Page Layout */}
        <div className="space-y-8 overflow-visible">
          {/* Section 1: Memory Category */}
          <div className="memory-card p-6">
            <Collapsible open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
              <div className="space-y-4">
                {/* Collapsible Trigger - Shows selected category or placeholder */}
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-200 ${
                      selectedCategory 
                        ? 'border-[#6A0572] bg-[#6A0572]/5 hover:bg-[#6A0572]/10' 
                        : 'border-[#6A0572]/20 hover:border-[#6A0572]/40 bg-[#FDFCDC]'
                    }`}
                    style={{ minHeight: '76px' }}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {selectedCategory ? (
                        // Show selected category
                        <>
                          {(() => {
                            const selected = memoryCategories.find(cat => cat.id === selectedCategory);
                            if (!selected) return null;
                            const Icon = selected.icon;
                            return (
                              <>
                                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${selected.gradient} flex items-center justify-center shrink-0`}>
                                  <Icon className="h-6 w-6 text-white" />
                                </div>
                                <div className="flex-1 text-left">
                                  <h3 className="font-semibold text-lg text-[#22223B]">{selected.title}</h3>
                                  <p className="text-sm text-[#22223B]/60">{selected.description}</p>
                                </div>
                                <CheckCircle2 className="h-6 w-6 text-[#6A0572] shrink-0" />
                              </>
                            );
                          })()}
                        </>
                      ) : (
                        // Show placeholder
                        <>
                          <div className="w-12 h-12 rounded-lg bg-[#6A0572]/10 flex items-center justify-center shrink-0">
                            <Tag className="h-6 w-6 text-[#6A0572]" />
                          </div>
                          <div className="flex-1 text-left">
                            <h3 className="font-semibold text-lg text-[#6A0572]">Select Memory Category *</h3>
                            <p className="text-sm text-[#22223B]/60">Choose what type of memory this is</p>
                          </div>
                        </>
                      )}
                      <ChevronDown 
                        className={`h-6 w-6 text-[#6A0572] shrink-0 transition-transform duration-200 ${
                          isCategoryOpen ? 'rotate-180' : ''
                        }`} 
                      />
                    </div>
                  </button>
                </CollapsibleTrigger>

                {/* Collapsible Content - Shows all categories */}
                <CollapsibleContent>
                  <div className="pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {memoryCategories.map((category) => {
                        const Icon = category.icon;
                        const isSelected = selectedCategory === category.id;
                        
                        return (
                          <div
                            key={category.id}
                            className={`p-4 cursor-pointer transition-all duration-200 border rounded-lg ${
                              isSelected 
                                ? 'border-primary bg-primary/5' 
                                : 'border-gray-200 hover:border-primary/30'
                            }`}
                            onClick={() => {
                              setSelectedCategory(category.id);
                              setIsCategoryOpen(false); // Close after selection
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${category.gradient} flex items-center justify-center`}>
                                <Icon className="h-5 w-5 text-white" />
                              </div>
                              <div className="flex-1">
                                <h3 className="font-semibold text-base">{category.title}</h3>
                                <p className="text-sm text-muted-foreground">{category.description}</p>
                              </div>
                              {isSelected && <CheckCircle2 className="h-5 w-5 text-primary" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          </div>

          {/* 👶 NEW: Child Selection for Pregnancy Journeys */}
          {milestoneContext?.journeyType === 'pregnancy' && user?.family_id && (
            <PregnancyChildSelector
              familyId={user.family_id}
              selectedChildId={selectedChildId}
              onChildSelect={setSelectedChildId}
              required={true}
            />
          )}

          {/* Section 2: Content Format & Upload - COMBINED */}
          <div className="memory-card p-6">
            <h2 className="text-xl mb-4">Content Format</h2>
            <div className="space-y-6">
              {/* Format Selection */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {formatOptions.map((format) => {
                  const Icon = format.icon;
                  const isSelected = selectedFormats.includes(format.type);
                  
                  return (
                    <div
                      key={format.type}
                      className={`p-4 cursor-pointer transition-all duration-200 border rounded-lg ${
                        isSelected 
                          ? 'border-primary bg-primary/5' 
                          : 'border-gray-200 hover:border-primary/30'
                      }`}
                      onClick={() => handleToggleFormat(format.type)}
                    >
                      <div className="flex flex-col items-center text-center">
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${format.gradient} flex items-center justify-center mb-3`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <span className="font-medium">{format.label}</span>
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-primary mt-2" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Upload Options - Based on Selected Formats */}
              {selectedFormats.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Text Content */}
                  {selectedFormats.includes('text') && (
                    <div className="col-span-full">
                      <Label className="flex items-center gap-2 mb-3 text-base">
                        <FileText className="h-5 w-5" />
                        Text Content
                      </Label>
                      <Textarea
                        placeholder="Write your memory, story, recipe, or message here..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="min-h-32"
                      />
                    </div>
                  )}

                  {/* Photo Upload */}
                  {selectedFormats.includes('photo') && (
                    <div>
                      <Label className="flex items-center gap-2 mb-3 text-base">
                        <Camera className="h-5 w-5" />
                        Photos 
                        <Archive className="h-4 w-4 text-green-600" title="Auto-compressed" />
                      </Label>
                      <Button
                        onClick={() => photoInputRef.current?.click()}
                        variant="outline"
                        className="w-full h-24 flex-col gap-2"
                        disabled={isCompressing}
                      >
                        {isCompressing ? (
                          <RefreshCw className="h-6 w-6 animate-spin" />
                        ) : (
                          <Upload className="h-6 w-6" />
                        )}
                        <span className="text-sm">Upload Photos</span>
                        <span className="text-xs opacity-70">Auto-optimized</span>
                      </Button>
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'photo')}
                      />
                    </div>
                  )}

                  {/* Video Upload */}
                  {selectedFormats.includes('video') && (
                    <div>
                      <Label className="flex items-center gap-2 mb-3 text-base">
                        <Video className="h-5 w-5" />
                        Videos
                        {videoCompressionNeeded.length > 0 && (
                          <AlertTriangle className="h-4 w-4 text-orange-500" title="Large videos detected" />
                        )}
                      </Label>
                      <Button
                        onClick={() => videoInputRef.current?.click()}
                        variant="outline"
                        className="w-full h-24 flex-col gap-2"
                        disabled={isCompressing}
                      >
                        {isCompressing ? (
                          <RefreshCw className="h-6 w-6 animate-spin" />
                        ) : (
                          <Upload className="h-6 w-6" />
                        )}
                        <span className="text-sm">Upload Videos</span>
                        <span className="text-xs opacity-70">
                          {showStorageWarning ? 'May be stripped if large' : 'Smart storage'}
                        </span>
                      </Button>
                      <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'video')}
                      />
                    </div>
                  )}

                  {/* Audio Upload & Recording */}
                  {selectedFormats.includes('audio') && (
                    <>
                      {/* Audio Upload */}
                      <div>
                        <Label className="flex items-center gap-2 mb-3 text-base">
                          <Mic className="h-5 w-5" />
                          Upload Audio
                        </Label>
                        <Button
                          onClick={() => audioInputRef.current?.click()}
                          variant="outline"
                          className="w-full h-24 flex-col gap-2"
                          disabled={isCompressing}
                        >
                          {isCompressing ? (
                            <RefreshCw className="h-6 w-6 animate-spin" />
                          ) : (
                            <Upload className="h-6 w-6" />
                          )}
                          <span className="text-sm">Upload Audio</span>
                          <span className="text-xs opacity-70">Smart storage</span>
                        </Button>
                        <input
                          ref={audioInputRef}
                          type="file"
                          accept="audio/*"
                          multiple
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, 'audio')}
                        />
                      </div>

                      {/* Audio Recording */}
                      <div>
                        <Label className="flex items-center gap-2 mb-3 text-base">
                          <Mic2 className="h-5 w-5" />
                          Record Audio
                        </Label>
                        
                        {/* Recording button with permission status */}
                        {microphonePermission === 'checking' ? (
                          <Button 
                            disabled
                            className="w-full h-24 flex-col gap-2"
                          >
                            <RefreshCw className="h-6 w-6 animate-spin" />
                            <span className="text-sm">Checking...</span>
                          </Button>
                        ) : microphonePermission === 'denied' ? (
                          <Button 
                            onClick={() => setShowPermissionHelp(true)}
                            variant="outline"
                            className="w-full h-24 flex-col gap-2 border-amber-300 bg-amber-50 hover:bg-amber-100"
                          >
                            <MicOff className="h-6 w-6" />
                            <span className="text-sm">Enable Mic</span>
                          </Button>
                        ) : !isRecording ? (
                          <Button 
                            onClick={startRecording}
                            className="aqua-button w-full h-24 flex-col gap-2"
                          >
                            <Mic className="h-6 w-6" />
                            <span className="text-sm">Start Recording</span>
                            <span className="text-xs opacity-70">High quality</span>
                          </Button>
                        ) : (
                          <Button 
                            onClick={stopRecording}
                            className="bg-red-500 hover:bg-red-600 text-white w-full h-24 flex-col gap-2"
                          >
                            <Square className="h-6 w-6" />
                            <span className="text-sm">Stop Recording</span>
                            <span className="text-xs opacity-70">Recording...</span>
                          </Button>
                        )}

                        {/* Recording Status */}
                        {isRecording && (
                          <div className="mt-3 flex items-center gap-2 p-2 bg-red-50 rounded border border-red-200">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            <span className="text-sm font-medium text-red-700">
                              {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                            </span>
                            <span className="text-xs text-red-600 ml-auto">Recording...</span>
                          </div>
                        )}

                        {/* Recorded Audio Preview */}
                        {recordedAudioUrl && (
                          <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-green-700">Recording Ready</span>
                              <Button 
                                onClick={clearRecording}
                                variant="outline"
                                size="sm"
                              >
                                Clear
                              </Button>
                            </div>
                            <audio 
                              src={recordedAudioUrl} 
                              controls 
                              className="w-full"
                            />
                            <div className="text-xs text-green-600 mt-1">
                              Duration: {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Memory Details */}
          <div className="memory-card p-6">
            <h2 className="text-xl mb-4">Memory Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title" className="text-base">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Give your memory a meaningful title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                {!selectedFormats.includes('text') && (
                  <div>
                    <Label htmlFor="description" className="text-base">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe this memory..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="min-h-24"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="date" className="text-base">Date</Label>
                  <div>
                    <div className="flex gap-2">
                      <Input
                        id="date"
                        type="text"
                        value={formatDateForDisplay(date)}
                        onChange={(e) => {
                          const formatted = formatDateInput(e.target.value);
                          setDate(formatted);
                        }}
                        onBlur={(e) => {
                          // Convert to storage format on blur
                          const displayValue = e.target.value;
                          if (displayValue && isValidDDMMYYYY(displayValue)) {
                            const storageValue = formatDateForStorage(displayValue);
                            setDate(storageValue);
                          }
                        }}
                        placeholder="DD-MM-YYYY (e.g., 15-03-2024)"
                        maxLength={10}
                        className="flex-1"
                      />
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="px-3 min-w-[48px] min-h-[48px]"
                            aria-label="Pick a date from calendar"
                          >
                            <Calendar className="h-5 w-5" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <CalendarComponent
                            mode="single"
                            selected={(() => {
                              // Parse DD-MM-YYYY to Date object
                              const displayDate = formatDateForDisplay(date);
                              if (!displayDate || !isValidDDMMYYYY(displayDate)) return undefined;
                              const [day, month, year] = displayDate.split('-').map(Number);
                              return new Date(year, month - 1, day);
                            })()}
                            onSelect={(selectedDate) => {
                              if (selectedDate) {
                                // Convert Date object to DD-MM-YYYY format
                                const day = String(selectedDate.getDate()).padStart(2, '0');
                                const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                                const year = selectedDate.getFullYear();
                                const ddmmyyyy = `${day}-${month}-${year}`;
                                // Convert to storage format
                                const storageValue = formatDateForStorage(ddmmyyyy);
                                setDate(storageValue);
                              }
                            }}
                            disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                            initialFocus
                            className="rounded-md border"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    {date && !isValidDDMMYYYY(formatDateForDisplay(date)) && (
                      <p className="text-sm text-destructive mt-1">Please enter date in DD-MM-YYYY format</p>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="location" className="text-base">Location</Label>
                  <Input
                    id="location"
                    placeholder="Where was this memory created?"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4a: Existing Files (Edit Mode) */}
          {isEditMode && existingFiles.length > 0 && (
            <div className="memory-card p-6">
              <h2 className="text-xl mb-4 flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                Existing Files ({existingFiles.length})
                <span className="text-sm font-normal text-muted-foreground">
                  Previously uploaded
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {existingFiles.map((existingFile, index) => (
                  <div key={`existing-${index}`} className="relative p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                    <Button
                      onClick={() => handleRemoveExistingFile(index)}
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2 h-6 w-6 p-0 bg-white hover:bg-red-50"
                      title="Remove this file"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    
                    <div className="mb-3">
                      {existingFile.type === 'photo' && existingFile.url && (
                        <img 
                          src={existingFile.url} 
                          alt={existingFile.name || 'Existing photo'} 
                          className="w-full h-32 object-cover rounded"
                        />
                      )}
                      
                      {existingFile.type === 'video' && existingFile.url && (
                        <video 
                          src={existingFile.url}
                          controls
                          className="w-full h-32 object-cover rounded"
                        />
                      )}
                      
                      {existingFile.type === 'audio' && existingFile.url && (
                        <div className="w-full h-32 bg-blue-100 rounded flex flex-col items-center justify-center gap-2">
                          <Volume2 className="h-8 w-8 text-blue-600" />
                          <audio src={existingFile.url} controls className="w-full max-w-[200px]" />
                        </div>
                      )}
                    </div>
                    
                    <div className="text-sm">
                      <div className="font-medium truncate">{existingFile.name || 'Unnamed file'}</div>
                      <div className="text-muted-foreground">
                        {existingFile.type} • {existingFile.sizeMB || 'Unknown'} MB
                      </div>
                      <div className="text-xs text-blue-700 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Saved to memory
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 4b: Newly Uploaded Files */}
          {uploadedFiles.length > 0 && (
            <div className="memory-card p-6">
              <h2 className="text-xl mb-4">
                {isEditMode ? 'New Files' : 'Uploaded Files'} ({uploadedFiles.length}) 
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  Total: {(uploadedFiles.reduce((sum, f) => sum + f.file.size, 0) / 1024 / 1024).toFixed(2)} MB
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {uploadedFiles.map((uploadedFile, index) => (
                  <div key={index} className="relative p-4 border rounded-lg bg-gray-50">
                    <Button
                      onClick={() => handleRemoveFile(index)}
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2 h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    
                    <div className="mb-3">
                      {uploadedFile.type === 'photo' && uploadedFile.preview && (
                        <img 
                          src={uploadedFile.preview} 
                          alt="Preview" 
                          className="w-full h-32 object-cover rounded"
                        />
                      )}
                      
                      {uploadedFile.type === 'video' && uploadedFile.preview && (
                        <video 
                          src={uploadedFile.preview}
                          controls
                          className="w-full h-32 object-cover rounded"
                        />
                      )}
                      
                      {uploadedFile.type === 'audio' && (
                        <div className="w-full h-32 bg-gray-200 rounded flex items-center justify-center">
                          <Volume2 className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    <div className="text-sm">
                      <div className="font-medium truncate">{uploadedFile.file.name}</div>
                      <div className="text-muted-foreground">
                        {uploadedFile.type} • {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                      {uploadedFile.compressed && (
                        <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                          <Archive className="h-3 w-3" />
                          Optimized 
                          {uploadedFile.originalSize && (
                            <span>
                              (saved {((uploadedFile.originalSize - uploadedFile.file.size) / 1024 / 1024).toFixed(1)}MB)
                            </span>
                          )}
                        </div>
                      )}
                      {uploadedFile.type === 'video' && (uploadedFile.file.size / 1024 / 1024) > 5 && (
                        <div className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Large video - may be stripped if storage full
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 5: People in Memory */}
          <div className="memory-card p-6 overflow-visible">
            {isLoadingFamilyMembers ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-primary mr-3" />
                <span>Loading family members...</span>
              </div>
            ) : (
              <div className="pb-4">
                <MultiSelectDropdown
                  label="Who is in this memory?"
                  placeholder="Select family members..."
                  options={familyMembers.map(m => ({
                    id: m.id,
                    name: m.name,
                    relationship: m.relationship,
                    avatar: m.avatar
                  }))}
                  selectedIds={peopleInMemory}
                  onChange={(selectedIds) => setPeopleInMemory(selectedIds)}
                  showSearch={true}
                  maxDisplayCount={2}
                  onOpenChange={setIsDropdownOpen}
                />
              </div>
            )}
          </div>

          {/* Section 6: Emotions */}
          <div className="memory-card p-6">
            <h2 className="text-xl mb-4">What emotions does this memory evoke?</h2>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                {predefinedEmotions.map((emotion) => {
                  const Icon = emotion.icon;
                  const isSelected = emotionTags.includes(emotion.name);
                  
                  return (
                    <div
                      key={emotion.name}
                      className={`flex items-center gap-2 px-3 py-2 rounded-full cursor-pointer transition-all duration-200 ${
                        isSelected 
                          ? `${emotion.bgColor} ${emotion.textColor} border-2 border-current` 
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                      onClick={() => handleToggleEmotion(emotion.name)}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{emotion.name}</span>
                      {isSelected && <CheckCircle2 className="h-3 w-3" />}
                    </div>
                  );
                })}
              </div>
              
              <div className="flex gap-2">
                <Input
                  placeholder="Add custom emotion..."
                  value={customEmotion}
                  onChange={(e) => setCustomEmotion(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCustomEmotion()}
                />
                <Button onClick={handleAddCustomEmotion} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Display custom emotions (not in predefined list) */}
              {(() => {
                const predefinedEmotionNames = predefinedEmotions.map(e => e.name);
                const customEmotions = emotionTags.filter(tag => !predefinedEmotionNames.includes(tag));
                
                if (customEmotions.length > 0) {
                  return (
                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-sm text-gray-600 mb-2">Your custom emotions:</p>
                      <div className="flex flex-wrap gap-2">
                        {customEmotions.map((emotion) => (
                          <Badge 
                            key={emotion} 
                            variant="secondary"
                            className="flex items-center gap-1 bg-violet/10 text-violet border border-violet/30 hover:bg-violet/20 transition-colors"
                          >
                            <Sparkles className="h-3 w-3" />
                            {emotion}
                            <X 
                              className="h-3 w-3 cursor-pointer hover:text-red-600" 
                              onClick={() => handleToggleEmotion(emotion)}
                            />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>

          {/* Section 7: Tags */}
          <div className="memory-card p-6">
            <h2 className="text-xl mb-4">Add tags to help find this memory later</h2>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a tag (e.g., birthday, festival, cooking, etc.)"
                  value={newGeneralTag}
                  onChange={(e) => setNewGeneralTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddGeneralTag()}
                />
                <Button onClick={handleAddGeneralTag} variant="outline">
                  <Tag className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
              
              {generalTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {generalTags.map((tag) => (
                    <Badge 
                      key={tag} 
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {tag}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => handleRemoveGeneralTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 8: Sharing & Privacy */}
          <div className="memory-card p-6 mb-8 relative overflow-visible">
            <h2 className="text-xl mb-4">Who can see this memory?</h2>
            <div className="space-y-6 overflow-visible">
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleShareWithAllFamily}
                  variant={!isPrivate && (sharedWith.includes('Family') || (sharedWith.length === familyMemberNames.length && familyMemberNames.length > 1)) ? "default" : "outline"}
                  className="flex-1"
                  style={!isPrivate && (sharedWith.includes('Family') || (sharedWith.length === familyMemberNames.length && familyMemberNames.length > 1)) ? {
                    backgroundColor: '#6A0572',
                    color: 'white',
                    borderColor: '#6A0572'
                  } : undefined}
                >
                  <Users className="h-4 w-4 mr-1.5 flex-shrink-0" />
                  <span className="text-center leading-tight">
                    <span className="hidden sm:inline">Share with Family</span>
                    <span className="sm:hidden">Family</span>
                  </span>
                </Button>
                
                <Button
                  onClick={handleSetPrivate}
                  variant={isPrivate ? "default" : "outline"}
                  className="flex-1"
                  style={isPrivate ? {
                    backgroundColor: '#6A0572',
                    color: 'white',
                    borderColor: '#6A0572'
                  } : undefined}
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Keep Private
                </Button>
              </div>
              
              {!isPrivate && !sharedWith.includes('Family') && (
                <div className="pb-4">
                  <MultiSelectDropdown
                    placeholder="Select family members to share with..."
                    options={familyMembers
                      .filter(member => member.id !== user?.id) // Exclude current user
                      .map(member => ({
                        id: member.id,
                        name: member.name,
                        relationship: member.relationship,
                        avatar: member.avatar
                      }))}
                    selectedIds={sharedWith.filter(id => id !== user?.id)} // Exclude current user from selection
                    onChange={(selectedIds) => setSharedWith(selectedIds)}
                    showSearch={true}
                    maxDisplayCount={2}
                    onOpenChange={setIsDropdownOpen}
                  />
                </div>
              )}
              
              <div className="text-sm text-muted-foreground">
                {isPrivate ? (
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    This memory will be private and only visible to you
                  </div>
                ) : sharedWith.includes('Family') ? (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    This memory will be visible to all {familyMembers.length} family members
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    This memory will be shared with {sharedWith.length} selected member{sharedWith.length !== 1 ? 's' : ''} (+ you)
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Save Button - Hidden when dropdown is open (simple solution!) */}
        {!isDropdownOpen ? (
          <>
            <div className="relative z-0 flex gap-4 mt-12 pb-32">
              <Button 
                onClick={handleSaveMemory}
                className="vibrant-button flex-1 text-white"
                disabled={completionProgress < 75}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Memory ({completionProgress}% complete)
                {uploadedFiles.length > 0 && (
                  <span className="ml-2 text-xs opacity-80">
                    • {uploadedFiles.length} files
                  </span>
                )}
              </Button>
            </div>

            {completionProgress < 75 && (
              <div className="text-center py-6 text-muted-foreground">
                Complete the required fields to save your memory
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 pb-32 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Select family members, then tap "Done"</p>
          </div>
        )}
      </div>
    </div>
  );
}
