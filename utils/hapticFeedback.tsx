// Haptic feedback utility for mobile devices
export const triggerHapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  // Check if the device supports haptic feedback
  if ('vibrate' in navigator) {
    try {
      switch (type) {
        case 'light':
          navigator.vibrate(10); // Quick, light tap
          break;
        case 'medium':
          navigator.vibrate(20); // Medium tap
          break;
        case 'heavy':
          navigator.vibrate([30, 10, 30]); // Heavy pattern
          break;
      }
    } catch (error) {
      // Silently fail if vibration is not supported
      console.debug('Haptic feedback not supported:', error);
    }
  }
};

// Specific haptic patterns for common actions
export const hapticFeedback = {
  tap: () => triggerHapticFeedback('light'),
  select: () => triggerHapticFeedback('medium'),
  delete: () => triggerHapticFeedback('heavy'),
  success: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 30, 50]);
    }
  },
  error: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100, 50, 100]);
    }
  }
};
