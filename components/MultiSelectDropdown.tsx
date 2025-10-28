import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X, Users, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';

interface Option {
  id: string;
  name: string;
  relationship?: string;
  avatar?: string;
}

interface MultiSelectDropdownProps {
  options: Option[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  placeholder?: string;
  label?: string;
  emptyMessage?: string;
  maxHeight?: string;
  disabled?: boolean;
  className?: string;
  showSearch?: boolean;
  maxDisplayCount?: number;
  onOpenChange?: (isOpen: boolean) => void;
}

export function MultiSelectDropdown({
  options,
  selectedIds,
  onChange,
  placeholder = 'Select members...',
  label,
  emptyMessage = 'No members available',
  maxHeight = '480px',
  disabled = false,
  className = '',
  showSearch = true,
  maxDisplayCount = 3,
  onOpenChange
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Handle open/close and notify parent
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        handleOpenChange(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.relationship?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get selected options for display
  const selectedOptions = options.filter(opt => selectedIds.includes(opt.id));

  // Toggle selection
  const toggleOption = (optionId: string) => {
    if (selectedIds.includes(optionId)) {
      onChange(selectedIds.filter(id => id !== optionId));
    } else {
      onChange([...selectedIds, optionId]);
    }
  };

  // Select all
  const selectAll = () => {
    onChange(filteredOptions.map(opt => opt.id));
  };

  // Clear all
  const clearAll = () => {
    onChange([]);
  };

  // Remove specific selected item
  const removeOption = (optionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedIds.filter(id => id !== optionId));
  };

  // Get display text for button
  const getDisplayText = () => {
    if (selectedOptions.length === 0) {
      return placeholder;
    }
    
    if (selectedOptions.length <= maxDisplayCount) {
      return selectedOptions.map(opt => opt.name).join(', ');
    }
    
    return `${selectedOptions.length} members selected`;
  };

  return (
    <div className={`relative w-full ${className}`}>
      {label && (
        <label className="block text-base sm:text-lg text-foreground mb-2">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && handleOpenChange(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between
          px-4 py-3 sm:py-4
          min-h-[56px] sm:min-h-[60px]
          bg-background border-2 border-input rounded-lg
          text-left text-base sm:text-lg
          hover:border-primary/50 focus:outline-none focus:border-primary
          transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isOpen ? 'border-primary shadow-lg' : ''}
        `}
        style={{ minHeight: '56px' }}
      >
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <Users className="w-5 h-5 text-muted-foreground shrink-0" />
          <span className={`truncate block ${selectedOptions.length === 0 ? 'text-muted-foreground' : 'text-foreground'}`}>
            {getDisplayText()}
          </span>
        </div>
        <ChevronDown 
          className={`w-5 h-5 text-muted-foreground shrink-0 ml-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Selected items badges - shown below button when items selected */}
      {selectedOptions.length > 0 && !isOpen && (
        <div className="flex flex-wrap gap-2 mt-3">
          {selectedOptions.slice(0, maxDisplayCount + 2).map(option => (
            <Badge
              key={option.id}
              variant="secondary"
              className="pl-2 pr-1 py-1.5 bg-primary/10 text-primary border-primary/20 text-sm sm:text-base flex items-center gap-1.5 max-w-full"
            >
              <Avatar className="w-5 h-5 shrink-0">
                <AvatarImage src={option.avatar} />
                <AvatarFallback className="text-xs">
                  {option.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate max-w-[120px] sm:max-w-[160px]">{option.name}</span>
              <button
                onClick={(e) => removeOption(option.id, e)}
                className="shrink-0 hover:bg-primary/20 rounded-full p-0.5 transition-colors touch-manipulation"
                style={{ minWidth: '20px', minHeight: '20px' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </Badge>
          ))}
          {selectedOptions.length > maxDisplayCount + 2 && (
            <Badge variant="outline" className="py-1.5 text-sm">
              +{selectedOptions.length - (maxDisplayCount + 2)} more
            </Badge>
          )}
        </div>
      )}

      {/* Dropdown Panel - CRITICAL: absolute positioning with high z-index */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-[9999] w-full mt-2 bg-background border-2 border-primary rounded-lg shadow-xl overflow-hidden flex flex-col"
          style={{ 
            maxHeight: maxHeight,
            top: '100%',
            left: 0,
            right: 0
          }}
        >
            {/* Search Bar */}
            {showSearch && options.length > 5 && (
              <div className="shrink-0 p-3 border-b border-border bg-muted/30">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="  Search members..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10 sm:h-11 text-base border-input"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {filteredOptions.length > 0 && (
              <div className="shrink-0 flex items-center justify-between p-3 border-b border-border bg-muted/20">
                <span className="text-sm text-muted-foreground">
                  {selectedIds.length} of {options.length} selected
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={selectAll}
                    className="h-8 px-3 text-sm text-primary hover:text-primary hover:bg-primary/10"
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearAll}
                    disabled={selectedIds.length === 0}
                    className="h-8 px-3 text-sm text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}

            {/* Scrollable Options List - CRITICAL: This must scroll properly */}
            <ScrollArea className="flex-1 overflow-auto bg-background" style={{ maxHeight: '280px' }}>
              <div className="p-2 bg-background">
                {filteredOptions.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-muted-foreground text-base">
                      {searchTerm ? 'No members match your search' : emptyMessage}
                    </p>
                  </div>
                ) : (
                  filteredOptions.map((option) => {
                    const isSelected = selectedIds.includes(option.id);
                    
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => toggleOption(option.id)}
                        className={`
                          w-full flex items-center gap-3 p-3 rounded-lg mb-2
                          text-left transition-all duration-150
                          touch-manipulation
                          ${isSelected 
                            ? 'bg-primary/10 border-2 border-primary' 
                            : 'hover:bg-muted border-2 border-transparent'
                          }
                        `}
                        style={{ minHeight: '56px' }}
                      >
                        {/* Avatar */}
                        <Avatar className="w-10 h-10 shrink-0">
                          <AvatarImage src={option.avatar} />
                          <AvatarFallback className="bg-primary/20 text-primary">
                            {option.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        {/* Name and Relationship */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground text-base truncate">
                            {option.name}
                          </div>
                          {option.relationship && (
                            <div className="text-sm text-muted-foreground truncate">
                              {option.relationship}
                            </div>
                          )}
                        </div>

                        {/* Checkbox */}
                        <div
                          className={`
                            w-6 h-6 shrink-0 rounded border-2 flex items-center justify-center
                            transition-all duration-150
                            ${isSelected 
                              ? 'bg-primary border-primary' 
                              : 'border-muted-foreground/30'
                            }
                          `}
                        >
                          {isSelected && (
                            <Check className="w-4 h-4 text-primary-foreground" />
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>

          {/* Done Button - Fixed at bottom - ALWAYS VISIBLE */}
          <div className="shrink-0 p-3 border-t border-border bg-muted/30">
            <Button
              type="button"
              onClick={() => handleOpenChange(false)}
              className="w-full h-11 vibrant-button text-primary-foreground text-base"
            >
              {selectedIds.length > 0 ? `Done (${selectedIds.length} selected)` : 'Close'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
