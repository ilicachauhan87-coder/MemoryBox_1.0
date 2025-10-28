import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { MultiSelectDropdown } from './MultiSelectDropdown';
import { toast } from 'sonner@2.0.3';
import { MemoryMediaViewer } from './MemoryMediaViewer';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { 
  Clock, 
  Plus, 
  ArrowLeft, 
  Calendar as CalendarIcon, 
  Timer, 
  Lock, 
  Unlock, 
  Heart, 
  Star, 
  Gift,
  CheckCircle,
  AlertCircle,
  Clock4,
  Archive,
  Users,
  Eye,
  MessageSquare,
  Camera,
  Play,
  Mic,
  Video,
  X,
  Image as ImageIcon
} from 'lucide-react';
import { format } from 'date-fns';

interface TimeCapsule {
  id: string;
  title: string;
  message: string;
  createdDate: Date;
  openDate: Date;
  status: 'sealed' | 'opened' | 'upcoming';
  recipients: string[];
  attachments: {
    photos: string[];
    voices: string[];
    videos: string[];
  };
  isLocked: boolean;
  category: 'personal' | 'family' | 'milestone' | 'future-self';
}

interface FamilyMember {
  id: string;
  name: string;
  relationship?: string;
  avatar?: string;
}

interface TimeCapsulesPageProps {
  onBack: () => void;
  familyMembers: FamilyMember[];
}

export function TimeCapsulesPage({ onBack, familyMembers }: TimeCapsulesPageProps) {
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'view'>('list');
  const [selectedCapsule, setSelectedCapsule] = useState<TimeCapsule | null>(null);
  const [timeCapsules, setTimeCapsules] = useState<TimeCapsule[]>([]);
  const [newCapsule, setNewCapsule] = useState({
    title: '',
    message: '',
    openDate: undefined as Date | undefined,
    recipients: [] as string[],
    category: 'personal' as 'personal' | 'family' | 'milestone' | 'future-self'
  });
  
  // 🎬 Multi-media viewer state
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [viewerFiles, setViewerFiles] = useState<any[]>([]);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

  // 📎 Attachment state
  const [uploadedPhotos, setUploadedPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [uploadedVideos, setUploadedVideos] = useState<{ file: File; preview: string }[]>([]);
  const [uploadedVoices, setUploadedVoices] = useState<{ file: File; preview: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // File input refs
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const voiceInputRef = useRef<HTMLInputElement>(null);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      uploadedPhotos.forEach(photo => URL.revokeObjectURL(photo.preview));
      uploadedVideos.forEach(video => URL.revokeObjectURL(video.preview));
      uploadedVoices.forEach(voice => URL.revokeObjectURL(voice.preview));
    };
  }, [uploadedPhotos, uploadedVideos, uploadedVoices]);

  // 🔧 FIX: Load time capsules from DATABASE (database-first model)
  useEffect(() => {
    const loadCapsules = async () => {
      const currentUserId = localStorage.getItem('current_user_id');
      if (!currentUserId) return;
      
      const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
      if (!userProfile) return;
      
      const userData = JSON.parse(userProfile);
      if (!userData.family_id) return;
      
      try {
        // 1️⃣ Load from DATABASE (primary source)
        const { DatabaseService } = await import('../utils/supabase/persistent-database');
        const capsulesFromDb = await DatabaseService.getTimeCapsules(userData.family_id);
        
        if (capsulesFromDb && capsulesFromDb.length > 0) {
          // Convert database format to component format
          const capsules = capsulesFromDb.map((c: any) => ({
            id: c.id,
            title: c.title,
            message: c.message,
            createdDate: new Date(c.created_at),
            openDate: new Date(c.unlock_date),
            status: c.is_unlocked ? 'opened' : (new Date(c.unlock_date) > new Date() ? 'sealed' : 'upcoming'),
            recipients: c.recipient_ids || [],
            attachments: {
              photos: c.media_urls?.filter((url: string) => url.match(/\.(jpg|jpeg|png|gif)$/i)) || [],
              voices: c.media_urls?.filter((url: string) => url.match(/\.(mp3|m4a|wav)$/i)) || [],
              videos: c.media_urls?.filter((url: string) => url.match(/\.(mp4|mov|avi)$/i)) || []
            },
            isLocked: !c.is_unlocked && new Date(c.unlock_date) > new Date(),
            category: c.category || 'personal'
          }));
          setTimeCapsules(capsules);
          console.log(`✅ Loaded ${capsules.length} time capsules from database`);
        } else {
          // 2️⃣ No database data - initialize with demo
          console.log('📦 No capsules in database, initializing with demo data');
          setTimeCapsules(getDemoTimeCapsules());
        }
      } catch (error) {
        console.warn('⚠️ Database load failed, trying localStorage:', error);
        // 3️⃣ Fallback to localStorage
        const storedCapsules = localStorage.getItem(`user:${currentUserId}:time_capsules`);
        if (storedCapsules) {
          const parsed = JSON.parse(storedCapsules);
          const capsules = parsed.map((c: any) => ({
            ...c,
            createdDate: new Date(c.createdDate),
            openDate: new Date(c.openDate)
          }));
          setTimeCapsules(capsules);
          console.log(`💾 Loaded ${capsules.length} time capsules from localStorage`);
        } else {
          // Initialize with demo data
          setTimeCapsules(getDemoTimeCapsules());
        }
      }
    };
    
    loadCapsules();
  }, []);

  // 🔧 FIX: Save time capsules to DATABASE (database-first model)
  useEffect(() => {
    const saveCapsules = async () => {
      const currentUserId = localStorage.getItem('current_user_id');
      if (!currentUserId || timeCapsules.length === 0) return;
      
      const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
      if (!userProfile) return;
      
      const userData = JSON.parse(userProfile);
      if (!userData.family_id) return;
      
      // 🔒 CRITICAL: Filter out DEMO capsules before saving to database
      // Demo capsules have UUIDs starting with '550e8400-e29b-41d4-a716-4466554400XX'
      const realCapsules = timeCapsules.filter((c: TimeCapsule) => 
        !c.id.startsWith('550e8400-e29b-41d4-a716-446655440')
      );
      
      // If no real capsules to save, skip database save
      if (realCapsules.length === 0) {
        console.log('📦 No user-created capsules to save (only demo capsules present)');
        return;
      }
      
      try {
        // Convert component format to database format
        const capsulesForDb = realCapsules.map((c: TimeCapsule) => {
          // 🔧 FIX: Process recipient IDs to convert special values
          const processedRecipients = (c.recipients || [])
            .map((recipientId: string) => {
              if (recipientId === 'self') {
                return currentUserId; // Replace "self" with actual user ID
              } else if (recipientId === 'entire-family') {
                return familyMembers.map(m => m.id); // Replace with all family member IDs
              }
              return recipientId;
            })
            .flat() // Flatten in case of "entire-family" expansion
            .filter((id: string) => {
              // Remove invalid IDs and non-UUID family member IDs
              if (!id || id === 'self' || id === 'entire-family') return false;
              // Only keep valid UUIDs (actual user IDs)
              const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
              return uuidRegex.test(id);
            });

          return {
            id: c.id,
            family_id: userData.family_id,
            created_by: currentUserId,
            title: c.title,
            message: c.message,
            media_urls: [
              ...(c.attachments.photos || []),
              ...(c.attachments.voices || []),
              ...(c.attachments.videos || [])
            ],
            recipient_ids: processedRecipients,
            unlock_date: c.openDate.toISOString(),
            is_unlocked: c.status === 'opened',
            unlocked_at: c.status === 'opened' ? new Date().toISOString() : null,
            category: c.category,
            created_at: c.createdDate.toISOString(),
            updated_at: new Date().toISOString()
          };
        });
        
        // Save to DATABASE
        const { DatabaseService } = await import('../utils/supabase/persistent-database');
        
        // Log recipient processing for debugging
        console.log('💾 Saving time capsules to database...');
        console.log(`   📊 ${realCapsules.length} capsules to save`);
        capsulesForDb.forEach((c: any, idx: number) => {
          console.log(`   📦 Capsule ${idx + 1}: "${c.title}" - ${c.recipient_ids.length} valid recipients (UUIDs only)`);
        });
        
        await DatabaseService.saveTimeCapsules(userData.family_id, capsulesForDb);
        console.log(`✅ Saved ${realCapsules.length} user-created time capsules to database (${timeCapsules.length - realCapsules.length} demo capsules excluded)`);
        
        // Also cache in localStorage (for offline access) - save only real capsules
        localStorage.setItem(`user:${currentUserId}:time_capsules`, JSON.stringify(realCapsules));
      } catch (error) {
        console.warn('⚠️ Database save failed, saving to localStorage only:', error);
        // Fallback to localStorage - save only real capsules
        localStorage.setItem(`user:${currentUserId}:time_capsules`, JSON.stringify(realCapsules));
      }
    };
    
    saveCapsules();
  }, [timeCapsules, familyMembers]);

  // Demo time capsules data - ✅ FIX: Use PURE UUIDs (no prefixes) to pass PostgreSQL validation
  const getDemoTimeCapsules = (): TimeCapsule[] => [
    {
      id: '550e8400-e29b-41d4-a716-446655440001', // Pure UUID v4 format
      title: 'Miraya\'s First Birthday Wishes',
      message: 'Dear future Miraya, today you turned 1! You said "mama" for the first time and took your first steps. We are so proud of you...',
      createdDate: new Date('2024-09-06'),
      openDate: new Date('2033-09-06'), // When she turns 10
      status: 'sealed',
      recipients: [], // Demo data - not saved to database
      attachments: {
        photos: [
          'https://images.unsplash.com/photo-1635349135195-ea08a39fcc5c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
          'https://images.unsplash.com/photo-1673882400966-57c83f87dda5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080'
        ],
        voices: [],
        videos: []
      },
      isLocked: true,
      category: 'milestone'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002', // Pure UUID v4 format
      title: 'COVID-19 Time Capsule - 2024',
      message: 'A collection of memories, hopes, and reflections from our family during these unprecedented times...',
      createdDate: new Date('2024-03-15'),
      openDate: new Date('2029-03-15'), // 5 years later
      status: 'sealed',
      recipients: [], // Demo data - not saved to database
      attachments: {
        photos: [
          'https://images.unsplash.com/photo-1760080903536-736f18eddcac?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
          'https://images.unsplash.com/photo-1605362242548-3af0d67dd4c3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080'
        ],
        voices: [],
        videos: []
      },
      isLocked: true,
      category: 'family'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440003', // Pure UUID v4 format
      title: 'To My Future Self - 30th Birthday',
      message: 'Dear 30-year-old me, I wonder what you\'ve accomplished by now. Are you happy? Did you travel to Japan like you planned?...',
      createdDate: new Date('2024-01-01'),
      openDate: new Date('2025-03-31'), // My 30th birthday
      status: 'upcoming',
      recipients: [], // Demo data - not saved to database
      attachments: {
        photos: [
          'https://images.unsplash.com/photo-1635564981692-857482d9325f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080'
        ],
        voices: [],
        videos: []
      },
      isLocked: true,
      category: 'future-self'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440004', // Pure UUID v4 format
      title: 'Grandparents\' Love Letters',
      message: 'Messages from Dadi and Dada to their great-grandchildren, filled with wisdom and love from their generation...',
      createdDate: new Date('2023-12-25'),
      openDate: new Date('2024-12-25'),
      status: 'opened',
      recipients: [], // Demo data - not saved to database
      attachments: {
        photos: [
          'https://images.unsplash.com/photo-1630481721712-0a79d553c1ea?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
          'https://images.unsplash.com/photo-1742281257687-092746ad6021?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080'
        ],
        voices: [],
        videos: []
      },
      isLocked: false,
      category: 'family'
    }
  ];

  // Prepare recipients list: add "You" and "Entire Family" options
  const recipientOptions = [
    { id: 'self', name: 'You (Yourself)', relationship: 'Self' },
    { id: 'entire-family', name: 'Entire Family', relationship: 'Everyone' },
    ...familyMembers
  ];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'personal': return <Star className="w-4 h-4" />;
      case 'family': return <Users className="w-4 h-4" />;
      case 'milestone': return <Gift className="w-4 h-4" />;
      case 'future-self': return <Clock4 className="w-4 h-4" />;
      default: return <Archive className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'personal': return 'bg-violet/10 text-violet border-violet';
      case 'family': return 'bg-aqua/10 text-aqua border-aqua';
      case 'milestone': return 'bg-coral/10 text-coral border-coral';
      case 'future-self': return 'bg-primary/10 text-primary border-primary';
      default: return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sealed': return <Lock className="w-4 h-4 text-primary" />;
      case 'opened': return <Unlock className="w-4 h-4 text-aqua" />;
      case 'upcoming': return <Timer className="w-4 h-4 text-coral" />;
      default: return <Archive className="w-4 h-4" />;
    }
  };

  const getTimeUntilOpen = (openDate: Date) => {
    const now = new Date();
    const diffTime = openDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 'Ready to open!';
    if (diffDays === 1) return '1 day left';
    if (diffDays < 30) return `${diffDays} days left`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months left`;
    return `${Math.ceil(diffDays / 365)} years left`;
  };

  // 🎬 Convert attachments structure to files array for MemoryMediaViewer
  const convertAttachmentsToFiles = (attachments: TimeCapsule['attachments']) => {
    const files: any[] = [];
    
    // Add photos
    attachments.photos.forEach((photo, index) => {
      files.push({
        preview: photo, // In real app, this would be actual URL
        type: 'photo' as const,
        name: `Photo ${index + 1}`,
        file: { name: photo, size: 0 } // Mock file object
      });
    });
    
    // Add videos
    attachments.videos.forEach((video, index) => {
      files.push({
        preview: video,
        type: 'video' as const,
        name: `Video ${index + 1}`,
        file: { name: video, size: 0 }
      });
    });
    
    // Add audio/voices
    attachments.voices.forEach((voice, index) => {
      files.push({
        preview: voice,
        type: 'audio' as const,
        name: `Voice ${index + 1}`,
        file: { name: voice, size: 0 }
      });
    });
    
    return files;
  };

  // 🎬 Open media viewer with all files
  const handleOpenGallery = (capsule: TimeCapsule, startIndex: number = 0) => {
    const files = convertAttachmentsToFiles(capsule.attachments);
    setViewerFiles(files);
    setViewerInitialIndex(startIndex);
    setShowMediaViewer(true);
  };

  const handleOpenCapsule = (capsule: TimeCapsule) => {
    if (capsule.status === 'sealed' && capsule.openDate > new Date()) {
      toast.error('🔒 This time capsule is still sealed and cannot be opened yet!');
      return;
    }
    
    // If capsule is ready to open but not opened yet, update its status
    if (capsule.status !== 'opened' && capsule.openDate <= new Date()) {
      const updatedCapsules = timeCapsules.map(c => 
        c.id === capsule.id 
          ? { ...c, status: 'opened' as const, isLocked: false }
          : c
      );
      setTimeCapsules(updatedCapsules);
      setSelectedCapsule({ ...capsule, status: 'opened', isLocked: false });
      toast.success('✨ Time Capsule unlocked!');
    } else {
      setSelectedCapsule(capsule);
    }
    
    setCurrentView('view');
  };

  // 📎 File upload handlers
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newPhotos: { file: File; preview: string }[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        const preview = URL.createObjectURL(file);
        newPhotos.push({ file, preview });
      }
    }

    setUploadedPhotos([...uploadedPhotos, ...newPhotos]);
    toast.success(`📸 ${newPhotos.length} photo(s) added!`);
    
    // Reset input
    if (event.target) event.target.value = '';
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newVideos: { file: File; preview: string }[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('video/')) {
        const preview = URL.createObjectURL(file);
        newVideos.push({ file, preview });
      }
    }

    setUploadedVideos([...uploadedVideos, ...newVideos]);
    toast.success(`🎥 ${newVideos.length} video(s) added!`);
    
    // Reset input
    if (event.target) event.target.value = '';
  };

  const handleVoiceUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newVoices: { file: File; preview: string }[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('audio/')) {
        const preview = URL.createObjectURL(file);
        newVoices.push({ file, preview });
      }
    }

    setUploadedVoices([...uploadedVoices, ...newVoices]);
    toast.success(`🎤 ${newVoices.length} voice recording(s) added!`);
    
    // Reset input
    if (event.target) event.target.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    const updatedPhotos = uploadedPhotos.filter((_, i) => i !== index);
    setUploadedPhotos(updatedPhotos);
    toast.success('Photo removed');
  };

  const handleRemoveVideo = (index: number) => {
    const updatedVideos = uploadedVideos.filter((_, i) => i !== index);
    setUploadedVideos(updatedVideos);
    toast.success('Video removed');
  };

  const handleRemoveVoice = (index: number) => {
    const updatedVoices = uploadedVoices.filter((_, i) => i !== index);
    setUploadedVoices(updatedVoices);
    toast.success('Voice recording removed');
  };

  // 🔐 Create time capsule with attachments
  const handleCreateCapsule = async () => {
    if (!newCapsule.title || !newCapsule.message || !newCapsule.openDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Upload files to Supabase Storage
      const currentUserId = localStorage.getItem('current_user_id');
      if (!currentUserId) {
        toast.error('User not found. Please sign in again.');
        setIsUploading(false);
        return;
      }

      const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
      if (!userProfile) {
        toast.error('User profile not found');
        setIsUploading(false);
        return;
      }

      const userData = JSON.parse(userProfile);
      const capsuleId = crypto.randomUUID();

      // 🔧 FIX: Convert special recipient IDs to actual user IDs
      const processedRecipients = newCapsule.recipients
        .map((recipientId: string) => {
          if (recipientId === 'self') {
            return currentUserId; // Replace "self" with actual user ID
          } else if (recipientId === 'entire-family') {
            return familyMembers.map(m => m.id); // Replace with all family member IDs
          }
          return recipientId;
        })
        .flat() // Flatten in case of "entire-family" expansion
        .filter((id: string) => {
          // Remove invalid IDs and non-UUID family member IDs
          if (!id || id === 'self' || id === 'entire-family') return false;
          // Only keep valid UUIDs (actual user IDs) - family tree members without accounts will be filtered out
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          return uuidRegex.test(id);
        });

      // Upload photos
      const photoUrls: string[] = [];
      if (uploadedPhotos.length > 0) {
        toast.info(`📤 Uploading ${uploadedPhotos.length} photo(s)...`);
        const { uploadMemoryFile } = await import('../utils/supabase/storage');
        
        for (const photo of uploadedPhotos) {
          try {
            const result = await uploadMemoryFile(
              photo.file,
              userData,
              null,
              `capsule_${capsuleId}`
            );
            photoUrls.push(result.url);
          } catch (error) {
            console.error('Error uploading photo:', error);
          }
        }
      }

      // Upload videos
      const videoUrls: string[] = [];
      if (uploadedVideos.length > 0) {
        toast.info(`📤 Uploading ${uploadedVideos.length} video(s)...`);
        const { uploadMemoryFile } = await import('../utils/supabase/storage');
        
        for (const video of uploadedVideos) {
          try {
            const result = await uploadMemoryFile(
              video.file,
              userData,
              null,
              `capsule_${capsuleId}`
            );
            videoUrls.push(result.url);
          } catch (error) {
            console.error('Error uploading video:', error);
          }
        }
      }

      // Upload voice recordings
      const voiceUrls: string[] = [];
      if (uploadedVoices.length > 0) {
        toast.info(`📤 Uploading ${uploadedVoices.length} voice recording(s)...`);
        const { uploadMemoryFile } = await import('../utils/supabase/storage');
        
        for (const voice of uploadedVoices) {
          try {
            const result = await uploadMemoryFile(
              voice.file,
              userData,
              null,
              `capsule_${capsuleId}`
            );
            voiceUrls.push(result.url);
          } catch (error) {
            console.error('Error uploading voice recording:', error);
          }
        }
      }

      // Create new capsule with attachments
      const capsule: TimeCapsule = {
        id: capsuleId,
        title: newCapsule.title,
        message: newCapsule.message,
        createdDate: new Date(),
        openDate: newCapsule.openDate,
        status: newCapsule.openDate > new Date() ? 'sealed' : 'opened',
        recipients: processedRecipients,
        attachments: {
          photos: photoUrls,
          voices: voiceUrls,
          videos: videoUrls
        },
        isLocked: newCapsule.openDate > new Date(),
        category: newCapsule.category
      };

      const updatedCapsules = [capsule, ...timeCapsules];
      setTimeCapsules(updatedCapsules);
      
      // 🎉 Celebrate first time capsule!
      if (timeCapsules.length === 0) {
        import('../utils/confettiService').then(({ celebrateFirstCapsule }) => {
          celebrateFirstCapsule();
        });
      }
      
      const totalAttachments = photoUrls.length + videoUrls.length + voiceUrls.length;
      const attachmentText = totalAttachments > 0 ? ` with ${totalAttachments} attachment(s)` : '';
      
      // Check if any recipients were filtered out (non-user family members)
      const originalRecipientCount = newCapsule.recipients.length;
      const processedRecipientCount = processedRecipients.length;
      if (originalRecipientCount > processedRecipientCount && processedRecipientCount === 0) {
        toast.warning('⚠️ Note: Selected recipients don\'t have MemoryBox accounts yet. Time capsule saved, but no recipients will be notified.');
      } else if (originalRecipientCount > processedRecipientCount) {
        toast.info(`ℹ️ Note: Some selected family members don't have MemoryBox accounts yet and were excluded from recipients.`);
      }
      
      toast.success(`🎉 Time Capsule "${newCapsule.title}" created${attachmentText}! Opens on ${format(newCapsule.openDate, 'MMMM d, yyyy')}`);
      
      // Reset form and attachments
      setCurrentView('list');
      setNewCapsule({
        title: '',
        message: '',
        openDate: undefined,
        recipients: [],
        category: 'personal'
      });
      setUploadedPhotos([]);
      setUploadedVideos([]);
      setUploadedVoices([]);
      
    } catch (error: any) {
      console.error('Error creating capsule:', error);
      toast.error(`Failed to create time capsule: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  if (currentView === 'create') {
    return (
      <div className="min-h-screen bg-background vibrant-texture pb-24">
        <div className="px-4 py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentView('list')}
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Capsules
            </Button>
            <div>
              <h1 className="text-3xl text-primary">Create Time Capsule</h1>
              <p className="text-lg text-muted-foreground">
                Preserve this moment for the future
              </p>
            </div>
          </div>

          {/* Create Form */}
          <Card className="memory-card max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Plus className="w-6 h-6 text-primary" />
                <span>New Time Capsule</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Capsule Title</Label>
                <Input
                  id="title"
                  value={newCapsule.title}
                  onChange={(e) => setNewCapsule({ ...newCapsule, title: e.target.value })}
                  placeholder="Give your time capsule a meaningful title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={newCapsule.category} onValueChange={(value: any) => setNewCapsule({ ...newCapsule, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">
                      <div className="flex items-center space-x-2">
                        <Star className="w-4 h-4" />
                        <span>Personal Reflection</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="family">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4" />
                        <span>Family Memory</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="milestone">
                      <div className="flex items-center space-x-2">
                        <Gift className="w-4 h-4" />
                        <span>Milestone Celebration</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="future-self">
                      <div className="flex items-center space-x-2">
                        <Clock4 className="w-4 h-4" />
                        <span>Future Self</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message for the Future</Label>
                <Textarea
                  id="message"
                  value={newCapsule.message}
                  onChange={(e) => setNewCapsule({ ...newCapsule, message: e.target.value })}
                  placeholder="Write your message, thoughts, hopes, or memories to be opened in the future..."
                  className="min-h-32"
                />
              </div>

              <div className="space-y-2">
                <Label>Open Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newCapsule.openDate ? format(newCapsule.openDate, 'PPP') : 'Select when to open this capsule'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newCapsule.openDate}
                      onSelect={(date) => setNewCapsule({ ...newCapsule, openDate: date })}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <MultiSelectDropdown
                label="Recipients (Who will receive this capsule?)"
                placeholder="Select recipients..."
                options={recipientOptions.map(member => ({
                  id: member.id,
                  name: member.name,
                  relationship: member.relationship,
                  avatar: member.avatar
                }))}
                selectedIds={newCapsule.recipients}
                onChange={(recipients) => setNewCapsule({ ...newCapsule, recipients })}
                showSearch={true}
                maxDisplayCount={2}
              />

              {/* Hidden file inputs */}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                multiple
                onChange={handleVideoUpload}
                className="hidden"
              />
              <input
                ref={voiceInputRef}
                type="file"
                accept="audio/*"
                multiple
                onChange={handleVoiceUpload}
                className="hidden"
              />

              <Card className="bg-gradient-to-r from-primary/5 to-coral/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Camera className="w-5 h-5 text-primary mt-1" />
                    <div className="w-full">
                      <h4 className="text-primary mb-2">Add Attachments</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Enhance your time capsule with photos, voice recordings, or videos
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-primary/50 text-primary hover:bg-primary/10"
                          onClick={() => photoInputRef.current?.click()}
                          type="button"
                        >
                          <ImageIcon className="w-4 h-4 mr-1" />
                          Photos
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-primary/50 text-primary hover:bg-primary/10"
                          onClick={() => voiceInputRef.current?.click()}
                          type="button"
                        >
                          <Mic className="w-4 h-4 mr-1" />
                          Voice
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-primary/50 text-primary hover:bg-primary/10"
                          onClick={() => videoInputRef.current?.click()}
                          type="button"
                        >
                          <Video className="w-4 h-4 mr-1" />
                          Video
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* File Previews */}
              {(uploadedPhotos.length > 0 || uploadedVideos.length > 0 || uploadedVoices.length > 0) && (
                <Card className="memory-card">
                  <CardContent className="p-4">
                    <h4 className="text-primary mb-3 flex items-center">
                      <Camera className="w-5 h-5 mr-2" />
                      Attachments ({uploadedPhotos.length + uploadedVideos.length + uploadedVoices.length})
                    </h4>
                    
                    <div className="space-y-4">
                      {/* Photos */}
                      {uploadedPhotos.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">📸 Photos ({uploadedPhotos.length})</p>
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                            {uploadedPhotos.map((photo, index) => (
                              <div key={index} className="relative aspect-square group">
                                <ImageWithFallback
                                  src={photo.preview}
                                  alt={`Photo ${index + 1}`}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                                <button
                                  onClick={() => handleRemovePhoto(index)}
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Videos */}
                      {uploadedVideos.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">🎥 Videos ({uploadedVideos.length})</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {uploadedVideos.map((video, index) => (
                              <div key={index} className="relative aspect-video group">
                                <video
                                  src={video.preview}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                                  <Play className="w-8 h-8 text-white" />
                                </div>
                                <button
                                  onClick={() => handleRemoveVideo(index)}
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Voice Recordings */}
                      {uploadedVoices.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">🎤 Voice Recordings ({uploadedVoices.length})</p>
                          <div className="space-y-2">
                            {uploadedVoices.map((voice, index) => (
                              <div key={index} className="flex items-center justify-between bg-muted/50 rounded-lg p-3 group">
                                <div className="flex items-center space-x-2">
                                  <Mic className="w-4 h-4 text-primary" />
                                  <span className="text-sm">Recording {index + 1}</span>
                                </div>
                                <button
                                  onClick={() => handleRemoveVoice(index)}
                                  className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex space-x-3 pt-4">
                <Button
                  onClick={handleCreateCapsule}
                  className="flex-1 vibrant-button text-primary-foreground"
                  disabled={!newCapsule.title || !newCapsule.message || !newCapsule.openDate || isUploading}
                >
                  {isUploading ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Seal Time Capsule
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => setCurrentView('list')}
                  variant="outline"
                  className="border-muted-foreground text-muted-foreground hover:bg-muted"
                  disabled={isUploading}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (currentView === 'view' && selectedCapsule) {
    return (
      <div className="min-h-screen bg-background vibrant-texture pb-24">
        <div className="px-4 py-6 space-y-6 max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentView('list')}
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground w-fit"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Capsules
            </Button>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl text-primary break-words">{selectedCapsule.title}</h1>
              <p className="text-base sm:text-lg text-muted-foreground">
                {selectedCapsule.status === 'opened' ? 'Opened' : 'Sealed'} Time Capsule
              </p>
            </div>
          </div>

          {/* Capsule Content */}
          <Card className="memory-card w-full overflow-hidden">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                  {getStatusIcon(selectedCapsule.status)}
                  <div className="min-w-0 flex-1">
                    <CardTitle className="break-words">{selectedCapsule.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Created on {format(selectedCapsule.createdDate, 'MMMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className={`${getCategoryColor(selectedCapsule.category)} shrink-0 w-fit`}>
                  {getCategoryIcon(selectedCapsule.category)}
                  <span className="ml-1 capitalize">{selectedCapsule.category.replace('-', ' ')}</span>
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
              {selectedCapsule.status === 'sealed' && selectedCapsule.openDate > new Date() ? (
                <Card className="bg-gradient-to-r from-primary/10 to-coral/10 border-primary/20 w-full">
                  <CardContent className="p-4 sm:p-6 text-center">
                    <Lock className="w-10 h-10 sm:w-12 sm:h-12 text-primary mx-auto mb-3 sm:mb-4" />
                    <h3 className="text-lg sm:text-xl text-primary mb-2">This Time Capsule is Sealed</h3>
                    <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4 px-2">
                      It will automatically unlock on {format(selectedCapsule.openDate, 'MMMM d, yyyy')}
                    </p>
                    <Badge variant="outline" className="bg-coral/10 text-coral border-coral">
                      <Timer className="w-4 h-4 mr-1" />
                      {getTimeUntilOpen(selectedCapsule.openDate)}
                    </Badge>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="bg-gradient-to-br from-cream/50 to-white p-4 sm:p-6 rounded-lg border border-primary/10 w-full overflow-hidden">
                    <h4 className="text-base sm:text-lg text-primary mb-2 sm:mb-3 flex items-center">
                      <MessageSquare className="w-5 h-5 mr-2 shrink-0" />
                      Message from the Past
                    </h4>
                    <p className="text-sm sm:text-base text-foreground leading-relaxed whitespace-pre-wrap break-words">
                      {selectedCapsule.message}
                    </p>
                  </div>

                  {(selectedCapsule.attachments.photos.length > 0 || 
                    selectedCapsule.attachments.voices.length > 0 || 
                    selectedCapsule.attachments.videos.length > 0) && (
                    <div className="space-y-3 sm:space-y-4 w-full">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <h4 className="text-base sm:text-lg text-primary flex items-center">
                          <Camera className="w-5 h-5 mr-2 shrink-0" />
                          Attachments ({convertAttachmentsToFiles(selectedCapsule.attachments).length})
                        </h4>
                        <Button
                          onClick={() => handleOpenGallery(selectedCapsule, 0)}
                          variant="outline"
                          size="sm"
                          className="border-primary text-primary hover:bg-primary hover:text-primary-foreground w-fit"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Gallery
                        </Button>
                      </div>
                      
                      {/* Multi-Media Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 w-full">
                        {convertAttachmentsToFiles(selectedCapsule.attachments).slice(0, 8).map((file: any, index: number) => (
                          <button
                            key={index}
                            onClick={() => handleOpenGallery(selectedCapsule, index)}
                            className="relative aspect-square bg-muted rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all group w-full"
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
                                  <Eye className="w-6 h-6 sm:w-8 sm:h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
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
                                  <div className="bg-white/90 rounded-full p-2 sm:p-3">
                                    <Play className="w-6 h-6 sm:w-8 sm:h-8 text-primary fill-current" />
                                  </div>
                                </div>
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                              </>
                            )}
                            
                            {/* Audio - Show waveform gradient */}
                            {file.type === 'audio' && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-green-100 to-emerald-100 p-2">
                                <Mic className="w-8 h-8 sm:w-10 sm:h-10 text-green-600 mb-1 sm:mb-2 shrink-0" />
                                <span className="text-xs text-green-800 font-medium px-1 text-center line-clamp-2 break-words">{file.name}</span>
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                              </div>
                            )}
                            
                            {/* File type badge */}
                            <div className="absolute top-1 right-1 sm:top-2 sm:right-2 z-10">
                              <Badge variant="secondary" className="text-xs bg-black/50 text-white border-0 px-1.5 py-0.5">
                                {file.type === 'photo' && '📷'}
                                {file.type === 'video' && '🎬'}
                                {file.type === 'audio' && '🎤'}
                              </Badge>
                            </div>
                          </button>
                        ))}
                      </div>
                      
                      {convertAttachmentsToFiles(selectedCapsule.attachments).length > 8 && (
                        <Button
                          onClick={() => handleOpenGallery(selectedCapsule, 0)}
                          variant="outline"
                          className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                        >
                          View All {convertAttachmentsToFiles(selectedCapsule.attachments).length} Files
                        </Button>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pt-4 border-t border-primary/10 w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 shrink-0" />
                        <span className="break-words">
                          Opened on {format(selectedCapsule.openDate, 'MMMM d, yyyy')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 shrink-0" />
                        <span>
                          {selectedCapsule.recipients.length} recipient{selectedCapsule.recipients.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <Button className="aqua-button text-primary-foreground w-full sm:w-auto">
                      <Heart className="w-4 h-4 mr-2" />
                      Save to Memories
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Main list view
  return (
    <div className="min-h-screen bg-background vibrant-texture pb-24">
      <div className="px-4 py-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <div className="p-3 bg-primary/20 rounded-full">
              <Clock className="w-8 h-8 text-primary" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl text-primary">Time Capsules</h1>
            <p className="text-lg text-muted-foreground">
              Messages and memories preserved for the future
            </p>
          </div>
          <Button
            onClick={() => setCurrentView('create')}
            className="vibrant-button text-primary-foreground"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Time Capsule
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          <Card className="memory-card text-center">
            <CardContent className="p-4">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Lock className="w-5 h-5 text-primary" />
                <span className="text-2xl font-medium text-primary">
                  {timeCapsules.filter(c => c.status === 'sealed').length}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Sealed Capsules</p>
            </CardContent>
          </Card>
          
          <Card className="memory-card text-center">
            <CardContent className="p-4">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Timer className="w-5 h-5 text-coral" />
                <span className="text-2xl font-medium text-coral">
                  {timeCapsules.filter(c => c.status === 'upcoming').length}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Opening Soon</p>
            </CardContent>
          </Card>
          
          <Card className="memory-card text-center">
            <CardContent className="p-4">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Unlock className="w-5 h-5 text-aqua" />
                <span className="text-2xl font-medium text-aqua">
                  {timeCapsules.filter(c => c.status === 'opened').length}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Opened</p>
            </CardContent>
          </Card>
        </div>

        {/* Time Capsules List */}
        <div className="max-w-4xl mx-auto space-y-4">
          {timeCapsules.map((capsule) => (
            <Card
              key={capsule.id}
              className="memory-card cursor-pointer transition-all hover:shadow-lg w-full overflow-hidden"
              onClick={() => handleOpenCapsule(capsule)}
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col space-y-3 w-full">
                  {/* Header Row - Always Visible */}
                  <div className="flex items-start justify-between gap-2 w-full">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {getStatusIcon(capsule.status)}
                      <h3 className="text-lg sm:text-xl text-primary truncate">{capsule.title}</h3>
                    </div>
                    {(capsule.attachments.photos.length > 0 || 
                      capsule.attachments.voices.length > 0 || 
                      capsule.attachments.videos.length > 0) && (
                      <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary shrink-0">
                        <Camera className="w-3 h-3 mr-1" />
                        {capsule.attachments.photos.length + capsule.attachments.voices.length + capsule.attachments.videos.length}
                      </Badge>
                    )}
                  </div>

                  {/* Category Badge */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className={`${getCategoryColor(capsule.category)} shrink-0`}>
                      {getCategoryIcon(capsule.category)}
                      <span className="ml-1 capitalize">{capsule.category.replace('-', ' ')}</span>
                    </Badge>
                  </div>
                  
                  {/* Message */}
                  <p className="text-muted-foreground line-clamp-2 break-words w-full">
                    {capsule.message}
                  </p>
                  
                  {/* Metadata - Responsive Grid */}
                  <div className="flex flex-wrap gap-3 sm:gap-4 text-sm text-muted-foreground w-full">
                    <div className="flex items-center gap-1 shrink-0">
                      <CalendarIcon className="w-4 h-4 shrink-0" />
                      <span className="whitespace-nowrap">Created {format(capsule.createdDate, 'MMM d, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Timer className="w-4 h-4 shrink-0" />
                      <span className="whitespace-nowrap">Opens {format(capsule.openDate, 'MMM d, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Users className="w-4 h-4 shrink-0" />
                      <span className="whitespace-nowrap">{capsule.recipients.length} recipient{capsule.recipients.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex flex-wrap gap-2">
                    {capsule.status === 'sealed' && (
                      <Badge variant="outline" className="bg-coral/10 text-coral border-coral shrink-0">
                        <Timer className="w-3 h-3 mr-1" />
                        {getTimeUntilOpen(capsule.openDate)}
                      </Badge>
                    )}

                    {capsule.status === 'upcoming' && (
                      <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 shrink-0">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Opening soon!
                      </Badge>
                    )}

                    {capsule.status === 'opened' && (
                      <Badge variant="outline" className="bg-aqua/10 text-aqua border-aqua shrink-0">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Opened
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {timeCapsules.length === 0 && (
          <Card className="memory-card max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg text-primary mb-2">No Time Capsules Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first time capsule to preserve memories for the future
              </p>
              <Button
                onClick={() => setCurrentView('create')}
                className="vibrant-button text-primary-foreground"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Capsule
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* 🎬 Multi-Media Viewer */}
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