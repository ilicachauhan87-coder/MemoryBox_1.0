import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { getSupabaseClient } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';

/**
 * Update Password Page
 * 
 * Final step in password reset flow where user enters their new password.
 * Called after successful token verification in PasswordResetCallback.
 */
export function UpdatePasswordPage() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);

  const validatePassword = (): string | null => {
    if (!newPassword) return 'Password is required';
    if (newPassword.length < 6) return 'Password must be at least 6 characters';
    if (!confirmPassword) return 'Please confirm your password';
    if (newPassword !== confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validatePassword();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const supabase = getSupabaseClient();
      
      // 🔐 PRODUCTION-GRADE: Use server-created session if available
      console.log('🔐 Updating password with server-verified session...');
      
      // Check if we have a stored session from the server verification
      const storedSession = localStorage.getItem('password_reset_session');
      const storedUser = localStorage.getItem('password_reset_user');
      
      if (storedSession && storedUser) {
        console.log('✅ Using server-verified session');
        const sessionData = JSON.parse(storedSession);
        const userData = JSON.parse(storedUser);
        
        console.log('   User ID:', userData.id);
        console.log('   Email:', userData.email);
        
        // Ensure session is set in Supabase client
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token
        });
        
        if (setSessionError) {
          console.warn('⚠️ Could not set session from stored data:', setSessionError.message);
          // Try to get current session as fallback
          const { data: currentSession } = await supabase.auth.getSession();
          if (!currentSession.session) {
            throw new Error('No valid session found. Please request a new password reset link.');
          }
        }
      } else {
        console.log('ℹ️ No stored session, checking current session...');
        // Verify we have a current session
        const { data: currentSession } = await supabase.auth.getSession();
        if (!currentSession.session) {
          throw new Error('No valid session found. Please request a new password reset link.');
        }
      }

      // Update the user's password
      console.log('🔐 Calling updateUser...');
      const { data, error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        console.error('❌ updateUser error:', updateError);
        throw updateError;
      }

      console.log('✅ Password updated successfully');
      console.log('   User ID:', data.user?.id);
      
      // Clean up stored session data
      localStorage.removeItem('password_reset_session');
      localStorage.removeItem('password_reset_user');
      
      setSuccess(true);
      toast.success('Password updated successfully!');

      // Wait 2 seconds then redirect to sign in
      setTimeout(() => {
        navigate('/signin', { replace: true });
      }, 2000);

    } catch (err: any) {
      console.error('❌ Password update error:', err);
      
      // Handle specific errors
      if (err.message?.includes('session')) {
        setError('Your session has expired. Please request a new password reset link.');
      } else if (err.message?.includes('same password')) {
        setError('New password must be different from your old password.');
      } else if (err.message?.includes('No valid session')) {
        setError(err.message);
      } else {
        setError(err.message || 'Failed to update password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-aqua/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-aqua" />
            </div>
            <CardTitle className="text-2xl">Password Updated!</CardTitle>
            <CardDescription>
              Your password has been successfully updated. Redirecting to sign in...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-violet/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-violet" />
          </div>
          <CardTitle className="text-2xl">Set New Password</CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min. 6 characters)"
                  className="h-12 pr-12"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/60 hover:text-ink"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="h-12 pr-12"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/60 hover:text-ink"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="text-sm text-ink/60 space-y-1">
              <p className="font-medium">Password must be:</p>
              <ul className="list-disc list-inside space-y-1">
                <li className={newPassword.length >= 6 ? 'text-aqua' : ''}>
                  At least 6 characters long
                </li>
                <li className={newPassword && confirmPassword && newPassword === confirmPassword ? 'text-aqua' : ''}>
                  Match in both fields
                </li>
              </ul>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-violet hover:bg-violet/90 text-white h-12"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Password...
                </>
              ) : (
                'Update Password'
              )}
            </Button>

            {/* Back Button */}
            <div className="text-center">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/', { replace: true })}
                className="text-violet"
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
