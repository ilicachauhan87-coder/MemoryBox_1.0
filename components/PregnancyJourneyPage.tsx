import { useState, useEffect } from 'react';
import { ArrowLeft, Baby, CheckCircle, Circle, Plus, Sparkles, Calendar, Users, Heart, Trash2, MessageSquare, ThumbsUp, Eye, Image as ImageIcon, Video, Mic, Play } from 'lucide-react';
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
  phase: 'pregnancy' | 'birth' | 'first-year' | 'second-year';
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

interface PregnancyJourneyPageProps {
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
    id: 'pregnancy',
    name: 'Pregnancy',
    label: 'Pregnancy',
    icon: '🤰',
    gradient: 'from-pink-500 to-rose-500',
    bgGradient: 'from-pink-50 to-rose-50'
  },
  {
    id: 'birth',
    name: 'Birth',
    label: 'Birth',
    icon: '👶',
    gradient: 'from-purple-500 to-pink-500',
    bgGradient: 'from-purple-50 to-pink-50'
  },
  {
    id: 'first-year',
    name: 'First Year',
    label: 'First Year',
    icon: '🎂',
    gradient: 'from-blue-500 to-cyan-500',
    bgGradient: 'from-blue-50 to-cyan-50'
  },
  {
    id: 'second-year',
    name: 'Second Year',
    label: 'Second Year',
    icon: '🎉',
    gradient: 'from-green-500 to-emerald-500',
    bgGradient: 'from-green-50 to-emerald-50'
  }
];

const DEFAULT_MILESTONES: Milestone[] = [
  // PREGNANCY PHASE (15 milestones)
  {
    id: 'pregnancy-discovery',
    title: 'Discovering the Pregnancy',
    description: 'The moment you found out',
    phase: 'pregnancy',
    timing: 'Week 4-6',
    isCompleted: false,
    isActive: true,
    icon: '🎉',
    prompts: [
      'How did you find out you were pregnant?',
      'What was your first reaction?',
      'How did you tell your partner?',
      'What were you feeling?',
      'When did you take the test?'
    ],
    memoryTypes: ['Pregnancy Test Photo', 'Voice Note', 'Journal Entry'],
    culturalNote: 'Many Indian families keep the news private for the first trimester before announcing widely.'
  },
  {
    id: 'telling-family',
    title: 'Announcing to Family',
    description: 'Sharing the joyful news',
    phase: 'pregnancy',
    timing: 'Week 8-12',
    isCompleted: false,
    isActive: false,
    icon: '📢',
    prompts: [
      'How did you announce to your families?',
      'What were their reactions?',
      'Any special way you revealed the news?',
      'Who did you tell first?',
      'What blessings did you receive?'
    ],
    memoryTypes: ['Announcement Video', 'Photos', 'Family Reactions'],
    culturalNote: 'Elders\' blessings are especially sought, often with small ceremonies or prayers.'
  },
  {
    id: 'first-ultrasound',
    title: 'First Ultrasound',
    description: 'Seeing your baby for the first time',
    phase: 'pregnancy',
    timing: 'Week 8-12',
    isCompleted: false,
    isActive: false,
    icon: '👶',
    prompts: [
      'Describe your first ultrasound experience',
      'What did you see?',
      'How did you feel hearing the heartbeat?',
      'What did the doctor say?',
      'Did you get photos or videos?'
    ],
    memoryTypes: ['Ultrasound Photos', 'Heartbeat Recording', 'Video'],
    culturalNote: 'First ultrasound is often when parents first feel the reality of the baby.'
  },
  {
    id: 'morning-sickness',
    title: 'First Trimester Symptoms',
    description: 'Early pregnancy experiences',
    phase: 'pregnancy',
    timing: 'Week 6-13',
    isCompleted: false,
    isActive: false,
    icon: '🤰',
    prompts: [
      'What symptoms did you experience?',
      'How did you cope with morning sickness?',
      'Any cravings or aversions?',
      'How did your partner support you?',
      'What helped you through this phase?'
    ],
    memoryTypes: ['Journal Entries', 'Photos', 'Voice Notes'],
    culturalNote: 'Traditional Indian remedies and home care play important role during pregnancy.'
  },
  {
    id: 'gender-reveal',
    title: 'Gender Reveal/Discovery',
    description: 'Finding out baby\'s gender (if chosen)',
    phase: 'pregnancy',
    timing: 'Week 18-20',
    isCompleted: false,
    isActive: false,
    icon: '💝',
    prompts: [
      'Did you find out the gender?',
      'How did you discover or reveal it?',
      'What was your reaction?',
      'Any celebration or ceremony?',
      'How did family react?'
    ],
    memoryTypes: ['Reveal Photos', 'Videos', 'Ultrasound'],
    culturalNote: 'Some families choose to wait until birth, while others celebrate with small gatherings.'
  },
  {
    id: 'baby-kicks',
    title: 'Feeling First Kicks',
    description: 'Baby\'s first movements',
    phase: 'pregnancy',
    timing: 'Week 18-25',
    isCompleted: false,
    isActive: false,
    icon: '💫',
    prompts: [
      'When did you first feel the baby move?',
      'What did it feel like?',
      'How did your partner react?',
      'Did family feel the kicks?',
      'What emotions did you feel?'
    ],
    memoryTypes: ['Video Recording', 'Journal Entry', 'Photos'],
    culturalNote: 'Feeling baby\'s movements is considered a very auspicious and joyful moment.'
  },
  {
    id: 'godh-bharai',
    title: 'Godh Bharai (Baby Shower)',
    description: 'Traditional baby shower ceremony',
    phase: 'pregnancy',
    timing: 'Month 7-8',
    isCompleted: false,
    isActive: false,
    icon: '🎊',
    prompts: [
      'Describe your Godh Bharai ceremony',
      'Who organized and attended?',
      'What rituals were performed?',
      'What gifts did you receive?',
      'Most memorable moment?'
    ],
    memoryTypes: ['Ceremony Photos', 'Videos', 'Gift Pictures'],
    culturalNote: 'Godh Bharai is a traditional Indian baby shower where the mother-to-be is blessed and showered with gifts, usually held in the 7th or 9th month.'
  },
  {
    id: 'nursery-prep',
    title: 'Preparing the Nursery',
    description: 'Setting up baby\'s room',
    phase: 'pregnancy',
    timing: 'Month 7-9',
    isCompleted: false,
    isActive: false,
    icon: '🏠',
    prompts: [
      'How did you design the nursery?',
      'What theme or colors did you choose?',
      'Who helped you set it up?',
      'What special items did you include?',
      'How did it feel preparing the space?'
    ],
    memoryTypes: ['Nursery Photos', 'Design Plans', 'Shopping Pics'],
    culturalNote: 'Many families set up the cradle (jhula) with traditional ceremonies and prayers.'
  },
  {
    id: 'baby-shopping',
    title: 'Shopping for Baby',
    description: 'Buying baby essentials',
    phase: 'pregnancy',
    timing: 'Month 6-9',
    isCompleted: false,
    isActive: false,
    icon: '🛍️',
    prompts: [
      'What were your first baby purchases?',
      'Who went shopping with you?',
      'What was most exciting to buy?',
      'Any traditional items you bought?',
      'Favorite baby items you chose?'
    ],
    memoryTypes: ['Shopping Photos', 'Baby Items', 'Videos'],
    culturalNote: 'Shopping for baby often involves family members, with emphasis on traditional clothing and items.'
  },
  {
    id: 'pregnancy-photoshoot',
    title: 'Maternity Photoshoot',
    description: 'Capturing the pregnancy journey',
    phase: 'pregnancy',
    timing: 'Month 7-8',
    isCompleted: false,
    isActive: false,
    icon: '📸',
    prompts: [
      'Did you do a maternity shoot?',
      'What locations did you choose?',
      'What outfits did you wear?',
      'Favorite photos from the shoot?',
      'What made it special?'
    ],
    memoryTypes: ['Photoshoot Pictures', 'BTS Videos'],
    culturalNote: 'Maternity photoshoots celebrate the beauty of pregnancy and create lasting memories.'
  },
  {
    id: 'choosing-name',
    title: 'Choosing Baby\'s Name',
    description: 'Selecting the perfect name',
    phase: 'pregnancy',
    timing: 'Month 6-9',
    isCompleted: false,
    isActive: false,
    icon: '📝',
    prompts: [
      'How did you choose the name?',
      'Any family naming traditions?',
      'Did you consult astrology or numerology?',
      'What does the name mean?',
      'Who suggested it?'
    ],
    memoryTypes: ['Name List', 'Journal Entry', 'Voice Note'],
    culturalNote: 'Many Indian families consult astrologers for auspicious names based on birth time and nakshatra.'
  },
  {
    id: 'birth-plan',
    title: 'Creating Birth Plan',
    description: 'Planning for delivery',
    phase: 'pregnancy',
    timing: 'Month 8-9',
    isCompleted: false,
    isActive: false,
    icon: '📋',
    prompts: [
      'What was your birth plan?',
      'Which hospital did you choose?',
      'Normal delivery or C-section preference?',
      'Who would be present for birth?',
      'What preparations did you make?'
    ],
    memoryTypes: ['Birth Plan Document', 'Hospital Photos', 'Notes'],
    culturalNote: 'Birth planning often involves family discussions and choosing auspicious dates if possible.'
  },
  {
    id: 'nesting-phase',
    title: 'Nesting Phase',
    description: 'Final preparations before birth',
    phase: 'pregnancy',
    timing: 'Month 8-9',
    isCompleted: false,
    isActive: false,
    icon: '🏡',
    prompts: [
      'What last-minute preparations did you do?',
      'How did you feel in the final weeks?',
      'Any special traditions or rituals?',
      'What were you most anxious about?',
      'What were you most excited for?'
    ],
    memoryTypes: ['Photos', 'Journal Entries', 'Videos'],
    culturalNote: 'The final weeks involve traditional prayers, preparations, and ensuring mother\'s comfort.'
  },
  {
    id: 'labor-begins',
    title: 'Labor Begins',
    description: 'The start of delivery',
    phase: 'pregnancy',
    timing: 'Delivery Day',
    isCompleted: false,
    isActive: false,
    icon: '⏰',
    prompts: [
      'When did labor start?',
      'How did you know it was time?',
      'What happened first?',
      'How did you feel?',
      'Journey to the hospital?'
    ],
    memoryTypes: ['Photos', 'Time Log', 'Voice Notes'],
    culturalNote: 'Family members often recite prayers and mantras for safe delivery.'
  },
  {
    id: 'pregnancy-final-thoughts',
    title: 'Final Pregnancy Thoughts',
    description: 'Reflecting on the journey',
    phase: 'pregnancy',
    timing: 'Month 9',
    isCompleted: false,
    isActive: false,
    icon: '💭',
    prompts: [
      'How do you feel about the pregnancy journey?',
      'What surprised you most?',
      'What advice would you give to yourself?',
      'Most precious memories?',
      'Messages to your unborn baby?'
    ],
    memoryTypes: ['Letter to Baby', 'Journal Entry', 'Video Message'],
    culturalNote: 'Many mothers write letters or record messages for their child to read/see later.'
  },

  // BIRTH PHASE (8 milestones)
  {
    id: 'baby-birth',
    title: 'Baby\'s Birth',
    description: 'The moment your baby arrived',
    phase: 'birth',
    timing: 'Birth Day',
    isCompleted: false,
    isActive: false,
    icon: '👶',
    prompts: [
      'Describe the birth experience',
      'What time was baby born?',
      'First moment seeing your baby?',
      'How did you feel?',
      'What did baby look like?'
    ],
    memoryTypes: ['Birth Photos', 'Birth Certificate', 'Hospital Bracelet'],
    culturalNote: 'Birth time is carefully noted for astrological calculations and naming ceremonies.'
  },
  {
    id: 'first-cry',
    title: 'Baby\'s First Cry',
    description: 'Hearing baby cry for the first time',
    phase: 'birth',
    timing: 'Birth Moment',
    isCompleted: false,
    isActive: false,
    icon: '🔊',
    prompts: [
      'What was it like hearing the first cry?',
      'How did you react?',
      'What emotions did you feel?',
      'Did you record it?',
      'Who else was present?'
    ],
    memoryTypes: ['Audio Recording', 'Video', 'Journal Entry'],
    culturalNote: 'The first cry is considered very auspicious, signifying healthy lungs and strong life force.'
  },
  {
    id: 'first-hold',
    title: 'Holding Baby First Time',
    description: 'First skin-to-skin moment',
    phase: 'birth',
    timing: 'Minutes after birth',
    isCompleted: false,
    isActive: false,
    icon: '🤱',
    prompts: [
      'Describe holding your baby first time',
      'What did baby feel like?',
      'What did you say to baby?',
      'How did your heart feel?',
      'What did you notice about baby?'
    ],
    memoryTypes: ['Photos', 'Video', 'Written Memory'],
    culturalNote: 'Skin-to-skin contact immediately after birth is encouraged for bonding and feeding.'
  },
  {
    id: 'first-feeding',
    title: 'First Feeding',
    description: 'Baby\'s first breastfeeding',
    phase: 'birth',
    timing: 'Hours after birth',
    isCompleted: false,
    isActive: false,
    icon: '🍼',
    prompts: [
      'How was the first feeding experience?',
      'Did baby latch well?',
      'How did you feel?',
      'Any challenges?',
      'Who supported you?'
    ],
    memoryTypes: ['Photos', 'Journal Entry', 'Notes'],
    culturalNote: 'Colostrum (first milk) is considered very precious and beneficial for baby\'s health.'
  },
  {
    id: 'family-meets-baby',
    title: 'Family Meets Baby',
    description: 'Introducing baby to family',
    phase: 'birth',
    timing: 'Day 1-2',
    isCompleted: false,
    isActive: false,
    icon: '👨‍👩‍👧‍👦',
    prompts: [
      'How did family meet the baby?',
      'What were their reactions?',
      'Any traditional ceremonies?',
      'Who visited first?',
      'What blessings did baby receive?'
    ],
    memoryTypes: ['Meeting Photos', 'Videos', 'Blessing Recordings'],
    culturalNote: 'Elders give blessings and often perform small rituals like whispering prayers in baby\'s ear.'
  },
  {
    id: 'hospital-stay',
    title: 'Hospital Stay',
    description: 'First days in the hospital',
    phase: 'birth',
    timing: 'Day 1-3',
    isCompleted: false,
    isActive: false,
    icon: '🏥',
    prompts: [
      'How were the hospital days?',
      'What did you learn?',
      'Any special moments?',
      'How did you bond with baby?',
      'Support from staff?'
    ],
    memoryTypes: ['Hospital Photos', 'Daily Notes', 'Videos'],
    culturalNote: 'Hospital stay is when new parents learn basic baby care and feeding techniques.'
  },
  {
    id: 'going-home',
    title: 'Taking Baby Home',
    description: 'Baby\'s first journey home',
    phase: 'birth',
    timing: 'Day 2-4',
    isCompleted: false,
    isActive: false,
    icon: '🏠',
    prompts: [
      'How did you feel taking baby home?',
      'Any welcome ceremony at home?',
      'Who was there to greet you?',
      'How did you prepare for this?',
      'First moments at home?'
    ],
    memoryTypes: ['Coming Home Photos', 'Videos', 'Ceremony Pictures'],
    culturalNote: 'Baby\'s first entry to home often involves traditional welcome rituals and blessings.'
  },
  {
    id: 'first-week',
    title: 'First Week at Home',
    description: 'Adjusting to life with baby',
    phase: 'birth',
    timing: 'Week 1',
    isCompleted: false,
    isActive: false,
    icon: '🌟',
    prompts: [
      'How was the first week?',
      'What surprised you?',
      'Sleep patterns and routine?',
      'Who helped you?',
      'Most challenging moments?'
    ],
    memoryTypes: ['Daily Photos', 'Journal Entries', 'Videos'],
    culturalNote: 'First weeks often involve family members staying to help, especially grandmothers.'
  },

  // FIRST YEAR PHASE (20 milestones)
  {
    id: 'naming-ceremony',
    title: 'Naamkaran (Naming Ceremony)',
    description: 'Official naming ceremony',
    phase: 'first-year',
    timing: 'Day 11-21',
    isCompleted: false,
    isActive: false,
    icon: '📜',
    prompts: [
      'Describe the naming ceremony',
      'Who performed the rituals?',
      'What name did you choose?',
      'Meaning of the name?',
      'How did family celebrate?'
    ],
    memoryTypes: ['Ceremony Photos', 'Videos', 'Invitation Card'],
    culturalNote: 'Naamkaran is performed on an auspicious day, often the 11th, 12th, or 21st day after birth.'
  },
  {
    id: 'first-smile',
    title: 'First Social Smile',
    description: 'Baby\'s first real smile',
    phase: 'first-year',
    timing: '6-8 weeks',
    isCompleted: false,
    isActive: false,
    icon: '😊',
    prompts: [
      'When did baby first smile at you?',
      'What made baby smile?',
      'How did you feel?',
      'Who witnessed it?',
      'Did you capture it?'
    ],
    memoryTypes: ['Photos', 'Videos', 'Journal Entry'],
    culturalNote: 'First smile is a major milestone showing baby\'s social development.'
  },
  {
    id: 'first-laugh',
    title: 'First Laugh',
    description: 'Hearing baby laugh',
    phase: 'first-year',
    timing: '3-4 months',
    isCompleted: false,
    isActive: false,
    icon: '😄',
    prompts: [
      'What made baby laugh first?',
      'How did it sound?',
      'Your reaction?',
      'Did you record it?',
      'What makes baby laugh now?'
    ],
    memoryTypes: ['Video', 'Audio Recording', 'Photos'],
    culturalNote: 'Baby\'s laughter brings immense joy and is often shared with entire family.'
  },
  {
    id: 'holding-head',
    title: 'Holding Head Up',
    description: 'Baby gains head control',
    phase: 'first-year',
    timing: '3-4 months',
    isCompleted: false,
    isActive: false,
    icon: '💪',
    prompts: [
      'When did baby hold head up?',
      'How did you encourage it?',
      'Baby\'s personality showing?',
      'Development milestones?',
      'Tummy time experiences?'
    ],
    memoryTypes: ['Videos', 'Photos', 'Notes'],
    culturalNote: 'Physical milestones are celebrated and noted for baby\'s development progress.'
  },
  {
    id: 'rolling-over',
    title: 'Rolling Over',
    description: 'First time rolling',
    phase: 'first-year',
    timing: '4-6 months',
    isCompleted: false,
    isActive: false,
    icon: '🔄',
    prompts: [
      'When did baby roll over?',
      'From back to front or vice versa?',
      'Your reaction?',
      'How did baby react?',
      'Any safety changes needed?'
    ],
    memoryTypes: ['Videos', 'Photos', 'Journal'],
    culturalNote: 'Rolling over marks baby\'s growing strength and mobility.'
  },
  {
    id: 'first-foods',
    title: 'Starting Solid Foods',
    description: 'Introduction to solid foods',
    phase: 'first-year',
    timing: '6 months',
    isCompleted: false,
    isActive: false,
    icon: '🥘',
    prompts: [
      'What was baby\'s first solid food?',
      'How did baby react?',
      'Traditional first foods?',
      'Any ceremonies performed?',
      'Funny food moments?'
    ],
    memoryTypes: ['Photos', 'Videos', 'Food Log'],
    culturalNote: 'Annaprashan (first rice ceremony) is performed when introducing solids, usually at 6 months.'
  },
  {
    id: 'sitting-up',
    title: 'Sitting Without Support',
    description: 'Baby sits independently',
    phase: 'first-year',
    timing: '6-8 months',
    isCompleted: false,
    isActive: false,
    icon: '🪑',
    prompts: [
      'When did baby sit without support?',
      'Where was baby when you noticed?',
      'How long could baby sit?',
      'What activities did you do?',
      'New toys introduced?'
    ],
    memoryTypes: ['Photos', 'Videos', 'Milestone Notes'],
    culturalNote: 'Sitting independently opens new ways for baby to explore and play.'
  },
  {
    id: 'first-tooth',
    title: 'First Tooth',
    description: 'Baby\'s first tooth appears',
    phase: 'first-year',
    timing: '6-10 months',
    isCompleted: false,
    isActive: false,
    icon: '🦷',
    prompts: [
      'When did first tooth appear?',
      'Which tooth came first?',
      'Any teething troubles?',
      'How did you soothe baby?',
      'Did you save the tooth?'
    ],
    memoryTypes: ['Photos', 'Tooth Chart', 'Journal'],
    culturalNote: 'First tooth is celebrated, and tooth fairy traditions are becoming popular in Indian families.'
  },
  {
    id: 'crawling',
    title: 'First Crawl',
    description: 'Baby starts crawling',
    phase: 'first-year',
    timing: '7-10 months',
    isCompleted: false,
    isActive: false,
    icon: '🚼',
    prompts: [
      'When did baby start crawling?',
      'Army crawl or hands-and-knees?',
      'What motivated baby to crawl?',
      'How did you baby-proof?',
      'Favorite crawling moments?'
    ],
    memoryTypes: ['Videos', 'Photos', 'Notes'],
    culturalNote: 'Crawling marks major mobility milestone and requires home safety preparations.'
  },
  {
    id: 'first-word',
    title: 'First Word',
    description: 'Baby says first word',
    phase: 'first-year',
    timing: '10-14 months',
    isCompleted: false,
    isActive: false,
    icon: '🗣️',
    prompts: [
      'What was baby\'s first word?',
      'When did baby say it?',
      'Who was baby talking to?',
      'Your reaction?',
      'Did you record it?'
    ],
    memoryTypes: ['Audio Recording', 'Video', 'Journal'],
    culturalNote: 'First word is eagerly anticipated, often "Mama," "Papa," or "Dada."'
  },
  {
    id: 'standing-up',
    title: 'Standing Up',
    description: 'Baby pulls to stand',
    phase: 'first-year',
    timing: '8-12 months',
    isCompleted: false,
    isActive: false,
    icon: '🧍',
    prompts: [
      'When did baby pull to stand?',
      'What did baby hold onto?',
      'How long could baby stand?',
      'Your reaction?',
      'Safety concerns?'
    ],
    memoryTypes: ['Photos', 'Videos', 'Notes'],
    culturalNote: 'Standing marks the beginning of walking journey, very exciting for family.'
  },
  {
    id: 'first-steps',
    title: 'First Steps',
    description: 'Baby walks independently',
    phase: 'first-year',
    timing: '9-15 months',
    isCompleted: false,
    isActive: false,
    icon: '👣',
    prompts: [
      'When did baby take first steps?',
      'How many steps?',
      'Walking towards whom?',
      'Did you capture it?',
      'How did family celebrate?'
    ],
    memoryTypes: ['Videos', 'Photos', 'Footprints'],
    culturalNote: 'First steps are a major celebration, often documented and shared with extended family.'
  },
  {
    id: 'first-birthday-prep',
    title: 'First Birthday Planning',
    description: 'Preparing for the big celebration',
    phase: 'first-year',
    timing: 'Month 11',
    isCompleted: false,
    isActive: false,
    icon: '🎂',
    prompts: [
      'How did you plan the party?',
      'What theme did you choose?',
      'Guest list and venue?',
      'Traditional elements included?',
      'What were you most excited about?'
    ],
    memoryTypes: ['Planning Notes', 'Invitation', 'Photos'],
    culturalNote: 'First birthday is a major celebration in Indian culture, often grand with family and rituals.'
  },
  {
    id: 'first-birthday',
    title: 'First Birthday Celebration',
    description: 'The big milestone birthday',
    phase: 'first-year',
    timing: '12 months',
    isCompleted: false,
    isActive: false,
    icon: '🎉',
    prompts: [
      'Describe the birthday celebration',
      'What rituals were performed?',
      'Cake cutting moment?',
      'Who attended?',
      'Most memorable moment?'
    ],
    memoryTypes: ['Photos', 'Videos', 'Cake Photos'],
    culturalNote: 'First birthday often includes traditional ceremonies, cake cutting, and blessing from elders.'
  },
  {
    id: 'first-haircut',
    title: 'Mundan/First Haircut',
    description: 'Traditional head shaving ceremony',
    phase: 'first-year',
    timing: '1st or 3rd year',
    isCompleted: false,
    isActive: false,
    icon: '✂️',
    prompts: [
      'When did you do Mundan?',
      'Where was it performed?',
      'What rituals were done?',
      'How did baby react?',
      'Did you save the hair?'
    ],
    memoryTypes: ['Photos', 'Videos', 'Hair Lock'],
    culturalNote: 'Mundan is performed for removing birth hair, often at temples with traditional rituals.'
  },
  {
    id: 'sleep-patterns',
    title: 'Sleep Milestones',
    description: 'Baby\'s sleep developments',
    phase: 'first-year',
    timing: 'Throughout year',
    isCompleted: false,
    isActive: false,
    icon: '😴',
    prompts: [
      'How did sleep patterns evolve?',
      'Sleeping through the night?',
      'Bedtime routine?',
      'Challenges and solutions?',
      'Co-sleeping or crib?'
    ],
    memoryTypes: ['Sleep Log', 'Photos', 'Notes'],
    culturalNote: 'Sleep patterns are important for baby\'s development and parents\' rest.'
  },
  {
    id: 'favorite-toys',
    title: 'Favorite Toys & Activities',
    description: 'Baby\'s play preferences',
    phase: 'first-year',
    timing: 'Throughout year',
    isCompleted: false,
    isActive: false,
    icon: '🧸',
    prompts: [
      'What are baby\'s favorite toys?',
      'Preferred activities?',
      'How does baby play?',
      'Interactive games you play?',
      'Developmental toys used?'
    ],
    memoryTypes: ['Photos', 'Videos', 'Toy Pictures'],
    culturalNote: 'Play is crucial for development, combining traditional and modern toys.'
  },
  {
    id: 'personality-emerging',
    title: 'Personality Development',
    description: 'Baby\'s unique character showing',
    phase: 'first-year',
    timing: 'Throughout year',
    isCompleted: false,
    isActive: false,
    icon: '⭐',
    prompts: [
      'What personality traits are emerging?',
      'Baby\'s temperament?',
      'Likes and dislikes?',
      'How does baby interact?',
      'Unique quirks and habits?'
    ],
    memoryTypes: ['Journal Entries', 'Videos', 'Photos'],
    culturalNote: 'Observing personality helps understand and nurture baby\'s individual nature.'
  },
  {
    id: 'vaccinations',
    title: 'Vaccination Journey',
    description: 'Keeping baby healthy',
    phase: 'first-year',
    timing: 'Throughout year',
    isCompleted: false,
    isActive: false,
    icon: '💉',
    prompts: [
      'How has vaccination journey been?',
      'Any reactions or concerns?',
      'How do you comfort baby?',
      'Tracking immunization?',
      'Following schedule?'
    ],
    memoryTypes: ['Vaccination Card', 'Photos', 'Health Records'],
    culturalNote: 'Regular vaccinations are essential, following government immunization schedule.'
  },
  {
    id: 'first-year-memories',
    title: 'First Year Reflections',
    description: 'Looking back at year one',
    phase: 'first-year',
    timing: 'End of year 1',
    isCompleted: false,
    isActive: false,
    icon: '💝',
    prompts: [
      'How was the first year?',
      'Biggest surprises?',
      'Proudest moments?',
      'Challenges overcome?',
      'Lessons learned?'
    ],
    memoryTypes: ['Letter to Baby', 'Video Message', 'Photo Album'],
    culturalNote: 'Reflecting on the journey helps appreciate growth and create meaningful keepsakes.'
  },

  // SECOND YEAR PHASE (7 milestones)
  {
    id: 'walking-confidently',
    title: 'Walking Confidently',
    description: 'Mastering walking skills',
    phase: 'second-year',
    timing: '13-18 months',
    isCompleted: false,
    isActive: false,
    icon: '🚶',
    prompts: [
      'How is baby\'s walking progress?',
      'Running yet?',
      'Favorite walking destinations?',
      'Any falls or accidents?',
      'Independence growing?'
    ],
    memoryTypes: ['Walking Videos', 'Photos', 'Notes'],
    culturalNote: 'Confident walking opens new worlds for exploration and play.'
  },
  {
    id: 'talking-more',
    title: 'Language Development',
    description: 'Expanding vocabulary',
    phase: 'second-year',
    timing: '15-24 months',
    isCompleted: false,
    isActive: false,
    icon: '💬',
    prompts: [
      'What words can baby say now?',
      'Short sentences forming?',
      'Favorite words or phrases?',
      'Languages baby speaks?',
      'Funny mispronunciations?'
    ],
    memoryTypes: ['Audio Recordings', 'Videos', 'Word List'],
    culturalNote: 'Many Indian children grow up bilingual, learning multiple languages naturally.'
  },
  {
    id: 'potty-training',
    title: 'Potty Training',
    description: 'Learning bathroom independence',
    phase: 'second-year',
    timing: '18-24 months',
    isCompleted: false,
    isActive: false,
    icon: '🚽',
    prompts: [
      'How is potty training going?',
      'What method are you using?',
      'Successes and challenges?',
      'How does baby communicate needs?',
      'Family support in training?'
    ],
    memoryTypes: ['Progress Chart', 'Photos', 'Notes'],
    culturalNote: 'Potty training approaches vary, often involving family members\' guidance.'
  },
  {
    id: 'playing-with-others',
    title: 'Social Play',
    description: 'Playing with other children',
    phase: 'second-year',
    timing: '18-24 months',
    isCompleted: false,
    isActive: false,
    icon: '👶👶',
    prompts: [
      'How does baby interact with others?',
      'Playdates and friendships?',
      'Sharing toys?',
      'Any playgroups or classes?',
      'Social behavior developing?'
    ],
    memoryTypes: ['Play Photos', 'Videos', 'Journal'],
    culturalNote: 'Social skills develop through play, important for future relationships.'
  },
  {
    id: 'independence-growing',
    title: 'Growing Independence',
    description: 'Baby wants to do things alone',
    phase: 'second-year',
    timing: '18-24 months',
    isCompleted: false,
    isActive: false,
    icon: '🦸',
    prompts: [
      'What can baby do independently?',
      'Feeding self?',
      'Choosing clothes?',
      'Asserting preferences?',
      'How do you encourage independence?'
    ],
    memoryTypes: ['Videos', 'Photos', 'Notes'],
    culturalNote: 'Balancing independence with safety is key in toddler development.'
  },
  {
    id: 'second-birthday',
    title: 'Second Birthday',
    description: 'Celebrating two years',
    phase: 'second-year',
    timing: '24 months',
    isCompleted: false,
    isActive: false,
    icon: '🎈',
    prompts: [
      'How did you celebrate?',
      'What theme did you choose?',
      'How did baby participate?',
      'Special moments?',
      'Comparison to first birthday?'
    ],
    memoryTypes: ['Party Photos', 'Videos', 'Cake Pictures'],
    culturalNote: 'Second birthday is another joyous celebration with growing awareness from child.'
  },
  {
    id: 'two-year-reflections',
    title: 'Two Year Journey',
    description: 'Reflecting on toddlerhood',
    phase: 'second-year',
    timing: 'End of year 2',
    isCompleted: false,
    isActive: false,
    icon: '🌟',
    prompts: [
      'How has baby grown in two years?',
      'Major changes and developments?',
      'Your growth as parent?',
      'Favorite memories?',
      'Hopes for the future?'
    ],
    memoryTypes: ['Letter to Child', 'Photo Compilation', 'Video Message'],
    culturalNote: 'Two years mark transition from baby to active toddler, a major milestone.'
  }
];

export function PregnancyJourneyPage({ userId = 'demo-user', onBack, onCaptureMemory }: PregnancyJourneyPageProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [customMilestones, setCustomMilestones] = useState<Milestone[]>([]);
  const [activePhase, setActivePhase] = useState<string>('pregnancy');
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  
  // 🎬 NEW: Multimedia support
  const [journeyMemories, setJourneyMemories] = useState<Memory[]>([]);
  const [isLoadingMemories, setIsLoadingMemories] = useState(true);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [viewerFiles, setViewerFiles] = useState<any[]>([]);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

  // ✏️ NEW: Edit memory detection
  useEffect(() => {
    const editingMemory = localStorage.getItem('editingJourneyMemory');
    if (editingMemory) {
      try {
        const memory = JSON.parse(editingMemory);
        // Verify it's a pregnancy journey memory
        if (memory.journeyType === 'pregnancy' || memory.journey_type === 'pregnancy') {
          // Clear the temp storage
          localStorage.removeItem('editingJourneyMemory');
          
          // Navigate to memory upload with pre-populated data
          if (onCaptureMemory) {
            onCaptureMemory({
              milestoneId: memory.milestoneId || memory.milestone_id,
              milestoneTitle: memory.milestoneTitle || memory.milestone_title,
              journeyType: 'pregnancy',
              childId: memory.child_id, // 🔥 Include child_id for pregnancy memories
              editingMemory: memory // Pass the full memory for editing
            });
          }
        }
      } catch (error) {
        console.error('Failed to load editing memory:', error);
        localStorage.removeItem('editingJourneyMemory');
      }
    }
  }, []); // Run once on mount

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
    
    const reactions = { '❤️': 0, '👶': 0, '🎉': 0 };
    reactingMembers.forEach(() => {
      const randomReaction = ['❤️', '👶', '🎉'][Math.floor(Math.random() * 3)];
      reactions[randomReaction]++;
    });
    
    // Generate 1-3 comments from family members
    const commentCount = Math.min(reactingMembers.length, Math.floor(Math.random() * 3) + 1);
    const commentingMembers = reactingMembers.slice(0, commentCount);
    
    const commentTexts = [
      'So exciting! Congratulations! 👶',
      'Beautiful milestone! ❤️',
      'Can\'t wait to meet the little one! 🎉',
      'What a precious moment! ✨',
      'Wishing you all the best! 💕',
      'This is wonderful news! 🌟',
      'So happy for you! 💝',
      'Precious memories! 🥰'
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

  // 🔧 FIX: Load milestones from DATABASE (database-first model)
  useEffect(() => {
    const loadMilestones = async () => {
      if (!userId) return;
      
      try {
        // 1️⃣ Load from DATABASE
        const { DatabaseService } = await import('../utils/supabase/persistent-database');
        const journeyData = await DatabaseService.getJourneyProgress(userId, 'pregnancy');
        
        if (journeyData && journeyData.milestones && journeyData.milestones.length > 0) {
          // ✨ Add engagement to completed milestones
          const milestonesWithEngagement = journeyData.milestones.map(generateMilestoneEngagement);
          setMilestones(milestonesWithEngagement);
          console.log(`✅ Loaded ${journeyData.milestones.length} pregnancy journey milestones from database`);
        } else {
          // 2️⃣ No database data - initialize with defaults
          setMilestones(DEFAULT_MILESTONES);
          console.log('📦 Initialized with default pregnancy journey milestones');
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
        const stored = localStorage.getItem(`pregnancy_journey_${userId}`);
        if (stored) {
          try {
            const loadedMilestones = JSON.parse(stored);
            // ✨ Add engagement to completed milestones
            const milestonesWithEngagement = loadedMilestones.map(generateMilestoneEngagement);
            setMilestones(milestonesWithEngagement);
          } catch (parseError) {
            console.error('Error parsing pregnancy journey:', parseError);
            setMilestones(DEFAULT_MILESTONES);
          }
        } else {
          setMilestones(DEFAULT_MILESTONES);
        }

        // Load custom milestones from localStorage
        const storedCustom = localStorage.getItem(`pregnancy_journey_custom_${userId}`);
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

  // 🎬 Load pregnancy journey memories from database
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
        
        // Filter for pregnancy journey memories only
        const pregnancyMemories = allMemories.filter((memory: any) => 
          memory.journeyType === 'pregnancy' || memory.journey_type === 'pregnancy'
        );
        
        console.log(`🎬 Loaded ${pregnancyMemories.length} pregnancy journey memories`);
        setJourneyMemories(pregnancyMemories);
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
      if (newMemory.journeyType === 'pregnancy' || newMemory.journey_type === 'pregnancy') {
        setJourneyMemories(prev => [newMemory, ...prev]);
        console.log('🎬 New pregnancy journey memory added:', newMemory.title);
      }
    };
    
    window.addEventListener('memoryAdded', handleMemoryAdded as EventListener);
    
    return () => {
      window.removeEventListener('memoryAdded', handleMemoryAdded as EventListener);
    };
  }, [userId]);

  // ✅ NEW: Auto-complete milestones when memories are loaded or added
  useEffect(() => {
    if (!isLoadingMemories && journeyMemories.length > 0 && milestones.length > 0) {
      autoCompleteMilestonesWithMemories();
    }
  }, [journeyMemories, milestones.length, customMilestones.length, isLoadingMemories]);

  // ✅ NEW: Auto-complete milestones that have saved memories
  const autoCompleteMilestonesWithMemories = async () => {
    if (journeyMemories.length === 0) return;
    
    // Get all milestone IDs that have memories
    const milestoneIdsWithMemories = new Set(
      journeyMemories
        .filter(memory => memory.milestoneId)
        .map(memory => memory.milestoneId)
    );
    
    if (milestoneIdsWithMemories.size === 0) return;
    
    // Update milestones to mark those with memories as completed
    let milestonesUpdated = false;
    const updatedMilestones = milestones.map(m => {
      if (milestoneIdsWithMemories.has(m.id) && !m.isCompleted) {
        milestonesUpdated = true;
        const completed = { ...m, isCompleted: true };
        return generateMilestoneEngagement(completed);
      }
      return m;
    });
    
    // Update custom milestones too
    let customMilestonesUpdated = false;
    const updatedCustomMilestones = customMilestones.map(m => {
      if (milestoneIdsWithMemories.has(m.id) && !m.isCompleted) {
        customMilestonesUpdated = true;
        const completed = { ...m, isCompleted: true };
        return generateMilestoneEngagement(completed);
      }
      return m;
    });
    
    // Save if any updates were made
    if (milestonesUpdated) {
      console.log(`✅ Auto-completed ${Array.from(milestoneIdsWithMemories).length} milestones based on saved memories`);
      await saveMilestones(updatedMilestones);
    }
    
    if (customMilestonesUpdated) {
      await saveCustomMilestones(updatedCustomMilestones);
    }
  };

  // 🔧 FIX: Save milestones to DATABASE (database-first model)
  const saveMilestones = async (newMilestones: Milestone[]) => {
    setMilestones(newMilestones);
    
    if (!userId) return;
    
    try {
      // Save to DATABASE
      const { DatabaseService } = await import('../utils/supabase/persistent-database');
      await DatabaseService.saveJourneyProgress(userId, 'pregnancy', {
        milestones: newMilestones,
        customMilestones
      });
      console.log(`✅ Saved pregnancy journey to database`);
      
      // Also cache in localStorage
      localStorage.setItem(`pregnancy_journey_${userId}`, JSON.stringify(newMilestones));
    } catch (error) {
      console.warn('⚠️ Database save failed, saving to localStorage only:', error);
      localStorage.setItem(`pregnancy_journey_${userId}`, JSON.stringify(newMilestones));
    }
  };

  // 🔧 FIX: Save custom milestones to DATABASE (database-first model)
  const saveCustomMilestones = async (newCustomMilestones: Milestone[]) => {
    setCustomMilestones(newCustomMilestones);
    
    if (!userId) return;
    
    try {
      // Save to DATABASE
      const { DatabaseService } = await import('../utils/supabase/persistent-database');
      await DatabaseService.saveJourneyProgress(userId, 'pregnancy', {
        milestones,
        customMilestones: newCustomMilestones
      });
      console.log(`✅ Saved custom pregnancy journey milestones to database`);
      
      // Also cache in localStorage
      localStorage.setItem(`pregnancy_journey_custom_${userId}`, JSON.stringify(newCustomMilestones));
    } catch (error) {
      console.warn('⚠️ Database save failed, saving to localStorage only:', error);
      localStorage.setItem(`pregnancy_journey_custom_${userId}`, JSON.stringify(newCustomMilestones));
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
      <div className="bg-gradient-to-br from-pink-600 via-rose-600 to-pink-700 text-white px-4 py-8 sm:px-6">
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
              <Baby className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-white" style={{ fontSize: '2rem', fontWeight: 600, lineHeight: 1.3 }}>
                Pregnancy & New Parents
              </h1>
              <p className="text-white/90 mt-1" style={{ fontSize: '1.125rem' }}>
                From pregnancy to baby\'s second birthday
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
            journeyType="pregnancy-newborn"
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
                <Baby className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
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
                        : milestone.isCustom
                        ? 'bg-gradient-to-br from-purple-50 to-violet-50 border-violet-200'
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
                                {milestone.isCustom && (
                                  <Badge className="bg-violet text-white text-xs">
                                    Custom
                                  </Badge>
                                )}
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
                              {milestone.isCustom && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteCustomMilestone(milestone.id)}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 self-start touch-manipulation"
                                  style={{ minHeight: '44px', minWidth: '44px' }}
                                  title="Delete custom milestone"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
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
                                  journeyType: 'pregnancy',
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
          memoryTitle="Pregnancy Journey Memory"
        />
      )}
    </div>
  );
}
