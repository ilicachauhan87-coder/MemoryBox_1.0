// History Manager for Undo/Redo functionality
export type HistoryAction = 
  | { type: 'ADD_PERSON'; person: any }
  | { type: 'DELETE_PERSON'; person: any; relationships: any[] }
  | { type: 'MOVE_PERSON'; personId: string; fromSlot: number; toSlot: number; fromX: number; toX: number }
  | { type: 'ADD_RELATIONSHIP'; relationship: any }
  | { type: 'DELETE_RELATIONSHIP'; relationship: any }
  | { type: 'WIZARD_COMPLETE'; people: any[]; relationships: any[]; wizardType: string }
  | { type: 'MOVE_SPOUSE_PAIR'; person1: { id: string; fromSlot: number; toSlot: number; fromX: number; toX: number }; person2: { id: string; fromSlot: number; toSlot: number; fromX: number; toX: number } }
  | { type: 'EDIT_PROFILE'; personId: string; before: any; after: any };

export interface HistoryState {
  past: HistoryAction[];
  future: HistoryAction[];
}

export const MAX_HISTORY = 50;

export const createEmptyHistory = (): HistoryState => ({
  past: [],
  future: []
});

export const addToHistory = (
  history: HistoryState,
  action: HistoryAction
): HistoryState => {
  const newPast = [...history.past, action];
  
  // Keep only last MAX_HISTORY items
  if (newPast.length > MAX_HISTORY) {
    newPast.shift();
  }
  
  return {
    past: newPast,
    future: [] // Clear future when new action is performed
  };
};

export const canUndo = (history: HistoryState): boolean => {
  return history.past.length > 0;
};

export const canRedo = (history: HistoryState): boolean => {
  return history.future.length > 0;
};

export const undo = (history: HistoryState): { history: HistoryState; action: HistoryAction | null } => {
  if (!canUndo(history)) {
    return { history, action: null };
  }
  
  const action = history.past[history.past.length - 1];
  const newPast = history.past.slice(0, -1);
  const newFuture = [...history.future, action];
  
  return {
    history: {
      past: newPast,
      future: newFuture
    },
    action
  };
};

export const redo = (history: HistoryState): { history: HistoryState; action: HistoryAction | null } => {
  if (!canRedo(history)) {
    return { history, action: null };
  }
  
  const action = history.future[history.future.length - 1];
  const newFuture = history.future.slice(0, -1);
  const newPast = [...history.past, action];
  
  return {
    history: {
      past: newPast,
      future: newFuture
    },
    action
  };
};

export const getActionDescription = (action: HistoryAction): string => {
  switch (action.type) {
    case 'ADD_PERSON':
      return `Added ${action.person.firstName}`;
    case 'DELETE_PERSON':
      return `Deleted ${action.person.firstName}`;
    case 'MOVE_PERSON':
      return `Moved person`;
    case 'ADD_RELATIONSHIP':
      return `Created ${action.relationship.type === 'spouse' ? 'marriage' : 'parent-child'} relationship`;
    case 'DELETE_RELATIONSHIP':
      return `Removed relationship`;
    case 'WIZARD_COMPLETE':
      return `Completed ${action.wizardType} wizard`;
    case 'MOVE_SPOUSE_PAIR':
      return `Moved spouse pair`;
    case 'EDIT_PROFILE':
      return `Edited profile`;
    default:
      return 'Action';
  }
};
