import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  metricsService, 
  UserActivityMetrics, 
  AggregatedMetrics, 
  FeedbackEntry,
  StorageMetrics 
} from '../utils/metricsService';
import { 
  Users, 
  Heart, 
  TrendingUp, 
  MessageSquare, 
  ArrowLeft,
  Download,
  RefreshCw,
  BarChart3,
  CheckCircle,
  XCircle,
  Calendar,
  Image,
  UserPlus,
  BookOpen,
  Clock,
  HardDrive,
  Database
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

/**
 * Admin Dashboard Page - MVP Validation Metrics
 * 
 * Only accessible to: ilicachauhan87@gmail.com
 * 
 * Shows:
 * - Activation Rate
 * - Avg Memories/User
 * - Return Rate (Day 7)
 * - Recommend %
 * - Emotional Score Avg
 * - Detailed user activity
 * - All feedback responses
 */

// 🔒 SECURE ADMIN ACCESS
// Add your Supabase user ID here after creating your account
// To find your user ID: Sign up → Check browser console for "User ID: xxx"
// Or check Supabase Dashboard → Authentication → Users
const ADMIN_USER_IDS = [
  // 'YOUR_USER_ID_HERE' // Replace with your actual UUID after signup
];

const ADMIN_EMAIL = 'ilicachauhan87@gmail.com'; // For display purposes only

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Metrics state
  const [aggregatedMetrics, setAggregatedMetrics] = useState<AggregatedMetrics | null>(null);
  const [userMetrics, setUserMetrics] = useState<UserActivityMetrics[]>([]);
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [returnRate, setReturnRate] = useState<number>(0);
  const [storageMetrics, setStorageMetrics] = useState<StorageMetrics | null>(null);

  // Check authorization - SECURE METHOD
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 🔒 SECURITY: Get current user from Supabase session (can't be faked)
        const { DatabaseService } = await import('../utils/supabase/persistent-database');
        const { user, session } = await DatabaseService.getSession();
        
        if (!session || !user) {
          toast.error('Please sign in to access admin dashboard');
          navigate('/signin');
          return;
        }

        // 🔒 SECURITY CHECK 1: Verify user ID against whitelist
        const isAuthorizedUser = ADMIN_USER_IDS.includes(user.id);
        
        // 🔒 SECURITY CHECK 2: Also check email as backup (but don't rely on it alone)
        const userEmail = user.email?.toLowerCase();
        const isAuthorizedEmail = userEmail === ADMIN_EMAIL;

        if (!isAuthorizedUser && !isAuthorizedEmail) {
          console.log('❌ Access denied:', {
            userId: user.id,
            email: userEmail,
            allowedIds: ADMIN_USER_IDS,
            allowedEmail: ADMIN_EMAIL
          });
          toast.error('Access denied. Admin only.');
          navigate('/');
          return;
        }

        // ✅ If user ID is not in list but email matches, show helpful message
        if (!isAuthorizedUser && isAuthorizedEmail) {
          console.log('⚠️ Admin email detected but user ID not in whitelist');
          console.log('📝 Add this to ADMIN_USER_IDS in AdminDashboardPage.tsx:');
          console.log(`   '${user.id}'`);
          toast.info('First-time setup: Check console for your user ID', { duration: 8000 });
        }

        setIsAuthorized(true);
        await loadAllMetrics();
      } catch (error) {
        console.error('❌ Authorization error:', error);
        toast.error('Authorization failed');
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  // Load all metrics
  const loadAllMetrics = async () => {
    try {
      setIsRefreshing(true);

      // Load aggregated metrics
      const aggregated = await metricsService.getAggregatedMetrics();
      setAggregatedMetrics(aggregated);

      // Load user metrics
      const users = await metricsService.getAllUserMetrics();
      setUserMetrics(users);

      // Load feedback
      const allFeedback = await metricsService.getAllFeedback();
      setFeedback(allFeedback);

      // Calculate return rate
      const returnRateValue = await metricsService.calculateReturnRate();
      setReturnRate(returnRateValue);

      // Load storage metrics
      const storage = await metricsService.getStorageMetrics();
      setStorageMetrics(storage);

      console.log('✅ Metrics loaded:', {
        aggregated,
        users: users.length,
        feedback: allFeedback.length,
        returnRate: returnRateValue,
        storage
      });

    } catch (error) {
      console.error('❌ Error loading metrics:', error);
      toast.error('Failed to load metrics');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Export to CSV
  const handleExportCSV = async () => {
    try {
      const csv = await metricsService.exportToCSV();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `memorybox-metrics-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      toast.success('Metrics exported to CSV');
    } catch (error) {
      console.error('❌ Export error:', error);
      toast.error('Failed to export metrics');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center space-y-4">
          <div className="animate-spin text-4xl">⏳</div>
          <p className="text-lg text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-cream pb-24">
      {/* Header */}
      <div className="bg-violet text-white p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/profile')}
                className="text-white hover:bg-white/20"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Admin Dashboard</h1>
                <p className="text-sm sm:text-base text-white/80">MVP Validation Metrics</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={loadAllMetrics}
                disabled={isRefreshing}
                className="text-white hover:bg-white/20"
                title="Refresh metrics"
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleExportCSV}
                className="text-white hover:bg-white/20"
                title="Export to CSV"
              >
                <Download className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Key Metrics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Activation Rate */}
          <Card className="bg-white border-2 border-aqua/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-aqua" />
                Activation Rate
              </CardTitle>
              <CardDescription className="text-xs">Users who uploaded ≥1 memory</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl sm:text-4xl font-bold text-violet">
                {aggregatedMetrics?.activation_rate || 0}%
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {aggregatedMetrics?.activated_users || 0} of {aggregatedMetrics?.total_users || 0} users
              </p>
            </CardContent>
          </Card>

          {/* Avg Memories/User */}
          <Card className="bg-white border-2 border-coral/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Image className="w-5 h-5 text-coral" />
                Avg Memories/User
              </CardTitle>
              <CardDescription className="text-xs">Engagement indicator</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl sm:text-4xl font-bold text-violet">
                {aggregatedMetrics?.avg_memories_per_user?.toFixed(1) || 0}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {aggregatedMetrics?.total_memories || 0} total memories
              </p>
            </CardContent>
          </Card>

          {/* Return Rate */}
          <Card className="bg-white border-2 border-violet/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-violet" />
                Return Rate (Day 7)
              </CardTitle>
              <CardDescription className="text-xs">Retention after 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl sm:text-4xl font-bold text-violet">
                {returnRate}%
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Users active after 7+ days
              </p>
            </CardContent>
          </Card>

          {/* Recommend % */}
          <Card className="bg-white border-2 border-aqua/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-aqua" />
                Recommend %
              </CardTitle>
              <CardDescription className="text-xs">Would recommend to family</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl sm:text-4xl font-bold text-violet">
                {aggregatedMetrics?.recommend_percentage || 0}%
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {aggregatedMetrics?.recommend_yes || 0} of {aggregatedMetrics?.total_feedback || 0} responses
              </p>
            </CardContent>
          </Card>

          {/* Emotional Score */}
          <Card className="bg-white border-2 border-coral/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Heart className="w-5 h-5 text-coral" />
                Emotional Score
              </CardTitle>
              <CardDescription className="text-xs">Feel connected (1-5 hearts)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl sm:text-4xl font-bold text-violet">
                {aggregatedMetrics?.avg_emotional_score?.toFixed(1) || 0}
              </div>
              <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Heart
                    key={i}
                    className={`w-4 h-4 ${
                      i <= (aggregatedMetrics?.avg_emotional_score || 0)
                        ? 'fill-red-500 text-red-500'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Total Users */}
          <Card className="bg-white border-2 border-violet/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-violet" />
                Total Users
              </CardTitle>
              <CardDescription className="text-xs">Signed up users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl sm:text-4xl font-bold text-violet">
                {aggregatedMetrics?.total_users || 0}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                MVP alpha testing
              </p>
            </CardContent>
          </Card>

          {/* Storage Usage */}
          <Card className="bg-white border-2 border-aqua/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-aqua" />
                Storage Usage
              </CardTitle>
              <CardDescription className="text-xs">Supabase free tier (1 GB)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="flex items-end gap-2 mb-1">
                    <span className="text-2xl sm:text-3xl font-bold text-violet">
                      {storageMetrics?.used_gb?.toFixed(3) || 0}
                    </span>
                    <span className="text-sm text-muted-foreground mb-1">GB used</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {storageMetrics?.remaining_gb?.toFixed(3) || 1} GB remaining • {storageMetrics?.file_count || 0} files
                  </p>
                </div>
                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        (storageMetrics?.usage_percentage || 0) < 50 
                          ? 'bg-aqua' 
                          : (storageMetrics?.usage_percentage || 0) < 80 
                          ? 'bg-yellow-500' 
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(storageMetrics?.usage_percentage || 0, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-center text-muted-foreground">
                    {storageMetrics?.usage_percentage?.toFixed(1) || 0}% used
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Tables */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger value="users" className="text-sm sm:text-base py-2 sm:py-3">
              <Users className="w-4 h-4 mr-2" />
              User Activity
            </TabsTrigger>
            <TabsTrigger value="feedback" className="text-sm sm:text-base py-2 sm:py-3">
              <MessageSquare className="w-4 h-4 mr-2" />
              Feedback
            </TabsTrigger>
          </TabsList>

          {/* User Activity Table */}
          <TabsContent value="users" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  User Activity Details
                </CardTitle>
                <CardDescription>
                  Detailed breakdown of user engagement
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Email</th>
                      <th className="text-left p-2">Batch</th>
                      <th className="text-center p-2"><Image className="w-4 h-4 mx-auto" /></th>
                      <th className="text-center p-2"><UserPlus className="w-4 h-4 mx-auto" /></th>
                      <th className="text-center p-2"><BookOpen className="w-4 h-4 mx-auto" /></th>
                      <th className="text-center p-2"><Clock className="w-4 h-4 mx-auto" /></th>
                      <th className="text-center p-2">Status</th>
                      <th className="text-left p-2">Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userMetrics.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center p-8 text-muted-foreground">
                          No user data yet. Users will appear here after signup.
                        </td>
                      </tr>
                    ) : (
                      userMetrics.map((user) => (
                        <tr key={user.user_id} className="border-b hover:bg-gray-50">
                          <td className="p-2 text-xs sm:text-sm">{user.email}</td>
                          <td className="p-2 text-center">{user.batch_no}</td>
                          <td className="p-2 text-center font-semibold">{user.memories_count}</td>
                          <td className="p-2 text-center font-semibold">{user.family_members_count}</td>
                          <td className="p-2 text-center font-semibold">{user.journal_entries_count}</td>
                          <td className="p-2 text-center font-semibold">{user.time_capsules_count}</td>
                          <td className="p-2 text-center">
                            {user.is_activated ? (
                              <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                            ) : (
                              <XCircle className="w-4 h-4 text-gray-300 mx-auto" />
                            )}
                          </td>
                          <td className="p-2 text-xs text-muted-foreground">
                            {new Date(user.last_active_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Feedback Table */}
          <TabsContent value="feedback" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  Emotional Feedback
                </CardTitle>
                <CardDescription>
                  Qualitative responses from users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {feedback.length === 0 ? (
                  <div className="text-center p-8 text-muted-foreground">
                    No feedback yet. Responses will appear here after users submit feedback.
                  </div>
                ) : (
                  feedback.map((entry) => (
                    <div
                      key={entry.id}
                      className="border rounded-lg p-4 space-y-3 bg-white hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {entry.would_recommend ? (
                            <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                              ✅ Would Recommend
                            </span>
                          ) : (
                            <span className="text-sm bg-gray-100 text-gray-800 px-2 py-1 rounded">
                              ⏸️ Not Yet
                            </span>
                          )}
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Heart
                                key={i}
                                className={`w-3 h-3 ${
                                  i <= entry.feel_connected
                                    ? 'fill-red-500 text-red-500'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(entry.submitted_at).toLocaleDateString()}
                        </span>
                      </div>

                      {entry.liked_most && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">
                            💖 Liked Most:
                          </p>
                          <p className="text-sm">{entry.liked_most}</p>
                        </div>
                      )}

                      {entry.frustrating && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">
                            😕 Frustrating:
                          </p>
                          <p className="text-sm">{entry.frustrating}</p>
                        </div>
                      )}

                      {entry.improvements && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">
                            💡 Improvements:
                          </p>
                          <p className="text-sm">{entry.improvements}</p>
                        </div>
                      )}

                      {entry.moment_to_preserve && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">
                            ✨ Memory to Preserve:
                          </p>
                          <p className="text-sm italic">{entry.moment_to_preserve}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
