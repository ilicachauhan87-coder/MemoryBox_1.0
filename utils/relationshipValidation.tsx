interface Person {
  id: string;
  firstName: string;
  lastName?: string;
  gender: 'male' | 'female';
  generation: number;
  status: 'alive' | 'deceased';
  isRoot?: boolean;
  dateOfBirth?: string;
}

interface Relationship {
  id: string;
  type: 'spouse' | 'parent-child';
  from: string;
  to: string;
}

interface ValidationResult {
  isValid: boolean;
  issues: string[];
  warnings: string[];
}

export class RelationshipValidator {
  private people: Person[];
  private relationships: Relationship[];

  constructor(people: Person[], relationships: Relationship[]) {
    this.people = people;
    this.relationships = relationships;
  }

  /**
   * Validates if a new relationship can be created between two people
   */
  validateNewRelationship(fromId: string, toId: string, type: 'spouse' | 'parent-child'): ValidationResult {
    const fromPerson = this.people.find(p => p.id === fromId);
    const toPerson = this.people.find(p => p.id === toId);

    if (!fromPerson || !toPerson) {
      return {
        isValid: false,
        issues: ['One or both people not found'],
        warnings: []
      };
    }

    const issues: string[] = [];
    const warnings: string[] = [];

    // Basic validations
    this.validateBasicConstraints(fromPerson, toPerson, type, issues);
    
    // Check for existing relationships
    this.validateExistingRelationships(fromPerson, toPerson, type, issues);
    
    // Type-specific validations
    if (type === 'spouse') {
      this.validateSpouseRelationship(fromPerson, toPerson, issues, warnings);
    } else if (type === 'parent-child') {
      this.validateParentChildRelationship(fromPerson, toPerson, issues, warnings);
    }

    // Advanced family structure validations
    this.validateFamilyStructure(fromPerson, toPerson, type, issues, warnings);

    return {
      isValid: issues.length === 0,
      issues,
      warnings
    };
  }

  /**
   * Validates basic constraints that apply to all relationship types
   */
  private validateBasicConstraints(fromPerson: Person, toPerson: Person, type: string, issues: string[]): void {
    // Cannot connect to self
    if (fromPerson.id === toPerson.id) {
      issues.push('Cannot create a relationship with yourself');
    }

    // Check generation limits
    const validGenerations = [-2, -1, 0, 1, 2];
    if (!validGenerations.includes(fromPerson.generation)) {
      issues.push(`${fromPerson.firstName} is in an invalid generation (${fromPerson.generation})`);
    }
    if (!validGenerations.includes(toPerson.generation)) {
      issues.push(`${toPerson.firstName} is in an invalid generation (${toPerson.generation})`);
    }
  }

  /**
   * Checks for conflicting existing relationships
   */
  private validateExistingRelationships(fromPerson: Person, toPerson: Person, type: string, issues: string[]): void {
    // Check if relationship already exists
    const existingRelation = this.relationships.find(rel => 
      (rel.from === fromPerson.id && rel.to === toPerson.id) ||
      (rel.from === toPerson.id && rel.to === fromPerson.id)
    );

    if (existingRelation) {
      const relationshipType = existingRelation.type === 'spouse' ? 'marriage' : 'parent-child';
      issues.push(`${fromPerson.firstName} and ${toPerson.firstName} already have a ${relationshipType} relationship`);
    }
  }

  /**
   * Validates spouse/marriage relationships
   */
  private validateSpouseRelationship(fromPerson: Person, toPerson: Person, issues: string[], warnings: string[]): void {
    // Must be same generation
    if (fromPerson.generation !== toPerson.generation) {
      issues.push(`Spouses must be in the same generation. ${fromPerson.firstName} is in generation ${fromPerson.generation}, ${toPerson.firstName} is in generation ${toPerson.generation}`);
    }

    // Check if either person already has a spouse
    const fromSpouse = this.getSpouse(fromPerson.id);
    const toSpouse = this.getSpouse(toPerson.id);

    if (fromSpouse) {
      const spouseName = this.people.find(p => p.id === fromSpouse)?.firstName || 'Unknown';
      issues.push(`${fromPerson.firstName} is already married to ${spouseName}`);
    }

    if (toSpouse) {
      const spouseName = this.people.find(p => p.id === toSpouse)?.firstName || 'Unknown';
      issues.push(`${toPerson.firstName} is already married to ${spouseName}`);
    }

    // Age validation if birth dates are available
    if (fromPerson.dateOfBirth && toPerson.dateOfBirth) {
      const ageDiff = this.calculateAgeDifference(fromPerson.dateOfBirth, toPerson.dateOfBirth);
      if (Math.abs(ageDiff) > 20) {
        warnings.push(`Large age difference: ${Math.abs(ageDiff)} years apart`);
      }
    }

    // Check for potential family relationships
    if (this.areRelated(fromPerson.id, toPerson.id)) {
      issues.push(`${fromPerson.firstName} and ${toPerson.firstName} appear to be family members and cannot marry`);
    }
  }

  /**
   * Validates parent-child relationships
   */
  private validateParentChildRelationship(fromPerson: Person, toPerson: Person, issues: string[], warnings: string[]): void {
    const generationDiff = Math.abs(fromPerson.generation - toPerson.generation);
    
    // Must be exactly one generation apart
    if (generationDiff !== 1) {
      issues.push(`Parent and child must be exactly one generation apart. Current difference: ${generationDiff} generations`);
      return; // Don't continue with other validations if basic constraint fails
    }

    // Determine who is parent and who is child
    const parent = fromPerson.generation < toPerson.generation ? fromPerson : toPerson;
    const child = fromPerson.generation > toPerson.generation ? fromPerson : toPerson;

    // Biological age constraints
    if (parent.dateOfBirth && child.dateOfBirth) {
      const ageDiff = this.calculateAgeDifference(parent.dateOfBirth, child.dateOfBirth);
      if (ageDiff < 16) {
        issues.push(`Parent must be at least 16 years older than child. Current difference: ${ageDiff} years`);
      }
      if (ageDiff > 60) {
        warnings.push(`Large age gap between parent and child: ${ageDiff} years`);
      }
    }

    // Check if child already has two parents (biological constraint)
    const existingParents = this.getParents(child.id);
    if (existingParents.length >= 2) {
      const parentNames = existingParents.map(id => this.people.find(p => p.id === id)?.firstName || 'Unknown').join(' and ');
      issues.push(`${child.firstName} already has two parents: ${parentNames}`);
    }

    // Check if parent already has a spouse and validate family structure
    const parentSpouse = this.getSpouse(parent.id);
    if (parentSpouse) {
      const spouseName = this.people.find(p => p.id === parentSpouse)?.firstName || 'Unknown';
      warnings.push(`${parent.firstName} is married to ${spouseName}. Consider adding ${child.firstName} as their child too for complete family structure`);
    }
  }

  /**
   * Validates complex family structure constraints
   */
  private validateFamilyStructure(fromPerson: Person, toPerson: Person, type: string, issues: string[], warnings: string[]): void {
    // Check for circular relationships that would create impossible family trees
    if (this.wouldCreateCircularRelationship(fromPerson.id, toPerson.id, type)) {
      issues.push('This relationship would create an impossible family structure (circular dependency)');
    }

    // Check for generation consistency
    if (type === 'parent-child') {
      this.validateGenerationConsistency(fromPerson, toPerson, warnings);
    }
  }

  /**
   * Helper methods
   */
  private getSpouse(personId: string): string | null {
    const spouseRelation = this.relationships.find(rel => 
      rel.type === 'spouse' && (rel.from === personId || rel.to === personId)
    );
    
    if (!spouseRelation) return null;
    return spouseRelation.from === personId ? spouseRelation.to : spouseRelation.from;
  }

  private getParents(personId: string): string[] {
    return this.relationships
      .filter(rel => rel.type === 'parent-child' && rel.to === personId)
      .map(rel => rel.from);
  }

  private getChildren(personId: string): string[] {
    return this.relationships
      .filter(rel => rel.type === 'parent-child' && rel.from === personId)
      .map(rel => rel.to);
  }

  private areRelated(personId1: string, personId2: string): boolean {
    // Simple check for direct relationships
    return this.relationships.some(rel => 
      (rel.from === personId1 && rel.to === personId2) ||
      (rel.from === personId2 && rel.to === personId1)
    );
  }

  private wouldCreateCircularRelationship(fromId: string, toId: string, type: string): boolean {
    // Complex logic to detect circular dependencies
    // For now, implement basic checks
    if (type === 'parent-child') {
      // Check if the proposed child is already an ancestor of the proposed parent
      return this.isAncestor(toId, fromId);
    }
    return false;
  }

  private isAncestor(ancestorId: string, descendantId: string): boolean {
    const parents = this.getParents(descendantId);
    if (parents.includes(ancestorId)) return true;
    
    // Recursively check grandparents, etc.
    return parents.some(parentId => this.isAncestor(ancestorId, parentId));
  }

  private calculateAgeDifference(date1: string, date2: string): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
    return Math.floor(diffYears);
  }

  private validateGenerationConsistency(parent: Person, child: Person, warnings: string[]): void {
    // Check if the generation difference makes sense in the broader family context
    const parentGeneration = parent.generation;
    const childGeneration = child.generation;
    
    if (parentGeneration >= childGeneration) {
      warnings.push('Parent should typically be in a higher generation (lower number) than their child');
    }
  }

  /**
   * Public utility methods for the UI
   */
  static getRecommendedRelationshipType(fromPerson: Person, toPerson: Person): 'spouse' | 'parent-child' | null {
    const generationDiff = Math.abs(fromPerson.generation - toPerson.generation);
    
    if (generationDiff === 0) {
      return 'spouse'; // Same generation suggests spouse relationship
    } else if (generationDiff === 1) {
      return 'parent-child'; // One generation apart suggests parent-child
    }
    
    return null; // No clear recommendation for other cases
  }

  static getSuggestedGeneration(existingPeople: Person[], relationshipType: 'spouse' | 'parent-child', personId?: string): number | null {
    if (!personId) return 0; // Default to user's generation
    
    const person = existingPeople.find(p => p.id === personId);
    if (!person) return 0;
    
    if (relationshipType === 'spouse') {
      return person.generation; // Same generation for spouse
    } else if (relationshipType === 'parent-child') {
      // Could be parent (generation - 1) or child (generation + 1)
      // Return the more likely option based on context
      if (person.generation <= 0) {
        return person.generation + 1; // Suggest child
      } else {
        return person.generation - 1; // Suggest parent
      }
    }
    
    return null;
  }
}