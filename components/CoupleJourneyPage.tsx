import { useState, useEffect } from 'react';
import { ArrowLeft, Heart, CheckCircle, Circle, Plus, Sparkles, Calendar, Users, Trash2, MessageSquare, ThumbsUp, Eye, Image as ImageIcon, Video, Mic, Play } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { CustomMilestoneDialog } from './CustomMilestoneDialog';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { toast } from "sonner@2.0.3";
import { DatabaseService } from '../utils/supabase/persistent-database';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { MemoryMediaViewer } from './MemoryMediaViewer';

interface Milestone {
  id: string;
  title: string;
  description: string;
  phase: 'courtship' | 'engagement' | 'wedding' | 'honeymoon';
  timing: string;
  isCompleted: boolean;
  isActive: boolean;
  icon: string;
  prompts: string[];
  memoryTypes: string[];
  culturalNote?: string;
  isCustom?: boolean;
  // ✨ NEW: Engagement features
  completedDate?: string;
  reactions?: { [key: string]: number };
  comments?: Array<{
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    text: string;
    timestamp: Date;
  }>;
  views?: number;
}

interface CoupleJourneyPageProps {
  userId?: string;
  onBack?: () => void;
  onCaptureMemory?: (milestoneData: any) => void;
}

interface Memory {
  id: string;
  title: string;
  description?: string;
  memory_type: string;
  files: Array<{
    name: string;
    type: 'photo' | 'video' | 'audio' | 'text';
    size?: number;
    preview: string;
    compressed?: boolean;
  }>;
  journeyType?: string;
  milestoneId?: string;
  milestoneTitle?: string;
  created_at?: string;
}

const PHASES = [
  {
    id: 'courtship',
    name: 'Courtship',
    label: 'Courtship',
    icon: '💕',
    gradient: 'from-pink-500 to-rose-500',
    bgGradient: 'from-pink-50 to-rose-50'
  },
  {
    id: 'engagement',
    name: 'Engagement',
    label: 'Engagement',
    icon: '💍',
    gradient: 'from-purple-500 to-pink-500',
    bgGradient: 'from-purple-50 to-pink-50'
  },
  {
    id: 'wedding',
    name: 'Wedding',
    label: 'Wedding',
    icon: '💒',
    gradient: 'from-orange-500 to-rose-500',
    bgGradient: 'from-orange-50 to-rose-50'
  },
  {
    id: 'honeymoon',
    name: 'Honeymoon',
    label: 'Honeymoon',
    icon: '🌴',
    gradient: 'from-red-500 to-pink-500',
    bgGradient: 'from-red-50 to-pink-50'
  }
];

const DEFAULT_MILESTONES: Milestone[] = [
  // COURTSHIP PHASE (10 milestones)
  {
    id: 'first-meeting',
    title: 'How We First Met',
    description: 'The beautiful beginning of your love story',
    phase: 'courtship',
    timing: 'Day 1',
    isCompleted: false,
    isActive: true,
    icon: '✨',
    prompts: [
      'Where and when did you first meet?',
      'What were your first impressions of each other?',
      'Was it arranged or a love match?',
      'Who introduced you or how did you connect?',
      'What made you want to meet again?'
    ],
    memoryTypes: ['Photo of the Place', 'Voice Note Retelling', 'Written Story'],
    culturalNote: 'In Indian families, this story becomes a treasured part of family folklore, often retold at gatherings.'
  },
  {
    id: 'first-date',
    title: 'First Date Together',
    description: 'Your first special outing as a couple',
    phase: 'courtship',
    timing: 'Week 1-2',
    isCompleted: false,
    isActive: false,
    icon: '💕',
    prompts: [
      'Where did you go for your first date?',
      'What did you talk about?',
      'Were you nervous? What happened?',
      'What made it special or memorable?',
      'Did you know this was "the one"?'
    ],
    memoryTypes: ['Photos from the Date', 'Restaurant Receipt', 'Video Message'],
    culturalNote: 'Modern Indian couples often balance traditional family involvement with personal connection time.'
  },
  {
    id: 'family-introduction',
    title: 'Meeting Each Other\'s Families',
    description: 'The important step of family approval',
    phase: 'courtship',
    timing: 'Month 1-3',
    isCompleted: false,
    isActive: false,
    icon: '👨‍👩‍👧‍👦',
    prompts: [
      'How did your families react?',
      'Were there any memorable moments?',
      'What traditions were followed?',
      'Did you receive their blessings?',
      'What advice did elders give you?'
    ],
    memoryTypes: ['Family Photos', 'Video of Blessings', 'Voice Notes'],
    culturalNote: 'Family acceptance and blessings are cornerstone of Indian marriages. This moment often involves traditional ceremonies and seeking elders\' ashirvad.'
  },
  {
    id: 'first-festival',
    title: 'First Festival Together',
    description: 'Celebrating your first festival as a couple',
    phase: 'courtship',
    timing: 'Month 2-4',
    isCompleted: false,
    isActive: false,
    icon: '🪔',
    prompts: [
      'Which festival did you celebrate first?',
      'How did you celebrate together?',
      'Did you exchange gifts or do puja together?',
      'What made it special?',
      'What family traditions did you share?'
    ],
    memoryTypes: ['Festival Photos', 'Traditional Outfit Pictures', 'Video'],
    culturalNote: 'Celebrating festivals together strengthens the bond and introduces each other to family traditions.'
  },
  {
    id: 'first-gift',
    title: 'First Special Gift Exchange',
    description: 'The first meaningful gift you gave each other',
    phase: 'courtship',
    timing: 'Month 1-3',
    isCompleted: false,
    isActive: false,
    icon: '🎁',
    prompts: [
      'What was the first gift you gave each other?',
      'What was the occasion or reason?',
      'Why did you choose that particular gift?',
      'How did they react?',
      'Do you still have it?'
    ],
    memoryTypes: ['Photo of Gift', 'Video of Reaction', 'Written Note'],
    culturalNote: 'Gift-giving in Indian culture often carries deep meaning and symbolism.'
  },
  {
    id: 'important-conversation',
    title: 'Important Life Conversations',
    description: 'Discussing your future dreams and plans',
    phase: 'courtship',
    timing: 'Month 2-4',
    isCompleted: false,
    isActive: false,
    icon: '💭',
    prompts: [
      'When did you first discuss marriage?',
      'What are your shared dreams for the future?',
      'How do you align on important values?',
      'What compromises or understandings did you reach?',
      'What excited you most about your future together?'
    ],
    memoryTypes: ['Journal Entry', 'Voice Note', 'Video Message'],
    culturalNote: 'Open conversations about expectations, family, career, and life goals are crucial in modern Indian relationships.'
  },
  {
    id: 'photo-together',
    title: 'First Professional Photos Together',
    description: 'Your first photoshoot or formal pictures',
    phase: 'courtship',
    timing: 'Month 2-6',
    isCompleted: false,
    isActive: false,
    icon: '📸',
    prompts: [
      'When did you take your first formal photos?',
      'What was the occasion?',
      'How did you choose your outfits?',
      'What do these photos mean to you?',
      'Do you have a favorite photo from this session?'
    ],
    memoryTypes: ['Photos', 'Behind-the-Scenes Videos'],
    culturalNote: 'Pre-wedding or engagement photoshoots have become an important tradition in modern Indian weddings.'
  },
  {
    id: 'special-trip',
    title: 'First Trip Together',
    description: 'Your first journey as a couple',
    phase: 'courtship',
    timing: 'Month 3-6',
    isCompleted: false,
    isActive: false,
    icon: '✈️',
    prompts: [
      'Where did you go on your first trip?',
      'What made this trip special?',
      'What did you learn about each other?',
      'Any funny or memorable moments?',
      'Would you go back to this place?'
    ],
    memoryTypes: ['Travel Photos', 'Videos', 'Ticket Stubs'],
    culturalNote: 'Traveling together helps couples understand each other better before marriage.'
  },
  {
    id: 'decision-to-marry',
    title: 'Deciding to Get Married',
    description: 'The moment you both decided to marry',
    phase: 'courtship',
    timing: 'Month 4-8',
    isCompleted: false,
    isActive: false,
    icon: '💍',
    prompts: [
      'When did you both decide to get married?',
      'How was the decision made?',
      'Who said "yes" first?',
      'How did you feel in that moment?',
      'Did you tell your families immediately?'
    ],
    memoryTypes: ['Voice Note', 'Journal Entry', 'Video'],
    culturalNote: 'This decision often involves family discussions and blessings in Indian culture.'
  },
  {
    id: 'horoscope-matching',
    title: 'Kundli Matching',
    description: 'Traditional horoscope compatibility check',
    phase: 'courtship',
    timing: 'Month 3-6',
    isCompleted: false,
    isActive: false,
    icon: '⭐',
    prompts: [
      'Did you do kundli matching?',
      'What did the astrologer say?',
      'How many gunas matched?',
      'Were there any doshas to address?',
      'How did both families feel about the results?'
    ],
    memoryTypes: ['Kundli Documents', 'Photos', 'Voice Note'],
    culturalNote: 'Kundli or horoscope matching is an important tradition in many Indian communities to ensure compatibility and auspicious union.'
  },

  // ENGAGEMENT PHASE (12 milestones)
  {
    id: 'engagement-planning',
    title: 'Planning the Engagement',
    description: 'Organizing your engagement ceremony',
    phase: 'engagement',
    timing: 'Month 1',
    isCompleted: false,
    isActive: false,
    icon: '📝',
    prompts: [
      'How did you plan the engagement?',
      'Who helped with the planning?',
      'What traditions did you want to include?',
      'Any challenges in planning?',
      'What were you most excited about?'
    ],
    memoryTypes: ['Planning Notes', 'WhatsApp Chats', 'Photos'],
    culturalNote: 'Engagement ceremonies vary across Indian communities but always involve family blessings and gift exchange.'
  },
  {
    id: 'ring-shopping',
    title: 'Choosing Engagement Rings',
    description: 'Selecting the perfect rings together',
    phase: 'engagement',
    timing: 'Month 1-2',
    isCompleted: false,
    isActive: false,
    icon: '💍',
    prompts: [
      'How did you choose your rings?',
      'Did you shop together or was it a surprise?',
      'What style did you choose and why?',
      'Any special customization or engraving?',
      'What does your ring symbolize?'
    ],
    memoryTypes: ['Photos of Rings', 'Video of Shopping', 'Receipt'],
    culturalNote: 'Modern Indian couples often blend traditional jewelry with contemporary ring designs.'
  },
  {
    id: 'sagai-ceremony',
    title: 'Sagai/Engagement Ceremony',
    description: 'The official engagement day',
    phase: 'engagement',
    timing: 'Month 2-3',
    isCompleted: false,
    isActive: false,
    icon: '🎊',
    prompts: [
      'Describe your engagement ceremony',
      'What rituals were performed?',
      'Who attended the ceremony?',
      'What did you wear?',
      'Most memorable moment from the day?'
    ],
    memoryTypes: ['Photos', 'Videos', 'Invitation Card'],
    culturalNote: 'Sagai or Mangni is the formal engagement where rings are exchanged and families come together to bless the couple.'
  },
  {
    id: 'meeting-extended-family',
    title: 'Meeting Extended Family',
    description: 'Getting to know each other\'s extended relatives',
    phase: 'engagement',
    timing: 'Month 2-4',
    isCompleted: false,
    isActive: false,
    icon: '👥',
    prompts: [
      'When did you meet extended family?',
      'Any interesting or funny family stories?',
      'What family traditions did you learn?',
      'Did you receive any special blessings?',
      'How did the families bond?'
    ],
    memoryTypes: ['Family Photos', 'Videos', 'Voice Notes'],
    culturalNote: 'Meeting and bonding with extended family is crucial as Indian marriages unite two families, not just two people.'
  },
  {
    id: 'pre-wedding-photoshoot',
    title: 'Pre-Wedding Photoshoot',
    description: 'Professional couple photoshoot',
    phase: 'engagement',
    timing: 'Month 3-5',
    isCompleted: false,
    isActive: false,
    icon: '📷',
    prompts: [
      'Where did you do your pre-wedding shoot?',
      'What theme or locations did you choose?',
      'What outfits did you wear?',
      'Favorite photos from the shoot?',
      'Any behind-the-scenes stories?'
    ],
    memoryTypes: ['Photoshoot Pictures', 'BTS Videos'],
    culturalNote: 'Pre-wedding photoshoots have become a cherished tradition, capturing the joy and excitement before the wedding.'
  },
  {
    id: 'venue-selection',
    title: 'Selecting Wedding Venue',
    description: 'Finding the perfect place for your wedding',
    phase: 'engagement',
    timing: 'Month 2-4',
    isCompleted: false,
    isActive: false,
    icon: '🏛️',
    prompts: [
      'How did you choose your wedding venue?',
      'What were your criteria?',
      'How many venues did you visit?',
      'What made you finalize this one?',
      'Any special significance to the location?'
    ],
    memoryTypes: ['Venue Photos', 'Booking Confirmation', 'Video Tour'],
    culturalNote: 'Venue selection often considers family traditions, religious requirements, and guest capacity.'
  },
  {
    id: 'wedding-shopping',
    title: 'Wedding Shopping',
    description: 'Shopping for your wedding outfits and jewelry',
    phase: 'engagement',
    timing: 'Month 3-5',
    isCompleted: false,
    isActive: false,
    icon: '👗',
    prompts: [
      'Where did you shop for wedding outfits?',
      'Who accompanied you for shopping?',
      'What colors and designs did you choose?',
      'Any family heirlooms you incorporated?',
      'Most exciting purchase?'
    ],
    memoryTypes: ['Shopping Photos', 'Outfit Pictures', 'Video'],
    culturalNote: 'Wedding shopping is a joyous family affair, often involving mothers, sisters, and close relatives.'
  },
  {
    id: 'wedding-invitations',
    title: 'Designing Wedding Invitations',
    description: 'Creating and sending wedding invitations',
    phase: 'engagement',
    timing: 'Month 4-5',
    isCompleted: false,
    isActive: false,
    icon: '💌',
    prompts: [
      'How did you design your invitations?',
      'What symbols or motifs did you include?',
      'Digital or physical invitations?',
      'How did you personalize them?',
      'Favorite aspect of your invitation?'
    ],
    memoryTypes: ['Invitation Cards', 'Design Files', 'Photos'],
    culturalNote: 'Indian wedding invitations often feature religious symbols, traditional art, and invoke blessings of deities.'
  },
  {
    id: 'sangeet-planning',
    title: 'Planning Sangeet Ceremony',
    description: 'Organizing the musical celebration',
    phase: 'engagement',
    timing: 'Month 4-6',
    isCompleted: false,
    isActive: false,
    icon: '🎵',
    prompts: [
      'How did you plan your Sangeet?',
      'What performances were prepared?',
      'Which songs did you choose?',
      'Who organized the dances?',
      'Any special surprises planned?'
    ],
    memoryTypes: ['Practice Videos', 'Song List', 'Photos'],
    culturalNote: 'Sangeet is a vibrant pre-wedding ceremony where families celebrate with music, dance, and performances.'
  },
  {
    id: 'mehendi-planning',
    title: 'Planning Mehendi Ceremony',
    description: 'Organizing the henna ceremony',
    phase: 'engagement',
    timing: 'Month 5-6',
    isCompleted: false,
    isActive: false,
    icon: '🎨',
    prompts: [
      'What mehendi designs did you choose?',
      'Traditional or contemporary patterns?',
      'Did you hide your partner\'s name in the design?',
      'Who applied your mehendi?',
      'What was the mehendi ceremony like?'
    ],
    memoryTypes: ['Mehendi Photos', 'Design Videos', 'Time-lapse'],
    culturalNote: 'Mehendi ceremony is a beautiful tradition where intricate henna designs are applied, symbolizing joy and beauty.'
  },
  {
    id: 'haldi-planning',
    title: 'Planning Haldi Ceremony',
    description: 'Organizing the turmeric ceremony',
    phase: 'engagement',
    timing: 'Month 5-6',
    isCompleted: false,
    isActive: false,
    icon: '🌼',
    prompts: [
      'How did you plan your Haldi?',
      'What traditions did you follow?',
      'Who participated in the ceremony?',
      'Any special rituals or customs?',
      'Most fun moments?'
    ],
    memoryTypes: ['Haldi Photos', 'Videos', 'Outfit Pictures'],
    culturalNote: 'Haldi ceremony involves applying turmeric paste for purification, beauty, and blessings before the wedding.'
  },
  {
    id: 'bachelor-bachelorette',
    title: 'Bachelor/Bachelorette Celebrations',
    description: 'Last celebrations before marriage',
    phase: 'engagement',
    timing: 'Month 5-6',
    isCompleted: false,
    isActive: false,
    icon: '🎉',
    prompts: [
      'Did you have bachelor/bachelorette parties?',
      'What did you do?',
      'Who organized it?',
      'Any memorable moments?',
      'Traditional or modern celebration?'
    ],
    memoryTypes: ['Photos', 'Videos', 'Group Photos'],
    culturalNote: 'Modern Indian couples often blend traditional ceremonies with contemporary bachelor/bachelorette celebrations.'
  },

  // WEDDING PHASE (10 milestones)
  {
    id: 'wedding-morning',
    title: 'Wedding Morning Preparations',
    description: 'Getting ready for the big day',
    phase: 'wedding',
    timing: 'Wedding Day Morning',
    isCompleted: false,
    isActive: false,
    icon: '☀️',
    prompts: [
      'How did your morning begin?',
      'Who helped you get ready?',
      'What were you feeling?',
      'Any special rituals or prayers?',
      'Most memorable moment while preparing?'
    ],
    memoryTypes: ['Getting Ready Photos', 'Videos', 'Voice Notes'],
    culturalNote: 'Wedding morning often involves special rituals, family blessings, and traditional preparations.'
  },
  {
    id: 'baraat',
    title: 'Baraat Arrival',
    description: 'The groom\'s procession',
    phase: 'wedding',
    timing: 'Wedding Day',
    isCompleted: false,
    isActive: false,
    icon: '🥁',
    prompts: [
      'Describe the Baraat procession',
      'What was the entry like?',
      'Did you dance?',
      'How did the bride\'s family welcome you?',
      'Any traditional elements included?'
    ],
    memoryTypes: ['Baraat Videos', 'Photos', 'Dance Clips'],
    culturalNote: 'Baraat is the groom\'s wedding procession, a joyous celebration with music, dancing, and family.'
  },
  {
    id: 'varmala',
    title: 'Varmala/Jaimala Ceremony',
    description: 'Exchange of garlands',
    phase: 'wedding',
    timing: 'Wedding Day',
    isCompleted: false,
    isActive: false,
    icon: '🌸',
    prompts: [
      'How did the Varmala exchange happen?',
      'Any playful moments?',
      'What flowers were in the garlands?',
      'How did you feel in that moment?',
      'What did the garlands symbolize for you?'
    ],
    memoryTypes: ['Varmala Photos', 'Videos', 'Garland Picture'],
    culturalNote: 'Jaimala or Varmala is the exchange of floral garlands, symbolizing acceptance and respect.'
  },
  {
    id: 'wedding-ceremony',
    title: 'Main Wedding Ceremony',
    description: 'The sacred marriage rituals',
    phase: 'wedding',
    timing: 'Wedding Day',
    isCompleted: false,
    isActive: false,
    icon: '🔥',
    prompts: [
      'Describe your wedding ceremony',
      'What rituals were performed?',
      'What were your vows?',
      'Most emotional moment?',
      'What made it special for you?'
    ],
    memoryTypes: ['Ceremony Photos', 'Videos', 'Ritual Clips'],
    culturalNote: 'Hindu wedding ceremonies include sacred fire (Agni), seven vows (Saat Phere), and various traditional rituals.'
  },
  {
    id: 'saat-phere',
    title: 'Saat Phere - Seven Vows',
    description: 'Taking seven sacred rounds',
    phase: 'wedding',
    timing: 'Wedding Day',
    isCompleted: false,
    isActive: false,
    icon: '🕉️',
    prompts: [
      'What did each of the seven vows mean to you?',
      'How did you feel during the pheras?',
      'What prayers were recited?',
      'Any special moments during the rounds?',
      'What promises did you make to each other?'
    ],
    memoryTypes: ['Phera Videos', 'Photos', 'Priest Blessings Audio'],
    culturalNote: 'Saat Phere are seven sacred rounds around the holy fire, each representing a vow and blessing for married life.'
  },
  {
    id: 'sindoor-mangalsutra',
    title: 'Sindoor & Mangalsutra',
    description: 'Sacred symbols of marriage',
    phase: 'wedding',
    timing: 'Wedding Day',
    isCompleted: false,
    isActive: false,
    icon: '💫',
    prompts: [
      'Describe the moment of applying sindoor',
      'What does your mangalsutra look like?',
      'Any family heirloom incorporated?',
      'How did this moment feel?',
      'What do these symbols mean to you?'
    ],
    memoryTypes: ['Close-up Photos', 'Videos', 'Mangalsutra Picture'],
    culturalNote: 'Sindoor (vermillion) and Mangalsutra (sacred necklace) are important symbols of married women in Hindu tradition.'
  },
  {
    id: 'kanyadaan',
    title: 'Kanyadaan Ceremony',
    description: 'The bride\'s parents\' blessings',
    phase: 'wedding',
    timing: 'Wedding Day',
    isCompleted: false,
    isActive: false,
    icon: '🙏',
    prompts: [
      'How was the Kanyadaan performed?',
      'What blessings did your parents give?',
      'How did this moment feel?',
      'What promises were exchanged?',
      'Most touching aspect?'
    ],
    memoryTypes: ['Photos', 'Videos', 'Audio of Blessings'],
    culturalNote: 'Kanyadaan is an emotional ritual where the bride\'s parents give away their daughter with blessings.'
  },
  {
    id: 'bidaai',
    title: 'Bidaai - Farewell Ceremony',
    description: 'Bride\'s emotional farewell',
    phase: 'wedding',
    timing: 'Wedding Day Evening',
    isCompleted: false,
    isActive: false,
    icon: '👋',
    prompts: [
      'Describe your Bidaai ceremony',
      'What traditions were followed?',
      'How did you say goodbye to your parents?',
      'What were you feeling?',
      'What blessings did you receive?'
    ],
    memoryTypes: ['Bidaai Photos', 'Videos', 'Farewell Moments'],
    culturalNote: 'Bidaai is an emotional ceremony where the bride leaves her parental home to start a new life.'
  },
  {
    id: 'reception',
    title: 'Wedding Reception',
    description: 'Celebrating with extended family and friends',
    phase: 'wedding',
    timing: 'Wedding Day Evening',
    isCompleted: false,
    isActive: false,
    icon: '🎊',
    prompts: [
      'Describe your reception',
      'What entertainment was there?',
      'Did you dance together?',
      'What did you wear for the reception?',
      'Most memorable moment?'
    ],
    memoryTypes: ['Reception Photos', 'Dance Videos', 'Speeches'],
    culturalNote: 'Reception is a grand celebration where the newly married couple is introduced to society.'
  },
  {
    id: 'grah-pravesh',
    title: 'Grah Pravesh - Home Entry',
    description: 'Bride\'s first entry to new home',
    phase: 'wedding',
    timing: 'After Wedding',
    isCompleted: false,
    isActive: false,
    icon: '🏠',
    prompts: [
      'How was your Grah Pravesh ceremony?',
      'What rituals were performed?',
      'How were you welcomed?',
      'Any special traditions?',
      'How did it feel entering your new home?'
    ],
    memoryTypes: ['Photos', 'Videos', 'Ritual Pictures'],
    culturalNote: 'Grah Pravesh marks the bride\'s auspicious entry into her new home with blessings and rituals.'
  },

  // HONEYMOON PHASE (10 milestones)
  {
    id: 'honeymoon-planning',
    title: 'Planning the Honeymoon',
    description: 'Choosing your first trip as married couple',
    phase: 'honeymoon',
    timing: 'Week 1-2',
    isCompleted: false,
    isActive: false,
    icon: '🗺️',
    prompts: [
      'Where did you decide to go?',
      'How did you choose the destination?',
      'What were you most excited about?',
      'Any special activities planned?',
      'Dream destination or budget-friendly?'
    ],
    memoryTypes: ['Booking Confirmations', 'Planning Notes', 'Photos'],
    culturalNote: 'Honeymoon is the first private time for the couple to bond and create memories together.'
  },
  {
    id: 'honeymoon-departure',
    title: 'Honeymoon Departure',
    description: 'Starting your romantic getaway',
    phase: 'honeymoon',
    timing: 'Day 1',
    isCompleted: false,
    isActive: false,
    icon: '✈️',
    prompts: [
      'Describe your journey to the destination',
      'How did you feel leaving for honeymoon?',
      'Any funny moments during travel?',
      'First impressions of the place?',
      'What excited you most?'
    ],
    memoryTypes: ['Travel Photos', 'Airport/Station Pics', 'Videos'],
    culturalNote: 'The honeymoon journey marks the beginning of your life together as a married couple.'
  },
  {
    id: 'honeymoon-destination',
    title: 'Exploring the Destination',
    description: 'Discovering new places together',
    phase: 'honeymoon',
    timing: 'Days 2-5',
    isCompleted: false,
    isActive: false,
    icon: '🏝️',
    prompts: [
      'What places did you visit?',
      'What activities did you try?',
      'Any local cuisine you loved?',
      'Favorite experience together?',
      'Any adventures or surprises?'
    ],
    memoryTypes: ['Destination Photos', 'Videos', 'Souvenirs'],
    culturalNote: 'Exploring together helps couples bond and create shared experiences and memories.'
  },
  {
    id: 'romantic-moments',
    title: 'Special Romantic Moments',
    description: 'Intimate moments on your honeymoon',
    phase: 'honeymoon',
    timing: 'Throughout',
    isCompleted: false,
    isActive: false,
    icon: '💑',
    prompts: [
      'What were your most romantic moments?',
      'Any special surprises for each other?',
      'Candlelight dinners or special evenings?',
      'What made these moments memorable?',
      'How did you celebrate being married?'
    ],
    memoryTypes: ['Photos', 'Videos', 'Journal Entries'],
    culturalNote: 'These intimate moments strengthen your bond and create cherished memories.'
  },
  {
    id: 'honeymoon-photos',
    title: 'Couple Photos & Selfies',
    description: 'Capturing your happiness together',
    phase: 'honeymoon',
    timing: 'Throughout',
    isCompleted: false,
    isActive: false,
    icon: '📸',
    prompts: [
      'Favorite photos from the trip?',
      'Any professional photoshoots?',
      'Best selfie locations?',
      'Photos that capture the happiness?',
      'Which photos will you frame?'
    ],
    memoryTypes: ['Photos', 'Selfies', 'Couple Pictures'],
    culturalNote: 'Honeymoon photos become treasured memories shared with family and future generations.'
  },
  {
    id: 'trying-new-things',
    title: 'Trying New Experiences',
    description: 'Adventures and new activities together',
    phase: 'honeymoon',
    timing: 'Days 3-7',
    isCompleted: false,
    isActive: false,
    icon: '🎢',
    prompts: [
      'What new things did you try?',
      'Any adventure activities?',
      'How did you support each other?',
      'Any funny or scary moments?',
      'What did you learn about each other?'
    ],
    memoryTypes: ['Activity Photos', 'Videos', 'GoPro Footage'],
    culturalNote: 'Trying new experiences together builds trust and creates lasting bonds.'
  },
  {
    id: 'local-culture',
    title: 'Experiencing Local Culture',
    description: 'Immersing in local traditions',
    phase: 'honeymoon',
    timing: 'Throughout',
    isCompleted: false,
    isActive: false,
    icon: '🎭',
    prompts: [
      'What local traditions did you experience?',
      'Any cultural performances or festivals?',
      'Local food you tried?',
      'How was it different from home?',
      'Most interesting cultural experience?'
    ],
    memoryTypes: ['Cultural Photos', 'Videos', 'Souvenirs'],
    culturalNote: 'Experiencing new cultures together enriches your relationship and worldview.'
  },
  {
    id: 'relaxation-time',
    title: 'Relaxation & Bonding',
    description: 'Quiet moments together',
    phase: 'honeymoon',
    timing: 'Throughout',
    isCompleted: false,
    isActive: false,
    icon: '🌅',
    prompts: [
      'How did you spend quiet time together?',
      'Any meaningful conversations?',
      'What did you learn about each other?',
      'Favorite peaceful moments?',
      'How did you unwind together?'
    ],
    memoryTypes: ['Photos', 'Journal Entries', 'Videos'],
    culturalNote: 'Quiet moments of connection are as important as adventures in building a strong marriage.'
  },
  {
    id: 'honeymoon-shopping',
    title: 'Shopping & Souvenirs',
    description: 'Collecting memories and gifts',
    phase: 'honeymoon',
    timing: 'Throughout',
    isCompleted: false,
    isActive: false,
    icon: '🛍️',
    prompts: [
      'What souvenirs did you buy?',
      'Any gifts for family?',
      'Special items you bought together?',
      'What will remind you of this trip?',
      'Any traditional items you collected?'
    ],
    memoryTypes: ['Shopping Photos', 'Souvenir Pictures', 'Videos'],
    culturalNote: 'Bringing back gifts and souvenirs is a way to share your joy with family.'
  },
  {
    id: 'honeymoon-return',
    title: 'Returning Home',
    description: 'Coming back as a married couple',
    phase: 'honeymoon',
    timing: 'Last Day',
    isCompleted: false,
    isActive: false,
    icon: '🏡',
    prompts: [
      'How did you feel returning home?',
      'What were you most excited to share?',
      'How did family welcome you back?',
      'What was your favorite memory overall?',
      'How did the honeymoon change your relationship?'
    ],
    memoryTypes: ['Return Photos', 'Family Welcome Video', 'Honeymoon Album'],
    culturalNote: 'Returning from honeymoon marks the beginning of your everyday married life together.'
  }
];

export function CoupleJourneyPage({ userId = 'demo-user', onBack, onCaptureMemory }: CoupleJourneyPageProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [customMilestones, setCustomMilestones] = useState<Milestone[]>([]);
  const [activePhase, setActivePhase] = useState<string>('courtship');
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  
  // 🎬 NEW: Multimedia support
  const [journeyMemories, setJourneyMemories] = useState<Memory[]>([]);
  const [isLoadingMemories, setIsLoadingMemories] = useState(true);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [viewerFiles, setViewerFiles] = useState<any[]>([]);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

  // 🎬 Load journey memories from database
  useEffect(() => {
    const loadJourneyMemories = async () => {
      if (!userId) return;
      
      try {
        setIsLoadingMemories(true);
        
        // Get user's family_id
        const userKey = `user_${userId}`;
        const userData = localStorage.getItem(userKey);
        if (!userData) {
          setIsLoadingMemories(false);
          return;
        }
        
        const user = JSON.parse(userData);
        const familyId = user.family_id;
        if (!familyId) {
          setIsLoadingMemories(false);
          return;
        }
        
        // Load all memories for this family
        const dbService = new DatabaseService();
        const allMemories = await dbService.getFamilyMemories(familyId);
        
        // Filter for couple journey memories only
        const coupleMemories = allMemories.filter((memory: any) => 
          memory.journeyType === 'couple' || memory.journey_type === 'couple'
        );
        
        console.log(`🎬 Loaded ${coupleMemories.length} couple journey memories`);
        setJourneyMemories(coupleMemories);
        setIsLoadingMemories(false);
      } catch (error) {
        console.error('Failed to load journey memories:', error);
        setIsLoadingMemories(false);
      }
    };
    
    loadJourneyMemories();
    
    // Listen for new memories being added
    const handleMemoryAdded = (event: CustomEvent) => {
      const newMemory = event.detail;
      if (newMemory.journeyType === 'couple' || newMemory.journey_type === 'couple') {
        setJourneyMemories(prev => [newMemory, ...prev]);
        console.log('🎬 New couple journey memory added:', newMemory.title);
      }
    };
    
    window.addEventListener('memoryAdded', handleMemoryAdded as EventListener);
    
    return () => {
      window.removeEventListener('memoryAdded', handleMemoryAdded as EventListener);
    };
  }, [userId]);
  
  // ✨ Load family members for engagement generation
  useEffect(() => {
    const loadFamilyMembers = () => {
      if (!userId) return;
      
      try {
        // Get user's family_id from localStorage
        const userKey = `user_${userId}`;
        const userData = localStorage.getItem(userKey);
        if (!userData) return;
        
        const user = JSON.parse(userData);
        const familyId = user.family_id;
        if (!familyId) return;
        
        // Load family tree
        const treeData = localStorage.getItem(`familyTree_${familyId}`);
        if (treeData) {
          const tree = JSON.parse(treeData);
          const allMembers = Array.isArray(tree) ? tree : tree.people || [];
          // Filter for living members only (exclude deceased and exclude current user)
          const livingMembers = allMembers.filter((m: any) => 
            m.status !== 'deceased' && m.id !== userId
          );
          setFamilyMembers(livingMembers);
          console.log(`✨ Loaded ${livingMembers.length} living family members for engagement`);
        }
      } catch (error) {
        console.log('Could not load family members for engagement:', error);
      }
    };
    
    loadFamilyMembers();
  }, [userId]);

  // 🎭 Generate engagement for completed milestones
  const generateMilestoneEngagement = (milestone: Milestone): Milestone => {
    // Only generate engagement for completed milestones
    if (!milestone.isCompleted || familyMembers.length === 0) {
      return milestone;
    }
    
    // Skip if already has engagement
    if (milestone.reactions && milestone.comments && milestone.comments.length > 0) {
      return milestone;
    }
    
    // Shuffle members for random selection
    const shuffledMembers = [...familyMembers].sort(() => Math.random() - 0.5);
    
    // Generate reactions from 2-5 family members
    const reactorCount = Math.min(shuffledMembers.length, Math.floor(Math.random() * 4) + 2);
    const reactingMembers = shuffledMembers.slice(0, reactorCount);
    
    const reactions = { '❤️': 0, '🎉': 0, '👏': 0 };
    reactingMembers.forEach(() => {
      const randomReaction = ['❤️', '🎉', '👏'][Math.floor(Math.random() * 3)];
      reactions[randomReaction]++;
    });
    
    // Generate 1-3 comments from family members
    const commentCount = Math.min(reactingMembers.length, Math.floor(Math.random() * 3) + 1);
    const commentingMembers = reactingMembers.slice(0, commentCount);
    
    const commentTexts = [
      'Congratulations! So happy for you! ❤️',
      'Beautiful milestone! 🎉',
      'Wishing you both all the best! 💕',
      'What a wonderful journey! ✨',
      'So proud of you both! 🙌',
      'This is amazing! Congratulations! 🎊',
      'Love seeing your journey! 💝',
      'Such precious moments! 🌟'
    ];
    
    const comments = commentingMembers.map((member, index) => ({
      id: `comment-${milestone.id}-${member.id}`,
      userId: member.id,
      userName: member.name || member.firstName || 'Family Member',
      userAvatar: member.photo,
      text: commentTexts[Math.floor(Math.random() * commentTexts.length)],
      timestamp: new Date(Date.now() - (commentCount - index) * 10 * 60 * 1000) // Stagger comments
    }));
    
    // Calculate views
    const views = Math.min(familyMembers.length + 1, Math.floor(Math.random() * 20) + 5);
    
    return {
      ...milestone,
      reactions,
      comments,
      views
    };
  };

  // Load milestones from localStorage
  // 🔧 FIX: Load milestones from DATABASE (database-first model)
  useEffect(() => {
    const loadMilestones = async () => {
      if (!userId) return;
      
      try {
        // 1️⃣ Load from DATABASE
        const { DatabaseService } = await import('../utils/supabase/persistent-database');
        const journeyData = await DatabaseService.getJourneyProgress(userId, 'couple');
        
        if (journeyData && journeyData.milestones && journeyData.milestones.length > 0) {
          // ✨ Add engagement to completed milestones
          const milestonesWithEngagement = journeyData.milestones.map(generateMilestoneEngagement);
          setMilestones(milestonesWithEngagement);
          console.log(`✅ Loaded ${journeyData.milestones.length} couple journey milestones from database`);
        } else {
          // 2️⃣ No database data - initialize with defaults
          setMilestones(DEFAULT_MILESTONES);
          console.log('📦 Initialized with default couple journey milestones');
        }
        
        // Load custom milestones if they exist
        if (journeyData && journeyData.customMilestones) {
          // ✨ Add engagement to completed custom milestones
          const customWithEngagement = journeyData.customMilestones.map(generateMilestoneEngagement);
          setCustomMilestones(customWithEngagement);
        }
      } catch (error) {
        console.warn('⚠️ Database load failed, trying localStorage:', error);
        // 3️⃣ Fallback to localStorage
        const stored = localStorage.getItem(`couple_journey_${userId}`);
        if (stored) {
          try {
            const loadedMilestones = JSON.parse(stored);
            // ✨ Add engagement to completed milestones
            const milestonesWithEngagement = loadedMilestones.map(generateMilestoneEngagement);
            setMilestones(milestonesWithEngagement);
          } catch (parseError) {
            console.error('Error parsing couple journey:', parseError);
            setMilestones(DEFAULT_MILESTONES);
          }
        } else {
          setMilestones(DEFAULT_MILESTONES);
        }

        // Load custom milestones from localStorage
        const storedCustom = localStorage.getItem(`couple_journey_custom_${userId}`);
        if (storedCustom) {
          try {
            const loadedCustom = JSON.parse(storedCustom);
            // ✨ Add engagement to completed custom milestones
            const customWithEngagement = loadedCustom.map(generateMilestoneEngagement);
            setCustomMilestones(customWithEngagement);
          } catch (parseError) {
            console.error('Error parsing custom milestones:', parseError);
          }
        }
      }
    };
    
    loadMilestones();
  }, [userId, familyMembers]);

  // 🔧 FIX: Save milestones to DATABASE (database-first model)
  const saveMilestones = async (newMilestones: Milestone[]) => {
    setMilestones(newMilestones);
    
    if (!userId) return;
    
    try {
      // Save to DATABASE
      const { DatabaseService } = await import('../utils/supabase/persistent-database');
      await DatabaseService.saveJourneyProgress(userId, 'couple', {
        milestones: newMilestones,
        customMilestones
      });
      console.log(`✅ Saved couple journey to database`);
      
      // Also cache in localStorage
      localStorage.setItem(`couple_journey_${userId}`, JSON.stringify(newMilestones));
    } catch (error) {
      console.warn('⚠️ Database save failed, saving to localStorage only:', error);
      localStorage.setItem(`couple_journey_${userId}`, JSON.stringify(newMilestones));
    }
  };

  // 🔧 FIX: Save custom milestones to DATABASE (database-first model)
  const saveCustomMilestones = async (newCustomMilestones: Milestone[]) => {
    setCustomMilestones(newCustomMilestones);
    
    if (!userId) return;
    
    try {
      // Save to DATABASE
      const { DatabaseService } = await import('../utils/supabase/persistent-database');
      await DatabaseService.saveJourneyProgress(userId, 'couple', {
        milestones,
        customMilestones: newCustomMilestones
      });
      console.log(`✅ Saved custom couple journey milestones to database`);
      
      // Also cache in localStorage
      localStorage.setItem(`couple_journey_custom_${userId}`, JSON.stringify(newCustomMilestones));
    } catch (error) {
      console.warn('⚠️ Database save failed, saving to localStorage only:', error);
      localStorage.setItem(`couple_journey_custom_${userId}`, JSON.stringify(newCustomMilestones));
    }
  };

  // Add custom milestone handler
  const handleAddCustomMilestone = (milestone: Milestone) => {
    const updatedCustom = [...customMilestones, milestone];
    saveCustomMilestones(updatedCustom);
    toast.success('✨ Custom milestone added successfully!');
  };

  // Delete custom milestone handler
  const handleDeleteCustomMilestone = (milestoneId: string) => {
    const updatedCustom = customMilestones.filter(m => m.id !== milestoneId);
    saveCustomMilestones(updatedCustom);
    toast.success('🗑️ Custom milestone deleted');
  };

  // Toggle milestone completion
  const toggleMilestone = (milestoneId: string) => {
    // Check if it's a custom milestone
    const customMilestone = customMilestones.find(m => m.id === milestoneId);
    if (customMilestone) {
      const updated = customMilestones.map(m => {
        if (m.id === milestoneId) {
          const toggled = { ...m, isCompleted: !m.isCompleted };
          // ✨ Generate engagement if milestone is being completed
          return toggled.isCompleted ? generateMilestoneEngagement(toggled) : toggled;
        }
        return m;
      });
      
      // 🎉 Celebrate first life journey milestone!
      const allCompletedCount = [...milestones, ...updated].filter(m => m.isCompleted).length;
      if (allCompletedCount === 1 && updated.find(m => m.id === milestoneId)?.isCompleted) {
        import('../utils/confettiService').then(({ celebrateFirstJourney }) => {
          celebrateFirstJourney();
        });
      }
      
      saveCustomMilestones(updated);
    } else {
      const updated = milestones.map(m => {
        if (m.id === milestoneId) {
          const toggled = { ...m, isCompleted: !m.isCompleted };
          // ✨ Generate engagement if milestone is being completed
          return toggled.isCompleted ? generateMilestoneEngagement(toggled) : toggled;
        }
        return m;
      });
      
      // 🎉 Celebrate first life journey milestone!
      const allCompletedCount = [...updated, ...customMilestones].filter(m => m.isCompleted).length;
      if (allCompletedCount === 1 && updated.find(m => m.id === milestoneId)?.isCompleted) {
        import('../utils/confettiService').then(({ celebrateFirstJourney }) => {
          celebrateFirstJourney();
        });
      }
      
      saveMilestones(updated);
    }
  };

  // Merge default and custom milestones (MUST be defined before helper functions use it)
  const allMilestones = [...milestones, ...customMilestones];

  // 🎬 Helper: Get memories for a specific milestone
  const getMemoriesForMilestone = (milestoneId: string): Memory[] => {
    return journeyMemories.filter(memory => 
      memory.milestoneId === milestoneId || 
      memory.milestoneTitle === allMilestones.find(m => m.id === milestoneId)?.title
    );
  };

  // 🎬 Helper: Convert memory files to viewer format
  const convertMemoryFilesToViewer = (memory: Memory) => {
    return (memory.files || []).map(file => ({
      file: new Blob(), // Placeholder - not needed for preview display
      preview: file.preview,
      type: file.type,
      name: file.name,
      size: file.size,
      compressed: file.compressed
    }));
  };

  // 🎬 Helper: Open gallery for a milestone's memories
  const handleOpenGallery = (memories: Memory[], fileIndex = 0) => {
    // Combine all files from all memories for this milestone
    const allFiles = memories.flatMap(memory => convertMemoryFilesToViewer(memory));
    
    setViewerFiles(allFiles);
    setViewerInitialIndex(fileIndex);
    setShowMediaViewer(true);
  };

  // Get milestones for current phase
  const phaseMilestones = allMilestones.filter(m => m.phase === activePhase);
  
  // Calculate stats
  const totalMilestones = allMilestones.length;
  const completedMilestones = allMilestones.filter(m => m.isCompleted).length;
  const progressPercentage = (completedMilestones / totalMilestones) * 100;

  const currentPhase = PHASES.find(p => p.id === activePhase);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 via-pink-600 to-rose-600 text-white px-4 py-8 sm:px-6">
        <div className="max-w-4xl mx-auto">
          {onBack && (
            <Button
              variant="ghost"
              onClick={onBack}
              className="text-white hover:bg-white/10 mb-4 -ml-2 touch-manipulation"
              style={{ minHeight: '44px' }}
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Journeys
            </Button>
          )}
          
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
              <Heart className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-white" style={{ fontSize: '2rem', fontWeight: 600, lineHeight: 1.3 }}>
                Love to Marriage
              </h1>
              <p className="text-white/90 mt-1" style={{ fontSize: '1.125rem' }}>
                Your beautiful journey from courtship to forever
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-white/90 text-sm">
              <span>{completedMilestones} of {totalMilestones} milestones completed</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-3 bg-white/20" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-3 py-4 sm:px-6 sm:py-6">
        {/* Add Custom Milestone Button */}
        <div className="mb-6">
          <CustomMilestoneDialog 
            onAddMilestone={handleAddCustomMilestone}
            journeyType="couple-journey"
            phases={PHASES}
          />
        </div>
        {/* Phase Tabs - Mobile Optimized 2x2 Grid */}
        <Tabs value={activePhase} onValueChange={setActivePhase} className="mb-4 sm:mb-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto p-1 sm:p-1 bg-muted gap-1.5 sm:gap-0.5">
            {PHASES.map((phase) => {
              const phaseCount = allMilestones.filter(m => m.phase === phase.id && m.isCompleted).length;
              const phaseTotal = allMilestones.filter(m => m.phase === phase.id).length;
              
              return (
                <TabsTrigger
                  key={phase.id}
                  value={phase.id}
                  className="flex flex-col items-center justify-center py-3 sm:py-3 px-2 sm:px-2 text-sm sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-md min-h-[72px] sm:min-h-[68px] touch-manipulation transition-all"
                  style={{ minHeight: '72px' }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-lg sm:text-base">{phase.icon}</span>
                    <span className="font-semibold text-center leading-tight text-sm sm:text-sm">{phase.label}</span>
                  </div>
                  <span className="text-xs sm:text-xs text-muted-foreground font-medium">
                    {phaseCount}/{phaseTotal}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Phase Content */}
          <TabsContent value={activePhase} className="mt-4 sm:mt-6">
            {phaseMilestones.length === 0 ? (
              <Card className="p-8 sm:p-12 text-center">
                <Heart className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
                  No milestones in this phase yet
                </h3>
              </Card>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {phaseMilestones.map((milestone) => (
                  <Card
                    key={milestone.id}
                    className={`overflow-hidden transition-all ${
                      milestone.isCompleted
                        ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
                        : 'hover:shadow-lg'
                    }`}
                  >
                    <div className="p-4 sm:p-6">
                      <div className="flex items-start gap-3 sm:gap-4">
                        {/* Completion Toggle */}
                        <button
                          onClick={() => toggleMilestone(milestone.id)}
                          className="mt-1 shrink-0 touch-manipulation"
                          style={{ minWidth: '44px', minHeight: '44px' }}
                        >
                          {milestone.isCompleted ? (
                            <CheckCircle className="w-7 h-7 sm:w-6 sm:h-6 text-green-600" />
                          ) : (
                            <Circle className="w-7 h-7 sm:w-6 sm:h-6 text-muted-foreground hover:text-violet" />
                          )}
                        </button>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xl sm:text-2xl shrink-0">{milestone.icon}</span>
                                <h3 className="text-base sm:text-xl font-semibold text-foreground leading-snug">
                                  {milestone.title}
                                </h3>
                              </div>
                              <p className="text-sm sm:text-base text-muted-foreground leading-snug">
                                {milestone.description}
                              </p>
                            </div>
                            <div className="flex flex-col gap-1.5 shrink-0">
                              <Badge variant="outline" className="self-start text-xs sm:text-sm">
                                <Calendar className="w-3 h-3 mr-1" />
                                <span className="whitespace-nowrap">{milestone.timing}</span>
                              </Badge>
                            </div>
                          </div>

                          {/* Prompts */}
                          <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-white/50 rounded-lg">
                            <h4 className="text-xs sm:text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet" />
                              Memory Prompts
                            </h4>
                            <ul className="space-y-1.5 sm:space-y-2">
                              {milestone.prompts.map((prompt, idx) => (
                                <li key={idx} className="text-xs sm:text-sm text-foreground/80 flex items-start gap-2">
                                  <span className="text-violet mt-0.5 shrink-0">•</span>
                                  <span className="leading-relaxed">{prompt}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Memory Types */}
                          <div className="mt-2.5 sm:mt-3 flex flex-wrap gap-1.5 sm:gap-2">
                            {milestone.memoryTypes.map((type, idx) => (
                              <Badge key={idx} variant="secondary" className="text-[10px] sm:text-xs px-2 py-0.5">
                                {type}
                              </Badge>
                            ))}
                          </div>

                          {/* Cultural Note */}
                          {milestone.culturalNote && (
                            <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-amber-50 border border-amber-200 rounded-lg">
                              <p className="text-xs sm:text-sm text-amber-900 flex items-start gap-2">
                                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 mt-0.5" />
                                <span className="leading-relaxed"><strong>Cultural Note:</strong> {milestone.culturalNote}</span>
                              </p>
                            </div>
                          )}

                          {/* ✨ Engagement Section - Only shown for completed milestones */}
                          {milestone.isCompleted && (milestone.reactions || milestone.comments) && (
                            <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                              {/* Reactions */}
                              {milestone.reactions && (
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="flex items-center gap-2">
                                    {Object.entries(milestone.reactions).map(([emoji, count]) => (
                                      count > 0 && (
                                        <div key={emoji} className="flex items-center gap-1 bg-white px-2 py-1 rounded-full shadow-sm">
                                          <span className="text-sm">{emoji}</span>
                                          <span className="text-xs font-medium text-muted-foreground">{count}</span>
                                        </div>
                                      )
                                    ))}
                                  </div>
                                  {milestone.views && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                                      <Eye className="w-3 h-3" />
                                      <span>{milestone.views} views</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Comments */}
                              {milestone.comments && milestone.comments.length > 0 && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-2">
                                    <MessageSquare className="w-3 h-3" />
                                    <span>{milestone.comments.length} {milestone.comments.length === 1 ? 'comment' : 'comments'}</span>
                                  </div>
                                  {milestone.comments.map((comment) => (
                                    <div key={comment.id} className="flex gap-2 bg-white p-2 rounded-lg">
                                      <Avatar className="w-6 h-6 shrink-0">
                                        <AvatarImage src={comment.userAvatar} alt={comment.userName} />
                                        <AvatarFallback className="text-[10px]">
                                          {comment.userName.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-foreground">{comment.userName}</p>
                                        <p className="text-xs text-muted-foreground leading-relaxed">{comment.text}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* 🎬 Captured Memories Multimedia Grid */}
                          {(() => {
                            const milestoneMemories = getMemoriesForMilestone(milestone.id);
                            if (milestoneMemories.length === 0) return null;
                            
                            const allFiles = milestoneMemories.flatMap(m => m.files || []);
                            const totalFiles = allFiles.length;
                            const displayFiles = allFiles.slice(0, 4);
                            
                            return (
                              <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-sm sm:text-base font-semibold text-foreground flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4 text-green-600" />
                                    Captured Memories
                                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                                      {totalFiles} file{totalFiles !== 1 ? 's' : ''}
                                    </Badge>
                                  </h4>
                                  <Button
                                    onClick={() => handleOpenGallery(milestoneMemories, 0)}
                                    variant="outline"
                                    size="sm"
                                    className="text-xs sm:text-sm border-green-300 text-green-700 hover:bg-green-100 h-9"
                                  >
                                    <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                    View All
                                  </Button>
                                </div>
                                
                                {/* Multimedia Grid */}
                                <div className="grid grid-cols-2 gap-2">
                                  {displayFiles.map((file, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() => handleOpenGallery(milestoneMemories, idx)}
                                      className="relative aspect-square bg-muted rounded-lg overflow-hidden hover:ring-2 hover:ring-green-400 transition-all group"
                                      style={{ minHeight: '120px' }}
                                    >
                                      {/* Photo */}
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
                                      
                                      {/* Video */}
                                      {file.type === 'video' && (
                                        <>
                                          <ImageWithFallback
                                            src={file.preview}
                                            alt={file.name}
                                            className="w-full h-full object-cover"
                                          />
                                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-center">
                                            <div className="bg-white/90 rounded-full p-2 sm:p-3">
                                              <Play className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 fill-current" />
                                            </div>
                                          </div>
                                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                        </>
                                      )}
                                      
                                      {/* Audio */}
                                      {file.type === 'audio' && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-green-100 to-emerald-100">
                                          <Mic className="w-10 h-10 sm:w-12 sm:h-12 text-green-600 mb-2" />
                                          <span className="text-xs text-green-800 font-medium px-2 text-center line-clamp-2">{file.name}</span>
                                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                        </div>
                                      )}
                                      
                                      {/* File type badge */}
                                      <div className="absolute top-1.5 right-1.5 z-10">
                                        <Badge variant="secondary" className="text-xs bg-black/50 text-white border-0">
                                          {file.type === 'photo' && '📷'}
                                          {file.type === 'video' && '🎬'}
                                          {file.type === 'audio' && '🎤'}
                                        </Badge>
                                      </div>
                                      
                                      {/* +X more overlay */}
                                      {idx === 3 && totalFiles > 4 && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                          <span className="text-white text-xl sm:text-2xl font-bold">
                                            +{totalFiles - 4}
                                          </span>
                                        </div>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Capture Memory Button */}
                          {onCaptureMemory && (
                            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border">
                              <Button
                                onClick={() => onCaptureMemory({
                                  milestoneId: milestone.id,
                                  milestoneTitle: milestone.title,
                                  journeyType: 'couple',
                                  phase: milestone.phase,
                                  timing: milestone.timing,
                                  prompts: milestone.prompts,
                                  suggestedTypes: milestone.memoryTypes
                                })}
                                className="w-full sm:w-auto vibrant-button text-white h-11 sm:h-12 text-sm sm:text-base"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Capture This Memory
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* 🎬 Full-Screen Media Viewer */}
      {showMediaViewer && (
        <MemoryMediaViewer
          files={viewerFiles}
          initialIndex={viewerInitialIndex}
          onClose={() => setShowMediaViewer(false)}
          memoryTitle="Couple Journey Memory"
        />
      )}
    </div>
  );
}
