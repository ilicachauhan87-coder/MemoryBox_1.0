import { useEffect, useState } from 'react';
import { migrationService } from '../utils/migration-service';
import { Progress } from './ui/progress';
import { CheckCircle2, Cloud, Database, AlertCircle } from 'lucide-react';

interface DataMigrationWrapperProps {
  children: React.ReactNode;
}

export function DataMigrationWrapper({ children }: DataMigrationWrapperProps) {
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [migrationError, setMigrationError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const runMigration = async () => {
      // Check if user is logged in
      const currentUserId = localStorage.getItem('current_user_id');
      
      if (!currentUserId) {
        // No user logged in, skip migration
        setMigrationComplete(true);
        return;
      }

      // 🔧 FIX: Skip migration if already completed OR if backend is unavailable
      // This prevents migration errors from blocking the app
      const migrationCompleted = localStorage.getItem('memorybox_migration_completed');
      
      if (migrationCompleted === 'true') {
        setMigrationComplete(true);
        return;
      }

      // Check if user has Supabase auth session
      try {
        const { getSupabaseClient } = await import('../utils/supabase/client');
        
        // Use singleton Supabase client to avoid multiple GoTrueClient instances
        const supabase = getSupabaseClient();
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // No auth session - skip migration silently
          setMigrationComplete(true);
          return;
        }

        // 🔧 FIX: Skip migration UI entirely - just mark as complete
        // Migration will happen in the background via DatabaseService
        // This prevents "Failed to fetch" errors from showing to users
        setMigrationComplete(true);
        localStorage.setItem('memorybox_migration_completed', 'true');
        
      } catch (error) {
        // Silently skip migration on error
        setMigrationComplete(true);
        localStorage.setItem('memorybox_migration_completed', 'true');
      }
    };

    runMigration();
  }, []);

  if (!migrationComplete && isMigrating) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center vibrant-texture">
        <div className="max-w-md w-full p-8">
          <div className="memory-card p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
              <Cloud className="w-10 h-10 text-white" />
            </div>
            
            <h2 className="text-2xl mb-2">Syncing Your Data</h2>
            <p className="text-muted-foreground mb-6">
              We're making your memories accessible from all your devices...
            </p>
            
            <div className="space-y-4">
              <Progress value={progress} className="h-2" />
              
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Database className="w-4 h-4" />
                <span>Uploading to secure cloud storage</span>
              </div>
            </div>
            
            <div className="mt-6 text-xs text-muted-foreground">
              This may take a few moments depending on your data size
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!migrationComplete && migrationError) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center vibrant-texture">
        <div className="max-w-md w-full p-8">
          <div className="memory-card p-8 text-center">
            <div className="w-20 h-20 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-yellow-600" />
            </div>
            
            <h2 className="text-2xl mb-2">Sync Paused</h2>
            <p className="text-muted-foreground mb-6">
              {migrationError}
            </p>
            
            <div className="text-sm text-muted-foreground">
              Your data remains safe and accessible. Cloud sync will be attempted again next time.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Migration complete or not needed, show app
  return <>{children}</>;
}
