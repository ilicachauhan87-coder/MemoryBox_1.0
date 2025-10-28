import React from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Users, ChevronDown, Heart, UserPlus, Check, Lock, AlertCircle, Home } from 'lucide-react';

interface FamilyTemplateMenuProps {
  hasSpouse: boolean;
  hasMother: boolean;
  hasFather: boolean;
  hasCompletedWelcome: boolean;
  hasCompletedInLaws: boolean;
  hasCompletedMaternal: boolean;
  hasCompletedPaternal: boolean;
  onSelectWelcome: () => void;
  onSelectInLaws: () => void;
  onSelectMaternal: () => void;
  onSelectPaternal: () => void;
  isMobile?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const FamilyTemplateMenu: React.FC<FamilyTemplateMenuProps> = ({
  hasSpouse,
  hasMother,
  hasFather,
  hasCompletedWelcome,
  hasCompletedInLaws,
  hasCompletedMaternal,
  hasCompletedPaternal,
  onSelectWelcome,
  onSelectInLaws,
  onSelectMaternal,
  onSelectPaternal,
  isMobile = false,
  open,
  onOpenChange
}) => {
  // Determine if in-laws should be done before maternal/paternal
  const shouldCompleteInLawsFirst = hasSpouse && !hasCompletedInLaws;
  
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={isMobile ? "sm" : "default"}>
          <UserPlus className="w-4 h-4 mr-2" />
          {isMobile ? "Templates" : "Add Family Template"}
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Guided Wizards</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Welcome Wizard - Always first, mandatory if not completed */}
        <DropdownMenuItem
          onClick={onSelectWelcome}
          className={`${hasCompletedWelcome ? 'cursor-default opacity-75' : 'cursor-pointer'} ${
            !hasCompletedWelcome ? 'bg-green-50 border-l-2 border-green-500' : ''
          }`}
          disabled={hasCompletedWelcome}
        >
          <Home className="w-4 h-4 mr-2 text-green-500 flex-shrink-0" />
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm">Welcome - Nuclear Family</span>
              {hasCompletedWelcome && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs px-1 py-0">
                  ✓ Completed
                </Badge>
              )}
              {!hasCompletedWelcome && (
                <Badge variant="default" className="bg-green-500 text-white text-xs px-1 py-0">
                  Start Here
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {hasCompletedWelcome ? 'Locked - Use + buttons to add more' : 'You, spouse, parents, siblings & children'}
            </span>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* In-Laws */}
        {hasSpouse && (
          <DropdownMenuItem
            onClick={onSelectInLaws}
            className={`${hasCompletedInLaws ? 'cursor-default opacity-75' : 'cursor-pointer'} ${
              hasSpouse && !hasCompletedInLaws ? 'bg-blue-50 border-l-2 border-blue-500' : ''
            }`}
            disabled={hasCompletedInLaws}
          >
            <Heart className="w-4 h-4 mr-2 text-pink-500 flex-shrink-0" />
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm">In-Laws Family</span>
                {hasCompletedInLaws && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs px-1 py-0">
                    ✓ Completed
                  </Badge>
                )}
                {hasSpouse && !hasCompletedInLaws && (
                  <Badge variant="default" className="bg-blue-500 text-white text-xs px-1 py-0">
                    Next
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {hasCompletedInLaws ? 'Locked - Use + buttons to add more' : "Spouse's parents & siblings"}
              </span>
            </div>
          </DropdownMenuItem>
        )}

        {/* Warning if in-laws should be done first */}
        {shouldCompleteInLawsFirst && (hasMother || hasFather) && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-2 bg-yellow-50 border-l-2 border-yellow-500 mx-1 rounded text-xs text-yellow-800 flex items-start gap-2">
              <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>Complete In-Laws wizard first for proper tree layout</span>
            </div>
          </>
        )}

        {(hasMother || hasFather) && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              Grandparents & Extended
            </div>
          </>
        )}

        {/* Maternal */}
        {hasMother && (
          <DropdownMenuItem
            onClick={onSelectMaternal}
            className={`${hasCompletedMaternal ? 'cursor-default opacity-75' : 'cursor-pointer'} ${
              hasMother && !hasCompletedMaternal && !shouldCompleteInLawsFirst ? 'bg-purple-50 border-l-2 border-purple-500' : ''
            }`}
            disabled={hasCompletedMaternal}
          >
            <Users className="w-4 h-4 mr-2 text-purple-500 flex-shrink-0" />
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm">Maternal Family</span>
                {hasCompletedMaternal && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs px-1 py-0">
                    ✓ Completed
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {hasCompletedMaternal ? 'Locked - Use + buttons (LEFT)' : "Mother's side (LEFT)"}
              </span>
            </div>
          </DropdownMenuItem>
        )}

        {/* Paternal */}
        {hasFather && (
          <DropdownMenuItem
            onClick={onSelectPaternal}
            className={`${hasCompletedPaternal ? 'cursor-default opacity-75' : 'cursor-pointer'} ${
              hasFather && !hasCompletedPaternal && !shouldCompleteInLawsFirst ? 'bg-blue-50 border-l-2 border-blue-500' : ''
            }`}
            disabled={hasCompletedPaternal}
          >
            <Users className="w-4 h-4 mr-2 text-blue-500 flex-shrink-0" />
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm">Paternal Family</span>
                {hasCompletedPaternal && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs px-1 py-0">
                    ✓ Completed
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {hasCompletedPaternal ? 'Locked - Use + buttons (RIGHT)' : "Father's side (RIGHT)"}
              </span>
            </div>
          </DropdownMenuItem>
        )}
        
        {!hasSpouse && !hasMother && !hasFather && (
          <div className="px-2 py-3 text-sm text-gray-500 text-center">
            Add a spouse or parents first to use family templates
          </div>
        )}

        {(hasSpouse || hasMother || hasFather) && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              💡 Wizards lock after first use. Use <strong>+ buttons</strong> to add more!
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
