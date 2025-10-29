import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { ArrowLeft, Mail, Phone, Eye, EyeOff, Sparkles, Shield, Clock, CheckCircle, AlertCircle, Heart, TreePine, UserPlus, Loader2 } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { getSupabaseClient } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';

interface SignInPageProps {
  onSignIn: (userData?: any) => void;
  onBack: () => void;
  mode?: 'signup' | 'signin';
}

export function SignInPage({ onSignIn, onBack, mode = 'signup' }: SignInPageProps) {
  const [activeTab, setActiveTab] = useState<'email' | 'mobile'>('email');
  const [isSignUp, setIsSignUp] = useState(mode === 'signup');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  // Password reset state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Email form state
  const [emailForm, setEmailForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  });

  // Mobile form state
  const [mobileForm, setMobileForm] = useState({
    phone: '',
    otp: '',
    name: ''
  });

  // Set mode from props
  useEffect(() => {
    setIsSignUp(mode === 'signup');
  }, [mode]);

  // ❌ REMOVED: Demo user creation - was causing conflicts with real admin account
  // No demo users are created anymore - all users must sign up through Supabase Auth

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Mock storage for registered users
  const getRegisteredUsers = () => {
    const stored = localStorage.getItem('familyVault_registeredUsers');
    return stored ? JSON.parse(stored) : [];
  };

  const saveRegisteredUser = (user: any) => {
    const users = getRegisteredUsers();
    // Check if user already exists to avoid duplicates
    const existingIndex = users.findIndex((u: any) => u.id === user.id || u.email === user.email);
    if (existingIndex >= 0) {
      // Update existing user
      users[existingIndex] = user;
    } else {
      // Add new user
      users.push(user);
    }
    localStorage.setItem('familyVault_registeredUsers', JSON.stringify(users));
  };

  const findUserByEmail = (email: string) => {
    const users = getRegisteredUsers();
    return users.find((user: any) => user.email === email);
  };

  const findUserByPhone = (phone: string) => {
    const users = getRegisteredUsers();
    return users.find((user: any) => user.phone === phone);
  };
  
  // 🆕 NEW: Remove a stuck account from local storage
  const removeUserByEmail = (email: string) => {
    const users = getRegisteredUsers();
    const filteredUsers = users.filter((user: any) => user.email !== email);
    localStorage.setItem('familyVault_registeredUsers', JSON.stringify(filteredUsers));
    console.log(`🗑️ Removed stuck account for ${email} from local storage`);
  };

  // Validate email form
  const validateEmailForm = () => {
    if (!emailForm.email) return 'Email is required';
    if (!emailForm.email.includes('@')) return 'Please enter a valid email';
    if (!emailForm.password) return 'Password is required';
    if (emailForm.password.length < 6) return 'Password must be at least 6 characters';
    if (isSignUp) {
      if (!emailForm.name) return 'Name is required';
      if (emailForm.password !== emailForm.confirmPassword) return 'Passwords do not match';
      
      // 🔧 FIX: Skip localStorage check - let Supabase handle duplicate detection
      // If user exists in localStorage (like demo user), we'll clear it during signup
      // This allows admin to create real account even if demo user exists
    }
    return null;
  };

  // Validate mobile form
  const validateMobileForm = () => {
    if (!mobileForm.phone) return 'Mobile number is required';
    if (mobileForm.phone.length < 10) return 'Please enter a valid mobile number';
    if (otpSent && !mobileForm.otp) return 'OTP is required';
    if (otpSent && mobileForm.otp.length !== 6) return 'OTP must be 6 digits';
    if (isSignUp && !mobileForm.name) return 'Name is required';
    
    if (isSignUp) {
      if (findUserByPhone(mobileForm.phone)) {
        return 'An account with this mobile number already exists. Please sign in instead.';
      }
    } else {
      if (!findUserByPhone(mobileForm.phone)) {
        return 'No account found with this mobile number. Please sign up first.';
      }
    }
    return null;
  };

  // Handle forgot password
  const handleForgotPassword = async () => {
    if (!resetEmail) {
      setError('Please enter your email address');
      return;
    }
    
    if (!resetEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsResetting(true);
    setError('');

    try {
      const supabase = getSupabaseClient();
      
      // Detect environment for redirect URL
      const isProduction = window.location.hostname !== 'localhost' && 
                          !window.location.hostname.includes('127.0.0.1') &&
                          !window.location.hostname.includes('figma');
      
      const redirectUrl = isProduction 
        ? `${window.location.origin}/auth/callback` // Production URL
        : `http://localhost:3000/auth/callback`; // Local dev URL
      
      console.log('🔐 Sending password reset email to:', resetEmail);
      console.log('🔗 Redirect URL:', redirectUrl);

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: redirectUrl
      });

      if (resetError) {
        throw resetError;
      }

      console.log('✅ Password reset email sent successfully');
      setResetSuccess(true);
      toast.success('Password reset email sent! Check your inbox.');
      
      // Close dialog after 3 seconds
      setTimeout(() => {
        setShowForgotPassword(false);
        setResetSuccess(false);
        setResetEmail('');
      }, 3000);

    } catch (err: any) {
      console.error('❌ Password reset error:', err);
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  // Handle email authentication
  const handleEmailAuth = async () => {
    const validationError = validateEmailForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (isSignUp) {
        // 🚀 NEW: Use Supabase Auth directly (simpler, no backend needed)
        console.log('🔐 Attempting signup with Supabase Auth...');
        
        // 🔧 FIX: Clear any existing localStorage user for this email (e.g., demo user)
        // This allows admin to create real account even if demo user exists
        const existingLocalUser = findUserByEmail(emailForm.email);
        if (existingLocalUser) {
          console.log('🗑️ Clearing existing localStorage user for:', emailForm.email);
          removeUserByEmail(emailForm.email);
        }
        
        let userData: any = null;
        let supabaseSuccess = false;
        
        // Try Supabase Auth signup first
        try {
          const supabase = getSupabaseClient();
          
          console.log('📝 Creating Supabase account:', { email: emailForm.email });
          
          // 🔧 FIX: Detect production vs local environment
          const isProduction = window.location.hostname !== 'localhost' && 
                              !window.location.hostname.includes('127.0.0.1') &&
                              !window.location.hostname.includes('figma');
          
          const redirectUrl = isProduction 
            ? `${window.location.origin}/` // Production URL
            : undefined; // Let Supabase use default for local dev
          
          console.log('🌐 Environment:', isProduction ? 'Production' : 'Local/Figma');
          console.log('🔗 Email redirect URL:', redirectUrl || 'default (Supabase settings)');
          
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: emailForm.email,
            password: emailForm.password,
            options: {
              data: {
                name: emailForm.name,
                display_name: emailForm.name
              },
              // 🚀 CRITICAL: Use production URL for email confirmation links
              emailRedirectTo: redirectUrl
            }
          });
          
          if (authError) {
            // ✅ FIX: Handle specific Supabase errors gracefully
            console.log('⚠️ Supabase signup error:', authError.message);
            
            // Handle "User already registered" error
            if (authError.message.includes('already registered') || authError.message.includes('User already exists')) {
              console.log('ℹ️ Email already registered, switching to sign-in mode');
              setError('This email is already registered. Please sign in instead or use a different email.');
              setIsSignUp(false); // Switch to sign-in mode
              setIsLoading(false);
              return;
            }
            
            // Handle email confirmation errors
            if (authError.message.includes('Email not confirmed')) {
              setError('Please check your email and confirm your account before signing in.');
              setIsLoading(false);
              return;
            }
            
            // Handle rate limiting
            if (authError.message.includes('rate limit') || authError.message.includes('too many requests')) {
              setError('Too many signup attempts. Please wait a few minutes and try again.');
              setIsLoading(false);
              return;
            }
            
            // Generic error fallback
            console.error('❌ Unhandled Supabase error:', authError);
            throw authError;
          }
          
          if (!authData.user) {
            throw new Error('No user data returned from Supabase');
          }
          
          console.log('✅ Supabase account created!', authData.user.id);
          
          // 🔧 CRITICAL FIX: Create FAMILY FIRST in database before creating user
          // This prevents foreign key constraint violation
          let familyId: string;
          let familyData: any;
          
          // Try to create family in database first
          try {
            const { DatabaseService } = await import('../utils/supabase/persistent-database');
            const createdFamily = await DatabaseService.createFamily({
              name: `${emailForm.name}'s Family`,
              created_by: authData.user.id
            });
            
            familyId = createdFamily.id;
            familyData = {
              ...createdFamily,
              members: [authData.user.id]
            };
            
            console.log('✅ Family created in database with ID:', familyId);
          } catch (dbError) {
            console.warn('⚠️ Failed to create family in database, using localStorage fallback:', dbError);
            
            // Fallback: Generate UUID for localStorage-only mode
            familyId = crypto.randomUUID();
            familyData = {
              id: familyId,
              name: `${emailForm.name}'s Family`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              created_by: authData.user.id,
              members: [authData.user.id]
            };
          }
          
          // Store in localStorage for immediate access
          localStorage.setItem(`family:${familyId}:data`, JSON.stringify(familyData));
          localStorage.setItem(`family:${familyId}:memories`, JSON.stringify([]));
          localStorage.setItem(`family:${familyId}:tree`, JSON.stringify([]));
          
          userData = {
            id: authData.user.id, // Proper UUID from Supabase
            email: emailForm.email,
            name: emailForm.name,
            phone: null,
            family_id: familyId,
            is_new_user: true,
            onboarding_completed: false,
            activity_count: 0,
            created_at: authData.user.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          // NOW create user profile (family exists now, so no foreign key error)
          try {
            const { DatabaseService } = await import('../utils/supabase/persistent-database');
            await DatabaseService.createUserProfile(userData.id, {
              id: userData.id,
              email: userData.email,
              name: userData.name,
              family_id: familyId,
              is_new_user: true,
              onboarding_completed: false,
              activity_count: 0,
              created_at: userData.created_at,
              updated_at: userData.updated_at
            });
            console.log('✅ User inserted into public.users table');
          } catch (dbError) {
            console.warn('⚠️ Failed to insert user into database (expected in demo mode):', dbError);
          }
          
          localStorage.setItem(`user:${userData.id}:activities`, JSON.stringify([]));
          
          supabaseSuccess = true;
          console.log('✅ Account created successfully with Supabase Auth!');
          
        } catch (supabaseError: any) {
          console.log('⚠️ Supabase Auth not available:', supabaseError.message);
          console.log('📦 Falling back to local storage mode');
        }
        
        // Fallback to local storage if Supabase not available
        if (!supabaseSuccess || !userData) {
          console.log('📦 Creating account in local storage mode');
          
          const userId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const familyId = `family_${userId}`;
          
          // Create user profile
          userData = {
            id: userId,
            email: emailForm.email,
            name: emailForm.name,
            phone: null,
            password: emailForm.password,
            family_id: familyId,
            is_new_user: true,
            onboarding_completed: false,
            activity_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          // Create family data
          const familyData = {
            id: familyId,
            name: `${emailForm.name}'s Family`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: userId,
            members: [userId]
          };
          
          // Store in localStorage
          localStorage.setItem(`family:${familyId}:data`, JSON.stringify(familyData));
          localStorage.setItem(`family:${familyId}:memories`, JSON.stringify([]));
          localStorage.setItem(`family:${familyId}:tree`, JSON.stringify([]));
          localStorage.setItem(`user:${userId}:activities`, JSON.stringify([]));
          
          console.log('✅ Account created successfully in local storage!');
          console.log('💾 All your data is stored securely in your browser');
        }
        
        // 🔧 FIX BUG #2: Remove duplicate profile save - App.tsx handleSignIn will save it
        // This prevents race condition where two saves happen in quick succession
        localStorage.setItem('current_user_id', userData.id);
        // ❌ REMOVED: localStorage.setItem(`user:${userData.id}:profile`, JSON.stringify(userData));
        // App.tsx handleSignIn will merge and save profile data properly
        saveRegisteredUser(userData);
        
        setSuccess('Account created successfully! Welcome to MemoryBox!');
        
        setTimeout(() => {
          onSignIn(userData);
        }, 1000);
        
      } else {
        // 🔧 FIX: Try Supabase auth first, fallback to local storage if not available
        console.log('🔐 Attempting sign in:', { email: emailForm.email });
        
        let userData: any = null;
        let authSuccessful = false;
        
        // Try Supabase authentication first
        try {
          console.log('🔍 Trying Supabase authentication...');
          
          // Import Supabase client
          const { default: getSupabaseClient } = await import('../utils/supabase/client');
          const supabase = getSupabaseClient();
          
          // Authenticate with Supabase
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: emailForm.email,
            password: emailForm.password
          });
          
          if (!authError && authData.session) {
            console.log('✅ Supabase auth success, fetching profile from backend...');
            
            // Fetch complete profile from backend
            const userId = authData.user.id;
            const accessToken = authData.session.access_token;
            
            try {
              const profileResponse = await fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-48a3bd07/users/${userId}/profile`,
                {
                  headers: {
                    'Authorization': `Bearer ${accessToken}`
                  }
                }
              );
              
              if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                console.log('✅ Profile fetched from backend:', {
                  is_new_user: profileData.profile.is_new_user,
                  onboarding_completed: profileData.profile.onboarding_completed
                });
                
                // Merge auth data with profile data
                userData = {
                  ...authData.user,
                  ...profileData.profile,
                  access_token: accessToken
                };
                
                authSuccessful = true;
              } else {
                console.log('⚠️ Backend profile fetch failed, will try local storage');
              }
            } catch (profileError) {
              console.log('⚠️ Backend not available, will try local storage');
            }
          } else {
            console.log('ℹ️ Supabase auth failed (expected for local accounts):', authError?.message);
          }
        } catch (supabaseError) {
          console.log('ℹ️ Supabase not available, will try local storage (normal in Figma Make)');
        }
        
        // Fallback to local storage authentication OR auto-create local account from Supabase
        if (!authSuccessful) {
          console.log('📦 Supabase auth failed, checking local storage...');
          
          const existingUser = findUserByEmail(emailForm.email);
          
          if (!existingUser) {
            // 🔧 CRITICAL FIX: Try to create local account from Supabase user
            // This handles the case where user exists in Supabase but not in localStorage
            console.log('⚠️ No local account found');
            console.log('🔄 Attempting to authenticate with Supabase and sync to localStorage...');
            
            try {
              // Try one more time with Supabase to pull the account
              const supabase = getSupabaseClient();
              const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: emailForm.email,
                password: emailForm.password
              });
              
              if (!authError && authData.session && authData.user) {
                console.log('✅ Found account in Supabase! Creating local copy...');
                
                // Fetch profile from database
                const userId = authData.user.id;
                const accessToken = authData.session.access_token;
                
                let profileData: any = null;
                try {
                  const { DatabaseService } = await import('../utils/supabase/persistent-database');
                  profileData = await DatabaseService.getUserProfile(userId);
                  console.log('✅ Loaded profile from database:', profileData);
                } catch (dbError) {
                  console.warn('⚠️ Failed to load profile from database, using auth data:', dbError);
                }
                
                // ✅ DATABASE-FIRST FIX: Create account from Supabase database data
                // Use profileData from DatabaseService (public.users table)
                userData = {
                  id: userId,
                  email: emailForm.email,
                  name: profileData?.name || authData.user.user_metadata?.name || emailForm.email.split('@')[0],
                  phone: profileData?.phone || null,
                  family_id: profileData?.family_id || null,
                  // ✅ Trust database values (now from public.users table)
                  is_new_user: profileData?.is_new_user ?? true,
                  onboarding_completed: profileData?.onboarding_completed ?? false,
                  firstName: profileData?.firstName || profileData?.first_name,
                  middleName: profileData?.middleName || profileData?.middle_name,
                  lastName: profileData?.lastName || profileData?.last_name,
                  gender: profileData?.gender,
                  date_of_birth: profileData?.date_of_birth,
                  display_name: profileData?.display_name,
                  photo_url: profileData?.photo_url,
                  status: profileData?.status,
                  activity_count: profileData?.activity_count || 0,
                  password: emailForm.password, // Store for local auth
                  created_at: profileData?.created_at || authData.user.created_at || new Date().toISOString(),
                  updated_at: new Date().toISOString()
                };
                
                // Save to localStorage as cache
                localStorage.setItem('current_user_id', userData.id);
                localStorage.setItem(`user:${userData.id}:profile`, JSON.stringify(userData));
                saveRegisteredUser(userData);
                
                console.log('✅ Local account synced from Supabase database:', {
                  onboarding_completed: userData.onboarding_completed,
                  firstName: userData.firstName || 'NOT SET',
                  gender: userData.gender || 'NOT SET'
                });
                authSuccessful = true;
              } else {
                // Supabase auth failed - account truly doesn't exist
                setError(
                  'No account found with this email. Please check your email or sign up for a new account.'
                );
                setIsLoading(false);
                return;
              }
            } catch (retryError) {
              console.error('❌ Failed to authenticate with Supabase:', retryError);
              setError(
                'Account not found. Please check your email and password, or sign up for a new account.'
              );
              setIsLoading(false);
              return;
            }
          } else {
            // Local account exists - verify password
            if (existingUser.password !== emailForm.password) {
              setError('Incorrect password. Please try again.');
              setIsLoading(false);
              return;
            }
            
            console.log('✅ Local storage authentication successful!');
            userData = existingUser;
            authSuccessful = true;
          }
        }
        
        if (!authSuccessful || !userData) {
          setError('Authentication failed. Please try again.');
          setIsLoading(false);
          return;
        }
        
        // ✅ DATABASE-FIRST FIX: Trust backend data (now comes from public.users table)
        // Store in localStorage as cache only
        localStorage.setItem('current_user_id', userData.id);
        localStorage.setItem(`user:${userData.id}:profile`, JSON.stringify(userData));
        saveRegisteredUser(userData);
        
        console.log('✅ User profile cached to localStorage from database:', {
          onboarding_completed: userData.onboarding_completed,
          firstName: userData.firstName || userData.first_name || 'NOT SET',
          gender: userData.gender || 'NOT SET'
        });
        
        setSuccess('Welcome back!');
        
        setTimeout(() => {
          onSignIn(userData);
        }, 1000);
      }
      
    } catch (err) {
      console.error('❌ Auth request failed:', err);
      setError('Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle mobile OTP send
  const handleSendOTP = async () => {
    if (!mobileForm.phone || mobileForm.phone.length < 10) {
      setError('Please enter a valid mobile number');
      return;
    }

    if (isSignUp && findUserByPhone(mobileForm.phone)) {
      setError('An account with this mobile number already exists. Please sign in instead.');
      return;
    }
    
    if (!isSignUp && !findUserByPhone(mobileForm.phone)) {
      setError('No account found with this mobile number. Please sign up first.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setOtpSent(true);
      setCountdown(60);
      setSuccess('OTP sent to your mobile number');
      
    } catch (err) {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle mobile authentication
  const handleMobileAuth = async () => {
    const validationError = validateMobileForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (isSignUp) {
        const userId = 'user-' + Date.now();
        const familyId = `family-${userId}`;
        
        const familyData = {
          id: familyId,
          name: `${mobileForm.name}'s Family`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          members: [userId]
        };
        
        const userData = {
          id: userId,
          email: null,
          phone: mobileForm.phone,
          name: mobileForm.name,
          auth_method: 'mobile',
          is_new_user: true,
          isNewUser: true,
          activity_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          family_id: familyId
        };
        
        localStorage.setItem(`family:${familyId}:data`, JSON.stringify(familyData));
        localStorage.setItem(`family:${familyId}:memories`, JSON.stringify([]));
        localStorage.setItem(`user:${userId}:profile`, JSON.stringify(userData));
        localStorage.setItem(`user:${userId}:activities`, JSON.stringify([]));
        saveRegisteredUser(userData);
        localStorage.setItem('current_user_id', userData.id);
        
        setSuccess('Account created successfully! Welcome to MemoryBox!');
        
        setTimeout(() => {
          onSignIn(userData);
        }, 1000);
      } else {
        const existingUser = findUserByPhone(mobileForm.phone);
        
        const userForAuth = {
          id: existingUser.id,
          email: existingUser.email || null,
          phone: existingUser.phone,
          name: existingUser.name,
          auth_method: existingUser.auth_method || 'mobile',
          is_new_user: existingUser.is_new_user ?? true,
          isNewUser: existingUser.is_new_user ?? true,
          activity_count: existingUser.activity_count ?? 0,
          created_at: existingUser.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          family_id: existingUser.family_id || `family-${existingUser.id}`
        };
        
        localStorage.setItem(`user:${existingUser.id}:profile`, JSON.stringify(userForAuth));
        if (!localStorage.getItem(`user:${existingUser.id}:activities`)) {
          localStorage.setItem(`user:${existingUser.id}:activities`, JSON.stringify([]));
        }
        localStorage.setItem('current_user_id', userForAuth.id);
        
        setSuccess('Welcome back!');
        
        setTimeout(() => {
          onSignIn(userForAuth);
        }, 1000);
      }
      
    } catch (err) {
      setError('Invalid OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form when switching tabs or sign in/up modes
  const resetForm = () => {
    setError('');
    setSuccess('');
    setOtpSent(false);
    setCountdown(0);
    setEmailForm({ email: '', password: '', confirmPassword: '', name: '' });
    setMobileForm({ phone: '', otp: '', name: '' });
  };

  const handleTabChange = (tab: 'email' | 'mobile') => {
    setActiveTab(tab);
    resetForm();
  };

  const toggleSignUpMode = () => {
    setIsSignUp(!isSignUp);
    resetForm();
  };

  return (
    <div className="min-h-screen bg-background vibrant-texture">
      <div className="px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={onBack}
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
            <Shield className="w-3 h-3 mr-1" />
            Secure {isSignUp ? 'Registration' : 'Login'}
          </Badge>
        </div>

        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/20 rounded-full">
              {isSignUp ? (
                <UserPlus className="w-12 h-12 text-primary" />
              ) : (
                <Heart className="w-12 h-12 text-primary" />
              )}
            </div>
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl text-primary">
              {isSignUp ? 'Create Your Family Vault' : 'Welcome Back to Your Vault'}
            </h1>
            <p className="text-lg text-muted-foreground">
              {isSignUp 
                ? 'Join thousands of families preserving their precious memories'
                : 'Sign in to access your family memories and continue your journey'
              }
            </p>
          </div>
        </div>

        {/* Authentication Card */}
        <Card className="memory-card max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">
              {isSignUp ? 'Create Your Account' : 'Sign In to Your Account'}
            </CardTitle>
            <CardDescription>
              {isSignUp 
                ? 'Choose your preferred method to create your family vault'
                : 'Choose your preferred method to access your vault'
              }
            </CardDescription>
            
            {/* Local Storage Mode Info Badge */}
            <div className="flex items-center justify-center gap-2 px-3 py-2 bg-aqua/10 rounded-lg border border-aqua/20">
              <CheckCircle className="w-4 h-4 text-aqua" />
              <span className="text-xs text-aqua-foreground">
                All data stored securely in your browser
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Authentication Tabs */}
            <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as 'email' | 'mobile')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email" className="text-sm">
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="mobile" className="text-sm">
                  <Phone className="w-4 h-4 mr-2" />
                  Mobile
                </TabsTrigger>
              </TabsList>

              {/* Email Authentication */}
              <TabsContent value="email" className="space-y-4">
                {isSignUp && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="Enter your full name"
                      value={emailForm.name}
                      onChange={(e) => setEmailForm(prev => ({ ...prev, name: e.target.value }))}
                      className="text-base"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={emailForm.email}
                    onChange={(e) => setEmailForm(prev => ({ ...prev, email: e.target.value }))}
                    className="text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={isSignUp ? "Create a password (min. 6 characters)" : "Enter your password"}
                      value={emailForm.password}
                      onChange={(e) => setEmailForm(prev => ({ ...prev, password: e.target.value }))}
                      className="text-base pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Forgot Password Link (Sign In only) */}
                {!isSignUp && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(true);
                        setResetEmail(emailForm.email); // Pre-fill with current email
                        setError('');
                      }}
                      className="text-sm text-violet hover:text-violet/80 underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}

                {isSignUp && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={emailForm.confirmPassword}
                      onChange={(e) => setEmailForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="text-base"
                    />
                  </div>
                )}

                <Button
                  onClick={handleEmailAuth}
                  disabled={isLoading}
                  className="w-full vibrant-button text-primary-foreground"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {isSignUp ? 'Creating Account...' : 'Signing In...'}
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      {isSignUp ? 'Create Account' : 'Sign In'}
                    </>
                  )}
                </Button>
              </TabsContent>

              {/* Mobile Authentication */}
              <TabsContent value="mobile" className="space-y-4">
                {isSignUp && (
                  <div className="space-y-2">
                    <Label htmlFor="mobileName">Full Name</Label>
                    <Input
                      id="mobileName"
                      placeholder="Enter your full name"
                      value={mobileForm.name}
                      onChange={(e) => setMobileForm(prev => ({ ...prev, name: e.target.value }))}
                      className="text-base"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="phone">Mobile Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter your mobile number"
                    value={mobileForm.phone}
                    onChange={(e) => setMobileForm(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))}
                    className="text-base"
                    maxLength={10}
                  />
                </div>

                {!otpSent ? (
                  <Button
                    onClick={handleSendOTP}
                    disabled={isLoading}
                    className="w-full vibrant-button text-primary-foreground"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending OTP...
                      </>
                    ) : (
                      <>
                        <Phone className="w-4 h-4 mr-2" />
                        Send OTP
                      </>
                    )}
                  </Button>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="otp">Enter OTP</Label>
                      <Input
                        id="otp"
                        type="text"
                        placeholder="Enter 6-digit OTP (demo: any 6 digits)"
                        value={mobileForm.otp}
                        onChange={(e) => setMobileForm(prev => ({ ...prev, otp: e.target.value.replace(/\D/g, '') }))}
                        className="text-base text-center text-lg tracking-widest"
                        maxLength={6}
                      />
                      <p className="text-xs text-muted-foreground text-center">
                        Demo: Enter any 6 digits as OTP
                      </p>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        onClick={handleMobileAuth}
                        disabled={isLoading}
                        className="flex-1 vibrant-button text-primary-foreground"
                      >
                        {isLoading ? (
                          <>
                            <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Verify OTP
                          </>
                        )}
                      </Button>
                      
                      <Button
                        onClick={handleSendOTP}
                        disabled={isLoading || countdown > 0}
                        variant="outline"
                        className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                      >
                        {countdown > 0 ? (
                          <>
                            <Clock className="w-4 h-4 mr-1" />
                            {countdown}s
                          </>
                        ) : (
                          'Resend'
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>

            {/* Error and Success Messages */}
            {error && (
              <div className="space-y-2">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
                
                {/* ✅ FIX: "Already registered" - Switch to sign-in */}
                {error.includes('already registered') && isSignUp && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                    <p className="text-xs text-blue-800">
                      <strong>Good news!</strong> You already have an account. Click below to sign in instead.
                    </p>
                    <Button
                      onClick={() => {
                        setError('');
                        setIsSignUp(false); // Switch to sign-in mode
                        setSuccess('Switched to sign-in mode. Please enter your password.');
                      }}
                      variant="default"
                      size="sm"
                      className="vibrant-button text-white w-full"
                    >
                      Switch to Sign In
                    </Button>
                  </div>
                )}
                
                {/* 🆕 TROUBLESHOOTING: Clear stuck account option */}
                {(error.includes('already exists') || error.includes('Invalid password')) && emailForm.email && !isSignUp && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-xs text-yellow-800 mb-2">
                      <strong>Troubleshooting:</strong> If you're unable to sign in, you can clear this account from local storage and create a new one.
                    </p>
                    <Button
                      onClick={() => {
                        if (confirm(`Are you sure you want to remove the account "${emailForm.email}" from local storage?\n\nThis will NOT delete any Supabase data. You can sign up again with the same email.`)) {
                          removeUserByEmail(emailForm.email);
                          setError('');
                          setSuccess('Account cleared from local storage. You can now sign up again.');
                          setIsSignUp(true); // Switch to sign-up mode
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="text-xs border-yellow-300 text-yellow-800 hover:bg-yellow-100 w-full"
                    >
                      Clear Stuck Account & Sign Up Again
                    </Button>
                  </div>
                )}
              </div>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}

            {/* Sign Up/Sign In Toggle */}
            <div className="text-center">
              <Separator className="my-4" />
              <p className="text-sm text-muted-foreground mb-2">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              </p>
              <Button
                variant="ghost"
                onClick={toggleSignUpMode}
                className="text-primary hover:bg-primary/10"
              >
                {isSignUp ? 'Sign In' : 'Create Account'}
              </Button>
            </div>



            {/* Privacy Notice */}
            <div className="text-center text-xs text-muted-foreground">
              <p>
                By continuing, you agree to our Terms of Service and Privacy Policy. 
                Your family memories are always private and secure.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Benefits Preview */}
        <div className="max-w-md mx-auto">
          <Card className="memory-card p-4">
            <div className="text-center space-y-3">
              <h3 className="font-medium text-primary">
                {isSignUp ? "What you'll get:" : "Your vault includes:"}
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-2">
                  <div className="w-8 h-8 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
                    <Shield className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground">Private & Secure</p>
                </div>
                <div className="space-y-2">
                  <div className="w-8 h-8 mx-auto bg-coral/20 rounded-full flex items-center justify-center">
                    <TreePine className="w-4 h-4 text-coral" />
                  </div>
                  <p className="text-xs text-muted-foreground">Family Tree</p>
                </div>
                <div className="space-y-2">
                  <div className="w-8 h-8 mx-auto bg-aqua/20 rounded-full flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-aqua" />
                  </div>
                  <p className="text-xs text-muted-foreground">Unlimited Memories</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Demo Note */}
        <div className="text-center">
          <Badge variant="outline" className="bg-background/80 text-muted-foreground">
            <Sparkles className="w-3 h-3 mr-1" />
            Demo Mode - {isSignUp ? 'Create account to get started' : 'Sign in with demo credentials'}
          </Badge>
        </div>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Reset Password</DialogTitle>
            <DialogDescription>
              Enter your email address and we'll send you a link to reset your password
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {resetSuccess && (
              <Alert className="bg-aqua/10 border-aqua">
                <CheckCircle className="h-4 w-4 text-aqua" />
                <AlertDescription className="text-ink">
                  Password reset email sent! Check your inbox for the reset link.
                </AlertDescription>
              </Alert>
            )}

            {!resetSuccess && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="resetEmail">Email Address</Label>
                  <Input
                    id="resetEmail"
                    type="email"
                    placeholder="Enter your email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleForgotPassword();
                      }
                    }}
                    className="h-12"
                    disabled={isResetting}
                    autoComplete="email"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetEmail('');
                      setError('');
                    }}
                    className="flex-1"
                    disabled={isResetting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleForgotPassword}
                    disabled={isResetting || !resetEmail}
                    className="flex-1 bg-violet hover:bg-violet/90 text-white"
                  >
                    {isResetting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Reset Link'
                    )}
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  The reset link will be valid for 1 hour. Check your spam folder if you don't see the email.
                </p>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
