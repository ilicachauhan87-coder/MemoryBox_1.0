import React, { useState, useCallback } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Heart, Users, Baby, Crown, AlertTriangle, CheckCircle } from 'lucide-react';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { toast } from 'sonner@2.0.3';

interface Person {
  id: string;
  firstName: string;
  lastName?: string;
  gender: 'male' | 'female';
  generation: number;
  status: 'alive' | 'deceased';
  isRoot?: boolean;
}

interface ConnectionTypeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  fromPerson: Person | null;
  toPerson: Person | null;
  onCreateConnection: (type: 'spouse' | 'parent-child' | 'sibling') => void;
  existingRelationships: Array<{
    id: string;
    type: 'spouse' | 'parent-child' | 'sibling';
    from: string;
    to: string;
  }>;
}

interface ConnectionOption {
  type: 'spouse' | 'parent-child' | 'sibling';
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  validationRules: string[];
}

const CONNECTION_OPTIONS: ConnectionOption[] = [
  {
    type: 'spouse',
    title: 'Marriage/Partnership',
    description: 'Romantic partners, married couples, or life partners',
    icon: <Heart className="w-5 h-5" />,
    color: 'border-red-200 bg-red-50 text-red-700',
    validationRules: [
      'Must be in the same generation',
      'Each person can only have one spouse',
      'Cannot marry yourself or family members'
    ]
  },
  {
    type: 'parent-child',
    title: 'Parent-Child',
    description: 'Biological or adopted parent-child relationships',
    icon: <Baby className="w-5 h-5" />,
    color: 'border-blue-200 bg-blue-50 text-blue-700',
    validationRules: [
      'Must be exactly one generation apart',
      'Parent must be in higher generation (closer to -2)',
      'Child must be in lower generation (closer to +2)'
    ]
  },
  {
    type: 'sibling',
    title: 'Sibling',
    description: 'Brothers, sisters, and step-siblings in the same generation',
    icon: <Users className="w-5 h-5" />,
    color: 'border-green-200 bg-green-50 text-green-700',
    validationRules: [
      'Must be in the same generation',
      'Cannot be siblings with yourself',
      'Siblings should share at least one parent'
    ]
  }
];

export const ConnectionTypeDialog: React.FC<ConnectionTypeDialogProps> = ({
  isOpen,
  onOpenChange,
  fromPerson,
  toPerson,
  onCreateConnection,
  existingRelationships
}) => {
  const [selectedType, setSelectedType] = useState<'spouse' | 'parent-child' | null>(null);

  const getPersonDisplayName = (person: Person | null) => {
    if (!person) return 'Unknown';
    return `${person.firstName} ${person.lastName || ''}`.trim();
  };

  const getGenerationName = (generation: number) => {
    const names: Record<number, string> = {
      '-2': 'Grandparents',
      '-1': 'Parents',
      '0': 'Your Generation',
      '1': 'Children',
      '2': 'Grandchildren'
    };
    return names[generation] || `Generation ${generation}`;
  };

  const validateConnection = useCallback((type: 'spouse' | 'parent-child' | 'sibling') => {
    if (!fromPerson || !toPerson) return { isValid: false, issues: ['Missing person information'] };

    const issues: string[] = [];

    // Check for self-connection
    if (fromPerson.id === toPerson.id) {
      issues.push('Cannot connect a person to themselves');
    }

    // Check for existing relationship
    const existingConnection = existingRelationships.find(rel => 
      (rel.from === fromPerson.id && rel.to === toPerson.id) ||
      (rel.from === toPerson.id && rel.to === fromPerson.id)
    );

    if (existingConnection) {
      const relTypeLabel = existingConnection.type === 'spouse' ? 'marriage' : 
                          existingConnection.type === 'sibling' ? 'sibling' : 'parent-child';
      issues.push(`These people already have a ${relTypeLabel} relationship`);
    }

    if (type === 'spouse') {
      // Spouse validation
      if (fromPerson.generation !== toPerson.generation) {
        issues.push(`Spouses must be in the same generation. ${getPersonDisplayName(fromPerson)} is in ${getGenerationName(fromPerson.generation)} while ${getPersonDisplayName(toPerson)} is in ${getGenerationName(toPerson.generation)}`);
      }

      // Check if either person already has a spouse
      const fromPersonHasSpouse = existingRelationships.some(rel => 
        rel.type === 'spouse' && (rel.from === fromPerson.id || rel.to === fromPerson.id)
      );
      const toPersonHasSpouse = existingRelationships.some(rel => 
        rel.type === 'spouse' && (rel.from === toPerson.id || rel.to === toPerson.id)
      );

      if (fromPersonHasSpouse) {
        issues.push(`${getPersonDisplayName(fromPerson)} already has a spouse`);
      }
      if (toPersonHasSpouse) {
        issues.push(`${getPersonDisplayName(toPerson)} already has a spouse`);
      }

    } else if (type === 'parent-child') {
      // Parent-child validation
      const generationDiff = Math.abs(fromPerson.generation - toPerson.generation);
      
      if (generationDiff !== 1) {
        issues.push(`Parent and child must be exactly one generation apart. Current difference is ${generationDiff} generations`);
      }

    } else if (type === 'sibling') {
      // Sibling validation
      if (fromPerson.generation !== toPerson.generation) {
        issues.push(`Siblings must be in the same generation. ${getPersonDisplayName(fromPerson)} is in ${getGenerationName(fromPerson.generation)} while ${getPersonDisplayName(toPerson)} is in ${getGenerationName(toPerson.generation)}`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }, [fromPerson, toPerson, existingRelationships]);

  const handleConnectionSelect = (type: 'spouse' | 'parent-child' | 'sibling') => {
    const validation = validateConnection(type);
    
    if (!validation.isValid) {
      const typeLabel = type === 'spouse' ? 'marriage' : 
                       type === 'sibling' ? 'sibling' : 'parent-child';
      toast.error(`Cannot create ${typeLabel} relationship: ${validation.issues[0]}`);
      return;
    }

    onCreateConnection(type);
    onOpenChange(false);
    setSelectedType(null);
  };

  const handleCancel = () => {
    onOpenChange(false);
    setSelectedType(null);
  };

  if (!fromPerson || !toPerson) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Relationship</DialogTitle>
          <DialogDescription>
            Choose the type of relationship between these family members
          </DialogDescription>
        </DialogHeader>

        {/* Person Connection Summary */}
        <div className="flex items-center justify-between p-4 bg-gray-50 border rounded-lg">
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-1">
                <span className="text-blue-700 font-medium">
                  {fromPerson.firstName.charAt(0)}
                </span>
              </div>
              <div className="text-xs text-gray-600">
                {getGenerationName(fromPerson.generation)}
              </div>
            </div>
            <div>
              <div className="font-medium">{getPersonDisplayName(fromPerson)}</div>
              {fromPerson.isRoot && <Badge variant="secondary" className="text-xs">You</Badge>}
            </div>
          </div>

          <div className="text-gray-400">↔</div>

          <div className="flex items-center gap-3">
            <div>
              <div className="font-medium text-right">{getPersonDisplayName(toPerson)}</div>
              {toPerson.isRoot && <Badge variant="secondary" className="text-xs">You</Badge>}
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center mb-1">
                <span className="text-pink-700 font-medium">
                  {toPerson.firstName.charAt(0)}
                </span>
              </div>
              <div className="text-xs text-gray-600">
                {getGenerationName(toPerson.generation)}
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Connection Options */}
        <div className="space-y-3">
          {CONNECTION_OPTIONS.map((option) => {
            const validation = validateConnection(option.type);
            const isEnabled = validation.isValid;
            
            return (
              <Card 
                key={option.type}
                className={`p-4 cursor-pointer transition-all ${
                  isEnabled 
                    ? `${option.color} hover:shadow-md hover:border-opacity-75` 
                    : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                onClick={() => isEnabled && handleConnectionSelect(option.type)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${isEnabled ? 'bg-white bg-opacity-60' : 'bg-gray-200'}`}>
                      {option.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{option.title}</h3>
                        {isEnabled ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <p className="text-sm opacity-75 mb-2">{option.description}</p>
                      
                      {!isEnabled && validation.issues.length > 0 && (
                        <div className="text-xs text-red-600 space-y-1">
                          {validation.issues.map((issue, index) => (
                            <div key={index} className="flex items-start gap-1">
                              <span>•</span>
                              <span>{issue}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={handleCancel} className="flex-1">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};