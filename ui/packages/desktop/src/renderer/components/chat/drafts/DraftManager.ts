const STORAGE_KEY = 'zoya_drafts';
const MAX_DRAFTS_PER_CONVERSATION = 5;
const SAVE_INTERVAL = 5000;

export class DraftManager {
  private drafts: Record<string, string[]> = {};
  private timers: Map<string, ReturnType<typeof setInterval>> = new Map();

  constructor() {
    this.load();
  }

  private load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.drafts = JSON.parse(raw);
    } catch { this.drafts = {}; }
  }

  private save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.drafts)); } catch {}
  }

  getDraft(conversationId: string): string | null {
    const conv = this.drafts[conversationId];
    if (!conv || conv.length === 0) return null;
    return conv[conv.length - 1] ?? null;
  }

  getAllDrafts(conversationId: string): string[] {
    return this.drafts[conversationId] ?? [];
  }

  saveDraft(conversationId: string, text: string) {
    if (!text.trim()) return;
    if (!this.drafts[conversationId]) this.drafts[conversationId] = [];
    const drafts = this.drafts[conversationId];
    if (drafts[drafts.length - 1] === text) return;
    drafts.push(text);
    if (drafts.length > MAX_DRAFTS_PER_CONVERSATION) drafts.splice(0, drafts.length - MAX_DRAFTS_PER_CONVERSATION);
    this.save();
  }

  removeDraft(conversationId: string) {
    delete this.drafts[conversationId];
    this.save();
  }

  removeLastDraft(conversationId: string) {
    const drafts = this.drafts[conversationId];
    if (drafts && drafts.length > 0) {
      drafts.pop();
      if (drafts.length === 0) delete this.drafts[conversationId];
      this.save();
    }
  }

  startAutoSave(conversationId: string, getText: () => string) {
    this.stopAutoSave(conversationId);
    const timer = setInterval(() => {
      const text = getText();
      if (text.trim()) this.saveDraft(conversationId, text);
    }, SAVE_INTERVAL);
    this.timers.set(conversationId, timer);
  }

  stopAutoSave(conversationId: string) {
    const timer = this.timers.get(conversationId);
    if (timer) { clearInterval(timer); this.timers.delete(conversationId); }
  }

  stopAll() {
    for (const [id, timer] of this.timers) clearInterval(timer);
    this.timers.clear();
  }

  hasDraft(conversationId: string): boolean {
    return !!this.getDraft(conversationId);
  }
}

export const draftManager = new DraftManager();
