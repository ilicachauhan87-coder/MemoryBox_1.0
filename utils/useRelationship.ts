/**
 * React Hook for Relationship Derivation
 * 
 * Provides easy-to-use hooks for accessing relationship data in React components.
 */

import { useMemo, useEffect, useState } from 'react';
import { 
  relationshipEngine, 
  initializeRelationshipEngine, 
  getRelationship,
  DerivedRelationship,
  FamilyTree
} from './relationshipDerivationEngine';

/**
 * Hook to get the relationship between two people
 * 
 * @param personAId - First person's ID
 * @param personBId - Second person's ID
 * @param rootUserId - Root user ID for lineage detection (optional)
 * @returns DerivedRelationship object or null
 */
export function useRelationship(
  personAId: string | undefined,
  personBId: string | undefined,
  rootUserId?: string
): DerivedRelationship | null {
  return useMemo(() => {
    if (!personAId || !personBId) {
      console.log('🔍 useRelationship: Missing IDs', { personAId, personBId });
      return null;
    }

    console.log('🔍 useRelationship: Calculating relationship');
    console.log('   From:', personAId);
    console.log('   To:', personBId);
    console.log('   Root:', rootUserId);
    console.log('   Engine ready:', relationshipEngine.graph !== null);
    console.log('   Engine stats:', relationshipEngine.getStats());

    const result = getRelationship(personAId, personBId, rootUserId);
    
    console.log('🔍 useRelationship: Result:', result);
    
    return result;
  }, [personAId, personBId, rootUserId]);
}

/**
 * Hook to get just the relationship label as a string
 * 
 * @param personAId - First person's ID
 * @param personBId - Second person's ID  
 * @param rootUserId - Root user ID for lineage detection (optional)
 * @returns Relationship label string (e.g., "Maternal Aunt", "Uncle")
 */
export function useRelationshipLabel(
  personAId: string | undefined,
  personBId: string | undefined,
  rootUserId?: string
): string {
  const relationship = useRelationship(personAId, personBId, rootUserId);
  return relationship?.label || 'Relative';
}

/**
 * Hook to initialize the relationship engine with family tree data
 * Call this once when the app loads or when family tree changes
 * 
 * @param familyTree - Family tree data
 * @param dependencies - Optional dependencies to trigger re-initialization
 */
export function useInitializeRelationshipEngine(
  familyTree: FamilyTree | null | undefined,
  dependencies: any[] = []
): boolean {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!familyTree) {
      setIsReady(false);
      return;
    }

    try {
      initializeRelationshipEngine(familyTree);
      setIsReady(true);
      console.log('✅ Relationship engine initialized');
    } catch (error) {
      console.error('❌ Failed to initialize relationship engine:', error);
      setIsReady(false);
    }
  }, [familyTree, ...dependencies]);

  return isReady;
}

/**
 * Hook to get relationship statistics
 * Useful for debugging and monitoring
 */
export function useRelationshipStats(): {
  nodes: number;
  edges: number;
  cacheSize: number;
  version: number;
} {
  const [stats, setStats] = useState({
    nodes: 0,
    edges: 0,
    cacheSize: 0,
    version: 0
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(relationshipEngine.getStats());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return stats;
}

/**
 * Hook to check if the relationship engine is ready to use
 */
export function useRelationshipEngineReady(): boolean {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkReady = () => {
      setIsReady(relationshipEngine.graph !== null);
    };

    checkReady();
    const interval = setInterval(checkReady, 500);

    return () => clearInterval(interval);
  }, []);

  return isReady;
}

/**
 * Hook to get all relationships for a person
 * Returns a map of personId → DerivedRelationship
 * 
 * @param personId - The person to get relationships for
 * @param rootUserId - Root user for lineage detection
 */
export function usePersonRelationships(
  personId: string | undefined,
  rootUserId: string | undefined
): Map<string, DerivedRelationship> {
  return useMemo(() => {
    if (!personId || !rootUserId) {
      return new Map();
    }

    return relationshipEngine.getAllRelationshipsForPerson(personId, rootUserId);
  }, [personId, rootUserId]);
}
