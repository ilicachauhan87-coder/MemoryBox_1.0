import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { X, Move, ZoomIn, Hand, ChevronDown } from 'lucide-react';

interface MobileGestureTutorialProps {
  onDismiss: () => void;
}

export const MobileGestureTutorial: React.FC<MobileGestureTutorialProps> = ({ onDismiss }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      icon: <Hand className="w-16 h-16 text-blue-500 mb-4" />,
      title: "Welcome to Mobile View! 👋",
      description: "Let's learn the touch gestures to navigate your family tree",
      animation: "animate-pulse"
    },
    {
      icon: <ZoomIn className="w-16 h-16 text-green-500 mb-4" />,
      title: "Pinch to Zoom 🔍",
      description: "Use two fingers to pinch and zoom in/out on your family tree",
      animation: "animate-bounce"
    },
    {
      icon: <Move className="w-16 h-16 text-purple-500 mb-4" />,
      title: "Scroll to Navigate 📍",
      description: "Swipe horizontally and vertically to explore all generations",
      animation: "animate-pulse"
    },
    {
      icon: <ChevronDown className="w-16 h-16 text-orange-500 mb-4" />,
      title: "Tap Generation Bands 🎯",
      description: "Tap any colored generation band to quickly zoom to that generation",
      animation: "animate-bounce"
    }
  ];

  const currentStepData = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onDismiss();
    }
  };

  const handleSkip = () => {
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white p-6 relative">
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Content */}
        <div className="text-center">
          <div className={`flex justify-center ${currentStepData.animation}`}>
            {currentStepData.icon}
          </div>
          <h2 className="text-2xl mb-4">{currentStepData.title}</h2>
          <p className="text-gray-600 mb-6">{currentStepData.description}</p>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full transition-all ${
                  index === currentStep 
                    ? 'bg-blue-500 w-6' 
                    : index < currentStep 
                      ? 'bg-green-500' 
                      : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex-1"
              >
                Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
            >
              {currentStep < steps.length - 1 ? 'Next' : 'Got it!'}
            </Button>
          </div>

          {currentStep === 0 && (
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 hover:text-gray-700 mt-3"
            >
              Skip tutorial
            </button>
          )}
        </div>
      </Card>
    </div>
  );
};
