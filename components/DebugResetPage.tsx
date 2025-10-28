/**
 * 🔧 DEBUG RESET PAGE
 * 
 * A simple UI to reset the database during testing
 * 
 * Access via: /debug-reset route (add to App.tsx)
 */

import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { AlertTriangle, Trash2, RefreshCw, Database, HardDrive } from 'lucide-react';
import { 
  resetAllData, 
  quickReset, 
  deleteAllSupabaseData, 
  clearAllBrowserStorage 
} from '../utils/resetDatabase';

export function DebugResetPage() {
  const [isResetting, setIsResetting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const handleFullReset = async () => {
    if (isResetting) return;
    
    setIsResetting(true);
    setLogs([]);
    addLog('Starting full reset...');
    
    try {
      await resetAllData();
    } catch (error: any) {
      addLog(`Error: ${error.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  const handleQuickReset = async () => {
    if (isResetting) return;
    
    setIsResetting(true);
    setLogs([]);
    addLog('Starting quick reset (browser only)...');
    
    try {
      await quickReset();
    } catch (error: any) {
      addLog(`Error: ${error.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  const handleDatabaseReset = async () => {
    if (isResetting) return;
    
    const confirm = window.confirm(
      '⚠️ This will DELETE ALL DATA from Supabase database!\n\n' +
      'Are you sure?'
    );
    
    if (!confirm) return;
    
    setIsResetting(true);
    setLogs([]);
    addLog('Deleting all Supabase data...');
    
    try {
      await deleteAllSupabaseData();
      addLog('Database reset complete!');
    } catch (error: any) {
      addLog(`Error: ${error.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  const handleBrowserReset = () => {
    if (isResetting) return;
    
    setIsResetting(true);
    setLogs([]);
    addLog('Clearing browser storage...');
    
    try {
      clearAllBrowserStorage();
      addLog('Browser storage cleared!');
      setTimeout(() => {
        addLog('Reloading page...');
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      addLog(`Error: ${error.message}`);
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="p-6 border-2 border-destructive/20 bg-destructive/5">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
            <div>
              <h1 className="text-2xl font-bold text-destructive">Database Reset Utility</h1>
              <p className="text-sm text-muted-foreground">
                ⚠️ Use ONLY for testing - This will delete ALL user data!
              </p>
            </div>
          </div>
        </Card>

        {/* Reset Options */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Full Reset */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Trash2 className="w-6 h-6 text-destructive" />
                <h2 className="text-xl font-semibold">Full Reset</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Deletes ALL data from database AND browser storage, then signs you out.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ Supabase database cleared</li>
                <li>✓ Browser storage cleared</li>
                <li>✓ User signed out</li>
                <li>✓ Page redirected to home</li>
              </ul>
              <Button
                onClick={handleFullReset}
                disabled={isResetting}
                className="w-full bg-destructive hover:bg-destructive/90 text-white"
              >
                {isResetting ? 'Resetting...' : 'Full Reset'}
              </Button>
            </div>
          </Card>

          {/* Quick Reset */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-6 h-6 text-orange-600" />
                <h2 className="text-xl font-semibold">Quick Reset</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Clears browser storage and signs you out. Database data remains.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ Browser storage cleared</li>
                <li>✓ User signed out</li>
                <li>✗ Database NOT cleared</li>
                <li>✓ Page redirected to home</li>
              </ul>
              <Button
                onClick={handleQuickReset}
                disabled={isResetting}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isResetting ? 'Resetting...' : 'Quick Reset'}
              </Button>
            </div>
          </Card>

          {/* Database Only */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Database className="w-6 h-6 text-violet" />
                <h2 className="text-xl font-semibold">Database Only</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Deletes all data from Supabase database only. Browser cache remains.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ Supabase database cleared</li>
                <li>✗ Browser storage NOT cleared</li>
                <li>✗ User NOT signed out</li>
                <li>✗ No redirect</li>
              </ul>
              <Button
                onClick={handleDatabaseReset}
                disabled={isResetting}
                className="w-full vibrant-button text-white"
              >
                {isResetting ? 'Deleting...' : 'Clear Database'}
              </Button>
            </div>
          </Card>

          {/* Browser Only */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <HardDrive className="w-6 h-6 text-aqua" />
                <h2 className="text-xl font-semibold">Browser Only</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Clears localStorage, sessionStorage, and IndexedDB. Database remains.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ Browser storage cleared</li>
                <li>✗ Database NOT cleared</li>
                <li>✗ User NOT signed out</li>
                <li>✓ Page reloads</li>
              </ul>
              <Button
                onClick={handleBrowserReset}
                disabled={isResetting}
                className="w-full aqua-button text-white"
              >
                {isResetting ? 'Clearing...' : 'Clear Browser'}
              </Button>
            </div>
          </Card>
        </div>

        {/* Logs */}
        {logs.length > 0 && (
          <Card className="p-6">
            <h3 className="font-semibold mb-3">Activity Log</h3>
            <div className="bg-ink/5 rounded-lg p-4 font-mono text-sm space-y-1 max-h-64 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className="text-ink/80">{log}</div>
              ))}
            </div>
          </Card>
        )}

        {/* Manual Instructions */}
        <Card className="p-6">
          <h3 className="font-semibold mb-3">Manual Browser Console Commands</h3>
          <div className="bg-ink/5 rounded-lg p-4 space-y-3">
            <div>
              <p className="text-sm font-medium mb-1">Full Reset:</p>
              <code className="text-xs bg-white p-2 rounded block">
                resetAllData()
              </code>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Quick Reset:</p>
              <code className="text-xs bg-white p-2 rounded block">
                quickReset()
              </code>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Database Only:</p>
              <code className="text-xs bg-white p-2 rounded block">
                deleteAllSupabaseData()
              </code>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Browser Only:</p>
              <code className="text-xs bg-white p-2 rounded block">
                clearAllBrowserStorage()
              </code>
            </div>
          </div>
        </Card>

        {/* Back Button */}
        <div className="flex justify-center">
          <Button
            onClick={() => window.location.href = '/'}
            variant="outline"
            disabled={isResetting}
          >
            ← Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
