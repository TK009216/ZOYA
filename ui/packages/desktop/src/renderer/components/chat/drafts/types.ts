export interface Draft {
  id: string;
  conversationId: string;
  text: string;
  savedAt: number;
  cursorPosition?: number;
}

export interface DraftState {
  drafts: Record<string, Draft[]>;
  currentDraft: string | null;
}
