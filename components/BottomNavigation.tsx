import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Home, FolderOpen, Plus, TreePine, MessageSquare } from 'lucide-react';

interface BottomNavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  unreadCount?: number;
}

export function BottomNavigation({ currentPage, onNavigate, unreadCount = 0 }: BottomNavigationProps) {
  const navItems = [
    {
      id: 'home',
      label: 'Home',
      emoji: '🏠',
      icon: Home,
      hasNotification: false,
      color: 'text-primary',
      activeGradient: 'from-primary to-violet',
      description: 'Recent memories and highlights'
    },
    {
      id: 'vault',
      label: 'Vault',
      emoji: '📂',
      icon: FolderOpen,
      hasNotification: false,
      color: 'text-violet',
      activeGradient: 'from-violet to-purple-600',
      description: 'Main memory library'
    },
    {
      id: 'upload-memory',
      label: 'Add',
      emoji: '➕',
      icon: Plus,
      hasNotification: false,
      color: 'text-coral',
      activeGradient: 'from-coral to-secondary',
      description: 'Quick upload shortcut',
      isAction: true
    },
    {
      id: 'family-tree',
      label: 'Tree',
      emoji: '🌳',
      icon: TreePine,
      hasNotification: false,
      color: 'text-aqua',
      activeGradient: 'from-aqua to-teal-600',
      description: 'Interactive tree view'
    },
    {
      id: 'family-wall',
      label: 'Wall',
      emoji: '💬',
      icon: MessageSquare,
      hasNotification: false,
      color: 'text-secondary',
      activeGradient: 'from-secondary to-coral',
      description: 'Family activity feed'
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bottom-nav-backdrop bottom-nav-safe">
      <div className="px-1 sm:px-4 py-2 sm:py-3">
        <Card className="memory-card mx-auto shadow-2xl border-primary/10 max-w-2xl">
          <CardContent className="p-1.5 sm:p-3">
            <div className="flex items-center justify-between gap-0.5 sm:gap-2 w-full px-0.5 sm:px-0">
              {navItems.map((item) => {
                const isActive = currentPage === item.id;
                const IconComponent = item.icon;

                return (
                  <Button
                    key={item.id}
                    variant="ghost"
                    onClick={() => onNavigate(item.id)}
                    className={`
                      flex flex-col items-center justify-center gap-1 sm:gap-1.5 p-1.5 sm:p-3 relative
                      min-w-[62px] sm:min-w-[80px] lg:min-w-[90px]
                      min-h-[64px] sm:min-h-[72px] lg:min-h-[76px]
                      max-w-[68px] sm:max-w-[96px] lg:max-w-[110px]
                      flex-1 sm:flex-initial
                      rounded-xl transition-all duration-300
                      ${isActive 
                        ? `bg-gradient-to-br ${item.activeGradient} text-white shadow-md scale-105 transform` 
                        : 'text-muted-foreground hover:bg-primary/5 hover:text-primary hover:scale-105'
                      }
                      ${item.isAction ? 'hover:shadow-lg' : ''}
                    `}
                  >
                    {/* Icon Container */}
                    <div className="relative flex items-center justify-center flex-shrink-0">
                      <div className={`
                        relative z-10 transition-all duration-300 flex items-center justify-center
                        ${isActive ? 'drop-shadow-sm' : ''}
                      `}>
                        <IconComponent 
                          className={`
                            w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8
                            transition-all duration-300
                            ${isActive ? 'text-white' : item.color}
                            ${item.isAction ? 'stroke-2' : 'stroke-[1.75]'}
                          `} 
                        />
                      </div>

                      {/* Notification Badge */}
                      {item.hasNotification && (
                        <Badge 
                          className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 p-0 flex items-center justify-center bg-coral text-white border-2 border-white notification-badge"
                          style={{ fontSize: '11px', fontWeight: '700' }}
                        >
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                      )}

                      {/* Action Indicator (Add button) */}
                      {item.isAction && !isActive && (
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-coral/20 to-secondary/20 rounded-lg animate-pulse -z-10"></div>
                      )}
                    </div>

                    {/* Label Text */}
                    <span 
                      className={`
                        transition-all duration-300 text-center leading-tight select-none whitespace-nowrap
                        text-[13px] sm:text-[15px] lg:text-base
                        ${isActive 
                          ? 'text-white drop-shadow-sm font-semibold' 
                          : `${item.color} font-medium`
                        }
                      `}
                      style={{
                        fontWeight: isActive ? '600' : '500',
                        letterSpacing: '0.2px',
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
                      }}
                    >
                      {item.label}
                    </span>

                    {/* Soft Glow Effect */}
                    {isActive && (
                      <div className={`
                        absolute inset-0 rounded-xl bg-gradient-to-br ${item.activeGradient} opacity-10 blur-sm -z-10
                      `}></div>
                    )}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shadow Element */}
      <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-black/3 to-transparent -z-10 rounded-t-2xl"></div>
    </div>
  );
}
