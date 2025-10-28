import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Heart } from 'lucide-react';
import { useState, useEffect } from 'react';

interface TopNavigationBarProps {
  user: {
    id: string;
    name?: string;
    display_name?: string;
    photo?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  } | null;
  onNavigate: (page: string) => void;
  showBackButton?: boolean;
  title?: string;
}

export function TopNavigationBar({ user, onNavigate, showBackButton, title }: TopNavigationBarProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  // Add shadow when scrolled for better visual separation
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Get user initials for avatar fallback
  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.name) {
      const nameParts = user.name.trim().split(/\s+/);
      if (nameParts.length >= 2) {
        return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
      }
      return user.name.slice(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  // Get display name
  const getDisplayName = () => {
    return user?.display_name || user?.name || user?.firstName || user?.email?.split('@')[0] || 'User';
  };

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 bg-cream border-b transition-all duration-300 ${
        isScrolled ? 'border-border shadow-md' : 'border-transparent'
      }`}
      style={{ 
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        backgroundColor: 'rgba(253, 252, 220, 0.95)'
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 top-nav-safe max-w-7xl mx-auto">
        {/* Left: Logo/Branding */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="p-3 bg-gradient-to-br from-primary to-secondary rounded-2xl shadow-lg">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <span className="font-semibold text-violet text-lg sm:text-xl">
              {title || 'MemoryBox'}
            </span>
          </div>
        </div>
        
        {/* Right: Profile Avatar */}
        {user && (
          <button 
            onClick={() => onNavigate('profile')}
            className="flex items-center gap-2 hover:bg-muted/50 p-1.5 sm:p-2 rounded-full transition-all active:scale-95 touch-manipulation"
            style={{ minHeight: '48px', minWidth: '48px' }}
            aria-label="View Profile"
          >
            <Avatar className="w-10 h-10 sm:w-11 sm:h-11 border-2 border-violet/20 shadow-sm">
              <AvatarImage src={user.photo} alt={getDisplayName()} />
              <AvatarFallback className="bg-gradient-to-br from-violet to-coral text-cream font-semibold text-sm">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            
            {/* Show name on larger screens only */}
            <span className="hidden md:inline text-sm font-medium text-foreground max-w-[120px] truncate">
              {getDisplayName()}
            </span>
          </button>
        )}
      </div>
    </header>
  );
}
