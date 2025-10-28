import confetti from 'canvas-confetti';

// MemoryBox vibrant color palette
const MEMORYBOX_COLORS = [
  '#6A0572', // Violet
  '#FF6F61', // Coral
  '#17BEBB', // Aqua
  '#FDFCDC', // Cream
];

// Check if user prefers reduced motion (accessibility)
const prefersReducedMotion = () => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Check if this is a "first time" event
const isFirstTime = (eventKey: string): boolean => {
  const key = `memorybox_celebrated_${eventKey}`;
  const celebrated = localStorage.getItem(key);
  if (!celebrated) {
    localStorage.setItem(key, 'true');
    return true;
  }
  return false;
};

// Reset celebrations (for testing)
export const resetCelebrations = () => {
  const keys = [
    'first_member',
    'first_memory',
    'first_journal',
    'first_journey',
    'profile_complete',
    'first_capsule',
    'first_invite',
    'birthday',
    'anniversary'
  ];
  keys.forEach(key => localStorage.removeItem(`memorybox_celebrated_${key}`));
  console.log('✅ All celebrations reset!');
};

// Main confetti trigger
const triggerConfetti = (config?: confetti.Options) => {
  if (prefersReducedMotion()) {
    console.log('🎉 Celebration skipped (user prefers reduced motion)');
    return;
  }

  const isMobile = window.innerWidth < 768;
  const particleCount = isMobile ? 100 : 150;

  confetti({
    particleCount,
    spread: 70,
    origin: { y: 0.6 },
    colors: MEMORYBOX_COLORS,
    shapes: ['circle', 'square'],
    gravity: 1.2,
    ticks: 200,
    scalar: 1.2,
    ...config
  });
};

// Enhanced multi-burst celebration
const triggerMultiBurstConfetti = () => {
  if (prefersReducedMotion()) return;

  const duration = 2000;
  const end = Date.now() + duration;
  const isMobile = window.innerWidth < 768;

  (function frame() {
    confetti({
      particleCount: isMobile ? 2 : 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
      colors: MEMORYBOX_COLORS
    });
    
    confetti({
      particleCount: isMobile ? 2 : 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
      colors: MEMORYBOX_COLORS
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  }());
};

// Celebration methods for specific events
export const celebrateFirstMember = () => {
  if (isFirstTime('first_member')) {
    console.log('🎉 Celebrating first family member!');
    triggerMultiBurstConfetti();
  }
};

export const celebrateFirstMemory = () => {
  if (isFirstTime('first_memory')) {
    console.log('🎉 Celebrating first memory!');
    triggerMultiBurstConfetti();
  }
};

export const celebrateFirstJournal = () => {
  if (isFirstTime('first_journal')) {
    console.log('🎉 Celebrating first journal entry!');
    triggerConfetti({ particleCount: window.innerWidth < 768 ? 80 : 120 });
  }
};

export const celebrateFirstJourney = () => {
  if (isFirstTime('first_journey')) {
    console.log('🎉 Celebrating first life journey!');
    triggerConfetti({ particleCount: window.innerWidth < 768 ? 80 : 120 });
  }
};

export const celebrateProfileComplete = () => {
  if (isFirstTime('profile_complete')) {
    console.log('🎉 Celebrating profile completion!');
    triggerMultiBurstConfetti();
  }
};

export const celebrateFirstCapsule = () => {
  if (isFirstTime('first_capsule')) {
    console.log('🎉 Celebrating first time capsule!');
    triggerConfetti({ particleCount: window.innerWidth < 768 ? 80 : 120 });
  }
};

export const celebrateFirstInvite = () => {
  if (isFirstTime('first_invite')) {
    console.log('🎉 Celebrating first invite sent!');
    triggerConfetti({ particleCount: window.innerWidth < 768 ? 80 : 120 });
  }
};

export const celebrateBirthday = () => {
  const today = new Date().toDateString();
  const key = `birthday_${today}`;
  if (isFirstTime(key)) {
    console.log('🎂 Happy Birthday!');
    triggerMultiBurstConfetti();
  }
};

export const celebrateAnniversary = () => {
  const today = new Date().toDateString();
  const key = `anniversary_${today}`;
  if (isFirstTime(key)) {
    console.log('💕 Happy Anniversary!');
    triggerMultiBurstConfetti();
  }
};

// General celebration (no first-time check, for repeatable events like welcome back)
export const celebrateGeneral = (message?: string) => {
  console.log(message || '🎉 Celebration!');
  triggerConfetti({ 
    particleCount: window.innerWidth < 768 ? 80 : 120,
    spread: 60,
    origin: { y: 0.5 }
  });
};

// Make reset function available globally for testing
if (typeof window !== 'undefined') {
  (window as any).resetCelebrations = resetCelebrations;
}
