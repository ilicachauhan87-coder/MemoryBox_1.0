import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Search, X, Clock, Filter, Users, Heart, Skull, Crown } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

interface Person {
  id: string;
  firstName: string;
  lastName?: string;
  middleName?: string;
  maidenName?: string;
  gender: 'male' | 'female';
  status: 'alive' | 'deceased';
  generation: -2 | -1 | 0 | 1 | 2;
  profilePicture?: string;
  isRoot?: boolean;
  position: { x: number; y: number };
  dateOfBirth?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  phone?: string;
  email?: string;
  bio?: string;
}

interface Relationship {
  id: string;
  type: 'spouse' | 'parent-child';
  from: string;
  to: string;
}

interface SearchAndFilterProps {
  people: Person[];
  relationships: Relationship[];
  onSelectPerson: (personId: string) => void;
  isMobile?: boolean;
}

type FilterType = 'all' | 'generation' | 'gender' | 'status' | 'married';
type FilterValue = string | number | boolean;

export const SearchAndFilter: React.FC<SearchAndFilterProps> = ({
  people,
  relationships,
  onSelectPerson,
  isMobile = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<{
    generation: string;
    gender: string;
    status: string;
    married: string;
  }>({
    generation: 'all',
    gender: 'all',
    status: 'all',
    married: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('familyTree_recentSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse recent searches:', e);
      }
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = (personName: string) => {
    const updated = [personName, ...recentSearches.filter(s => s !== personName)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('familyTree_recentSearches', JSON.stringify(updated));
  };

  // Filter and search logic
  const filteredPeople = useMemo(() => {
    console.log('🔍 === FILTER DEBUG START ===');
    console.log('📊 Total people in tree:', people.length);
    console.log('🎯 Active filters:', selectedFilters);
    console.log('🔎 Search query:', searchQuery);
    
    let results = people;
    const filterSteps: string[] = [];

    // Apply generation filter
    if (selectedFilters.generation !== 'all') {
      const beforeCount = results.length;
      results = results.filter(p => p.generation.toString() === selectedFilters.generation);
      const afterCount = results.length;
      filterSteps.push(`Generation filter (${selectedFilters.generation}): ${beforeCount} → ${afterCount} people`);
      console.log(`✅ Generation filter applied: "${selectedFilters.generation}" - ${beforeCount} → ${afterCount} people`);
      console.log('   Remaining people:', results.map(p => `${p.firstName} (Gen ${p.generation})`));
    }

    // Apply gender filter
    if (selectedFilters.gender !== 'all') {
      const beforeCount = results.length;
      results = results.filter(p => p.gender === selectedFilters.gender);
      const afterCount = results.length;
      filterSteps.push(`Gender filter (${selectedFilters.gender}): ${beforeCount} → ${afterCount} people`);
      console.log(`✅ Gender filter applied: "${selectedFilters.gender}" - ${beforeCount} → ${afterCount} people`);
      console.log('   Remaining people:', results.map(p => `${p.firstName} (${p.gender})`));
    }

    // Apply status filter
    if (selectedFilters.status !== 'all') {
      const beforeCount = results.length;
      results = results.filter(p => p.status === selectedFilters.status);
      const afterCount = results.length;
      filterSteps.push(`Status filter (${selectedFilters.status}): ${beforeCount} → ${afterCount} people`);
      console.log(`✅ Status filter applied: "${selectedFilters.status}" - ${beforeCount} → ${afterCount} people`);
      console.log('   Remaining people:', results.map(p => `${p.firstName} (${p.status})`));
    }

    // Apply married filter
    if (selectedFilters.married !== 'all') {
      const hasSpouse = (personId: string) => {
        return relationships.some(rel => 
          rel.type === 'spouse' && (rel.from === personId || rel.to === personId)
        );
      };
      
      const beforeCount = results.length;
      if (selectedFilters.married === 'yes') {
        results = results.filter(p => hasSpouse(p.id));
        filterSteps.push(`Married filter (yes): ${beforeCount} → ${results.length} people`);
        console.log(`✅ Married filter applied: "yes" - ${beforeCount} → ${results.length} people`);
      } else if (selectedFilters.married === 'no') {
        results = results.filter(p => !hasSpouse(p.id));
        filterSteps.push(`Married filter (no): ${beforeCount} → ${results.length} people`);
        console.log(`✅ Married filter applied: "no" - ${beforeCount} → ${results.length} people`);
      }
      console.log('   Remaining people:', results.map(p => `${p.firstName} (${hasSpouse(p.id) ? 'married' : 'unmarried'})`));
    }

    // Apply search query (includes name, bio, location, and contact info)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const beforeCount = results.length;
      results = results.filter(p => {
        const fullName = `${p.firstName} ${p.middleName || ''} ${p.lastName || ''} ${p.maidenName || ''}`.toLowerCase();
        const bio = (p.bio || '').toLowerCase();
        const birthPlace = (p.birthPlace || '').toLowerCase();
        const deathPlace = (p.deathPlace || '').toLowerCase();
        const phone = (p.phone || '').toLowerCase();
        const email = (p.email || '').toLowerCase();
        
        return fullName.includes(query) || 
               bio.includes(query) || 
               birthPlace.includes(query) || 
               deathPlace.includes(query) ||
               phone.includes(query) ||
               email.includes(query);
      });
      const afterCount = results.length;
      filterSteps.push(`Search query ("${searchQuery}"): ${beforeCount} → ${afterCount} people`);
      console.log(`✅ Search filter applied: "${searchQuery}" - ${beforeCount} → ${afterCount} people`);
      console.log('   Matching people:', results.map(p => `${p.firstName} ${p.lastName || ''}`));
    }

    console.log('📋 Filter pipeline summary:');
    filterSteps.forEach((step, i) => console.log(`   ${i + 1}. ${step}`));
    console.log(`🎯 FINAL RESULT: ${results.length} people match all criteria`);
    console.log('👥 Final list:', results.map(p => `${p.firstName} ${p.lastName || ''} (Gen ${p.generation}, ${p.gender}, ${p.status})`));
    console.log('🔍 === FILTER DEBUG END ===\n');

    return results;
  }, [people, relationships, searchQuery, selectedFilters]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePersonClick = (person: Person) => {
    const fullName = `${person.firstName} ${person.lastName || ''}`.trim();
    saveRecentSearch(fullName);
    onSelectPerson(person.id);
    setShowResults(false);
    setSearchQuery('');
  };

  const handleRecentSearchClick = (searchTerm: string) => {
    setSearchQuery(searchTerm);
    setShowResults(true);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('familyTree_recentSearches');
  };

  const activeFilterCount = Object.values(selectedFilters).filter(v => v !== 'all').length;

  const getGenerationLabel = (gen: number) => {
    const labels: Record<number, string> = {
      '-2': 'Grandparents',
      '-1': 'Parents',
      '0': 'Your Generation',
      '1': 'Children',
      '2': 'Grandchildren'
    };
    return labels[gen] || `Gen ${gen}`;
  };

  return (
    <div ref={searchRef} className={`relative ${isMobile ? 'w-full' : 'min-w-[300px]'}`}>
      {/* Debug Panel - Shows active filters */}
      {activeFilterCount > 0 && (
        <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-xs font-medium text-blue-900 mb-1">🔍 Active Filters:</div>
          <div className="flex flex-wrap gap-1">
            {selectedFilters.generation !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                Gen: {getGenerationLabel(parseInt(selectedFilters.generation))}
              </Badge>
            )}
            {selectedFilters.gender !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                Gender: {selectedFilters.gender}
              </Badge>
            )}
            {selectedFilters.status !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                Status: {selectedFilters.status}
              </Badge>
            )}
            {selectedFilters.married !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                Married: {selectedFilters.married}
              </Badge>
            )}
          </div>
          <div className="text-xs text-blue-700 mt-1">
            Showing {filteredPeople.length} of {people.length} people
          </div>
        </div>
      )}
      
      <div className="flex gap-2">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="   Search family members..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            className={`pl-10 pr-10 ${isMobile ? 'h-10' : ''}`}
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setShowResults(false);
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Button */}
        <Popover open={showFilters} onOpenChange={setShowFilters}>
          <PopoverTrigger asChild>
            <Button variant="outline" size={isMobile ? "default" : "default"} className="relative">
              <Filter className="w-4 h-4" />
              {activeFilterCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filters</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFilters({
                    generation: 'all',
                    gender: 'all',
                    status: 'all',
                    married: 'all'
                  })}
                >
                  Clear All
                </Button>
              </div>

              {/* Generation Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Generation</label>
                <Select
                  value={selectedFilters.generation}
                  onValueChange={(value) => setSelectedFilters(prev => ({ ...prev, generation: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Generations</SelectItem>
                    <SelectItem value="-2">Grandparents (Gen -2)</SelectItem>
                    <SelectItem value="-1">Parents (Gen -1)</SelectItem>
                    <SelectItem value="0">Your Generation (Gen 0)</SelectItem>
                    <SelectItem value="1">Children (Gen +1)</SelectItem>
                    <SelectItem value="2">Grandchildren (Gen +2)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Gender Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Gender</label>
                <Select
                  value={selectedFilters.gender}
                  onValueChange={(value) => setSelectedFilters(prev => ({ ...prev, gender: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Genders</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={selectedFilters.status}
                  onValueChange={(value) => setSelectedFilters(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="alive">Alive</SelectItem>
                    <SelectItem value="deceased">Deceased</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Married Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Relationship Status</label>
                <Select
                  value={selectedFilters.married}
                  onValueChange={(value) => setSelectedFilters(prev => ({ ...prev, married: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="yes">Married</SelectItem>
                    <SelectItem value="no">Unmarried</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {/* Recent Searches */}
          {!searchQuery && recentSearches.length > 0 && (
            <div className="p-2 border-b">
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Recent Searches
                </span>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Clear
                </button>
              </div>
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => handleRecentSearchClick(search)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded text-sm text-gray-600 flex items-center gap-2"
                >
                  <Clock className="w-3 h-3" />
                  {search}
                </button>
              ))}
            </div>
          )}

          {/* Search Results */}
          {filteredPeople.length > 0 ? (
            <div className="p-2">
              <div className="px-2 py-1 text-xs font-medium text-gray-500 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {filteredPeople.length} {filteredPeople.length === 1 ? 'person' : 'people'} found
                </span>
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'}
                  </Badge>
                )}
              </div>
              {filteredPeople.map((person) => {
                const hasSpouse = relationships.some(rel => 
                  rel.type === 'spouse' && (rel.from === person.id || rel.to === person.id)
                );
                
                return (
                  <button
                    key={person.id}
                    onClick={() => handlePersonClick(person)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg flex items-center gap-3 group transition-colors"
                  >
                    {/* Profile Picture */}
                    <div className="relative flex-shrink-0">
                      {person.profilePicture ? (
                        <ImageWithFallback
                          src={person.profilePicture}
                          alt={person.firstName}
                          className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 group-hover:border-blue-400 transition-colors"
                        />
                      ) : (
                        <div className={`w-10 h-10 rounded-full border-2 border-gray-200 group-hover:border-blue-400 transition-colors flex items-center justify-center font-medium text-white ${
                          person.gender?.toLowerCase() === 'male' 
                            ? person.status === 'deceased' ? 'bg-gray-400' : 'bg-blue-400'
                            : person.status === 'deceased' ? 'bg-gray-400' : 'bg-pink-400'
                        }`}>
                          {person.firstName.charAt(0)}
                        </div>
                      )}
                      {person.status === 'alive' && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>

                    {/* Person Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 truncate">
                          {person.firstName} {person.lastName || ''}
                        </span>
                        {person.isRoot && <Crown className="w-3 h-3 text-yellow-500 flex-shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500">
                          {getGenerationLabel(person.generation)}
                        </span>
                        {hasSpouse && (
                          <span className="flex items-center gap-1 text-xs text-pink-600">
                            <Heart className="w-3 h-3" />
                            Married
                          </span>
                        )}
                        {person.status === 'deceased' && (
                          <span className="flex items-center gap-1 text-xs text-gray-600">
                            <Skull className="w-3 h-3" />
                            Deceased
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Gender Badge */}
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        person.gender?.toLowerCase() === 'male' ? 'border-blue-300 text-blue-700' : 'border-pink-300 text-pink-700'
                      }`}
                    >
                      {person.gender?.toLowerCase() === 'male' ? '♂' : '♀'}
                    </Badge>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No family members found</p>
              {(searchQuery || activeFilterCount > 0) && (
                <p className="text-xs mt-1">Try adjusting your search or filters</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
