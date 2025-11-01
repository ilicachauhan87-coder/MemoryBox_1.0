import { useState, useEffect } from 'react';
import { DatabaseService } from '../utils/supabase/persistent-database';
import { toast } from 'sonner@2.0.3';

export interface BookPreference {
  id?: string;
  user_id: string;
  journey_type: 'couple' | 'pregnancy';
  custom_title: string;
  child_id?: string | null; // NEW: For pregnancy books
  cover_color?: string;
  last_opened_at?: string;
  created_at?: string;
  updated_at?: string;
}

interface UseBookPreferencesReturn {
  preferences: Record<string, string>; // journey_type or child_id -> custom_title
  loading: boolean;
  error: string | null;
  updateTitle: (journeyType: 'couple' | 'pregnancy', title: string, childId?: string) => Promise<void>; // NEW: Added childId
  markAsOpened: (journeyType: 'couple' | 'pregnancy', childId?: string) => Promise<void>; // NEW: Added childId
}

export const useBookPreferences = (userId: string | null): UseBookPreferencesReturn => {
  const [preferences, setPreferences] = useState<Record<string, string>>({
    couple: 'Our Love Story',
    pregnancy: "Our Baby's Journey"
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load preferences from database
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const loadPreferences = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch from database
        const data = await DatabaseService.getBookPreferences(userId);
        
        if (data && data.length > 0) {
          const prefs: Record<string, string> = {
            couple: 'Our Love Story',
            pregnancy: "Our Baby's Journey"
          };
          
          data.forEach((pref: BookPreference) => {
            if (pref.custom_title) {
              // NEW: For pregnancy books with child_id, use child_id as key
              if (pref.journey_type === 'pregnancy' && pref.child_id) {
                prefs[pref.child_id] = pref.custom_title;
              } else {
                prefs[pref.journey_type] = pref.custom_title;
              }
            }
          });
          
          setPreferences(prefs);
        }
      } catch (err) {
        console.error('❌ Failed to load book preferences:', err);
        setError(err instanceof Error ? err.message : 'Failed to load preferences');
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [userId]);

  // Update title (database-first)
  const updateTitle = async (journeyType: 'couple' | 'pregnancy', title: string, childId?: string) => {
    if (!userId) {
      toast.error('Please sign in to save book titles');
      return;
    }

    if (!title || title.trim().length === 0) {
      toast.error('Book title cannot be empty');
      return;
    }

    if (title.length > 50) {
      toast.error('Book title must be 50 characters or less');
      return;
    }

    try {
      // Save to database FIRST
      await DatabaseService.saveBookPreference(userId, {
        journey_type: journeyType,
        custom_title: title.trim(),
        child_id: childId // NEW: Include child_id
      });

      // Update UI state (only after database success)
      // NEW: Use child_id as key for pregnancy books, journey_type for couple books
      const key = (journeyType === 'pregnancy' && childId) ? childId : journeyType;
      setPreferences(prev => ({
        ...prev,
        [key]: title.trim()
      }));

      toast.success('Book title saved!');
    } catch (err) {
      console.error('❌ Failed to save book title:', err);
      toast.error('Failed to save title. Please try again.');
      throw err;
    }
  };

  // Mark book as opened (update last_opened_at)
  const markAsOpened = async (journeyType: 'couple' | 'pregnancy', childId?: string) => {
    if (!userId) return;

    try {
      await DatabaseService.updateBookLastOpened(userId, journeyType, childId); // NEW: Pass child_id
    } catch (err) {
      console.error('❌ Failed to update last opened:', err);
      // Silent failure - not critical
    }
  };

  return {
    preferences,
    loading,
    error,
    updateTitle,
    markAsOpened
  };
};
