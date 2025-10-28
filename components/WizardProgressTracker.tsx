import React from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Check, Lock, ArrowRight, Home, Heart, Users, Edit2 } from 'lucide-react';
import { Progress } from './ui/progress';

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  isCompleted: boolean;
  isLocked: boolean;
  isRecommended: boolean;
}

interface WizardProgressTrackerProps {
  hasCompletedWelcome: boolean;
  hasSpouse: boolean;
  hasCompletedInLaws: boolean;
  hasMother: boolean;
  hasFather: boolean;
  hasCompletedMaternal: boolean;
  hasCompletedPaternal: boolean;
  onStartInLaws: () => void;
  onStartMaternal: () => void;
  onStartPaternal: () => void;
  onStartWelcome: () => void;
  isMobile?: boolean;
}

export const WizardProgressTracker: React.FC<WizardProgressTrackerProps> = ({
  hasCompletedWelcome,
  hasSpouse,
  hasCompletedInLaws,
  hasMother,
  hasFather,
  hasCompletedMaternal,
  hasCompletedPaternal,
  onStartInLaws,
  onStartMaternal,
  onStartPaternal,
  onStartWelcome,
  isMobile = false
}) => {
  // Calculate which step is next
  const getNextStep = (): string | null => {
    if (!hasCompletedWelcome) return null; // Welcome wizard handles itself
    if (hasSpouse && !hasCompletedInLaws) return 'inlaws';
    if (hasMother && !hasCompletedMaternal) return 'maternal';
    if (hasFather && !hasCompletedPaternal) return 'paternal';
    return null; // All done!
  };

  const nextStep = getNextStep();

  // Build wizard steps
  const steps: WizardStep[] = [
    {
      id: 'welcome',
      title: 'Nuclear Family',
      description: 'Your immediate family (parents, siblings, spouse, children)',
      icon: <Home className="w-4 h-4" />,
      isCompleted: hasCompletedWelcome,
      isLocked: false,
      isRecommended: !hasCompletedWelcome
    },
    {
      id: 'inlaws',
      title: "In-Laws Family",
      description: "Your spouse's parents and siblings",
      icon: <Heart className="w-4 h-4" />,
      isCompleted: hasCompletedInLaws,
      isLocked: !hasSpouse || !hasCompletedWelcome,
      isRecommended: hasSpouse && hasCompletedWelcome && !hasCompletedInLaws
    },
    {
      id: 'maternal',
      title: 'Maternal Family',
      description: "Your mother's parents and siblings (left side)",
      icon: <Users className="w-4 h-4" />,
      isCompleted: hasCompletedMaternal,
      isLocked: !hasMother || !hasCompletedWelcome,
      isRecommended: hasMother && hasCompletedWelcome && (!hasSpouse || hasCompletedInLaws) && !hasCompletedMaternal
    },
    {
      id: 'paternal',
      title: 'Paternal Family',
      description: "Your father's parents and siblings (right side)",
      icon: <Users className="w-4 h-4" />,
      isCompleted: hasCompletedPaternal,
      isLocked: !hasFather || !hasCompletedWelcome,
      isRecommended: hasFather && hasCompletedWelcome && (!hasSpouse || hasCompletedInLaws) && !hasCompletedPaternal
    }
  ];

  // Calculate progress
  const availableSteps = steps.filter(s => !s.isLocked);
  const completedSteps = availableSteps.filter(s => s.isCompleted);
  const progressPercentage = availableSteps.length > 0 
    ? (completedSteps.length / availableSteps.length) * 100 
    : 0;

  // Don't show if all available wizards are completed
  if (availableSteps.length === completedSteps.length) {
    return null;
  }

  const handleStepClick = (stepId: string) => {
    switch (stepId) {
      case 'welcome':
        onStartWelcome();
        break;
      case 'inlaws':
        onStartInLaws();
        break;
      case 'maternal':
        onStartMaternal();
        break;
      case 'paternal':
        onStartPaternal();
        break;
    }
  };

  return (
    <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">📋 Guided Tree Building</h3>
            <p className="text-xs text-muted-foreground mt-1 break-words">
              Follow these steps for a well-organized family tree
            </p>
          </div>
          <Badge variant="secondary" className="bg-white flex-shrink-0">
            {completedSteps.length}/{availableSteps.length}
          </Badge>
        </div>

        {/* Progress Bar */}
        <Progress value={progressPercentage} className="h-2" />

        {/* Steps */}
        <div className={`space-y-2 ${isMobile ? 'text-sm' : ''}`}>
          {steps.map((step, index) => {
            if (step.isLocked && !step.isCompleted) return null; // Hide locked incomplete steps

            return (
              <div
                key={step.id}
                className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                  step.isCompleted
                    ? 'bg-green-50 border border-green-200'
                    : step.isRecommended
                    ? 'bg-blue-100 border-2 border-blue-400 shadow-sm'
                    : step.isLocked
                    ? 'bg-gray-100 border border-gray-300 opacity-60'
                    : 'bg-white border border-gray-200'
                }`}
              >
                {/* Icon */}
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    step.isCompleted
                      ? 'bg-green-500 text-white'
                      : step.isRecommended
                      ? 'bg-blue-500 text-white'
                      : step.isLocked
                      ? 'bg-gray-400 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step.isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : step.isLocked ? (
                    <Lock className="w-3 h-3" />
                  ) : (
                    step.icon
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-1">
                    <span className={`font-medium break-words ${isMobile ? 'text-xs' : 'text-sm'}`}>
                      {step.title}
                    </span>
                    {step.isCompleted && (
                      <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs flex-shrink-0">
                        Done
                      </Badge>
                    )}
                    {step.isRecommended && !step.isCompleted && (
                      <Badge variant="default" className="bg-blue-500 text-white text-xs animate-pulse flex-shrink-0">
                        Next
                      </Badge>
                    )}
                    {step.isLocked && (
                      <Badge variant="secondary" className="bg-gray-200 text-gray-600 text-xs flex-shrink-0">
                        Locked
                      </Badge>
                    )}
                  </div>
                  <p className={`text-muted-foreground break-words ${isMobile ? 'text-xs' : 'text-xs'}`}>
                    {step.description}
                  </p>
                  
                  {/* Action button for recommended step */}
                  {step.isRecommended && !step.isCompleted && (
                    <Button
                      size="sm"
                      className="mt-2 h-7 text-xs"
                      onClick={() => handleStepClick(step.id)}
                    >
                      Start This Wizard
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                  
                  {/* Completed badge - wizards are locked after completion */}
                  {step.isCompleted && (
                    <Badge variant="outline" className="mt-2 border-green-300 text-green-700 bg-green-50 text-xs inline-flex items-center gap-1 whitespace-nowrap">
                      <Check className="w-3 h-3 flex-shrink-0" />
                      <span>Completed - Use + to add more</span>
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Helper text */}
        <div className="mt-3 p-2 bg-white/60 rounded border border-blue-200">
          <p className="text-xs text-gray-600 mb-1 break-words">
            💡 <strong>Tip:</strong> Following this order ensures proper spatial layout (Maternal LEFT ← → Paternal RIGHT)
          </p>
          <p className="text-xs text-gray-500 break-words">
            ✅ Wizards lock after completion. Use the <strong>+ buttons on canvas</strong> to add more members!
          </p>
        </div>
      </div>
    </Card>
  );
};
