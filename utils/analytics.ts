/**
 * Analytics Service - Track user behavior and events
 * 
 * Supports multiple analytics providers:
 * - PostHog (recommended for product analytics)
 * - Google Analytics (optional)
 * - Custom logging
 * 
 * Usage:
 * import { analytics } from './utils/analytics';
 * analytics.track('memory_uploaded', { type: 'photo', size: 1024 });
 */

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp?: string;
}

interface UserProperties {
  user_id?: string;
  name?: string;
  email?: string;
  family_id?: string;
  signup_date?: string;
  [key: string]: any;
}

class AnalyticsService {
  private isInitialized = false;
  private provider: 'posthog' | 'ga' | 'custom' = 'custom';
  private eventQueue: AnalyticsEvent[] = [];

  /**
   * Initialize analytics service
   * Call this once in App.tsx
   */
  init(provider: 'posthog' | 'ga' | 'custom' = 'custom') {
    this.provider = provider;
    this.isInitialized = true;
    console.log('✅ Analytics initialized with provider:', provider);

    // Process queued events
    this.eventQueue.forEach(event => this.track(event.event, event.properties));
    this.eventQueue = [];
  }

  /**
   * Track an event
   * @param eventName - Name of the event (e.g., 'memory_uploaded')
   * @param properties - Additional event properties
   */
  track(eventName: string, properties?: Record<string, any>) {
    if (!this.isInitialized) {
      // Queue event until initialized
      this.eventQueue.push({ event: eventName, properties, timestamp: new Date().toISOString() });
      return;
    }

    const eventData: AnalyticsEvent = {
      event: eventName,
      properties: {
        ...properties,
        page_url: window.location.pathname,
        timestamp: new Date().toISOString()
      }
    };

    // Send to appropriate provider
    switch (this.provider) {
      case 'posthog':
        this.trackPostHog(eventData);
        break;
      case 'ga':
        this.trackGA(eventData);
        break;
      case 'custom':
        this.trackCustom(eventData);
        break;
    }

    console.log('📊 Analytics event tracked:', eventData);
  }

  /**
   * Identify user (call after login/signup)
   */
  identify(userId: string, properties?: UserProperties) {
    if (!this.isInitialized) {
      console.warn('⚠️ Analytics not initialized. Call analytics.init() first.');
      return;
    }

    const userData = {
      user_id: userId,
      ...properties,
      identified_at: new Date().toISOString()
    };

    switch (this.provider) {
      case 'posthog':
        // @ts-ignore - PostHog types
        if (window.posthog) {
          window.posthog.identify(userId, userData);
        }
        break;
      case 'ga':
        // @ts-ignore - GA types
        if (window.gtag) {
          window.gtag('config', 'GA_MEASUREMENT_ID', {
            user_id: userId,
            ...userData
          });
        }
        break;
      case 'custom':
        this.saveToLocalStorage('user_identity', userData);
        break;
    }

    console.log('👤 User identified:', userId);
  }

  /**
   * Track page view (call on route change)
   */
  pageView(pageName: string) {
    this.track('page_view', {
      page_name: pageName,
      page_url: window.location.pathname,
      referrer: document.referrer
    });
  }

  /**
   * PostHog implementation
   */
  private trackPostHog(event: AnalyticsEvent) {
    // @ts-ignore - PostHog types
    if (window.posthog) {
      window.posthog.capture(event.event, event.properties);
    } else {
      console.warn('⚠️ PostHog not loaded. Event saved to localStorage.');
      this.trackCustom(event);
    }
  }

  /**
   * Google Analytics implementation
   */
  private trackGA(event: AnalyticsEvent) {
    // @ts-ignore - GA types
    if (window.gtag) {
      window.gtag('event', event.event, event.properties);
    } else {
      console.warn('⚠️ Google Analytics not loaded. Event saved to localStorage.');
      this.trackCustom(event);
    }
  }

  /**
   * Custom implementation (localStorage fallback)
   */
  private trackCustom(event: AnalyticsEvent) {
    // Save to localStorage for later sync
    const events = this.loadFromLocalStorage('analytics_events');
    events.push(event);
    this.saveToLocalStorage('analytics_events', events);

    // Keep only last 1000 events to avoid storage bloat
    if (events.length > 1000) {
      events.shift();
      this.saveToLocalStorage('analytics_events', events);
    }
  }

  /**
   * Save to localStorage
   */
  private saveToLocalStorage(key: string, data: any) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('❌ Failed to save analytics to localStorage:', error);
    }
  }

  /**
   * Load from localStorage
   */
  private loadFromLocalStorage(key: string): any[] {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('❌ Failed to load analytics from localStorage:', error);
      return [];
    }
  }

  /**
   * Get all stored events (for debugging or manual export)
   */
  getStoredEvents(): AnalyticsEvent[] {
    return this.loadFromLocalStorage('analytics_events');
  }

  /**
   * Clear stored events
   */
  clearStoredEvents() {
    localStorage.removeItem('analytics_events');
    console.log('🗑️ Analytics events cleared');
  }
}

// Export singleton instance
export const analytics = new AnalyticsService();

/**
 * Predefined event tracking functions for common actions
 */
export const trackEvent = {
  // Authentication
  signUp: (method: 'email' | 'mobile') => 
    analytics.track('user_signed_up', { method }),
  
  signIn: (method: 'email' | 'mobile') => 
    analytics.track('user_signed_in', { method }),
  
  signOut: () => 
    analytics.track('user_signed_out'),

  // Onboarding
  onboardingStarted: () => 
    analytics.track('onboarding_started'),
  
  onboardingCompleted: (duration_seconds?: number) => 
    analytics.track('onboarding_completed', { duration_seconds }),
  
  onboardingSkipped: (step: string) => 
    analytics.track('onboarding_skipped', { step }),

  // Family Tree
  familyMemberAdded: (generation: number, relationship?: string) => 
    analytics.track('family_member_added', { generation, relationship }),
  
  familyTreeViewed: (member_count: number) => 
    analytics.track('family_tree_viewed', { member_count }),
  
  relationshipCreated: (type: 'spouse' | 'parent-child' | 'sibling') => 
    analytics.track('relationship_created', { type }),

  // Memories
  memoryUploaded: (type: 'photo' | 'video' | 'audio', size_kb: number) => 
    analytics.track('memory_uploaded', { type, size_kb }),
  
  memoryViewed: (memory_id: string, type: string) => 
    analytics.track('memory_viewed', { memory_id, type }),
  
  memoryDeleted: (memory_id: string) => 
    analytics.track('memory_deleted', { memory_id }),

  // Time Capsules
  timeCapsuleCreated: (unlock_date: string, recipient_count: number) => 
    analytics.track('time_capsule_created', { unlock_date, recipient_count }),
  
  timeCapsuleUnlocked: (capsule_id: string) => 
    analytics.track('time_capsule_unlocked', { capsule_id }),

  // Journeys
  journeyStarted: (type: 'couple' | 'pregnancy') => 
    analytics.track('journey_started', { type }),
  
  milestoneAdded: (journey_type: string, milestone_name: string) => 
    analytics.track('milestone_added', { journey_type, milestone_name }),

  // Journal
  journalEntryCreated: (word_count: number) => 
    analytics.track('journal_entry_created', { word_count }),
  
  journalEntryEdited: (entry_id: string) => 
    analytics.track('journal_entry_edited', { entry_id }),

  // Family Wall
  postCreated: (post_type: string) => 
    analytics.track('family_wall_post_created', { post_type }),
  
  postLiked: (post_id: string) => 
    analytics.track('family_wall_post_liked', { post_id }),
  
  commentAdded: (post_id: string) => 
    analytics.track('family_wall_comment_added', { post_id }),

  // Engagement
  featureUsed: (feature_name: string) => 
    analytics.track('feature_used', { feature_name }),
  
  helpViewed: (help_topic: string) => 
    analytics.track('help_viewed', { help_topic }),
  
  feedbackSubmitted: (rating: number, category: string) => 
    analytics.track('feedback_submitted', { rating, category }),

  // Errors (for monitoring)
  error: (error_type: string, error_message: string, page: string) => 
    analytics.track('error_occurred', { error_type, error_message, page }),
};

/**
 * HOW TO USE:
 * 
 * 1. Initialize in App.tsx:
 *    import { analytics } from './utils/analytics';
 *    analytics.init('custom'); // or 'posthog' or 'ga'
 * 
 * 2. Identify user after login:
 *    analytics.identify(userId, { name, email, family_id });
 * 
 * 3. Track events:
 *    import { trackEvent } from './utils/analytics';
 *    trackEvent.memoryUploaded('photo', 1024);
 * 
 * 4. Custom events:
 *    analytics.track('custom_event', { custom_property: 'value' });
 * 
 * 5. Page views (in route components):
 *    analytics.pageView('Home');
 */

/**
 * PostHog Setup Instructions:
 * 
 * 1. Sign up at posthog.com (free tier)
 * 2. Get your Project API Key
 * 3. Add to index.html before </head>:
 *    <script>
 *      !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
 *      posthog.init('YOUR_PROJECT_API_KEY',{api_host:'https://app.posthog.com'})
 *    </script>
 * 4. Change analytics.init('custom') to analytics.init('posthog')
 */
