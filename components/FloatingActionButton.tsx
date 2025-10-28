import React, { useState } from 'react';
import { Plus, Link, Users, X, Wand2 } from 'lucide-react';
import { Button } from './ui/button';

interface FloatingActionButtonProps {
  onAddPerson: () => void;
  onConnect: () => void;
  onOpenWizardMenu: () => void;
  isConnecting: boolean;
  hideButton?: boolean; // Hide button when wizards are open for better UX
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onAddPerson,
  onConnect,
  onOpenWizardMenu,
  isConnecting,
  hideButton = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleMainClick = () => {
    if (isConnecting) {
      onConnect(); // Cancel connection mode
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  const handleAction = (action: () => void) => {
    action();
    setIsExpanded(false);
  };

  // Don't render button when wizards are open to prevent overlap and improve UX
  if (hideButton) {
    return null;
  }

  return (
    <div className="fixed bottom-24 right-6 z-[60] flex flex-col-reverse items-end gap-3">
      {/* Action buttons with inline labels - appear when expanded */}
      {isExpanded && !isConnecting && (
        <>
          {/* Wizard Button */}
          <div className="flex items-center gap-3 animate-in slide-in-from-bottom-2" style={{ animationDuration: '200ms', animationDelay: '0ms' }}>
            <span className="bg-gray-800 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg pointer-events-none">
              Add Family Wizard
            </span>
            <Button
              onClick={() => handleAction(onOpenWizardMenu)}
              className="h-12 w-12 rounded-full bg-purple-500 hover:bg-purple-600 text-white shadow-lg flex items-center justify-center"
            >
              <Wand2 className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Connect Button */}
          <div className="flex items-center gap-3 animate-in slide-in-from-bottom-2" style={{ animationDuration: '200ms', animationDelay: '50ms' }}>
            <span className="bg-gray-800 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg pointer-events-none">
              Connect People
            </span>
            <Button
              onClick={() => handleAction(onConnect)}
              className="h-12 w-12 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg flex items-center justify-center"
            >
              <Link className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Add Person Button */}
          <div className="flex items-center gap-3 animate-in slide-in-from-bottom-2" style={{ animationDuration: '200ms', animationDelay: '100ms' }}>
            <span className="bg-gray-800 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg pointer-events-none">
              Add Person
            </span>
            <Button
              onClick={() => handleAction(onAddPerson)}
              className="h-12 w-12 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg flex items-center justify-center"
            >
              <Users className="w-5 h-5" />
            </Button>
          </div>
        </>
      )}

      {/* Main FAB */}
      <Button
        onClick={handleMainClick}
        className={`h-16 w-16 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ${
          isConnecting 
            ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
            : isExpanded 
              ? 'bg-gray-600 hover:bg-gray-700 rotate-45' 
              : 'bg-blue-600 hover:bg-blue-700'
        } text-white`}
      >
        {isConnecting ? (
          <X className="w-7 h-7" />
        ) : (
          <Plus className="w-7 h-7" />
        )}
      </Button>

      {/* Connection mode label */}
      {isConnecting && (
        <div className="absolute right-20 bottom-5 pointer-events-none">
          <span className="bg-red-600 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg animate-pulse">
            Tap to cancel
          </span>
        </div>
      )}
    </div>
  );
};
