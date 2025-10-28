// Journey-related utility functions and types for MemoryBox

export interface JourneyContext {
  journey: 'pregnancy-newborn' | 'couple-journey';
  milestone: {
    id: string;
    title: string;
    description: string;
    phase: string;
    timing: string;
    icon: string;
    prompts: string[];
    memoryTypes: string[];
    culturalNote?: string;
  };
  prompts: string[];
  suggestedTypes: string[];
  culturalNote?: string;
}

export interface JourneyMilestone {
  id: string;
  title: string;
  description: string;
  phase: string;
  timing: string;
  isCompleted: boolean;
  isActive: boolean;
  icon: string;
  prompts: string[];
  memoryTypes: string[];
  culturalNote?: string;
}

// Get journey context from localStorage
export function getJourneyContext(): JourneyContext | null {
  try {
    const contextStr = localStorage.getItem('journeyContext');
    if (!contextStr) return null;
    
    return JSON.parse(contextStr) as JourneyContext;
  } catch (error) {
    console.error('Error parsing journey context:', error);
    return null;
  }
}

// Clear journey context from localStorage
export function clearJourneyContext(): void {
  localStorage.removeItem('journeyContext');
}

// Get journey display name
export function getJourneyDisplayName(journeyId: string): string {
  switch (journeyId) {
    case 'pregnancy-newborn':
      return 'Pregnancy & New Parents Journey';
    case 'couple-journey':
      return 'Love to Marriage Journey';
    default:
      return 'Life Journey';
  }
}

// Get journey emoji/icon
export function getJourneyIcon(journeyId: string): string {
  switch (journeyId) {
    case 'pregnancy-newborn':
      return '👶';
    case 'couple-journey':
      return '💕';
    default:
      return '✨';
  }
}

// Get journey color theme
export function getJourneyColors(journeyId: string): {
  primary: string;
  secondary: string;
  gradient: string;
} {
  switch (journeyId) {
    case 'pregnancy-newborn':
      return {
        primary: 'text-pink-600',
        secondary: 'text-rose-500',
        gradient: 'from-pink-100 to-rose-200'
      };
    case 'couple-journey':
      return {
        primary: 'text-purple-600',
        secondary: 'text-pink-500',
        gradient: 'from-purple-100 to-pink-200'
      };
    default:
      return {
        primary: 'text-violet-600',
        secondary: 'text-coral',
        gradient: 'from-violet-100 to-coral-100'
      };
  }
}

// Get suggested memory types for a phase
export function getSuggestedMemoryTypes(phase: string): string[] {
  switch (phase) {
    case 'pregnancy':
      return ['Ultrasound Photo', 'Bump Photos', 'Voice Note', 'Journal Entry'];
    case 'newborn':
      return ['Hospital Photos', 'First Moments', 'Video', 'Birth Certificate'];
    case 'infant':
      return ['Milestone Videos', 'Growth Photos', 'First Foods', 'Play Time'];
    case 'toddler':
      return ['Walking Videos', 'First Words', 'Birthday Photos', 'Achievements'];
    case 'courtship':
      return ['Date Photos', 'Messages Screenshots', 'Voice Note', 'Location Photos'];
    case 'engagement':
      return ['Ring Photos', 'Ceremony Photos', 'Family Photos', 'Planning Videos'];
    case 'wedding':
      return ['Ceremony Photos', 'Reception Videos', 'Sacred Moments', 'Family Blessings'];
    case 'honeymoon':
      return ['Travel Photos', 'Adventure Videos', 'Romantic Moments', 'Destination Memories'];
    default:
      return ['Photo', 'Video', 'Voice Note', 'Journal Entry'];
  }
}

// Get cultural prompts for Indian families
export function getCulturalPrompts(phase: string): string[] {
  switch (phase) {
    case 'pregnancy':
      return [
        'What blessings did elders give during pregnancy?',
        'Which cultural rituals did you follow?',
        'What traditional foods did you eat for baby\'s health?',
        'How did the family prepare for the new arrival?'
      ];
    case 'newborn':
      return [
        'What name ceremony traditions did you follow?',
        'Which relatives visited first to bless the baby?',
        'What traditional prayers or mantras were recited?',
        'How did grandparents welcome their grandchild?'
      ];
    case 'engagement':
      return [
        'What traditional engagement rituals were performed?',
        'How did both families exchange gifts and blessings?',
        'Which elders gave you advice for married life?',
        'What cultural significance did the ceremony hold?'
      ];
    case 'wedding':
      return [
        'Which wedding traditions were most meaningful to you?',
        'How did the families come together during ceremonies?',
        'What blessings did elders give during the rituals?',
        'Which cultural customs were followed during the wedding?'
      ];
    default:
      return [];
  }
}

// Check if user has completed journey milestones
export function getJourneyProgress(journeyId: string): {
  completed: number;
  total: number;
  percentage: number;
} {
  try {
    const progressStr = localStorage.getItem(`journey-progress-${journeyId}`);
    if (!progressStr) {
      return { completed: 0, total: getTotalMilestones(journeyId), percentage: 0 };
    }
    
    const completedIds = JSON.parse(progressStr) as string[];
    const total = getTotalMilestones(journeyId);
    const completed = completedIds.length;
    
    return {
      completed,
      total,
      percentage: (completed / total) * 100
    };
  } catch (error) {
    console.error('Error getting journey progress:', error);
    return { completed: 0, total: getTotalMilestones(journeyId), percentage: 0 };
  }
}

// Get total milestones for a journey (including custom milestones)
function getTotalMilestones(journeyId: string): number {
  let baseMilestones = 0;
  switch (journeyId) {
    case 'pregnancy-newborn':
      baseMilestones = 14; // Number of default milestones
      break;
    case 'couple-journey':
      baseMilestones = 16; // Number of default milestones
      break;
    default:
      baseMilestones = 0;
  }
  
  // Add custom milestones count
  try {
    const customKey = journeyId === 'pregnancy-newborn' ? 'pregnancyCustomMilestones' : 'coupleCustomMilestones';
    const customMilestones = localStorage.getItem(customKey);
    if (customMilestones) {
      const parsedCustom = JSON.parse(customMilestones);
      baseMilestones += Array.isArray(parsedCustom) ? parsedCustom.length : 0;
    }
  } catch (error) {
    console.error('Error counting custom milestones:', error);
  }
  
  return baseMilestones;
}

// Save journey progress
export function saveJourneyProgress(journeyId: string, completedMilestoneIds: string[]): void {
  try {
    localStorage.setItem(`journey-progress-${journeyId}`, JSON.stringify(completedMilestoneIds));
  } catch (error) {
    console.error('Error saving journey progress:', error);
  }
}

// Get journey-specific memory prompts
export function getJourneyMemoryPrompts(journeyId: string, milestoneId?: string): string[] {
  if (milestoneId) {
    // Return specific milestone prompts if available
    const context = getJourneyContext();
    if (context && context.milestone.id === milestoneId) {
      return context.prompts;
    }
  }
  
  // Return general journey prompts
  switch (journeyId) {
    case 'pregnancy-newborn':
      return [
        'How did this moment make you feel?',
        'Who was with you during this special time?',
        'What hopes and dreams do you have?',
        'What would you want to tell your future child about this moment?'
      ];
    case 'couple-journey':
      return [
        'What made this moment special for both of you?',
        'How did this experience bring you closer together?',
        'What traditions or customs were meaningful?',
        'What would you want to remember about this time forever?'
      ];
    default:
      return [
        'What made this moment special?',
        'Who was involved in this memory?',
        'How did this experience impact your family?',
        'What emotions do you want to preserve?'
      ];
  }
}

// Validate journey data
export function validateJourneyContext(context: any): context is JourneyContext {
  return (
    context &&
    typeof context.journey === 'string' &&
    context.milestone &&
    typeof context.milestone.id === 'string' &&
    Array.isArray(context.prompts) &&
    Array.isArray(context.suggestedTypes)
  );
}