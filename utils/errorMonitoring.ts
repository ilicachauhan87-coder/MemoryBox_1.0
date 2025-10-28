/**
 * Error Monitoring Service
 * 
 * Captures and logs errors for production monitoring
 * Supports Sentry integration with localStorage fallback
 * 
 * Usage:
 * import { errorMonitoring } from './utils/errorMonitoring';
 * errorMonitoring.captureError(error, { context: 'user_action' });
 */

interface ErrorContext {
  user_id?: string;
  page?: string;
  action?: string;
  component?: string;
  [key: string]: any;
}

interface ErrorLog {
  id: string;
  message: string;
  stack?: string;
  context: ErrorContext;
  timestamp: string;
  severity: 'error' | 'warning' | 'info';
  user_agent: string;
  page_url: string;
}

class ErrorMonitoringService {
  private isInitialized = false;
  private useSentry = false;
  private errorCount = 0;
  private maxLocalErrors = 100; // Keep only last 100 errors in localStorage

  /**
   * Initialize error monitoring
   * Call this once in App.tsx
   */
  init(useSentry = false) {
    this.isInitialized = true;
    this.useSentry = useSentry;

    // Set up global error handlers
    this.setupGlobalErrorHandlers();

    console.log('✅ Error monitoring initialized', useSentry ? 'with Sentry' : '(localStorage only)');
  }

  /**
   * Set up global error handlers to catch unhandled errors
   */
  private setupGlobalErrorHandlers() {
    // Catch unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.captureError(event.error || new Error(event.message), {
        type: 'unhandled_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(
        new Error(event.reason?.message || 'Unhandled Promise Rejection'),
        {
          type: 'unhandled_rejection',
          reason: event.reason
        }
      );
    });

    console.log('✅ Global error handlers set up');
  }

  /**
   * Capture an error with context
   */
  captureError(error: Error | string, context?: ErrorContext) {
    if (!this.isInitialized) {
      console.warn('⚠️ Error monitoring not initialized. Call errorMonitoring.init() first.');
      console.error(error);
      return;
    }

    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error === 'string' ? undefined : error.stack;

    // Get current user context
    const currentUserId = localStorage.getItem('current_user_id');
    const userProfile = currentUserId 
      ? localStorage.getItem(`user:${currentUserId}:profile`)
      : null;
    const userData = userProfile ? JSON.parse(userProfile) : null;

    // Create error log
    const errorLog: ErrorLog = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: errorMessage,
      stack: errorStack,
      context: {
        user_id: currentUserId || 'anonymous',
        user_name: userData?.name,
        user_email: userData?.email,
        page: window.location.pathname,
        ...context
      },
      timestamp: new Date().toISOString(),
      severity: 'error',
      user_agent: navigator.userAgent,
      page_url: window.location.href
    };

    this.errorCount++;

    // Send to Sentry if enabled
    if (this.useSentry && window.Sentry) {
      this.sendToSentry(errorLog);
    }

    // Always save to localStorage as backup
    this.saveToLocalStorage(errorLog);

    // Log to console
    console.error('🚨 Error captured:', errorLog);
  }

  /**
   * Capture a warning (non-critical)
   */
  captureWarning(message: string, context?: ErrorContext) {
    const warningLog: ErrorLog = {
      id: `warning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message,
      context: context || {},
      timestamp: new Date().toISOString(),
      severity: 'warning',
      user_agent: navigator.userAgent,
      page_url: window.location.href
    };

    if (this.useSentry && window.Sentry) {
      window.Sentry.captureMessage(message, 'warning');
    }

    this.saveToLocalStorage(warningLog);
    console.warn('⚠️ Warning captured:', warningLog);
  }

  /**
   * Capture an info message (for tracking purposes)
   */
  captureInfo(message: string, context?: ErrorContext) {
    const infoLog: ErrorLog = {
      id: `info_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message,
      context: context || {},
      timestamp: new Date().toISOString(),
      severity: 'info',
      user_agent: navigator.userAgent,
      page_url: window.location.href
    };

    this.saveToLocalStorage(infoLog);
    console.info('ℹ️ Info captured:', infoLog);
  }

  /**
   * Send error to Sentry
   */
  private sendToSentry(errorLog: ErrorLog) {
    try {
      if (!window.Sentry) {
        console.warn('⚠️ Sentry not loaded');
        return;
      }

      window.Sentry.captureException(new Error(errorLog.message), {
        contexts: {
          error_context: errorLog.context
        },
        tags: {
          page: errorLog.context.page,
          user_id: errorLog.context.user_id
        },
        extra: {
          timestamp: errorLog.timestamp,
          error_id: errorLog.id
        }
      });

      console.log('✅ Error sent to Sentry:', errorLog.id);
    } catch (error) {
      console.error('❌ Failed to send error to Sentry:', error);
    }
  }

  /**
   * Save error to localStorage
   */
  private saveToLocalStorage(errorLog: ErrorLog) {
    try {
      // Get existing errors
      const errors = this.getStoredErrors();

      // Add new error
      errors.unshift(errorLog); // Add to beginning

      // Keep only last N errors to prevent storage overflow
      const trimmedErrors = errors.slice(0, this.maxLocalErrors);

      // Save back to localStorage
      localStorage.setItem('app_errors', JSON.stringify(trimmedErrors));
    } catch (error) {
      console.error('❌ Failed to save error to localStorage:', error);
      // If localStorage is full, clear old errors and try again
      try {
        const recentErrors = this.getStoredErrors().slice(0, 20);
        localStorage.setItem('app_errors', JSON.stringify(recentErrors));
      } catch {
        console.error('❌ localStorage completely full, cannot save errors');
      }
    }
  }

  /**
   * Get stored errors from localStorage
   */
  getStoredErrors(): ErrorLog[] {
    try {
      const errors = localStorage.getItem('app_errors');
      return errors ? JSON.parse(errors) : [];
    } catch (error) {
      console.error('❌ Failed to load errors from localStorage:', error);
      return [];
    }
  }

  /**
   * Clear stored errors
   */
  clearStoredErrors() {
    localStorage.removeItem('app_errors');
    this.errorCount = 0;
    console.log('🗑️ Stored errors cleared');
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const errors = this.getStoredErrors();
    
    const stats = {
      total: errors.length,
      by_severity: {
        error: errors.filter(e => e.severity === 'error').length,
        warning: errors.filter(e => e.severity === 'warning').length,
        info: errors.filter(e => e.severity === 'info').length
      },
      by_page: {} as Record<string, number>,
      recent_errors: errors.slice(0, 10)
    };

    // Count by page
    errors.forEach(error => {
      const page = error.context.page || 'unknown';
      stats.by_page[page] = (stats.by_page[page] || 0) + 1;
    });

    return stats;
  }

  /**
   * Export errors as JSON (for manual review)
   */
  exportErrors() {
    const errors = this.getStoredErrors();
    const dataStr = JSON.stringify(errors, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `memorybox-errors-${new Date().toISOString()}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    console.log('✅ Errors exported to file');
  }
}

// Export singleton instance
export const errorMonitoring = new ErrorMonitoringService();

/**
 * Predefined error tracking functions for common scenarios
 */
export const trackError = {
  // Authentication errors
  authFailed: (reason: string) => 
    errorMonitoring.captureError(`Authentication failed: ${reason}`, {
      component: 'Authentication',
      action: 'sign_in'
    }),

  // Database errors
  databaseError: (operation: string, error: Error) => 
    errorMonitoring.captureError(error, {
      component: 'Database',
      operation
    }),

  // Upload errors
  uploadFailed: (fileType: string, error: Error) => 
    errorMonitoring.captureError(error, {
      component: 'Upload',
      file_type: fileType
    }),

  // API errors
  apiFailed: (endpoint: string, status: number, error: string) => 
    errorMonitoring.captureError(`API call failed: ${endpoint}`, {
      component: 'API',
      endpoint,
      status,
      error_message: error
    }),

  // UI errors
  renderError: (component: string, error: Error) => 
    errorMonitoring.captureError(error, {
      component,
      type: 'render_error'
    }),

  // Form validation errors
  validationError: (form: string, field: string, error: string) => 
    errorMonitoring.captureWarning(`Validation error in ${form}.${field}: ${error}`, {
      component: 'Form',
      form,
      field
    }),

  // Storage errors
  storageError: (operation: 'read' | 'write' | 'delete', key: string, error: Error) => 
    errorMonitoring.captureError(error, {
      component: 'Storage',
      operation,
      key
    }),
};

/**
 * HOW TO USE:
 * 
 * 1. Initialize in App.tsx (inside useEffect):
 *    import { errorMonitoring } from './utils/errorMonitoring';
 *    errorMonitoring.init(false); // false = localStorage only, true = with Sentry
 * 
 * 2. Wrap async operations with try-catch:
 *    try {
 *      await someOperation();
 *    } catch (error) {
 *      errorMonitoring.captureError(error, { context: 'my_operation' });
 *    }
 * 
 * 3. Use predefined trackers:
 *    import { trackError } from './utils/errorMonitoring';
 *    trackError.uploadFailed('photo', error);
 * 
 * 4. View errors in console:
 *    errorMonitoring.getErrorStats();
 *    errorMonitoring.getStoredErrors();
 * 
 * 5. Export errors for review:
 *    errorMonitoring.exportErrors(); // Downloads JSON file
 */

/**
 * Sentry Setup Instructions:
 * 
 * 1. Sign up at sentry.io (free tier: 5K errors/month)
 * 2. Create a new React project
 * 3. Get your DSN (Data Source Name)
 * 4. Install Sentry SDK:
 *    npm install @sentry/react
 * 5. Add to App.tsx before errorMonitoring.init():
 *    import * as Sentry from "@sentry/react";
 *    Sentry.init({
 *      dsn: "YOUR_SENTRY_DSN",
 *      integrations: [
 *        new Sentry.BrowserTracing(),
 *        new Sentry.Replay()
 *      ],
 *      tracesSampleRate: 1.0,
 *      replaysSessionSampleRate: 0.1,
 *      replaysOnErrorSampleRate: 1.0,
 *    });
 * 6. Change errorMonitoring.init(false) to errorMonitoring.init(true)
 */

// TypeScript declarations for global Sentry object
declare global {
  interface Window {
    Sentry?: {
      captureException: (error: Error, context?: any) => void;
      captureMessage: (message: string, severity?: string) => void;
    };
  }
}
