import React, { useState, useCallback } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Calendar, CalendarDays, Plus, User, Users, Baby, Crown, Heart } from 'lucide-react';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { toast } from 'sonner@2.0.3';
import { formatDateForDisplay, formatDateForStorage, isValidDDMMYYYY, formatDateInput } from '../utils/dateHelpers';

interface PersonData {
  firstName: string;
  lastName: string;
  gender: 'male' | 'female';
  generation: -2 | -1 | 0 | 1 | 2;
  status: 'alive' | 'deceased';
  dateOfBirth: string;
  relationshipType?: string;
}

interface GenerationInfo {
  generation: number;
  title: string;
  maxPeople: number;
  currentCount: number;
  description: string;
  icon: React.ReactNode;
}

interface PersonPaletteProps {
  onAddPerson: (personData: PersonData) => void;
  generationLimits: Record<string, { current: number; max: number }>;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  suggestedGeneration?: number;
}

const GENERATION_INFO: Record<string, Omit<GenerationInfo, 'currentCount'>> = {
  '-2': {
    generation: -2,
    title: 'Grandparents',
    maxPeople: 4,
    description: 'Maternal & Paternal Grandparents',
    icon: <Crown className="w-4 h-4" />
  },
  '-1': {
    generation: -1,
    title: 'Parents & Aunts/Uncles',
    maxPeople: 20,
    description: 'Parents, in-laws, and Parents\' Siblings & their Spouses',
    icon: <Users className="w-4 h-4" />
  },
  '0': {
    generation: 0,
    title: 'Your Generation',
    maxPeople: 78,
    description: 'You, Spouse, Siblings, Siblings-in-Law, Cousins & their spouses',
    icon: <User className="w-4 h-4" />
  },
  '1': {
    generation: 1,
    title: 'Children',
    maxPeople: 42,
    description: 'Your Children, Nephew/Niece and their Spouses',
    icon: <Baby className="w-4 h-4" />
  },
  '2': {
    generation: 2,
    title: 'Grandchildren',
    maxPeople: 18,
    description: 'Children of your children & their spouses',
    icon: <Heart className="w-4 h-4" />
  }
};

// Contextual relationship types based on generation (same as ContextualPersonDialog)
const GENERATION_RELATIONSHIP_TYPES = {
  '-2': [
    { value: 'maternal-grandparent', label: 'Maternal Grandparent', icon: '👴' },
    { value: 'paternal-grandparent', label: 'Paternal Grandparent', icon: '👵' },
  ],
  '-1': [
    { value: 'parent', label: 'Parent', icon: '👨' },
    { value: 'parent-in-law', label: 'Parent-in-Law', icon: '👨‍👩' },
    { value: 'aunt-uncle', label: 'Aunt/Uncle', icon: '👨‍👩' },
    { value: 'aunt-uncle-spouse', label: 'Aunt/Uncle\'s Spouse', icon: '💑' },
  ],
  '0': [
    { value: 'spouse', label: 'Spouse/Partner', icon: '💑' },
    { value: 'sibling', label: 'Sibling', icon: '👫' },
    { value: 'sibling-spouse', label: 'Sibling\'s Spouse', icon: '💍' },
    { value: 'sibling-in-law', label: 'Sibling-in-Law', icon: '👨‍👩' },
    { value: 'sibling-in-law-spouse', label: 'Sibling-in-Law\'s Spouse', icon: '💑' },
    { value: 'cousin', label: 'Cousin', icon: '👥' },
    { value: 'cousin-spouse', label: 'Cousin\'s Spouse', icon: '💕' },
  ],
  '1': [
    { value: 'child', label: 'Child', icon: '👶' },
    { value: 'child-in-law', label: 'Child-in-Law', icon: '👨‍👩' },
    { value: 'sibling-in-law-child', label: 'Sibling-in-Law\'s Child', icon: '👶' },
    { value: 'sibling-in-law-child-spouse', label: 'Sibling-in-Law\'s Child\'s Spouse', icon: '💑' },
    { value: 'cousin-child', label: 'Cousin\'s Child', icon: '👶' },
    { value: 'cousin-child-spouse', label: 'Cousin\'s Child\'s Spouse', icon: '💕' },
  ],
  '2': [
    { value: 'grandchild', label: 'Grandchild', icon: '👶' },
    { value: 'sibling-grandchild', label: 'Sibling\'s Grandchild', icon: '👶' },
    { value: 'sibling-in-law-grandchild', label: 'Sibling-in-Law\'s Grandchild', icon: '👶' },
    { value: 'cousin-grandchild', label: 'Cousin\'s Grandchild', icon: '👶' },
  ]
};

export const PersonPalette: React.FC<PersonPaletteProps> = ({
  onAddPerson,
  generationLimits,
  isOpen,
  onOpenChange,
  suggestedGeneration = 0
}) => {
  const [personData, setPersonData] = useState<PersonData>({
    firstName: '',
    lastName: '',
    gender: 'male',
    generation: suggestedGeneration as -2 | -1 | 0 | 1 | 2,
    status: 'alive',
    dateOfBirth: '',
    relationshipType: ''
  });

  const [step, setStep] = useState<'generation' | 'details'>('generation');

  const resetForm = useCallback(() => {
    setPersonData({
      firstName: '',
      lastName: '',
      gender: 'male',
      generation: suggestedGeneration as -2 | -1 | 0 | 1 | 2,
      status: 'alive',
      dateOfBirth: '',
      relationshipType: ''
    });
    setStep('generation');
  }, [suggestedGeneration]);

  const handleGenerationSelect = (generation: number) => {
    // 🔧 CRITICAL FIX: Handle both string and numeric keys
    const genStr = generation.toString();
    const genLimits = generationLimits[genStr] || generationLimits[generation] || { current: 0, max: 999 };
    if (genLimits.current >= genLimits.max) {
      toast.error(`Generation ${generation} is at capacity (${genLimits.current}/${genLimits.max})`);
      return;
    }
    
    setPersonData(prev => ({ ...prev, generation: generation as -2 | -1 | 0 | 1 | 2 }));
    setStep('details');
  };

  const handleSubmit = () => {
    if (!personData.firstName.trim()) {
      toast.error('First name is required');
      return;
    }

    // Validate generation capacity one more time
    // 🔧 CRITICAL FIX: Handle both string and numeric keys
    const genStr = personData.generation.toString();
    const genLimits = generationLimits[genStr] || generationLimits[personData.generation] || { current: 0, max: 999 };
    if (genLimits.current >= genLimits.max) {
      toast.error(`Generation ${personData.generation} is at capacity`);
      return;
    }

    onAddPerson(personData);
    resetForm();
    onOpenChange(false);
  };

  const goBack = () => {
    setStep('generation');
  };

  const getGenerationColor = (generation: number, current: number, max: number) => {
    // Match the generation band colors from the canvas
    const baseColors: Record<number, string> = {
      '-2': 'bg-purple-50 border-purple-200',
      '-1': 'bg-blue-50 border-blue-200',
      '0': 'bg-green-50 border-green-200',
      '1': 'bg-yellow-50 border-yellow-200',
      '2': 'bg-orange-50 border-orange-200'
    };
    
    // Show red if at capacity, otherwise use generation band color
    if (current >= max) return 'border-red-200 bg-red-50 text-red-700';
    return baseColors[generation] || 'border-gray-200 bg-gray-50';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Person
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 'generation' ? 'Choose Generation' : 'Add Family Member'}
          </DialogTitle>
          <DialogDescription>
            {step === 'generation' 
              ? 'Select which generation this person belongs to'
              : `Adding to Generation ${personData.generation}: ${GENERATION_INFO[personData.generation.toString()].title}`
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'generation' ? (
          <div className="space-y-3">
            {['0', '1', '-1', '2', '-2'].map((gen) => {
              const info = GENERATION_INFO[gen];
              // 🔧 CRITICAL FIX: Handle both string and numeric keys + provide fallback
              // Sometimes JSON.parse converts string keys to numbers, breaking the lookup
              const genNum = parseInt(gen);
              const genLimits = generationLimits[gen] || generationLimits[genNum] || { current: 0, max: info.maxPeople };
              const isAtCapacity = genLimits.current >= genLimits.max;
              const colorClass = getGenerationColor(info.generation, genLimits.current, genLimits.max);
              
              return (
                <Card 
                  key={gen}
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${colorClass} ${
                    isAtCapacity ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-300'
                  }`}
                  onClick={() => !isAtCapacity && handleGenerationSelect(info.generation)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {info.icon}
                      <div>
                        <div className="font-medium">{info.title}</div>
                        <div className="text-sm opacity-75">{info.description}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={isAtCapacity ? 'destructive' : 'secondary'}>
                        {genLimits.current}/{genLimits.max}
                      </Badge>
                      {info.generation === suggestedGeneration && (
                        <div className="text-xs text-blue-600 mt-1">Suggested</div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Generation confirmation */}
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              {GENERATION_INFO[personData.generation.toString()].icon}
              <span className="text-sm font-medium">
                {GENERATION_INFO[personData.generation.toString()].title}
              </span>
              <Button variant="ghost" size="sm" onClick={goBack}>
                Change
              </Button>
            </div>

            <Separator />

            {/* Relationship Type Selection */}
            {(() => {
              const relationshipOptions = GENERATION_RELATIONSHIP_TYPES[personData.generation.toString() as keyof typeof GENERATION_RELATIONSHIP_TYPES] || [];
              return relationshipOptions.length > 0 ? (
                <div className="space-y-2">
                  <Label>Relationship Type (Optional)</Label>
                  <Select 
                    value={personData.relationshipType || ''} 
                    onValueChange={(value: string) => setPersonData(prev => ({ ...prev, relationshipType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select relationship type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {relationshipOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          <span className="flex items-center gap-2">
                            <span>{option.icon}</span>
                            <span>{option.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    This helps identify their role in the family (optional)
                  </p>
                </div>
              ) : null;
            })()}

            {/* Personal details form */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={personData.firstName}
                  onChange={(e) => setPersonData(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="John"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={personData.lastName}
                  onChange={(e) => setPersonData(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Gender</Label>
                <Select 
                  value={personData.gender} 
                  onValueChange={(value: 'male' | 'female') => setPersonData(prev => ({ ...prev, gender: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select 
                  value={personData.status} 
                  onValueChange={(value: 'alive' | 'deceased') => setPersonData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alive">Living</SelectItem>
                    <SelectItem value="deceased">Deceased</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="dateOfBirth">Date of Birth (Optional)</Label>
              <div className="space-y-1">
                <div className="relative">
                  <Input
                    id="dateOfBirth"
                    type="text"
                    value={formatDateForDisplay(personData.dateOfBirth)}
                    onChange={(e) => {
                      const formatted = formatDateInput(e.target.value);
                      setPersonData(prev => ({ ...prev, dateOfBirth: formatted }));
                    }}
                    onBlur={(e) => {
                      // Convert to storage format on blur
                      const displayValue = e.target.value;
                      if (displayValue && isValidDDMMYYYY(displayValue)) {
                        const storageValue = formatDateForStorage(displayValue);
                        setPersonData(prev => ({ ...prev, dateOfBirth: storageValue }));
                      }
                    }}
                    placeholder="DD-MM-YYYY (e.g., 15-03-1990)"
                    maxLength={10}
                  />
                  <CalendarDays className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {personData.dateOfBirth && !isValidDDMMYYYY(formatDateForDisplay(personData.dateOfBirth)) && (
                  <p className="text-sm text-destructive">Please enter date in DD-MM-YYYY format</p>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={goBack} className="flex-1">
                Back
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!personData.firstName.trim()}
                className="flex-1"
              >
                Add Family Member
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};