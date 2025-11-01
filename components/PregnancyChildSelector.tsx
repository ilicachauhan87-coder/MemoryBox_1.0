import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../utils/supabase/persistent-database';
import { Baby, AlertCircle, Plus } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface Child {
  id: string;
  name: string;
  date_of_birth?: string;
  gender?: string;
}

interface PregnancyChildSelectorProps {
  familyId: string;
  selectedChildId: string | null;
  onChildSelect: (childId: string | null) => void;
  required?: boolean;
}

export const PregnancyChildSelector: React.FC<PregnancyChildSelectorProps> = ({
  familyId,
  selectedChildId,
  onChildSelect,
  required = true
}) => {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  console.log('🎯 [PREGNANCY CHILD SELECTOR] Component rendered with familyId:', familyId);
  console.log('🎯 [PREGNANCY CHILD SELECTOR] familyId type:', typeof familyId);
  console.log('🎯 [PREGNANCY CHILD SELECTOR] familyId value:', JSON.stringify(familyId));

  useEffect(() => {
    console.log('🎯 [PREGNANCY CHILD SELECTOR] useEffect triggered, familyId:', familyId);
    loadChildren();
  }, [familyId]);

  const loadChildren = async () => {
    try {
      setLoading(true);
      console.log('👶 PregnancyChildSelector: Loading children for familyId:', familyId);
      
      const childrenData = await DatabaseService.getChildrenFromFamilyTree(familyId);
      
      console.log('👶 PregnancyChildSelector: Loaded children:', childrenData);
      setChildren(childrenData);
      
      if (childrenData.length === 0) {
        console.warn('⚠️ No children found in family tree - user may need to add children first');
      }
    } catch (error) {
      console.error('❌ Failed to load children:', error);
      toast.error('Failed to load family members. Please check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <div className="memory-card p-6">
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3"></div>
          <span className="text-muted-foreground">Loading children...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="memory-card p-6">
      <h2 className="text-xl mb-4 flex items-center gap-2">
        <Baby className="h-5 w-5 text-primary" />
        Which child is this memory for?
      </h2>
      
      <p className="text-sm text-muted-foreground mb-4">
        Link this pregnancy memory to a specific child so it appears in their journey book.
      </p>

      <div className="space-y-3">
        <select
          value={selectedChildId || ''}
          onChange={(e) => onChildSelect(e.target.value || null)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-base"
          required={required}
          style={{ minHeight: '48px' }} // Elder-friendly touch target
        >
          <option value="">Select child...</option>
          
          {children.map(child => (
            <option key={child.id} value={child.id}>
              {child.name}
              {child.date_of_birth && ` (Born ${formatDate(child.date_of_birth)})`}
            </option>
          ))}
          
          <option value="unborn">👶 Baby (not yet born)</option>
        </select>

        {selectedChildId === 'unborn' && (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Baby not yet born?</p>
              <p className="mt-1">
                You can link this memory to the actual child later after they're added to your family tree.
              </p>
            </div>
          </div>
        )}

        {!selectedChildId && required && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              Please select which child this pregnancy memory is for
            </p>
          </div>
        )}

        {children.length === 0 && (
          <div className="text-sm text-blue-700 bg-blue-50 border border-blue-200 p-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">No children in family tree yet?</p>
              <p className="mt-1">
                Select "Baby (not yet born)" for now. You can add the child to your family tree later.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
