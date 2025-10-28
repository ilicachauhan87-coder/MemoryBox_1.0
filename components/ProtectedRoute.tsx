import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is signed in
    const currentUserId = localStorage.getItem('current_user_id');
    
    if (currentUserId) {
      // Verify user profile exists
      const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
      if (userProfile) {
        console.log('✅ ProtectedRoute: User authenticated:', currentUserId);
        setIsAuthenticated(true);
      } else {
        console.warn('⚠️ ProtectedRoute: User ID found but no profile');
        setIsAuthenticated(false);
      }
    } else {
      console.warn('⚠️ ProtectedRoute: No user ID found, redirecting to sign in');
      setIsAuthenticated(false);
    }
    
    setIsChecking(false);
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
