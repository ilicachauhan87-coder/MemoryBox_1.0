import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { CheckCircle, AlertCircle, Lock, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { getSupabaseClient } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';

/**
 * Password Reset Landing Page - SAFE from Email Prefetchers
 * 
 * This page implements Supabase's recommended solution for preventing
 * email preview/security scanners from consuming one-time password reset tokens.
 * 
 * Flow:
 * 1. User clicks link in email → Lands on this page
 * 2. Email prefetcher fetches HTML but doesn't click buttons
 * 3. User sees "Continue to Reset Password" button
 * 4. User clicks button → Token is verified
 * 5. User is redirected to password update page
 * 
 * This prevents the token from being consumed before user interaction.
 */
export function PasswordResetLandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string>('');
  const [token, setToken] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [showResendForm, setShowResendForm] = useState(false);

  useEffect(() => {
    // 🔍 ENHANCED DEBUGGING
    console.log('🔍 Password Reset Landing Page - URL Analysis:');
    console.log('   Full URL:', window.location.href);
    console.log('   Hash:', window.location.hash);
    console.log('   Search params:', location.search);
    
    // APPROACH 1: Check if we have a redirect parameter (from email)
    const queryParams = new URLSearchParams(location.search);
    const redirectUrl = queryParams.get('redirect');
    
    if (redirectUrl) {
      // Extract access_token from the confirmation URL
      console.log('   Redirect URL found:', redirectUrl);
      const url = new URL(redirectUrl);
      const hashParams = new URLSearchParams(url.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const typeParam = hashParams.get('type');
      
      console.log('   Parsed from redirect:', {
        access_token: accessToken ? 'PRESENT' : 'MISSING',
        type: typeParam
      });
      
      if (accessToken && typeParam === 'recovery') {
        setToken(accessToken);
        console.log('✅ Password reset token extracted from redirect URL');
        return;
      }
    }
    
    // APPROACH 2: Check for direct hash fragment (if Supabase redirected here)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const typeParam = hashParams.get('type');
    
    console.log('   Parsed Hash Params:', {
      access_token: accessToken ? 'PRESENT' : 'MISSING',
      type: typeParam
    });
    
    if (accessToken && typeParam === 'recovery') {
      // Store token in memory (NOT calling verify yet)
      // This prevents email prefetchers from consuming it
      setToken(accessToken);
      console.log('✅ Password reset token detected and stored (not verified yet)');
    } else if (!accessToken && !redirectUrl) {
      setError('No password reset token found in URL. Please use the link from your email.');
      console.error('❌ No access_token found in hash fragment or redirect parameter');
    } else if (typeParam && typeParam !== 'recovery') {
      setError(`Invalid token type: ${typeParam}. Expected 'recovery'.`);
      console.error('❌ Invalid token type:', typeParam);
    }
  }, [location]);

  const handleContinueToReset = async () => {
    if (!token) {
      setError('No token available. Please use the link from your email.');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      console.log('🔐 Verifying password reset token...');
      
      const supabase = getSupabaseClient();
      
      // Set the session using the access token from the hash
      // This consumes the token and creates an authenticated session
      const { data, error: verifyError } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: '' // Not needed for password recovery
      });

      if (verifyError) {
        console.error('❌ Token verification failed:', verifyError);
        
        // Parse error for specific messages
        if (verifyError.message.includes('expired')) {
          setError('This password reset link has expired. Password reset links are only valid for 1 hour for security. Please request a new one below.');
        } else if (verifyError.message.includes('invalid') || verifyError.message.includes('not found')) {
          setError('This password reset link is invalid or has already been used. Please request a new one below.');
        } else {
          setError(`Verification failed: ${verifyError.message}. Please request a new link below.`);
        }
        return;
      }

      if (data?.session) {
        console.log('✅ Token verified successfully! Session created.');
        toast.success('Password reset link verified! Set your new password.');
        
        // Redirect to password update page
        navigate('/update-password');
      } else {
        console.error('❌ No session created after verification');
        setError('Verification succeeded but no session was created. Please try requesting a new reset link.');
      }
    } catch (err: any) {
      console.error('❌ Verification error:', err);
      setError(`An unexpected error occurred: ${err.message}. Please try again.`);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRequestNewLink = async () => {
    if (!resendEmail.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resendEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsResending(true);

    try {
      const supabase = getSupabaseClient();
      
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        resendEmail,
        {
          redirectTo: `${window.location.origin}/auth/reset-password`
        }
      );

      if (resetError) {
        console.error('❌ Failed to send reset email:', resetError);
        toast.error(`Failed to send reset email: ${resetError.message}`);
      } else {
        console.log('✅ New password reset email sent');
        toast.success('New password reset email sent! Check your inbox.');
        setShowResendForm(false);
        setResendEmail('');
      }
    } catch (err: any) {
      console.error('❌ Unexpected error sending reset email:', err);
      toast.error(`Unexpected error: ${err.message}`);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCDC] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-[#6A0572] rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl" style={{ color: '#6A0572' }}>
            Reset Your Password
          </CardTitle>
          <CardDescription>
            {token && !error ? (
              'Click the button below to continue with your password reset'
            ) : (
              'Verify your password reset request'
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Success state: Token present and valid */}
          {token && !error && (
            <>
              <Alert className="border-[#17BEBB] bg-[#17BEBB]/10">
                <ShieldCheck className="h-5 w-5 text-[#17BEBB]" />
                <AlertDescription className="text-[#22223B]">
                  Your password reset link is ready. Click the button below to verify and continue.
                  <div className="mt-2 text-sm opacity-75">
                    This extra step prevents automated email scanners from consuming your reset link.
                  </div>
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleContinueToReset}
                disabled={isVerifying}
                className="w-full h-12 text-base"
                style={{
                  backgroundColor: '#6A0572',
                  color: 'white'
                }}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Continue to Reset Password
                  </>
                )}
              </Button>
            </>
          )}

          {/* Error state */}
          {error && (
            <>
              <Alert variant="destructive">
                <AlertCircle className="h-5 w-5" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>

              {/* Resend form */}
              {!showResendForm ? (
                <Button
                  onClick={() => setShowResendForm(true)}
                  variant="outline"
                  className="w-full h-12 text-base border-[#6A0572] text-[#6A0572] hover:bg-[#6A0572]/10"
                >
                  <Mail className="mr-2 h-5 w-5" />
                  Request New Reset Link
                </Button>
              ) : (
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <Label htmlFor="resend-email" className="text-[#22223B]">
                      Email Address
                    </Label>
                    <Input
                      id="resend-email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleRequestNewLink();
                        }
                      }}
                      className="mt-1"
                      disabled={isResending}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleRequestNewLink}
                      disabled={isResending}
                      className="flex-1 h-10"
                      style={{
                        backgroundColor: '#6A0572',
                        color: 'white'
                      }}
                    >
                      {isResending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send Reset Link'
                      )}
                    </Button>
                    <Button
                      onClick={() => {
                        setShowResendForm(false);
                        setResendEmail('');
                      }}
                      variant="outline"
                      className="flex-1 h-10"
                      disabled={isResending}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Back to sign in link */}
          <div className="text-center pt-4 border-t">
            <Button
              variant="ghost"
              onClick={() => navigate('/signin')}
              className="text-[#6A0572] hover:text-[#6A0572]/80"
            >
              Back to Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
