/**
 * Metrics Service - MVP Validation Dashboard
 * 
 * Calculates all key metrics for MemoryBox alpha testing:
 * - Activation Rate
 * - Avg Memories/User
 * - Return Rate (Day 7)
 * - Recommend %
 * - Emotional Score Avg
 * - User Activity Tracking
 */

import { projectId, publicAnonKey } from './supabase/info';

export interface UserActivityMetrics {
  user_id: string;
  email: string;
  batch_no: number;
  memories_count: number;
  family_members_count: number;
  journal_entries_count: number;
  time_capsules_count: number;
  is_activated: boolean;
  days_since_signup: number;
  last_active_at: string;
  created_at: string;
}

export interface AggregatedMetrics {
  total_users: number;
  activated_users: number;
  activation_rate: number;
  avg_memories_per_user: number;
  total_memories: number;
  recommend_yes: number;
  total_feedback: number;
  recommend_percentage: number;
  avg_emotional_score: number;
}

export interface StorageMetrics {
  used_gb: number;
  total_gb: number;
  remaining_gb: number;
  usage_percentage: number;
  file_count: number;
}

export interface FeedbackEntry {
  id: string;
  user_id: string;
  would_recommend: boolean;
  liked_most: string | null;
  frustrating: string | null;
  improvements: string | null;
  feel_connected: number;
  invite_family: string | null;
  moment_to_preserve: string | null;
  submitted_at: string;
}

class MetricsService {
  private baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-78eb8d05`;

  /**
   * Initialize user activity tracking for a new user
   */
  async initializeUserActivity(userId: string, email: string, batchNo: number = 1): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/metrics/init-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          user_id: userId,
          email: email,
          batch_no: batchNo
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to initialize user activity: ${response.statusText}`);
      }

      console.log('✅ User activity initialized:', userId);
    } catch (error) {
      console.error('❌ Error initializing user activity:', error);
      // Fallback to localStorage
      const activityData = {
        user_id: userId,
        email: email,
        batch_no: batchNo,
        created_at: new Date().toISOString()
      };
      localStorage.setItem(`user_activity:${userId}`, JSON.stringify(activityData));
    }
  }

  /**
   * Track when user uploads a memory
   */
  async trackMemoryUpload(userId: string): Promise<void> {
    try {
      await this.updateActivity(userId, { memories_count: 1 });
      console.log('✅ Memory upload tracked for:', userId);
    } catch (error) {
      console.error('❌ Error tracking memory upload:', error);
    }
  }

  /**
   * Track when user adds a family member
   */
  async trackFamilyMemberAdded(userId: string): Promise<void> {
    try {
      await this.updateActivity(userId, { family_members_count: 1 });
      console.log('✅ Family member addition tracked for:', userId);
    } catch (error) {
      console.error('❌ Error tracking family member:', error);
    }
  }

  /**
   * Track when user creates a journal entry
   */
  async trackJournalEntry(userId: string): Promise<void> {
    try {
      await this.updateActivity(userId, { journal_entries_count: 1 });
      console.log('✅ Journal entry tracked for:', userId);
    } catch (error) {
      console.error('❌ Error tracking journal entry:', error);
    }
  }

  /**
   * Track when user creates a time capsule
   */
  async trackTimeCapsule(userId: string): Promise<void> {
    try {
      await this.updateActivity(userId, { time_capsules_count: 1 });
      console.log('✅ Time capsule tracked for:', userId);
    } catch (error) {
      console.error('❌ Error tracking time capsule:', error);
    }
  }

  /**
   * Update user activity (internal method)
   */
  private async updateActivity(userId: string, updates: any): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/metrics/update-activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          user_id: userId,
          ...updates
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update activity: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Error updating activity:', error);
      throw error;
    }
  }

  /**
   * Get all user metrics (admin only)
   */
  async getAllUserMetrics(): Promise<UserActivityMetrics[]> {
    try {
      const response = await fetch(`${this.baseUrl}/metrics/all-users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user metrics: ${response.statusText}`);
      }

      const data = await response.json();
      return data.metrics || [];
    } catch (error) {
      console.error('❌ Error fetching user metrics:', error);
      return [];
    }
  }

  /**
   * Get aggregated metrics (admin only)
   */
  async getAggregatedMetrics(): Promise<AggregatedMetrics> {
    try {
      const response = await fetch(`${this.baseUrl}/metrics/aggregated`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch aggregated metrics: ${response.statusText}`);
      }

      const data = await response.json();
      return data.metrics || {
        total_users: 0,
        activated_users: 0,
        activation_rate: 0,
        avg_memories_per_user: 0,
        total_memories: 0,
        recommend_yes: 0,
        total_feedback: 0,
        recommend_percentage: 0,
        avg_emotional_score: 0
      };
    } catch (error) {
      console.error('❌ Error fetching aggregated metrics:', error);
      return {
        total_users: 0,
        activated_users: 0,
        activation_rate: 0,
        avg_memories_per_user: 0,
        total_memories: 0,
        recommend_yes: 0,
        total_feedback: 0,
        recommend_percentage: 0,
        avg_emotional_score: 0
      };
    }
  }

  /**
   * Get all feedback entries (admin only)
   */
  async getAllFeedback(): Promise<FeedbackEntry[]> {
    try {
      const response = await fetch(`${this.baseUrl}/metrics/all-feedback`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch feedback: ${response.statusText}`);
      }

      const data = await response.json();
      return data.feedback || [];
    } catch (error) {
      console.error('❌ Error fetching feedback:', error);
      return [];
    }
  }

  /**
   * Calculate return rate (Day 7)
   * Users who logged in 7+ days after signup
   */
  async calculateReturnRate(): Promise<number> {
    try {
      const users = await this.getAllUserMetrics();
      if (users.length === 0) return 0;

      const returnedUsers = users.filter(user => {
        const daysSinceSignup = user.days_since_signup;
        const lastActiveDate = new Date(user.last_active_at);
        const createdDate = new Date(user.created_at);
        const daysSinceLastActive = Math.floor(
          (Date.now() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // User returned if they were active at least 7 days after signup
        return daysSinceSignup >= 7 && daysSinceLastActive <= 30;
      });

      return Math.round((returnedUsers.length / users.length) * 100);
    } catch (error) {
      console.error('❌ Error calculating return rate:', error);
      return 0;
    }
  }

  /**
   * Export metrics to CSV format (for manual Google Sheets import if needed)
   */
  async exportToCSV(): Promise<string> {
    try {
      const users = await this.getAllUserMetrics();
      
      // CSV Header
      let csv = 'User ID,Email,Batch,Memories,Family Members,Journal Entries,Time Capsules,Activated,Days Since Signup,Last Active\n';
      
      // Add rows
      users.forEach(user => {
        csv += `${user.user_id},${user.email},${user.batch_no},${user.memories_count},${user.family_members_count},${user.journal_entries_count},${user.time_capsules_count},${user.is_activated},${user.days_since_signup},${user.last_active_at}\n`;
      });

      return csv;
    } catch (error) {
      console.error('❌ Error exporting to CSV:', error);
      return '';
    }
  }

  /**
   * Get Supabase storage usage metrics
   * Tracks GB used vs remaining (1GB free tier limit)
   */
  async getStorageMetrics(): Promise<StorageMetrics> {
    try {
      const response = await fetch(`${this.baseUrl}/metrics/storage`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch storage metrics: ${response.statusText}`);
      }

      const data = await response.json();
      return data.storage || {
        used_gb: 0,
        total_gb: 1,
        remaining_gb: 1,
        usage_percentage: 0,
        file_count: 0
      };
    } catch (error) {
      console.error('❌ Error fetching storage metrics:', error);
      return {
        used_gb: 0,
        total_gb: 1,
        remaining_gb: 1,
        usage_percentage: 0,
        file_count: 0
      };
    }
  }
}

// Export singleton instance
export const metricsService = new MetricsService();

// Helper function to track activity easily from components
export const trackActivity = {
  memory: (userId: string) => metricsService.trackMemoryUpload(userId),
  familyMember: (userId: string) => metricsService.trackFamilyMemberAdded(userId),
  journal: (userId: string) => metricsService.trackJournalEntry(userId),
  timeCapsule: (userId: string) => metricsService.trackTimeCapsule(userId)
};
