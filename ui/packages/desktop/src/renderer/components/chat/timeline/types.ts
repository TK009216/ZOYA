export interface TimelineEvent {
  id: string;
  type: 'message' | 'mode_change' | 'task' | 'system';
  timestamp: number;
  label: string;
  description?: string;
  parentId: string | null;
  branchId?: string;
  message?: string;
}

export interface TimelineBranch {
  id: string;
  name: string;
  events: string[];
  createdAt: number;
}

export interface UndoRedoState {
  past: TimelineEvent[];
  present: TimelineEvent | null;
  future: TimelineEvent[];
  branches: TimelineBranch[];
  activeBranch: string;
}
