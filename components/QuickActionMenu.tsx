import React from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Link, User } from 'lucide-react';

interface QuickActionMenuProps {
  isOpen: boolean;
  onConnect: () => void;
  onProfile: () => void;
  personName: string;
  isMobile: boolean;
  generation?: number; // Optional: generation number to determine positioning
}

export const QuickActionMenu: React.FC<QuickActionMenuProps> = ({
  isOpen,
  onConnect,
  onProfile,
  personName,
  isMobile,
  generation = 0
}) => {
  if (!isOpen) return null;

  // For Gen -2 (Grandparents) and Gen -1 (Parents), show dialog BELOW the node
  // For Gen 0 and below, show dialog ABOVE the node (default)
  const shouldShowBelow = generation <= -2;
  
  return (
    <div 
      className="absolute z-50 pointer-events-auto"
      style={{
        ...(shouldShowBelow 
          ? { 
              top: '100%', 
              marginTop: '8px' 
            } 
          : { 
              bottom: '100%', 
              marginBottom: '8px' 
            }
        ),
        left: '50%',
        transform: 'translateX(-50%)'
      }}
    >
      <Card className="shadow-xl border-2 border-blue-400 bg-white p-2 min-w-[160px]">
        <div className="space-y-1">
          <div className="px-2 py-1 text-xs font-medium text-gray-700 border-b text-center truncate">
            {personName}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sm h-8"
            onClick={onConnect}
          >
            <Link className="w-3 h-3 mr-2" />
            Connect
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sm h-8"
            onClick={onProfile}
          >
            <User className="w-3 h-3 mr-2" />
            Profile
          </Button>
        </div>
      </Card>
    </div>
  );
};
