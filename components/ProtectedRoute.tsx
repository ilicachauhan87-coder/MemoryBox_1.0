import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getSupabaseClient } from '../utils/supabase/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // ✅ DATABASE-FIRST: Check Supabase Auth session
        const supabase = getSupabaseClient();
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ ProtectedRoute: Auth error:', error.message);
          setIsAuthenticated(false);
          setIsChecking(false);
          return;
        }

        if (session?.user) {
          const authUserId = session.user.id;
          console.log('✅ ProtectedRoute: User authenticated:', authUserId);
          
          // Cache user ID to localStorage (ONLY as cache)
          localStorage.setItem('current_user_id', authUserId);
          
          // Try to get user profile from database
          try {
            const { data: profile, error: profileError } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', authUserId)
              .single();

            if (!profileError && profile) {
              // Cache profile to localStorage (ONLY as cache)
              localStorage.setItem(`user:${authUserId}:profile`, JSON.stringify(profile));
              console.log('✅ ProtectedRoute: Profile cached from database');
            }
          } catch (profileErr) {
            console.warn('⚠️ ProtectedRoute: Could not load profile, but user is authenticated');
          }
          
          setUserId(authUserId);
          setIsAuthenticated(true);
        } else {
          console.warn('⚠️ ProtectedRoute: No active session, redirecting to sign in');
          
          // Clear stale localStorage data
          localStorage.removeItem('current_user_id');
          const keys = Object.keys(localStorage);
          keys.forEach(key => {
            if (key.startsWith('user:')) {
              localStorage.removeItem(key);
            }
          });
          
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('❌ ProtectedRoute: Unexpected error:', error);
        setIsAuthenticated(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, []);

  // Show loading state while checking authentication
  if (isChecking) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet mx-auto mb-4"></div>
          <p className="text-ink">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to sign in if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  // Render the protected content
  return <>{children}</>;
};
