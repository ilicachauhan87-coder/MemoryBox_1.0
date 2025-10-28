import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ChevronLeft, ChevronRight, Home, Users, Heart, Baby, Check, X } from 'lucide-react';

interface SiblingData {
  name: string;
  gender: 'male' | 'female';
  isMarried: boolean;
  spouseName: string;
  spouseGender: 'male' | 'female';
}

interface ChildData {
  name: string;
  gender: 'male' | 'female';
  isMarried: boolean;
  spouseName: string;
  spouseGender: 'male' | 'female';
}

interface WizardData {
  father: string;
  mother: string;
  parentsNotTogether: boolean;
  siblingCount: number;
  siblings: SiblingData[];
  hasSpouse: boolean;
  spouse: string;
  spouseGender: 'male' | 'female';
  childrenCount: number;
  children: ChildData[];
}

interface WelcomeWizardProps {
  isOpen: boolean;
  onComplete: (data: WizardData) => void;
  onSkip: () => void;
  userGender: 'male' | 'female';
}

const STEPS = {
  WELCOME: 0,
  PARENTS: 1,
  SIBLINGS: 2,
  SPOUSE: 3,
  CHILDREN: 4,
  PREVIEW: 5
};

const TOTAL_STEPS = 4; // Not counting welcome and preview

export const WelcomeWizard: React.FC<WelcomeWizardProps> = ({
  isOpen,
  onComplete,
  onSkip,
  userGender
}) => {
  const [currentStep, setCurrentStep] = useState(STEPS.WELCOME);
  const [wizardData, setWizardData] = useState<WizardData>({
    father: '',
    mother: '',
    parentsNotTogether: false,
    siblingCount: 0,
    siblings: [],
    hasSpouse: false,
    spouse: '',
    spouseGender: userGender === 'male' ? 'female' : 'male',
    childrenCount: 0,
    children: []
  });

  // ✅ FIX 4: Wizard Safety Check - Verify root user exists before proceeding
  React.useEffect(() => {
    if (!isOpen) return;

    const currentUserId = localStorage.getItem('current_user_id');
    if (!currentUserId) {
      console.error('❌ WelcomeWizard: No current user ID found');
      return;
    }

    const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
    if (!userProfile) {
      console.error('❌ WelcomeWizard: No user profile found');
      return;
    }

    const userData = JSON.parse(userProfile);
    if (!userData.family_id) {
      console.error('❌ WelcomeWizard: No family ID found');
      return;
    }

    // Load tree data to check for root user
    const treeData = localStorage.getItem(`familyTree_${userData.family_id}`);
    if (treeData) {
      try {
        const tree = JSON.parse(treeData);
        const people = Array.isArray(tree) ? tree : tree.people || [];
        
        // ✅ Check if root user exists
        const hasRootUser = people.some((p: any) => p.isRoot === true || p.id === currentUserId);
        
        if (!hasRootUser && people.length === 0) {
          console.log('📝 WelcomeWizard: Empty tree detected (new user or fresh start)');
          console.log('   This is normal for new users - wizard will help create family tree');
          // Tree is completely empty - this is NORMAL for brand new users
          // Wizard will open and guide them through tree creation
          // DO NOT redirect or show errors
        } else if (!hasRootUser && people.length > 0) {
          console.warn('⚠️ WelcomeWizard: No root user found but tree has people');
          console.warn('   Auto-fixing: Setting first person as root...');
          
          // Auto-fix: Set first person as root
          people[0].isRoot = true;
          const saveData = Array.isArray(tree) ? people : tree;
          if (Array.isArray(tree)) {
            localStorage.setItem(`familyTree_${userData.family_id}`, JSON.stringify(people));
          } else {
            tree.people = people;
            localStorage.setItem(`familyTree_${userData.family_id}`, JSON.stringify(tree));
          }
          console.log('✅ Auto-fixed: Set', people[0].firstName, 'as root user');
          
          // 🔧 CRITICAL FIX: Also sync tree to database for bidirectional sync
          (async () => {
            try {
              const { DatabaseService } = await import('../utils/supabase/persistent-database');
              await DatabaseService.saveFamilyTree(userData.family_id, saveData);
              console.log('✅ Root auto-fix synced: Tree → Database (bidirectional sync complete)');
            } catch (treeDbError) {
              console.warn('⚠️ Database tree sync failed (using localStorage only):', treeDbError);
              // Non-fatal - localStorage is the backup
            }
          })();
        } else {
          console.log('✅ WelcomeWizard: Root user verified');
        }
      } catch (error) {
        console.error('❌ WelcomeWizard: Error checking root user:', error);
      }
    } else {
      console.log('ℹ️ WelcomeWizard: No existing tree data (first time user)');
    }
  }, [isOpen, onSkip]);

  const handleNext = () => {
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSkipStep = () => {
    // Skip current step and move to next
    if (currentStep === STEPS.PARENTS) {
      setWizardData(prev => ({ ...prev, father: '', mother: '' }));
    } else if (currentStep === STEPS.SIBLINGS) {
      setWizardData(prev => ({ ...prev, siblingCount: 0, siblings: [] }));
    } else if (currentStep === STEPS.SPOUSE) {
      setWizardData(prev => ({ ...prev, hasSpouse: false, spouse: '' }));
    } else if (currentStep === STEPS.CHILDREN) {
      setWizardData(prev => ({ ...prev, childrenCount: 0, children: [] }));
    }
    handleNext();
  };

  const handleFinish = () => {
    onComplete(wizardData);
  };

  const getProgress = () => {
    if (currentStep === STEPS.WELCOME) return 0;
    if (currentStep === STEPS.PREVIEW) return 100;
    return ((currentStep - 1) / TOTAL_STEPS) * 100;
  };

  const updateSiblingCount = (count: number) => {
    const newSiblings = Array.from({ length: count }, (_, i) => 
      wizardData.siblings[i] || { 
        name: '', 
        gender: 'male' as const, 
        isMarried: false, 
        spouseName: '', 
        spouseGender: 'female' as const 
      }
    );
    setWizardData(prev => ({ ...prev, siblingCount: count, siblings: newSiblings }));
  };

  const updateSibling = (index: number, field: 'name' | 'gender' | 'isMarried' | 'spouseName' | 'spouseGender', value: string | boolean) => {
    const newSiblings = [...wizardData.siblings];
    if (field === 'name') {
      newSiblings[index] = { ...newSiblings[index], name: value as string };
    } else if (field === 'gender') {
      const newGender = value as 'male' | 'female';
      // Auto-update spouse gender to opposite when sibling gender changes
      const autoSpouseGender = newGender === 'male' ? 'female' : 'male';
      newSiblings[index] = { 
        ...newSiblings[index], 
        gender: newGender,
        spouseGender: autoSpouseGender
      };
    } else if (field === 'isMarried') {
      newSiblings[index] = { ...newSiblings[index], isMarried: value as boolean };
    } else if (field === 'spouseName') {
      newSiblings[index] = { ...newSiblings[index], spouseName: value as string };
    } else if (field === 'spouseGender') {
      newSiblings[index] = { ...newSiblings[index], spouseGender: value as 'male' | 'female' };
    }
    setWizardData(prev => ({ ...prev, siblings: newSiblings }));
  };

  const updateChildrenCount = (count: number) => {
    const newChildren = Array.from({ length: count }, (_, i) => 
      wizardData.children[i] || { 
        name: '', 
        gender: 'male' as const, 
        isMarried: false, 
        spouseName: '', 
        spouseGender: 'female' as const 
      }
    );
    setWizardData(prev => ({ ...prev, childrenCount: count, children: newChildren }));
  };

  const updateChild = (index: number, field: 'name' | 'gender' | 'isMarried' | 'spouseName' | 'spouseGender', value: string | boolean) => {
    const newChildren = [...wizardData.children];
    if (field === 'name') {
      newChildren[index] = { ...newChildren[index], name: value as string };
    } else if (field === 'gender') {
      const newGender = value as 'male' | 'female';
      // Auto-update spouse gender to opposite when child gender changes
      const autoSpouseGender = newGender === 'male' ? 'female' : 'male';
      newChildren[index] = { 
        ...newChildren[index], 
        gender: newGender,
        spouseGender: autoSpouseGender
      };
    } else if (field === 'isMarried') {
      newChildren[index] = { ...newChildren[index], isMarried: value as boolean };
    } else if (field === 'spouseName') {
      newChildren[index] = { ...newChildren[index], spouseName: value as string };
    } else if (field === 'spouseGender') {
      newChildren[index] = { ...newChildren[index], spouseGender: value as 'male' | 'female' };
    }
    setWizardData(prev => ({ ...prev, children: newChildren }));
  };

  const getTotalPeople = () => {
    let count = 0;
    if (wizardData.father) count++;
    if (wizardData.mother) count++;
    count += wizardData.siblings.filter(s => s.name).length;
    count += wizardData.siblings.filter(s => s.isMarried && s.spouseName).length; // Sibling spouses
    if (wizardData.hasSpouse && wizardData.spouse) count++;
    count += wizardData.children.filter(c => c.name).length;
    count += wizardData.children.filter(c => c.isMarried && c.spouseName).length; // Child spouses
    return count;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onSkip(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto sm:max-w-lg p-4 sm:p-6" aria-describedby={undefined}>
        
        {/* Welcome Screen */}
        {currentStep === STEPS.WELCOME && (
          <>
            <DialogHeader>
              <div className="flex justify-center mb-4">
                <Home className="w-16 h-16 text-blue-500" />
              </div>
              <DialogTitle className="text-center text-2xl">
                👋 Welcome to Family Tree Builder!
              </DialogTitle>
            </DialogHeader>
            <div className="text-center space-y-4 pt-4 text-muted-foreground">
              <div>Let's build your family tree together.</div>
              <div>We'll start by adding your immediate family members. Don't worry - you can always add or edit people later!</div>
              <div className="font-medium text-foreground">This will only take 2 minutes.</div>
            </div>
            <div className="flex flex-col gap-3 mt-6">
              <Button onClick={handleNext} size="lg" className="w-full">
                Get Started
              </Button>
              <Button onClick={onSkip} variant="outline" size="lg" className="w-full">
                Skip - Start Blank
              </Button>
            </div>
          </>
        )}

        {/* Step 1: Parents */}
        {currentStep === STEPS.PARENTS && (
          <>
            <DialogHeader>
              <DialogTitle>Step 1 of 4: Your Parents</DialogTitle>
              <Progress value={getProgress()} className="mt-2" />
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="father">👨 Father's Name</Label>
                <Input
                  id="father"
                  placeholder="e.g., John Smith"
                  value={wizardData.father}
                  onChange={(e) => setWizardData(prev => ({ ...prev, father: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mother">👩 Mother's Name</Label>
                <Input
                  id="mother"
                  placeholder="e.g., Mary Smith"
                  value={wizardData.mother}
                  onChange={(e) => setWizardData(prev => ({ ...prev, mother: e.target.value }))}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="parentsNotTogether"
                  checked={wizardData.parentsNotTogether}
                  onChange={(e) => setWizardData(prev => ({ ...prev, parentsNotTogether: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="parentsNotTogether" className="text-sm cursor-pointer">
                  My parents are not together
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">(We'll still add both to your tree)</p>
            </div>

            <div className="flex gap-2 mt-6">
              <Button onClick={handleBack} variant="outline" className="flex-1">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button onClick={handleSkipStep} variant="ghost" className="flex-1">
                Skip Parents
              </Button>
              <Button onClick={handleNext} className="flex-1">
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </>
        )}

        {/* Step 2: Siblings */}
        {currentStep === STEPS.SIBLINGS && (
          <>
            <DialogHeader>
              <DialogTitle>Step 2 of 4: Your Siblings</DialogTitle>
              <Progress value={getProgress()} className="mt-2" />
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>How many siblings do you have?</Label>
                <div className="flex gap-2 flex-wrap">
                  {[0, 1, 2, 3, 4, 5].map(num => (
                    <Button
                      key={num}
                      variant={wizardData.siblingCount === num ? 'default' : 'outline'}
                      onClick={() => updateSiblingCount(num)}
                      className="flex-1 min-w-[60px]"
                    >
                      {num === 5 ? '5+' : num}
                    </Button>
                  ))}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                💡 Tip: Include half-siblings and step-siblings if you'd like
              </p>

              {wizardData.siblingCount > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {wizardData.siblings.map((sibling, index) => (
                      <div key={index} className="space-y-2 p-3 border rounded-lg bg-white">
                        <Label className="text-sm font-medium">Sibling {index + 1}</Label>
                        <Input
                          placeholder="e.g., Sarah"
                          value={sibling.name}
                          onChange={(e) => updateSibling(index, 'name', e.target.value)}
                        />
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
                        
                        {/* Married checkbox */}
                        <div className="flex items-center gap-2 pt-2">
                          <input
                            type="checkbox"
                            id={`sibling-${index}-married`}
                            checked={sibling.isMarried}
                            onChange={(e) => updateSibling(index, 'isMarried', e.target.checked)}
                            className="rounded"
                          />
                          <Label htmlFor={`sibling-${index}-married`} className="text-sm cursor-pointer">
                            Married?
                          </Label>
                        </div>

                        {/* Spouse details if married */}
                        {sibling.isMarried && (
                          <div className="pl-6 space-y-2 border-l-2 border-pink-300">
                            <Label className="text-xs text-muted-foreground">💑 Spouse Details</Label>
                            <Input
                              placeholder="Spouse name"
                              value={sibling.spouseName}
                              onChange={(e) => updateSibling(index, 'spouseName', e.target.value)}
                              className="text-sm"
                            />
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
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <Button onClick={handleBack} variant="outline" className="flex-1">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button onClick={handleSkipStep} variant="ghost" className="flex-1">
                Skip Siblings
              </Button>
              <Button onClick={handleNext} className="flex-1">
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </>
        )}

        {/* Step 3: Spouse/Partner */}
        {currentStep === STEPS.SPOUSE && (
          <>
            <DialogHeader>
              <DialogTitle>Step 3 of 4: Your Spouse/Partner</DialogTitle>
              <Progress value={getProgress()} className="mt-2" />
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Are you married or in a partnership?</Label>
                <div className="flex gap-2">
                  <Button
                    variant={wizardData.hasSpouse ? 'default' : 'outline'}
                    onClick={() => setWizardData(prev => ({ ...prev, hasSpouse: true }))}
                    className="flex-1"
                  >
                    Yes
                  </Button>
                  <Button
                    variant={!wizardData.hasSpouse ? 'default' : 'outline'}
                    onClick={() => setWizardData(prev => ({ ...prev, hasSpouse: false }))}
                    className="flex-1"
                  >
                    No
                  </Button>
                </div>
              </div>

              {wizardData.hasSpouse && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label htmlFor="spouse">💑 Spouse/Partner's Name</Label>
                    <Input
                      id="spouse"
                      placeholder="e.g., Alex Johnson"
                      value={wizardData.spouse}
                      onChange={(e) => setWizardData(prev => ({ ...prev, spouse: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Gender:</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={wizardData.spouseGender === 'male' ? 'default' : 'outline'}
                        onClick={() => setWizardData(prev => ({ ...prev, spouseGender: 'male' }))}
                        className="flex-1"
                      >
                        Male
                      </Button>
                      <Button
                        variant={wizardData.spouseGender === 'female' ? 'default' : 'outline'}
                        onClick={() => setWizardData(prev => ({ ...prev, spouseGender: 'female' }))}
                        className="flex-1"
                      >
                        Female
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <Button onClick={handleBack} variant="outline" className="flex-1">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button onClick={handleSkipStep} variant="ghost" className="flex-1">
                Skip
              </Button>
              <Button onClick={handleNext} className="flex-1">
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </>
        )}

        {/* Step 4: Children */}
        {currentStep === STEPS.CHILDREN && (
          <>
            <DialogHeader>
              <DialogTitle>Step 4 of 4: Your Children</DialogTitle>
              <Progress value={getProgress()} className="mt-2" />
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>How many children do you have?</Label>
                <div className="flex gap-2 flex-wrap">
                  {[0, 1, 2, 3, 4, 5].map(num => (
                    <Button
                      key={num}
                      variant={wizardData.childrenCount === num ? 'default' : 'outline'}
                      onClick={() => updateChildrenCount(num)}
                      className="flex-1 min-w-[60px]"
                    >
                      {num === 5 ? '5+' : num}
                    </Button>
                  ))}
                </div>
              </div>

              {wizardData.childrenCount > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {wizardData.children.map((child, index) => (
                      <div key={index} className="space-y-2 p-3 border rounded-lg bg-white">
                        <Label className="text-sm font-medium">Child {index + 1}</Label>
                        <Input
                          placeholder="e.g., Emma"
                          value={child.name}
                          onChange={(e) => updateChild(index, 'name', e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={child.gender === 'male' ? 'default' : 'outline'}
                            onClick={() => updateChild(index, 'gender', 'male')}
                            className="flex-1"
                          >
                            Male
                          </Button>
                          <Button
                            size="sm"
                            variant={child.gender === 'female' ? 'default' : 'outline'}
                            onClick={() => updateChild(index, 'gender', 'female')}
                            className="flex-1"
                          >
                            Female
                          </Button>
                        </div>
                        
                        {/* Married checkbox */}
                        <div className="flex items-center gap-2 pt-2">
                          <input
                            type="checkbox"
                            id={`child-${index}-married`}
                            checked={child.isMarried}
                            onChange={(e) => updateChild(index, 'isMarried', e.target.checked)}
                            className="rounded"
                          />
                          <Label htmlFor={`child-${index}-married`} className="text-sm cursor-pointer">
                            Married?
                          </Label>
                        </div>

                        {/* Spouse details if married */}
                        {child.isMarried && (
                          <div className="pl-6 space-y-2 border-l-2 border-pink-300">
                            <Label className="text-xs text-muted-foreground">💑 Spouse Details</Label>
                            <Input
                              placeholder="Spouse name"
                              value={child.spouseName}
                              onChange={(e) => updateChild(index, 'spouseName', e.target.value)}
                              className="text-sm"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={child.spouseGender === 'male' ? 'default' : 'outline'}
                                onClick={() => updateChild(index, 'spouseGender', 'male')}
                                className="flex-1 text-xs"
                              >
                                Male
                              </Button>
                              <Button
                                size="sm"
                                variant={child.spouseGender === 'female' ? 'default' : 'outline'}
                                onClick={() => updateChild(index, 'spouseGender', 'female')}
                                className="flex-1 text-xs"
                              >
                                Female
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground italic">
                              Auto-detected as {child.spouseGender}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    💡 Tip: You can add more details and relationships later
                  </p>
                </>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <Button onClick={handleBack} variant="outline" className="flex-1">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button onClick={handleSkipStep} variant="ghost" className="flex-1">
                Skip Children
              </Button>
              <Button onClick={handleNext} className="flex-1">
                Finish
                <Check className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </>
        )}

        {/* Preview/Confirmation */}
        {currentStep === STEPS.PREVIEW && (
          <>
            <DialogHeader>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="w-10 h-10 text-green-600" />
                </div>
              </div>
              <DialogTitle className="text-center text-2xl">
                🎉 Your Family Tree is Ready!
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                <p className="font-medium">We're creating your tree with:</p>
                {wizardData.father && wizardData.mother && (
                  <p className="text-sm">👨‍👩 Parents: {wizardData.father} & {wizardData.mother}</p>
                )}
                {wizardData.father && !wizardData.mother && (
                  <p className="text-sm">👨 Father: {wizardData.father}</p>
                )}
                {!wizardData.father && wizardData.mother && (
                  <p className="text-sm">👩 Mother: {wizardData.mother}</p>
                )}
                {wizardData.siblings.filter(s => s.name).length > 0 && (
                  <div className="text-sm">
                    <p>👨‍👩‍👧‍👦 Siblings: {wizardData.siblings.filter(s => s.name).length}</p>
                    {wizardData.siblings.filter(s => s.name).map((s, i) => (
                      <p key={i} className="text-xs ml-4">
                        • {s.name}{s.isMarried && s.spouseName ? ` & spouse ${s.spouseName}` : ''}
                      </p>
                    ))}
                  </div>
                )}
                {wizardData.hasSpouse && wizardData.spouse && (
                  <p className="text-sm">💑 Spouse: {wizardData.spouse}</p>
                )}
                {wizardData.children.filter(c => c.name).length > 0 && (
                  <div className="text-sm">
                    <p>👶 Children: {wizardData.children.filter(c => c.name).length}</p>
                    {wizardData.children.filter(c => c.name).map((c, i) => (
                      <p key={i} className="text-xs ml-4">
                        • {c.name}{c.isMarried && c.spouseName ? ` & spouse ${c.spouseName}` : ''}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">📊 Total: {getTotalPeople()} people with all relationships automatically linked</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="font-medium text-sm">📝 What's Next?</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Click any person to edit details</li>
                  <li>Add photos via Profile menu</li>
                  <li>Add extended family members</li>
                  <li>Connect more relationships</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button onClick={handleBack} variant="outline" className="flex-1">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Edit
              </Button>
              <Button onClick={handleFinish} className="flex-1 bg-green-600 hover:bg-green-700">
                🚀 Build My Tree!
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
