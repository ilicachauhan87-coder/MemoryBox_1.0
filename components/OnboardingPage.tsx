import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { User, Calendar, Heart, ChevronRight } from 'lucide-react';
import { toast } from "sonner@2.0.3";
import type { UserProfile } from '../utils/supabase/client';

interface OnboardingPageProps {
  user: UserProfile | null;
  onComplete: (profileData: {
    name: string;
    gender: 'male' | 'female';
    date_of_birth: string;
  }) => void;
}

export function OnboardingPage({ user, onComplete }: OnboardingPageProps) {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    gender: (user?.gender === 'male' || user?.gender === 'female') ? user.gender : 'male' as 'male' | 'female',
    date_of_birth: user?.date_of_birth || ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Helper function to format date from DD-MM-YYYY to YYYY-MM-DD for form submission
  const formatDateForSubmission = (ddmmyyyy: string): string => {
    if (!ddmmyyyy || ddmmyyyy.length !== 10) return '';
    const [day, month, year] = ddmmyyyy.split('-');
    return `${year}-${month}-${day}`;
  };
  
  // Helper function to format date from YYYY-MM-DD to DD-MM-YYYY for display
  const formatDateForDisplay = (yyyymmdd: string): string => {
    if (!yyyymmdd) return '';
    const [year, month, day] = yyyymmdd.split('-');
    return `${day}-${month}-${year}`;
  };
  
  // State for the displayed date format (DD-MM-YYYY)
  const [displayDate, setDisplayDate] = useState(() => {
    return user?.date_of_birth ? formatDateForDisplay(user.date_of_birth) : '';
  });

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.gender) {
      newErrors.gender = 'Please select your gender';
    }

    if (!displayDate) {
      newErrors.date_of_birth = 'Date of birth is required';
    } else {
      // Validate DD-MM-YYYY format
      const datePattern = /^\d{2}-\d{2}-\d{4}$/;
      if (!datePattern.test(displayDate)) {
        newErrors.date_of_birth = 'Please enter date in DD-MM-YYYY format';
      } else {
        const [day, month, year] = displayDate.split('-').map(Number);
        const dob = new Date(year, month - 1, day);
        const today = new Date();
        const age = today.getFullYear() - dob.getFullYear();
        
        // Check if date is valid
        if (dob.getDate() !== day || dob.getMonth() !== month - 1 || dob.getFullYear() !== year) {
          newErrors.date_of_birth = 'Please enter a valid date';
        } else if (age < 5 || age > 120) {
          newErrors.date_of_birth = 'Please enter a valid date of birth';
        } else if (dob > today) {
          newErrors.date_of_birth = 'Date of birth cannot be in the future';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Convert display date to submission format
      const submissionDate = formatDateForSubmission(displayDate);
      
      // Calculate age for display
      const [day, month, year] = displayDate.split('-').map(Number);
      const dob = new Date(year, month - 1, day);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      
      toast.success(`Welcome to MemoryBox, ${formData.name}! 🎉`);
      onComplete({
        ...formData,
        date_of_birth: submissionDate
      });
    } catch (error) {
      console.error('Onboarding error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format gender display
  const getGenderDisplayText = (gender: string) => {
    switch (gender) {
      case 'male':
        return 'Male';
      case 'female':
        return 'Female';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-background vibrant-texture pb-8">
      {/* Header with MemoryBox Branding - Consistent with other pages */}
      <div className="bg-background px-4 py-5 sm:p-6 text-center border-b border-border">
        {/* MemoryBox Branding */}
        <div className="flex items-center justify-center space-x-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-primary to-secondary rounded-2xl shadow-lg">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <span className="text-primary text-2xl font-semibold tracking-wide">MemoryBox</span>
        </div>
        <h1 className="text-primary text-xl sm:text-2xl font-semibold font-['Playfair_Display'] mb-2">
          Welcome to the family! 🏠
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg">
          Let's set up your profile to get started
        </p>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6 max-w-md mx-auto">
        <Card className="memory-card border-violet/20">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-violet to-coral rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-xl font-['Playfair_Display'] text-foreground">
              Tell us about yourself
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Help your family recognize and connect with you
            </CardDescription>
          </CardHeader>

          <CardContent className="px-4 sm:px-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-base font-medium text-foreground flex items-center gap-2">
                  <User className="w-4 h-4 text-violet" />
                  Full Name *
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={`text-base ${errors.name ? 'border-red-500 focus:border-red-500' : 'border-violet/30 focus:border-violet'}`}
                  style={{ fontSize: '1.125rem', lineHeight: '1.6', padding: '0.75rem 1rem' }}
                />
                {errors.name && (
                  <p className="text-sm text-red-600 font-medium">{errors.name}</p>
                )}
              </div>

              {/* Gender Field */}
              <div className="space-y-2">
                <Label htmlFor="gender" className="text-base font-medium text-foreground flex items-center gap-2">
                  <Heart className="w-4 h-4 text-coral" />
                  Gender *
                </Label>
                <Select 
                  value={formData.gender} 
                  onValueChange={(value: 'male' | 'female') => 
                    setFormData(prev => ({ ...prev, gender: value }))
                  }
                >
                  <SelectTrigger className={`text-base ${errors.gender ? 'border-red-500 focus:border-red-500' : 'border-violet/30 focus:border-violet'}`}>
                    <SelectValue placeholder="Select your gender">
                      {formData.gender && getGenderDisplayText(formData.gender)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male" className="text-base">
                      Male
                    </SelectItem>
                    <SelectItem value="female" className="text-base">
                      Female
                    </SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && (
                  <p className="text-sm text-red-600 font-medium">{errors.gender}</p>
                )}
              </div>

              {/* Date of Birth Field - DD-MM-YYYY Format */}
              <div className="space-y-2">
                <Label htmlFor="date_of_birth" className="text-base font-medium text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-aqua" />
                  Date of Birth *
                </Label>
                <Input
                  id="date_of_birth"
                  type="text"
                  value={displayDate}
                  onChange={(e) => {
                    let value = e.target.value.replace(/[^\d]/g, ''); // Remove non-digits
                    
                    // Auto-format as user types: DD-MM-YYYY
                    if (value.length >= 2 && value.length < 4) {
                      value = value.slice(0, 2) + '-' + value.slice(2);
                    } else if (value.length >= 4) {
                      value = value.slice(0, 2) + '-' + value.slice(2, 4) + '-' + value.slice(4, 8);
                    }
                    
                    setDisplayDate(value);
                  }}
                  className={`text-base ${errors.date_of_birth ? 'border-red-500 focus:border-red-500' : 'border-violet/30 focus:border-violet'}`}
                  style={{ 
                    fontSize: '1.125rem', 
                    lineHeight: '1.6', 
                    padding: '0.75rem 1rem'
                  }}
                  placeholder="DD-MM-YYYY"
                  maxLength={10}
                />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>Enter in DD-MM-YYYY format (e.g., 15-08-1990)</span>
                </div>
                {errors.date_of_birth && (
                  <p className="text-sm text-red-600 font-medium">{errors.date_of_birth}</p>
                )}
              </div>

              {/* Information Box */}
              <div className="bg-violet/5 border border-violet/20 rounded-lg p-4">
                <p className="text-sm text-violet/80 leading-relaxed">
                  💡 <strong>Why we need this:</strong> This information helps your family members identify and connect with you properly in the family tree.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full vibrant-button text-white text-base font-semibold py-3 min-h-[48px] flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    'Setting up your profile...'
                  ) : (
                    <>
                      Complete Setup
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Simple Progress Indicator - Single Step Setup */}
        <div className="flex items-center justify-center mt-6 space-x-2">
          <div className="w-4 h-4 bg-violet rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
        </div>
        <p className="text-center text-sm text-muted-foreground mt-2">
          Complete Your Profile Setup
        </p>
      </div>
    </div>
  );
}