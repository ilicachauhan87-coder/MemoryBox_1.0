/**
 * Relationship Derivation Engine
 * 
 * Automatically calculates family relationships by analyzing the family tree graph.
 * Supports complex relationships including aunts, uncles, cousins, in-laws, etc.
 * 
 * Features:
 * - Graph-based path finding between any two family members
 * - Pattern matching for relationship identification
 * - Gender-aware relationship labeling
 * - Lineage detection (Maternal vs Paternal)
 * - Caching for performance optimization
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Person {
  id: string;
  name: string;
  gender?: string;
  dateOfBirth?: string;
  isRoot?: boolean;
  [key: string]: any;
}

export interface Relationship {
  from: string;
  to: string;
  type: 'parent' | 'child' | 'spouse' | 'sibling';
  biologicalOrAdopted?: 'biological' | 'adopted' | 'step';
}

export interface FamilyTree {
  people?: Person[];
  relationships?: Relationship[];
  [key: string]: any;
}

export interface RelationshipEdge {
  fromId: string;
  toId: string;
  type: 'parent' | 'child' | 'spouse' | 'sibling';
  biologicalOrAdopted?: 'biological' | 'adopted' | 'step';
}

export interface RelationshipPath {
  nodes: string[]; // Array of person IDs
  edges: RelationshipEdge[]; // Connections between nodes
  length: number; // Number of hops
}

export interface DerivedRelationship {
  label: string; // "Maternal Aunt", "Paternal Uncle", "First Cousin"
  type: string; // aunt, uncle, cousin, niece, nephew, etc.
  lineage?: 'maternal' | 'paternal' | 'spousal' | 'mixed';
  degree?: number; // 1st cousin, 2nd cousin, etc.
  shortLabel?: string; // Shorter version for UI
  description?: string; // Human-readable explanation
}

export interface RelationshipGraph {
  nodes: Map<string, Person>; // personId → Person
  edges: Map<string, RelationshipEdge[]>; // personId → connections
}

interface RelationshipRule {
  pattern: string[]; // e.g., ['parent', 'sibling'] for uncle/aunt
  label: string;
  type: string;
  lineage?: 'depends' | 'maternal' | 'paternal' | 'spousal';
  degree?: number;
}

// ============================================================================
// RELATIONSHIP RULES DEFINITIONS
// ============================================================================

const RELATIONSHIP_RULES: RelationshipRule[] = [
  // Direct relationships
  { pattern: ['parent'], label: 'Parent', type: 'parent' },
  { pattern: ['child'], label: 'Child', type: 'child' },
  { pattern: ['spouse'], label: 'Spouse', type: 'spouse' },
  { pattern: ['sibling'], label: 'Sibling', type: 'sibling' },
  
  // 🔧 FIX: Sibling via shared parent (most common path when no explicit sibling relationship)
  { pattern: ['child', 'parent'], label: 'Sibling', type: 'sibling' },
  { pattern: ['parent', 'child'], label: 'Sibling', type: 'sibling' },
  
  // One generation up
  { pattern: ['parent', 'parent'], label: 'Grandparent', type: 'grandparent', lineage: 'depends' },
  { pattern: ['parent', 'sibling'], label: 'Uncle/Aunt', type: 'uncle_aunt', lineage: 'depends' },
  { pattern: ['parent', 'spouse'], label: 'Step-parent', type: 'step_parent' },
  { pattern: ['spouse', 'parent'], label: 'Parent-in-law', type: 'parent_in_law' },
  
  // One generation down
  { pattern: ['child', 'child'], label: 'Grandchild', type: 'grandchild' },
  { pattern: ['sibling', 'child'], label: 'Niece/Nephew', type: 'niece_nephew' },
  { pattern: ['child', 'spouse'], label: 'Child-in-law', type: 'child_in_law' },
  
  // Same generation
  { pattern: ['parent', 'sibling', 'child'], label: 'First Cousin', type: 'cousin', degree: 1, lineage: 'depends' },
  { pattern: ['sibling', 'spouse'], label: 'Sibling-in-law', type: 'sibling_in_law' },
  { pattern: ['spouse', 'sibling'], label: 'Sibling-in-law', type: 'sibling_in_law' },
  
  // 🆕 Uncle/Aunt's spouse (e.g., "Husband of Mother's Sister")
  { pattern: ['parent', 'sibling', 'spouse'], label: 'Uncle/Aunt-in-law', type: 'uncle_aunt_in_law', lineage: 'depends' },
  { pattern: ['spouse', 'parent', 'sibling'], label: 'Uncle/Aunt by marriage', type: 'uncle_aunt_by_marriage' },
  
  // 🆕 Sibling-in-Law's Child (e.g., "Brother-in-Law's Son", "Sister-in-Law's Daughter")
  // Path: You → Your Spouse → Spouse's Sibling → Sibling's Child
  { pattern: ['spouse', 'sibling', 'child'], label: "Sibling-in-Law's Child", type: 'sibling_in_law_child' },
  
  // 🆕 Niece/Nephew through in-laws (Your sibling's spouse's child)
  { pattern: ['sibling', 'spouse', 'child'], label: 'Niece/Nephew-in-law', type: 'niece_nephew_in_law' },
  
  // 🆕 Niece/Nephew's Spouse (e.g., "Nephew's Wife", "Niece's Husband")
  // IMPORTANT: Only direct sibling's child's spouse - NOT parent's sibling's child (that's cousin)
  { pattern: ['sibling', 'child', 'spouse'], label: "Niece/Nephew's Spouse", type: 'niece_nephew_spouse' },
  
  // 🆕 Sibling-in-Law's Child's Spouse (e.g., "Brother-in-Law's Son's Wife")
  // Path: You → Your Spouse → Spouse's Sibling → Sibling's Child → Child's Spouse
  { pattern: ['spouse', 'sibling', 'child', 'spouse'], label: "Sibling-in-Law's Child's Spouse", type: 'sibling_in_law_child_spouse' },
  
  // 🔧 FIX: Spouse's Sibling's Spouse (Brother-in-law's Wife / Sister-in-law's Husband)
  // In English: "Sister-in-law" or "Co-sister-in-law" (commonly used in Indian English)
  // This is the spouse of your spouse's sibling
  { pattern: ['spouse', 'sibling', 'spouse'], label: "Sibling-in-Law's Spouse", type: 'sibling_in_law_spouse' },
  // Reverse direction (your sibling's spouse's sibling) - also co-sibling-in-law
  { pattern: ['sibling', 'spouse', 'sibling'], label: 'Sibling-in-law', type: 'sibling_in_law' },
  
  // Two generations up
  { pattern: ['parent', 'parent', 'parent'], label: 'Great-Grandparent', type: 'great_grandparent', lineage: 'depends' },
  { pattern: ['parent', 'parent', 'sibling'], label: 'Great-Uncle/Aunt', type: 'great_uncle_aunt', lineage: 'depends' },
  
  // Two generations down
  { pattern: ['child', 'child', 'child'], label: 'Great-Grandchild', type: 'great_grandchild' },
  
  // 🆕 Sibling's Grandchild (Enhanced Grand-Niece/Nephew with gender-aware labeling)
  // Path: You → Your Sibling → Sibling's Child → Child's Child
  { pattern: ['sibling', 'child', 'child'], label: "Sibling's Grandchild", type: 'sibling_grandchild' },
  
  // 🆕 Sibling-in-Law's Grandchild (e.g., "Brother-in-Law's Grandson", "Sister-in-Law's Granddaughter")
  // Path: You → Your Spouse → Spouse's Sibling → Sibling's Child → Child's Child
  { pattern: ['spouse', 'sibling', 'child', 'child'], label: "Sibling-in-Law's Grandchild", type: 'sibling_in_law_grandchild' },
  
  // Second cousins
  { pattern: ['parent', 'parent', 'sibling', 'child', 'child'], label: 'Second Cousin', type: 'cousin', degree: 2, lineage: 'depends' },
  
  // Cousin's Children (more intuitive than "Cousin Once Removed")
  // Path: You → Parent → Aunt/Uncle → Cousin → Cousin's Child
  { pattern: ['parent', 'sibling', 'child', 'child'], label: "Cousin's Child", type: 'cousin_child', degree: 1, lineage: 'depends' },
  
  // 🆕 Cousin's Child's Spouse (e.g., "Paternal Cousin's Son's Wife")
  // Path: You → Parent → Aunt/Uncle → Cousin → Cousin's Child → Child's Spouse
  { pattern: ['parent', 'sibling', 'child', 'child', 'spouse'], label: "Cousin's Child's Spouse", type: 'cousin_child_spouse', degree: 1, lineage: 'depends' },
  
  // 🆕 Cousin's Grandchild (e.g., "Paternal Cousin's Grandson", "Maternal Cousin's Granddaughter")
  // Path: You → Parent → Aunt/Uncle → Cousin → Cousin's Child → Child's Child
  { pattern: ['parent', 'sibling', 'child', 'child', 'child'], label: "Cousin's Grandchild", type: 'cousin_grandchild', degree: 1, lineage: 'depends' },
  
  // Parent's Cousin (reverse of above - your parent's cousin)
  { pattern: ['parent', 'parent', 'sibling', 'child'], label: "Parent's Cousin", type: 'parent_cousin', degree: 1, lineage: 'depends' },
  
  // Cousin-in-laws
  // Path: You → Parent → Parent's Sibling (Aunt/Uncle) → Cousin → Cousin's Spouse
  { pattern: ['parent', 'sibling', 'child', 'spouse'], label: "Cousin's Spouse", type: 'cousin_spouse', lineage: 'depends' },
  { pattern: ['spouse', 'parent', 'sibling', 'child'], label: "Spouse's Cousin", type: 'spouse_cousin' },
  
  // Three generations up
  { pattern: ['parent', 'parent', 'parent', 'parent'], label: 'Great-Great-Grandparent', type: 'great_great_grandparent', lineage: 'depends' },
];

// ============================================================================
// RELATIONSHIP DERIVATION ENGINE CLASS
// ============================================================================

export class RelationshipDerivationEngine {
  private cache: Map<string, DerivedRelationship>;
  private graphVersion: number;
  private graph: RelationshipGraph | null;

  constructor() {
    this.cache = new Map();
    this.graphVersion = 0;
    this.graph = null;
  }

  /**
   * Build a relationship graph from family tree data
   */
  buildRelationshipGraph(familyTree: FamilyTree): RelationshipGraph {
    const graph: RelationshipGraph = {
      nodes: new Map(),
      edges: new Map()
    };

    // Handle both old format (array) and new format (object with people array)
    const people = Array.isArray(familyTree) ? familyTree : familyTree.people || [];
    const relationships = Array.isArray(familyTree) ? [] : familyTree.relationships || [];

    // Add all people as nodes
    people.forEach((person: Person) => {
      graph.nodes.set(person.id, person);
      graph.edges.set(person.id, []);
    });

    // Extract relationships from old format (embedded in person objects)
    people.forEach((person: Person) => {
      // Parent relationships
      // 🔧 CRITICAL FIX: When processing person.parents, person.id is the CHILD and parentId is the PARENT
      // So edge from child→parent should be 'parent' (child's perspective: "my parent")
      // And edge from parent→child should be 'child' (parent's perspective: "my child")
      if (person.parents && Array.isArray(person.parents)) {
        person.parents.forEach((parentId: string) => {
          this.addBidirectionalEdge(graph, person.id, parentId, 'parent', 'child');
        });
      }

      // Spouse relationships
      if (person.spouseId) {
        this.addBidirectionalEdge(graph, person.id, person.spouseId, 'spouse', 'spouse');
      }

      // Sibling relationships (if explicitly stored)
      if (person.siblings && Array.isArray(person.siblings)) {
        person.siblings.forEach((siblingId: string) => {
          this.addBidirectionalEdge(graph, person.id, siblingId, 'sibling', 'sibling');
        });
      }
    });

    // Add relationships from new format
    relationships.forEach((rel: any) => {
      const relType = rel.type || '';
      
      // 🔧 FIX: Support both "from/to" and "fromPerson/toPerson" property names
      const fromId = rel.from || rel.fromPerson;
      const toId = rel.to || rel.toPerson;
      
      if (!fromId || !toId) {
        console.warn('⚠️ Skipping relationship with missing IDs:', rel);
        return;
      }
      
      console.log('🔍 Processing relationship:', {
        from: fromId,
        to: toId,
        type: relType,
        biologicalOrAdopted: rel.biologicalOrAdopted
      });
      
      // Handle parent-child relationships (both "parent-child" and "parent"/"child")
      // 🔧 CRITICAL FIX: When relType is 'parent-child', from=parent and to=child
      // So edge from parent→child should be 'child' (parent's perspective: "my child")
      // And edge from child→parent should be 'parent' (child's perspective: "my parent")
      if (relType === 'parent-child' || relType === 'parent') {
        this.addBidirectionalEdge(graph, fromId, toId, 'child', 'parent', rel.biologicalOrAdopted);
      } else if (relType === 'child') {
        this.addBidirectionalEdge(graph, fromId, toId, 'parent', 'child', rel.biologicalOrAdopted);
      } 
      // Handle spouse relationships
      else if (relType === 'spouse') {
        this.addBidirectionalEdge(graph, fromId, toId, 'spouse', 'spouse');
      } 
      // Handle sibling relationships
      else if (relType === 'sibling') {
        this.addBidirectionalEdge(graph, fromId, toId, 'sibling', 'sibling');
      }
      // Unknown type - log warning
      else if (relType) {
        console.warn('⚠️ Unknown relationship type:', relType, 'for relationship:', rel);
      }
    });

    // Infer sibling relationships from shared parents
    this.inferSiblings(graph);

    this.graph = graph;
    this.graphVersion++;
    this.cache.clear();

    const totalEdges = Array.from(graph.edges.values()).reduce((sum, edges) => sum + edges.length, 0);
    console.log(`🔍 Relationship Graph Built:`, {
      nodes: graph.nodes.size,
      totalEdges: totalEdges,
      version: this.graphVersion
    });
    
    // Debug: Show all edges
    console.log('🔍 All edges in graph:');
    graph.edges.forEach((edges, personId) => {
      if (edges.length > 0) {
        const person = graph.nodes.get(personId);
        console.log(`   ${person?.name} (${personId}):`, edges.map(e => `${e.type} -> ${graph.nodes.get(e.toId)?.name}`));
      }
    });

    return graph;
  }

  /**
   * Add bidirectional edges to the graph
   */
  private addBidirectionalEdge(
    graph: RelationshipGraph,
    fromId: string,
    toId: string,
    forwardType: 'parent' | 'child' | 'spouse' | 'sibling',
    reverseType: 'parent' | 'child' | 'spouse' | 'sibling',
    biologicalOrAdopted?: 'biological' | 'adopted' | 'step'
  ) {
    if (!graph.nodes.has(fromId) || !graph.nodes.has(toId)) {
      return; // Skip if nodes don't exist
    }

    // Forward edge
    const forwardEdges = graph.edges.get(fromId) || [];
    if (!forwardEdges.some(e => e.toId === toId && e.type === forwardType)) {
      forwardEdges.push({ fromId, toId, type: forwardType, biologicalOrAdopted });
      graph.edges.set(fromId, forwardEdges);
    }

    // Reverse edge
    const reverseEdges = graph.edges.get(toId) || [];
    if (!reverseEdges.some(e => e.toId === fromId && e.type === reverseType)) {
      reverseEdges.push({ fromId: toId, toId: fromId, type: reverseType, biologicalOrAdopted });
      graph.edges.set(toId, reverseEdges);
    }
  }

  /**
   * Infer sibling relationships from shared parents
   */
  private inferSiblings(graph: RelationshipGraph) {
    const parentToChildren = new Map<string, string[]>();

    // Build parent → children map
    graph.edges.forEach((edges, personId) => {
      edges.forEach(edge => {
        if (edge.type === 'parent') {
          const children = parentToChildren.get(edge.toId) || [];
          if (!children.includes(personId)) {
            children.push(personId);
          }
          parentToChildren.set(edge.toId, children);
        }
      });
    });

    // 🔧 DEBUG: Log parent-children relationships
    console.log('🔍 Inferring sibling relationships from shared parents:');
    parentToChildren.forEach((children, parentId) => {
      const parent = graph.nodes.get(parentId);
      const childNames = children.map(id => graph.nodes.get(id)?.name);
      console.log(`   Parent: ${parent?.name} has ${children.length} children:`, childNames);
    });

    // Create sibling relationships
    let siblingsCreated = 0;
    parentToChildren.forEach((children, parentId) => {
      if (children.length > 1) {
        for (let i = 0; i < children.length; i++) {
          for (let j = i + 1; j < children.length; j++) {
            const child1 = children[i];
            const child2 = children[j];
            const name1 = graph.nodes.get(child1)?.name;
            const name2 = graph.nodes.get(child2)?.name;
            console.log(`   ✅ Creating sibling relationship: ${name1} ↔ ${name2}`);
            this.addBidirectionalEdge(graph, child1, child2, 'sibling', 'sibling');
            siblingsCreated++;
          }
        }
      }
    });
    
    console.log(`✅ Created ${siblingsCreated} sibling relationship pairs`);
  }

  /**
   * Find all paths between two people (BFS with depth limit)
   */
  findAllPaths(
    startId: string,
    endId: string,
    maxDepth: number = 6
  ): RelationshipPath[] {
    if (!this.graph) {
      return [];
    }

    if (startId === endId) {
      return [];
    }

    const paths: RelationshipPath[] = [];
    const visited = new Set<string>();
    
    interface QueueItem {
      currentId: string;
      path: string[];
      edges: RelationshipEdge[];
    }

    const queue: QueueItem[] = [{
      currentId: startId,
      path: [startId],
      edges: []
    }];

    while (queue.length > 0) {
      const { currentId, path, edges } = queue.shift()!;

      if (path.length > maxDepth + 1) {
        continue;
      }

      if (currentId === endId) {
        paths.push({
          nodes: path,
          edges: edges,
          length: edges.length
        });
        continue;
      }

      const nodeEdges = this.graph.edges.get(currentId) || [];
      
      for (const edge of nodeEdges) {
        if (!path.includes(edge.toId)) {
          queue.push({
            currentId: edge.toId,
            path: [...path, edge.toId],
            edges: [...edges, edge]
          });
        }
      }
    }

    return paths.sort((a, b) => a.length - b.length); // Sort by shortest path first
  }

  /**
   * Calculate relationship from a path
   */
  calculateRelationshipFromPath(path: RelationshipPath, rootPerson: Person): DerivedRelationship {
    if (path.length === 0) {
      return { label: 'Self', type: 'self', shortLabel: 'Self' };
    }

    // Extract edge types to create pattern
    const pattern = path.edges.map(edge => edge.type);
    
    // 🔧 DEBUG: Log pattern matching attempts
    const targetPersonId = path.nodes[path.nodes.length - 1];
    const targetPerson = this.graph?.nodes.get(targetPersonId);
    console.log('🔍 Calculating relationship for path:');
    console.log('   Pattern:', pattern);
    console.log('   Path nodes:', path.nodes.map(id => this.graph?.nodes.get(id)?.name));
    console.log('   Target person:', targetPerson?.name);

    // Try to match against rules
    for (const rule of RELATIONSHIP_RULES) {
      if (this.matchesPattern(pattern, rule.pattern)) {
        
        if (!targetPerson) {
          continue;
        }

        console.log('   ✅ Matched rule:', rule.label, 'for pattern:', rule.pattern);

        // Apply gender and lineage awareness
        let label = rule.label;
        const lineage = rule.lineage === 'depends' ? this.detectLineage(path, rootPerson) : rule.lineage;

        // 🆕 SPECIAL HANDLING: For relationship types that need gender-aware labeling
        if (rule.type === 'niece_nephew_spouse' || rule.type === 'cousin_spouse' || rule.type === 'cousin_child' || rule.type === 'cousin_child_spouse' || rule.type === 'sibling_in_law_spouse' || rule.type === 'sibling_in_law_child' || rule.type === 'sibling_in_law_child_spouse' || rule.type === 'sibling_grandchild' || rule.type === 'sibling_in_law_grandchild' || rule.type === 'cousin_grandchild') {
          // Path is like: root → sibling → niece/nephew → spouse (target)
          // OR: root → parent → sibling → niece/nephew → spouse (target)
          // OR: root → parent → sibling → cousin → spouse (target)
          // OR: root → spouse → sibling-in-law → spouse (target)
          // We need to check the gender of the intermediate person (second-to-last node)
          const intermediatePersonId = path.nodes[path.nodes.length - 2];
          const intermediatePerson = this.graph?.nodes.get(intermediatePersonId);
          
          if (intermediatePerson) {
            const intermediateGender = intermediatePerson.gender?.toLowerCase();
            const targetGender = targetPerson.gender?.toLowerCase();
            
            if (rule.type === 'sibling_in_law_spouse') {
              console.log('   🔍 Sibling-in-Law Spouse - Intermediate person:', intermediatePerson.name, 'Gender:', intermediateGender);
              console.log('   🔍 Sibling-in-Law Spouse - Target person:', targetPerson.name, 'Gender:', targetGender);
              
              // Determine relationship based on sibling-in-law's gender
              if (intermediateGender === 'male') {
                // It's a brother-in-law, so target is brother-in-law's spouse
                label = targetGender === 'female' ? "Brother-in-Law's Wife" : "Brother-in-Law's Husband";
              } else if (intermediateGender === 'female') {
                // It's a sister-in-law, so target is sister-in-law's spouse
                label = targetGender === 'male' ? "Sister-in-Law's Husband" : "Sister-in-Law's Wife";
              } else {
                // Gender unknown, use generic label
                label = targetGender === 'male' ? "Sibling-in-Law's Husband" : "Sibling-in-Law's Wife";
              }
              
              console.log('   ✅ Resolved to:', label);
            } else if (rule.type === 'cousin_spouse') {
              console.log('   🔍 Cousin Spouse - Intermediate person:', intermediatePerson.name, 'Gender:', intermediateGender);
              console.log('   🔍 Cousin Spouse - Target person:', targetPerson.name, 'Gender:', targetGender);
              
              // Determine relationship based on cousin's gender
              if (intermediateGender === 'male') {
                // It's a male cousin, so target is cousin's spouse
                label = targetGender === 'female' ? "Cousin's Wife" : "Cousin's Husband";
              } else if (intermediateGender === 'female') {
                // It's a female cousin, so target is cousin's spouse
                label = targetGender === 'male' ? "Cousin's Husband" : "Cousin's Wife";
              } else {
                // Gender unknown, use generic label
                label = targetGender === 'male' ? "Cousin's Husband" : "Cousin's Wife";
              }
              
              // Add lineage prefix if applicable
              if (lineage === 'maternal') {
                label = 'Maternal ' + label;
              } else if (lineage === 'paternal') {
                label = 'Paternal ' + label;
              }
              
              console.log('   ✅ Resolved to:', label);
            } else if (rule.type === 'cousin_child') {
              console.log('   🔍 Cousin Child - Intermediate person (cousin):', intermediatePerson.name, 'Gender:', intermediateGender);
              console.log('   🔍 Cousin Child - Target person (child):', targetPerson.name, 'Gender:', targetGender);
              
              // Determine relationship based on target person's gender (the cousin's child)
              if (targetGender === 'male') {
                label = "Cousin's Son";
              } else if (targetGender === 'female') {
                label = "Cousin's Daughter";
              } else {
                label = "Cousin's Child";
              }
              
              // Add lineage prefix if applicable
              if (lineage === 'maternal') {
                label = 'Maternal ' + label;
              } else if (lineage === 'paternal') {
                label = 'Paternal ' + label;
              }
              
              console.log('   ✅ Resolved to:', label);
            } else if (rule.type === 'sibling_in_law_child') {
              console.log('   🔍 Sibling-in-Law Child - Intermediate person (sibling-in-law):', intermediatePerson.name, 'Gender:', intermediateGender);
              console.log('   🔍 Sibling-in-Law Child - Target person (child):', targetPerson.name, 'Gender:', targetGender);
              
              // Determine relationship based on both intermediate (sibling-in-law) and target (child) genders
              // Path: You → Spouse → Spouse's Sibling → Child
              const siblingInLawGender = path.nodes.length >= 3 ? this.graph?.nodes.get(path.nodes[path.nodes.length - 2])?.gender?.toLowerCase() : undefined;
              
              if (siblingInLawGender === 'male') {
                // Brother-in-Law's child
                label = targetGender === 'male' ? "Brother-in-Law's Son" : targetGender === 'female' ? "Brother-in-Law's Daughter" : "Brother-in-Law's Child";
              } else if (siblingInLawGender === 'female') {
                // Sister-in-Law's child
                label = targetGender === 'male' ? "Sister-in-Law's Son" : targetGender === 'female' ? "Sister-in-Law's Daughter" : "Sister-in-Law's Child";
              } else {
                // Gender unknown
                label = targetGender === 'male' ? "Sibling-in-Law's Son" : targetGender === 'female' ? "Sibling-in-Law's Daughter" : "Sibling-in-Law's Child";
              }
              
              console.log('   ✅ Resolved to:', label);
            } else if (rule.type === 'sibling_in_law_child_spouse') {
              console.log('   🔍 Sibling-in-Law Child Spouse - Path length:', path.nodes.length);
              
              // Path: You → Spouse → Spouse's Sibling → Child → Child's Spouse
              // Second-to-last node is the child, third-to-last is the sibling-in-law
              const childGender = path.nodes.length >= 2 ? this.graph?.nodes.get(path.nodes[path.nodes.length - 2])?.gender?.toLowerCase() : undefined;
              const siblingInLawGender = path.nodes.length >= 3 ? this.graph?.nodes.get(path.nodes[path.nodes.length - 3])?.gender?.toLowerCase() : undefined;
              
              console.log('   🔍 Child gender:', childGender, 'Sibling-in-law gender:', siblingInLawGender, 'Target gender:', targetGender);
              
              // Build label based on sibling-in-law gender and child gender
              let childLabel = '';
              if (siblingInLawGender === 'male') {
                // Brother-in-Law's child
                childLabel = childGender === 'male' ? "Brother-in-Law's Son's" : childGender === 'female' ? "Brother-in-Law's Daughter's" : "Brother-in-Law's Child's";
              } else if (siblingInLawGender === 'female') {
                // Sister-in-Law's child
                childLabel = childGender === 'male' ? "Sister-in-Law's Son's" : childGender === 'female' ? "Sister-in-Law's Daughter's" : "Sister-in-Law's Child's";
              } else {
                // Gender unknown
                childLabel = childGender === 'male' ? "Sibling-in-Law's Son's" : childGender === 'female' ? "Sibling-in-Law's Daughter's" : "Sibling-in-Law's Child's";
              }
              
              // Add spouse label
              label = childLabel + (targetGender === 'male' ? ' Husband' : targetGender === 'female' ? ' Wife' : ' Spouse');
              
              console.log('   ✅ Resolved to:', label);
            } else if (rule.type === 'cousin_child_spouse') {
              console.log('   🔍 Cousin Child Spouse - Path length:', path.nodes.length);
              
              // Path: You → Parent → Aunt/Uncle → Cousin → Cousin's Child → Child's Spouse
              // Second-to-last node is the cousin's child, third-to-last is the cousin
              const childGender = path.nodes.length >= 2 ? this.graph?.nodes.get(path.nodes[path.nodes.length - 2])?.gender?.toLowerCase() : undefined;
              
              console.log('   🔍 Cousin child gender:', childGender, 'Target (spouse) gender:', targetGender);
              
              // Build label based on cousin's child gender
              if (childGender === 'male') {
                label = targetGender === 'female' ? "Cousin's Son's Wife" : targetGender === 'male' ? "Cousin's Son's Husband" : "Cousin's Son's Spouse";
              } else if (childGender === 'female') {
                label = targetGender === 'male' ? "Cousin's Daughter's Husband" : targetGender === 'female' ? "Cousin's Daughter's Wife" : "Cousin's Daughter's Spouse";
              } else {
                label = targetGender === 'male' ? "Cousin's Child's Husband" : targetGender === 'female' ? "Cousin's Child's Wife" : "Cousin's Child's Spouse";
              }
              
              // Add lineage prefix if applicable
              if (lineage === 'maternal') {
                label = 'Maternal ' + label;
              } else if (lineage === 'paternal') {
                label = 'Paternal ' + label;
              }
              
              console.log('   ✅ Resolved to:', label);
            } else if (rule.type === 'sibling_grandchild') {
              console.log('   🔍 Sibling Grandchild - Path length:', path.nodes.length);
              
              // Path: You → Sibling → Child → Child's Child (Grandchild)
              // Third-to-last node is the sibling, second-to-last is the child
              const siblingGender = path.nodes.length >= 3 ? this.graph?.nodes.get(path.nodes[path.nodes.length - 3])?.gender?.toLowerCase() : undefined;
              const childGender = path.nodes.length >= 2 ? this.graph?.nodes.get(path.nodes[path.nodes.length - 2])?.gender?.toLowerCase() : undefined;
              
              console.log('   🔍 Sibling gender:', siblingGender, 'Child gender:', childGender, 'Target (grandchild) gender:', targetGender);
              
              // Build label based on sibling gender and grandchild gender
              if (siblingGender === 'male') {
                // Brother's grandchild
                label = targetGender === 'male' ? "Brother's Grandson" : targetGender === 'female' ? "Brother's Granddaughter" : "Brother's Grandchild";
              } else if (siblingGender === 'female') {
                // Sister's grandchild
                label = targetGender === 'male' ? "Sister's Grandson" : targetGender === 'female' ? "Sister's Granddaughter" : "Sister's Grandchild";
              } else {
                // Gender unknown
                label = targetGender === 'male' ? "Sibling's Grandson" : targetGender === 'female' ? "Sibling's Granddaughter" : "Sibling's Grandchild";
              }
              
              console.log('   ✅ Resolved to:', label);
            } else if (rule.type === 'sibling_in_law_grandchild') {
              console.log('   🔍 Sibling-in-Law Grandchild - Path length:', path.nodes.length);
              
              // Path: You → Spouse → Spouse's Sibling → Child → Child's Child (Grandchild)
              // Fourth-to-last node is the sibling-in-law, third-to-last is the child
              const siblingInLawGender = path.nodes.length >= 4 ? this.graph?.nodes.get(path.nodes[path.nodes.length - 4])?.gender?.toLowerCase() : undefined;
              const childGender = path.nodes.length >= 3 ? this.graph?.nodes.get(path.nodes[path.nodes.length - 3])?.gender?.toLowerCase() : undefined;
              
              console.log('   🔍 Sibling-in-law gender:', siblingInLawGender, 'Child gender:', childGender, 'Target (grandchild) gender:', targetGender);
              
              // Build label based on sibling-in-law gender and grandchild gender
              if (siblingInLawGender === 'male') {
                // Brother-in-Law's grandchild
                label = targetGender === 'male' ? "Brother-in-Law's Grandson" : targetGender === 'female' ? "Brother-in-Law's Granddaughter" : "Brother-in-Law's Grandchild";
              } else if (siblingInLawGender === 'female') {
                // Sister-in-Law's grandchild
                label = targetGender === 'male' ? "Sister-in-Law's Grandson" : targetGender === 'female' ? "Sister-in-Law's Granddaughter" : "Sister-in-Law's Grandchild";
              } else {
                // Gender unknown
                label = targetGender === 'male' ? "Sibling-in-Law's Grandson" : targetGender === 'female' ? "Sibling-in-Law's Granddaughter" : "Sibling-in-Law's Grandchild";
              }
              
              console.log('   ✅ Resolved to:', label);
            } else if (rule.type === 'cousin_grandchild') {
              console.log('   🔍 Cousin Grandchild - Path length:', path.nodes.length);
              
              // Path: You → Parent → Aunt/Uncle → Cousin → Cousin's Child → Child's Child (Grandchild)
              // Third-to-last node is the cousin, second-to-last is the child
              const childGender = path.nodes.length >= 2 ? this.graph?.nodes.get(path.nodes[path.nodes.length - 2])?.gender?.toLowerCase() : undefined;
              
              console.log('   🔍 Child gender:', childGender, 'Target (grandchild) gender:', targetGender);
              
              // Build label based on grandchild gender
              if (targetGender === 'male') {
                label = "Cousin's Grandson";
              } else if (targetGender === 'female') {
                label = "Cousin's Granddaughter";
              } else {
                label = "Cousin's Grandchild";
              }
              
              // Add lineage prefix if applicable
              if (lineage === 'maternal') {
                label = 'Maternal ' + label;
              } else if (lineage === 'paternal') {
                label = 'Paternal ' + label;
              }
              
              console.log('   ✅ Resolved to:', label);
            } else {
              // Niece/Nephew's Spouse logic
              console.log('   🔍 Niece/Nephew Spouse - Intermediate person:', intermediatePerson.name, 'Gender:', intermediateGender);
              console.log('   🔍 Niece/Nephew Spouse - Target person:', targetPerson.name, 'Gender:', targetGender);
              
              // Determine relationship based on intermediate person's gender
              if (intermediateGender === 'male') {
                // It's a nephew, so target is nephew's spouse
                label = targetGender === 'female' ? "Nephew's Wife" : "Nephew's Husband";
              } else if (intermediateGender === 'female') {
                // It's a niece, so target is niece's spouse
                label = targetGender === 'male' ? "Niece's Husband" : "Niece's Wife";
              } else {
                // Gender unknown, use generic label
                label = targetGender === 'male' ? "Niece/Nephew's Husband" : "Niece/Nephew's Wife";
              }
              
              // Add lineage prefix if applicable
              if (lineage === 'maternal') {
                label = 'Maternal ' + label;
              } else if (lineage === 'paternal') {
                label = 'Paternal ' + label;
              }
              
              console.log('   ✅ Resolved to:', label);
            }
          }
        } else {
          // Apply standard gender-specific labeling for other relationships
          label = this.applyGenderToLabel(label, targetPerson, lineage);
        }

        return {
          label,
          type: rule.type,
          lineage,
          degree: rule.degree,
          shortLabel: this.generateShortLabel(label),
          description: this.generateDescription(label, targetPerson.name)
        };
      }
    }

    // 🔧 DEBUG: No rule matched
    console.warn('   ⚠️ No rule matched for pattern:', pattern);
    console.warn('   Available patterns:', RELATIONSHIP_RULES.map(r => r.pattern.join(' → ')));

    // Fallback for unmatched patterns
    const distance = path.length;
    if (distance <= 2) {
      return { 
        label: 'Close Relative', 
        type: 'relative', 
        shortLabel: 'Relative',
        description: `A close family member (${distance} connection${distance > 1 ? 's' : ''} away)`
      };
    } else {
      return { 
        label: 'Distant Relative', 
        type: 'relative', 
        shortLabel: 'Relative',
        description: `A distant family member (${distance} connections away)`
      };
    }
  }

  /**
   * Match edge pattern against rule pattern
   */
  private matchesPattern(edgePattern: string[], rulePattern: string[]): boolean {
    if (edgePattern.length !== rulePattern.length) {
      return false;
    }

    return edgePattern.every((edge, i) => edge === rulePattern[i]);
  }

  /**
   * Apply gender-specific labels
   */
  private applyGenderToLabel(
    baseLabel: string,
    person: Person,
    lineage?: 'maternal' | 'paternal' | 'spousal' | 'mixed'
  ): string {
    const gender = person.gender?.toLowerCase();
    
    // Add lineage prefix if applicable
    let lineagePrefix = '';
    if (lineage === 'maternal') {
      lineagePrefix = 'Maternal ';
    } else if (lineage === 'paternal') {
      lineagePrefix = 'Paternal ';
    }

    const genderMap: { [key: string]: { male: string; female: string } } = {
      'Uncle/Aunt': { male: 'Uncle', female: 'Aunt' },
      'Great-Uncle/Aunt': { male: 'Great-Uncle', female: 'Great-Aunt' },
      'Sibling-in-law': { male: 'Brother-in-law', female: 'Sister-in-law' },
      'Niece/Nephew': { male: 'Nephew', female: 'Niece' },
      'Grand-Niece/Nephew': { male: 'Grand-Nephew', female: 'Grand-Niece' },
      'Child-in-law': { male: 'Son-in-law', female: 'Daughter-in-law' },
      'Parent-in-law': { male: 'Father-in-law', female: 'Mother-in-law' },
      'Grandparent': { male: 'Grandfather', female: 'Grandmother' },
      'Great-Grandparent': { male: 'Great-Grandfather', female: 'Great-Grandmother' },
      'Great-Great-Grandparent': { male: 'Great-Great-Grandfather', female: 'Great-Great-Grandmother' },
      'Grandchild': { male: 'Grandson', female: 'Granddaughter' },
      'Great-Grandchild': { male: 'Great-Grandson', female: 'Great-Granddaughter' },
      'Parent': { male: 'Father', female: 'Mother' },
      'Child': { male: 'Son', female: 'Daughter' },
      'Sibling': { male: 'Brother', female: 'Sister' },
      'Step-parent': { male: 'Step-father', female: 'Step-mother' },
      // 🆕 NEW: In-law relationships
      'Uncle/Aunt-in-law': { male: 'Uncle-in-law', female: 'Aunt-in-law' },
      'Uncle/Aunt by marriage': { male: 'Uncle by marriage', female: 'Aunt by marriage' },
      'Niece/Nephew-in-law': { male: 'Nephew-in-law', female: 'Niece-in-law' },
      'Niece/Nephew by marriage': { male: 'Nephew by marriage', female: 'Niece by marriage' },
      'Spouse': { male: 'Husband', female: 'Wife' }
    };

    if (genderMap[baseLabel] && gender) {
      const genderedLabel = gender === 'male' ? genderMap[baseLabel].male : genderMap[baseLabel].female;
      return lineagePrefix + genderedLabel;
    }

    return lineagePrefix + baseLabel;
  }

  /**
   * Detect lineage (maternal vs paternal)
   */
  private detectLineage(
    path: RelationshipPath,
    rootPerson: Person
  ): 'maternal' | 'paternal' | 'mixed' | undefined {
    if (!this.graph) {
      return undefined;
    }

    // Get root person's parents
    const rootParents = this.graph.edges.get(rootPerson.id)
      ?.filter(edge => edge.type === 'parent')
      .map(edge => edge.toId) || [];

    if (rootParents.length === 0) {
      return undefined;
    }

    let mother: string | undefined;
    let father: string | undefined;

    rootParents.forEach(parentId => {
      const parent = this.graph!.nodes.get(parentId);
      if (parent) {
        if (parent.gender?.toLowerCase() === 'female') {
          mother = parentId;
        } else if (parent.gender?.toLowerCase() === 'male') {
          father = parentId;
        }
      }
    });

    // Check if path goes through mother or father
    const goesThoughMother = mother && path.nodes.includes(mother);
    const goesThoughFather = father && path.nodes.includes(father);

    if (goesThoughMother && !goesThoughFather) {
      return 'maternal';
    } else if (goesThoughFather && !goesThoughMother) {
      return 'paternal';
    } else if (goesThoughMother && goesThoughFather) {
      return 'mixed';
    }

    return undefined;
  }

  /**
   * Generate short label for UI
   */
  private generateShortLabel(label: string): string {
    return label
      .replace('Maternal ', '')
      .replace('Paternal ', '')
      .replace('-in-law', '')
      .replace('Great-Great-', 'G-G-')
      .replace('Great-', 'G-')
      .replace(' Once Removed', ' (1R)')
      .replace(' Twice Removed', ' (2R)');
  }

  /**
   * Generate human-readable description
   */
  private generateDescription(label: string, personName: string): string {
    // 🔧 FIX: Don't include person's name since it's already displayed at the top of the profile
    // Just show the relationship, e.g., "Brother" instead of "undefined is your Brother"
    return label;
  }

  /**
   * Get relationship between two people (with caching)
   */
  getRelationship(personAId: string, personBId: string, rootPerson?: Person): DerivedRelationship | null {
    if (!this.graph) {
      console.warn('⚠️ Relationship graph not built. Call buildRelationshipGraph first.');
      return null;
    }

    if (personAId === personBId) {
      return { label: 'Self', type: 'self', shortLabel: 'Self' };
    }

    // Check cache
    const cacheKey = `${personAId}-${personBId}-${this.graphVersion}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // 🔧 CRITICAL FIX: Find paths FROM personA TO personB (correct direction)
    // This gives us the correct edge pattern for "What is personB to personA?"
    // For example, if personA is "you" and personB is "your mother":
    // - Path from you → mother uses 'parent' edge type (you have parent edge to mother)
    // - Pattern: ['parent'] → matches rule ['parent'] → "Parent" → gender applied → "Mother" ✅
    // 
    // The path direction determines the edge types encountered:
    // - Root → Mother: follows 'parent' edge → pattern ['parent'] → "Mother"
    // - Root → Child: follows 'child' edge → pattern ['child'] → "Son/Daughter"
    // - Root → Sibling: follows 'sibling' edge → pattern ['sibling'] → "Brother/Sister"
    const paths = this.findAllPaths(personAId, personBId, 6);

    if (paths.length === 0) {
      console.log('🔍 No paths found between', personAId, 'and', personBId);
      return null; // No relationship found
    }

    // Use shortest path for relationship calculation
    const shortestPath = paths[0];
    
    console.log('🔍 Found path:', {
      from: personAId,
      to: personBId,
      pattern: shortestPath.edges.map(e => e.type),
      nodes: shortestPath.nodes
    });
    
    // Determine root person for lineage detection
    const root = rootPerson || this.graph.nodes.get(personAId);
    if (!root) {
      return null;
    }

    const relationship = this.calculateRelationshipFromPath(shortestPath, root);

    console.log('🎯 Calculated relationship:', relationship);

    // Cache result
    this.cache.set(cacheKey, relationship);

    return relationship;
  }

  /**
   * Get all relationships for a person relative to root user
   */
  getAllRelationshipsForPerson(personId: string, rootUserId: string): Map<string, DerivedRelationship> {
    if (!this.graph) {
      return new Map();
    }

    const relationships = new Map<string, DerivedRelationship>();
    const rootPerson = this.graph.nodes.get(rootUserId);

    if (!rootPerson) {
      return relationships;
    }

    // Calculate relationships to all other people
    this.graph.nodes.forEach((person, id) => {
      if (id !== personId) {
        const relationship = this.getRelationship(personId, id, rootPerson);
        if (relationship) {
          relationships.set(id, relationship);
        }
      }
    });

    return relationships;
  }

  /**
   * Invalidate cache (call when family tree changes)
   */
  invalidateCache() {
    this.graphVersion++;
    this.cache.clear();
    console.log('🔄 Relationship cache invalidated');
  }

  /**
   * Get statistics about the relationship graph
   */
  getStats(): { nodes: number; edges: number; cacheSize: number; version: number } {
    const totalEdges = this.graph 
      ? Array.from(this.graph.edges.values()).reduce((sum, edges) => sum + edges.length, 0)
      : 0;

    return {
      nodes: this.graph?.nodes.size || 0,
      edges: totalEdges,
      cacheSize: this.cache.size,
      version: this.graphVersion
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

// Export a singleton instance for use across the app
export const relationshipEngine = new RelationshipDerivationEngine();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Initialize the relationship engine with family tree data
 */
export function initializeRelationshipEngine(familyTree: FamilyTree): void {
  relationshipEngine.buildRelationshipGraph(familyTree);
}

/**
 * Get relationship between two people
 */
export function getRelationship(
  personAId: string,
  personBId: string,
  rootUserId?: string
): DerivedRelationship | null {
  const rootPerson = rootUserId ? relationshipEngine.graph?.nodes.get(rootUserId) : undefined;
  return relationshipEngine.getRelationship(personAId, personBId, rootPerson);
}

/**
 * Get relationship label as a simple string
 */
export function getRelationshipLabel(
  personAId: string,
  personBId: string,
  rootUserId?: string
): string {
  const relationship = getRelationship(personAId, personBId, rootUserId);
  return relationship?.label || 'Relative';
}

/**
 * Check if relationship engine is ready
 */
export function isRelationshipEngineReady(): boolean {
  return relationshipEngine.graph !== null;
}
