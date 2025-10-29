import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { CheckCircle, AlertCircle, Lock, Loader2, Mail } from 'lucide-react';
import { getSupabaseClient } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

/**
 * Password Reset Callback Page
 * 
 * This intermediate confirmation page prevents Safari email link prefetch issues.
 * When user clicks reset link in email, they land here and must click a button
 * to proceed. This prevents the token from being consumed by email preview.
 */
export function PasswordResetCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string>('');
  const [hasToken, setHasToken] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [showResendForm, setShowResendForm] = useState(false);

  useEffect(() => {
    // Check if we have a token in the URL
    const hashParams = new URLSearchParams(location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');
    
    // Check for errors from Supabase (token expired/invalid)
    const errorParam = hashParams.get('error');
    const errorCode = hashParams.get('error_code');
    const errorDescription = hashParams.get('error_description');
    
    // Also check query params (some email clients may use this)
    const queryParams = new URLSearchParams(location.search);
    const tokenHash = queryParams.get('token_hash') || queryParams.get('token');
    
    // 🔍 Handle Supabase errors (expired/invalid tokens)
    if (errorParam) {
      console.error('❌ Supabase Auth Error:', {
        error: errorParam,
        code: errorCode,
        description: errorDescription
      });
      
      if (errorCode === 'otp_expired') {
        setError('This password reset link has expired. Password reset links are only valid for 1 hour for security. Please request a new one below.');
      } else if (errorParam === 'access_denied') {
        setError('This password reset link is invalid or has already been used. Please request a new one below.');
      } else {
        setError(`${errorDescription || 'Invalid password reset link'}. Please request a new one below.`);
      }
      return;
    }
    
    // Check if we have a valid token
    if ((accessToken && type === 'recovery') || tokenHash) {
      setHasToken(true);
      console.log('✅ Password reset token detected');
    } else {
      setError('Invalid or expired password reset link. Please request a new one below.');
      console.error('❌ No valid token found in URL');
    }
  }, [location]);

  const handleContinue = async () => {
    setIsVerifying(true);
    setError('');

    try {
      // 🔐 PRODUCTION-GRADE: Server-side token verification (Safari compatible)
      // Extract token_hash from URL params
      const hashParams = new URLSearchParams(location.hash.substring(1));
      const queryParams = new URLSearchParams(location.search);
      
      const tokenHash = hashParams.get('token_hash') || queryParams.get('token_hash') || queryParams.get('token');
      const type = hashParams.get('type') || queryParams.get('type') || 'recovery';
      
      if (!tokenHash) {
        throw new Error('Missing token in URL. Please try requesting a new reset link.');
      }
      
      console.log('🔐 Verifying token via server endpoint...');
      console.log('   Token hash:', tokenHash.substring(0, 20) + '...');
      console.log('   Type:', type);
      
      // Call server endpoint to verify token and create session
      const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-48a3bd07/auth/verify-reset-token`;
      
      const response = await fetch(serverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          token_hash: tokenHash,
          type: type
        })
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        console.error('❌ Server verification failed:', data);
        throw new Error(data.error || 'Token verification failed');
      }
      
      console.log('✅ Server verification successful');
      console.log('   User ID:', data.user?.id);
      console.log('   Email:', data.user?.email);
      
      // 🔐 Store session in Supabase client for password update
      const supabase = getSupabaseClient();
      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      });
      
      if (setSessionError) {
        console.error('⚠️ Warning: Could not set session in client:', setSessionError.message);
        // Continue anyway - server session is what matters
      } else {
        console.log('✅ Session set in Supabase client');
      }
      
      // Also store session in localStorage for UpdatePasswordPage
      localStorage.setItem('password_reset_session', JSON.stringify(data.session));
      localStorage.setItem('password_reset_user', JSON.stringify(data.user));
      
      console.log('✅ Session verified and stored, proceeding to password update');
      
      // Navigate to update password page
      navigate('/update-password', { replace: true });
      
    } catch (err: any) {
      console.error('❌ Verification error:', err);
      setError(err.message || 'Verification failed. Please request a new reset link.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendResetLink = async () => {
    if (!resendEmail || !resendEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsResending(true);

    try {
      const supabase = getSupabaseClient();
      
      // Detect environment for redirect URL
      const isProduction = window.location.hostname !== 'localhost' && 
                          !window.location.hostname.includes('127.0.0.1') &&
                          !window.location.hostname.includes('figma');
      
      const redirectUrl = isProduction 
        ? `${window.location.origin}/auth/callback`
        : `http://localhost:3000/auth/callback`;
      
      console.log('🔐 Resending password reset email to:', resendEmail);
      console.log('🔗 Redirect URL:', redirectUrl);

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(resendEmail, {
        redirectTo: redirectUrl
      });

      if (resetError) {
        throw resetError;
      }

      console.log('✅ Password reset email resent successfully');
      toast.success('New password reset email sent! Check your inbox.');
      setShowResendForm(false);
      setResendEmail('');
      
    } catch (err: any) {
      console.error('❌ Resend reset email error:', err);
      toast.error(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-violet/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-violet" />
          </div>
          <CardTitle className="text-2xl">Reset Your Password</CardTitle>
          <CardDescription>
            Click the button below to continue with your password reset
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>

              {!showResendForm ? (
                <Button
                  onClick={() => setShowResendForm(true)}
                  className="w-full bg-coral hover:bg-coral/90 text-white h-12"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Request New Reset Link
                </Button>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="resend-email" className="text-sm text-ink/70 mb-1 block">
                      Enter your email address
                    </Label>
                    <Input
                      id="resend-email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      disabled={isResending}
                      className="h-11"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={handleResendResetLink}
                      disabled={isResending}
                      className="flex-1 bg-violet hover:bg-violet/90 text-white h-11"
                    >
                      {isResending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          Send Reset Link
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowResendForm(false);
                        setResendEmail('');
                      }}
                      disabled={isResending}
                      className="px-4"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {hasToken && !error && (
            <>
              <Alert className="bg-aqua/10 border-aqua">
                <CheckCircle className="h-4 w-4 text-aqua" />
                <AlertDescription className="text-ink">
                  Your password reset link is valid. Click continue to set a new password.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleContinue}
                disabled={isVerifying}
                className="w-full bg-violet hover:bg-violet/90 text-white h-12"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Continue to Reset Password'
                )}
              </Button>
            </>
          )}

          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => navigate('/', { replace: true })}
              className="text-violet"
            >
              Back to Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
