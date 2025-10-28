import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { ChevronLeft, ChevronRight, Heart, X } from 'lucide-react';

interface InLawsWizardProps {
  isOpen: boolean;
  onComplete: (data: InLawsWizardData) => void;
  onSkip: () => void;
  spouseName: string;
  spouseGender: 'male' | 'female';
}

export interface InLawsWizardData {
  motherInLaw: string;
  fatherInLaw: string;
  parentsNotTogether: boolean;
  siblings: Array<{
    name: string;
    gender: 'male' | 'female';
    isMarried: boolean;
    spouseName?: string;
    spouseGender?: 'male' | 'female';
  }>;
}

export const InLawsWizard: React.FC<InLawsWizardProps> = ({
  isOpen,
  onComplete,
  onSkip,
  spouseName,
  spouseGender
}) => {
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Step 1: Parents
  const [motherInLaw, setMotherInLaw] = useState('');
  const [fatherInLaw, setFatherInLaw] = useState('');
  const [parentsNotTogether, setParentsNotTogether] = useState(false);

  // Step 2: Siblings count
  const [siblingCount, setSiblingCount] = useState<number>(0);

  // Step 3: Sibling details
  const [siblings, setSiblings] = useState<Array<{
    name: string;
    gender: 'male' | 'female';
    isMarried: boolean;
    spouseName?: string;
    spouseGender?: 'male' | 'female';
  }>>([]);

  const resetWizard = () => {
    setStep(1);
    setMotherInLaw('');
    setFatherInLaw('');
    setParentsNotTogether(false);
    setSiblingCount(0);
    setSiblings([]);
  };

  const updateSiblingCount = (count: number) => {
    setSiblingCount(count);
    // Initialize siblings array
    setSiblings(Array(count).fill(null).map(() => ({
      name: '',
      gender: 'male',
      isMarried: false,
      spouseName: '',
      spouseGender: 'female'
    })));
  };

  const handleComplete = () => {
    const data: InLawsWizardData = {
      motherInLaw: motherInLaw.trim(),
      fatherInLaw: fatherInLaw.trim(),
      parentsNotTogether,
      siblings
    };
    onComplete(data);
    resetWizard();
  };

  const handleSkip = () => {
    onSkip();
    resetWizard();
  };

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (siblingCount === 0) {
        handleComplete();
      } else {
        setStep(3);
      }
    }
  };

  const updateSibling = (index: number, field: string, value: any) => {
    setSiblings(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      // Auto-update spouse gender to opposite when sibling gender changes
      if (field === 'gender') {
        const newGender = value as 'male' | 'female';
        const autoSpouseGender = newGender === 'male' ? 'female' : 'male';
        updated[index].spouseGender = autoSpouseGender;
      }
      
      return updated;
    });
  };

  const allSiblingsValid = siblings.every(s => s.name.trim() && (!s.isMarried || s.spouseName?.trim()));

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[500px]" aria-describedby={undefined}>
        {/* Close Button */}
        <button
          onClick={handleSkip}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-50"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-500" />
            Add {spouseName}'s Family
          </DialogTitle>
          <DialogDescription>
            {step === 1 && `Tell us about ${spouseName}'s parents`}
            {step === 2 && `How many siblings does ${spouseName} have?`}
            {step === 3 && `Tell us about ${spouseName}'s siblings`}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={(step / totalSteps) * 100} className="h-2" />
          <p className="text-xs text-gray-500 text-center">
            Step {step} of {totalSteps}
          </p>
        </div>

        {/* Step 1: Parents */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mother-in-law">👩 {spouseGender === 'male' ? 'Mother-in-Law' : 'Mother-in-Law'}'s Name</Label>
              <Input
                id="mother-in-law"
                value={motherInLaw}
                onChange={(e) => setMotherInLaw(e.target.value)}
                placeholder={`e.g., Jane ${spouseName.split(' ')[1] || 'Smith'}`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="father-in-law">👨 {spouseGender === 'male' ? 'Father-in-Law' : 'Father-in-Law'}'s Name</Label>
              <Input
                id="father-in-law"
                value={fatherInLaw}
                onChange={(e) => setFatherInLaw(e.target.value)}
                placeholder={`e.g., John ${spouseName.split(' ')[1] || 'Smith'}`}
              />
            </div>

            {motherInLaw.trim() && fatherInLaw.trim() && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="parents-not-together"
                  checked={parentsNotTogether}
                  onChange={(e) => setParentsNotTogether(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="parents-not-together" className="text-sm cursor-pointer">
                  They are not together
                </Label>
              </div>
            )}
            
            <p className="text-xs text-muted-foreground">(Leave blank if you don't want to add them now)</p>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleSkip}>
                Skip for now
              </Button>
              <Button onClick={handleNext}>
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Sibling Count */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>How many siblings does {spouseName} have?</Label>
              <div className="flex gap-2 flex-wrap">
                {[0, 1, 2, 3, 4, 5].map(num => (
                  <Button
                    key={num}
                    variant={siblingCount === num ? 'default' : 'outline'}
                    onClick={() => updateSiblingCount(num)}
                    className="flex-1 min-w-[60px]"
                  >
                    {num === 5 ? '5+' : num}
                  </Button>
                ))}
              </div>
            </div>

            {siblingCount > 0 && (
              <>
                <Separator />
                <p className="text-xs text-muted-foreground">
                  💡 Click Next to enter details for each sibling
                </p>
              </>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button onClick={handleNext}>
                {siblingCount === 0 ? 'Finish' : 'Next'} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Sibling Details */}
        {step === 3 && (
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {siblings.map((sibling, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <h4 className="font-medium">Sibling {index + 1}</h4>
                
                <div className="space-y-2">
                  <Label htmlFor={`sibling-name-${index}`}>Name *</Label>
                  <Input
                    id={`sibling-name-${index}`}
                    value={sibling.name}
                    onChange={(e) => updateSibling(index, 'name', e.target.value)}
                    placeholder="Enter name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Gender</Label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={sibling.gender === 'male' ? 'default' : 'outline'}
                      onClick={() => updateSibling(index, 'gender', 'male')}
                      className="flex-1"
                    >
                      Male
                    </Button>
                    <Button
                      size="sm"
                      variant={sibling.gender === 'female' ? 'default' : 'outline'}
                      onClick={() => updateSibling(index, 'gender', 'female')}
                      className="flex-1"
                    >
                      Female
                    </Button>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`sibling-married-${index}`}
                    checked={sibling.isMarried}
                    onChange={(e) => updateSibling(index, 'isMarried', e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor={`sibling-married-${index}`} className="text-sm cursor-pointer">
                    Married
                  </Label>
                </div>

                {sibling.isMarried && (
                  <>
                    <div className="space-y-2 pl-6">
                      <Label htmlFor={`sibling-spouse-${index}`}>Spouse's Name *</Label>
                      <Input
                        id={`sibling-spouse-${index}`}
                        value={sibling.spouseName || ''}
                        onChange={(e) => updateSibling(index, 'spouseName', e.target.value)}
                        placeholder="Enter spouse's name"
                      />
                    </div>

                    <div className="space-y-2 pl-6">
                      <Label>Spouse's Gender</Label>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={sibling.spouseGender === 'male' ? 'default' : 'outline'}
                          onClick={() => updateSibling(index, 'spouseGender', 'male')}
                          className="flex-1 text-xs"
                        >
                          Male
                        </Button>
                        <Button
                          size="sm"
                          variant={sibling.spouseGender === 'female' ? 'default' : 'outline'}
                          onClick={() => updateSibling(index, 'spouseGender', 'female')}
                          className="flex-1 text-xs"
                        >
                          Female
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground italic">
                        Auto-detected as {sibling.spouseGender}
                      </p>
                    </div>
                  </>
                )}
              </div>
            ))}

            <div className="flex justify-between pt-4 sticky bottom-0 bg-white">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button onClick={handleComplete} disabled={!allSiblingsValid}>
                Complete
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
