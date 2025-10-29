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
    
    // Parse query parameters for Supabase password recovery token
    const queryParams = new URLSearchParams(location.search);
    const tokenParam = queryParams.get('token'); // Long token hash (correct for magic links)
    const codeParam = queryParams.get('code'); // 6-digit OTP (wrong for magic links)
    const typeParam = queryParams.get('type');
    
    console.log('   Parsed Query Params:', {
      token: tokenParam ? `PRESENT (${tokenParam.length} chars)` : 'MISSING',
      code: codeParam ? `PRESENT (${codeParam.length} chars - ${codeParam.length === 6 ? 'OTP FORMAT ❌' : 'TOKEN HASH ✅'})` : 'MISSING',
      type: typeParam
    });
    
    // Prefer token over code (token is the long hash for magic links)
    const recoveryToken = tokenParam || codeParam;
    
    // Warn if we got a 6-digit OTP instead of token hash
    if (codeParam && codeParam.length === 6 && !tokenParam) {
      console.warn('⚠️ Received 6-digit OTP instead of token hash!');
      console.warn('   Email template is using {{ .Token }} instead of {{ .TokenHash }}');
      console.warn('   This will fail during verification.');
    }
    
    // APPROACH 1: Check for query parameter token (?code=xxx or ?token=xxx)
    if (recoveryToken && typeParam === 'recovery') {
      // Store token in memory (NOT calling verify yet)
      // This prevents email prefetchers from consuming it
      setToken(recoveryToken);
      console.log('✅ Password reset token detected in query params (not verified yet)');
      return;
    }
    
    // APPROACH 2: Check for hash fragment (if Supabase used old format)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const hashType = hashParams.get('type');
    
    console.log('   Parsed Hash Params:', {
      access_token: accessToken ? 'PRESENT' : 'MISSING',
      type: hashType
    });
    
    if (accessToken && hashType === 'recovery') {
      setToken(accessToken);
      console.log('✅ Password reset token detected in hash fragment (not verified yet)');
      return;
    }
    
    // APPROACH 3: Check if we have a redirect parameter (from custom email template)
    const redirectUrl = queryParams.get('redirect');
    if (redirectUrl) {
      try {
        console.log('   Redirect URL found:', redirectUrl);
        const url = new URL(redirectUrl);
        const redirectHashParams = new URLSearchParams(url.hash.substring(1));
        const redirectAccessToken = redirectHashParams.get('access_token');
        const redirectType = redirectHashParams.get('type');
        
        console.log('   Parsed from redirect:', {
          access_token: redirectAccessToken ? 'PRESENT' : 'MISSING',
          type: redirectType
        });
        
        if (redirectAccessToken && redirectType === 'recovery') {
          setToken(redirectAccessToken);
          console.log('✅ Password reset token extracted from redirect URL');
          return;
        }
      } catch (e) {
        console.error('❌ Error parsing redirect URL:', e);
      }
    }
    
    // NO TOKEN FOUND
    if (!recoveryToken && !accessToken && !redirectUrl) {
      setError('No password reset token found in URL. Please use the link from your email.');
      console.error('❌ No token found in query params, hash, or redirect');
    } else if (typeParam && typeParam !== 'recovery' && hashType && hashType !== 'recovery') {
      setError(`Invalid token type. Expected 'recovery'.`);
      console.error('❌ Invalid token type');
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
      
      // Verify the OTP/recovery token and exchange it for a session
      // This uses Supabase's verifyOtp for password recovery flow
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'recovery'
      });

      if (verifyError) {
        console.error('❌ Token verification failed:', verifyError);
        console.error('   Error details:', {
          message: verifyError.message,
          status: verifyError.status,
          tokenLength: token?.length
        });
        
        // Check if this is a 6-digit OTP (wrong format)
        if (token && token.length === 6) {
          setError('Your password reset email is using an outdated format (6-digit code instead of secure token). Please contact support or request a new link after the email template is updated.');
          console.error('❌ DIAGNOSIS: Email template is using {{ .Token }} (6-digit OTP) instead of {{ .TokenHash }} (long token)');
        } 
        // Parse error for specific messages
        else if (verifyError.message.includes('expired')) {
          setError('This password reset link has expired. Password reset links are only valid for 1 hour for security. Please request a new one below.');
        } else if (verifyError.message.includes('invalid') || verifyError.message.includes('not found')) {
          setError('This password reset link is invalid or has already been used. Please request a new one below.');
        } else {
          setError(`Verification failed: ${verifyError.message}. Please request a new link below.`);
        }
        setShowResendForm(true);
        return;
      }

      if (data?.session) {
        console.log('✅ Token verified successfully! Session created.');
        console.log('   Session user ID:', data.session.user.id);
        console.log('   Session expires:', data.session.expires_at);
        toast.success('Password reset link verified! Set your new password.');
        
        // Redirect to password update page
        navigate('/update-password');
      } else {
        console.error('❌ No session created after verification');
        setError('Verification succeeded but no session was created. Please try requesting a new reset link.');
        setShowResendForm(true);
      }
    } catch (err: any) {
      console.error('❌ Verification error:', err);
      setError(`An unexpected error occurred: ${err.message}. Please try again.`);
      setShowResendForm(true);
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
