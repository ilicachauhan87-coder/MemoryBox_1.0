import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Users, Heart, Baby, User } from 'lucide-react';
import { formatDateForDisplay, formatDateForStorage, isValidDDMMYYYY, formatDateInput } from '../utils/dateHelpers';

interface ContextualPersonDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  generation: -2 | -1 | 0 | 1 | 2;
  gridSlot: number;
  onAddPerson: (personData: {
    firstName: string;
    lastName: string;
    gender: 'male' | 'female';
    generation: -2 | -1 | 0 | 1 | 2;
    status: 'alive' | 'deceased';
    dateOfBirth: string;
    relationshipType?: string;
  }, targetSlot: number) => void;
}

// Contextual relationship types based on generation
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

export const ContextualPersonDialog: React.FC<ContextualPersonDialogProps> = ({
  isOpen,
  onOpenChange,
  generation,
  gridSlot,
  onAddPerson
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [status, setStatus] = useState<'alive' | 'deceased'>('alive');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [relationshipType, setRelationshipType] = useState('');

  const relationshipOptions = GENERATION_RELATIONSHIP_TYPES[generation.toString() as keyof typeof GENERATION_RELATIONSHIP_TYPES] || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName.trim()) {
      return;
    }

    onAddPerson({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      gender,
      generation,
      status,
      dateOfBirth,
      relationshipType
    }, gridSlot);

    // Reset form
    setFirstName('');
    setLastName('');
    setGender('male');
    setStatus('alive');
    setDateOfBirth('');
    setRelationshipType('');
    onOpenChange(false);
  };

  const getGenerationTitle = () => {
    const titles = {
      '-2': 'Grandparents Generation',
      '-1': 'Parents & Aunts/Uncles Generation',
      '0': 'Your Generation',
      '1': 'Children Generation',
      '2': 'Grandchildren Generation'
    };
    return titles[generation.toString() as keyof typeof titles];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Add Family Member
          </DialogTitle>
          <DialogDescription>
            Adding to <Badge variant="secondary">{getGenerationTitle()}</Badge> at grid position {gridSlot}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Relationship Type Selection */}
          {relationshipOptions.length > 0 && (
            <div className="space-y-2">
              <Label>Relationship Type (Optional)</Label>
              <Select value={relationshipType} onValueChange={setRelationshipType}>
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
          )}

          {/* First Name */}
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Enter first name"
              required
            />
          </div>

          {/* Last Name */}
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Enter last name (optional)"
            />
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label>Gender</Label>
            <Select value={gender} onValueChange={(val) => setGender(val as 'male' | 'female')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(val) => setStatus(val as 'alive' | 'deceased')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alive">Alive</SelectItem>
                <SelectItem value="deceased">Deceased</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date of Birth */}
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input
              id="dateOfBirth"
              type="text"
              value={formatDateForDisplay(dateOfBirth)}
              onChange={(e) => {
                const formatted = formatDateInput(e.target.value);
                setDateOfBirth(formatted);
              }}
              onBlur={(e) => {
                // Convert to storage format on blur
                const displayValue = e.target.value;
                if (displayValue && isValidDDMMYYYY(displayValue)) {
                  const storageValue = formatDateForStorage(displayValue);
                  setDateOfBirth(storageValue);
                }
              }}
              placeholder="DD-MM-YYYY (e.g., 15-03-1990)"
              maxLength={10}
            />
            {dateOfBirth && !isValidDDMMYYYY(formatDateForDisplay(dateOfBirth)) && (
              <p className="text-sm text-destructive">Please enter date in DD-MM-YYYY format</p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={!firstName.trim()}>
              Add Person
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
