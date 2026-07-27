import type { TimelineBranch, TimelineEvent } from './types';

let nextId = 1;
function genId() { return `evt_${nextId++}_${Date.now()}`; }
function branchId() { return `branch_${Date.now()}`; }

export class UndoRedoManager {
  past: TimelineEvent[] = [];
  present: TimelineEvent | null = null;
  future: TimelineEvent[] = [];
  branches: TimelineBranch[] = [];
  activeBranch: string;
  maxHistory = 100;

  constructor() {
    this.activeBranch = branchId();
    this.branches.push({ id: this.activeBranch, name: 'Main', events: [], createdAt: Date.now() });
  }

  private currentBranch() {
    return this.branches.find((b) => b.id === this.activeBranch)!;
  }

  push(event: Omit<TimelineEvent, 'id' | 'timestamp' | 'parentId'>) {
    const evt: TimelineEvent = {
      ...event,
      id: genId(),
      timestamp: Date.now(),
      parentId: this.present?.id ?? null,
    };
    this.past.push(evt);
    if (this.past.length > this.maxHistory) this.past.shift();
    this.future = [];
    const branch = this.currentBranch();
    branch.events.push(evt.id);
    this.present = evt;
  }

  undo(): TimelineEvent | null {
    if (this.past.length === 0) return null;
    const evt = this.past.pop()!;
    this.future.push(evt);
    this.present = this.past[this.past.length - 1] ?? null;
    return evt;
  }

  redo(): TimelineEvent | null {
    if (this.future.length === 0) return null;
    const evt = this.future.pop()!;
    this.past.push(evt);
    this.present = evt;
    return evt;
  }

  canUndo(): boolean { return this.past.length > 0; }
  canRedo(): boolean { return this.future.length > 0; }

  fork(name: string): string {
    const branchId = branchId();
    const parentBranch = this.currentBranch();
    this.branches.push({
      id: branchId,
      name,
      events: [...parentBranch.events],
      createdAt: Date.now(),
    });
    this.activeBranch = branchId;
    return branchId;
  }

  switchBranch(branchId: string) {
    if (!this.branches.find((b) => b.id === branchId)) return;
    this.activeBranch = branchId;
    const branch = this.currentBranch();
    const events = this.getAllEvents().filter((e) => branch.events.includes(e.id));
    this.past = events;
    this.present = events[events.length - 1] ?? null;
    this.future = [];
  }

  getAllEvents(): TimelineEvent[] {
    return [...this.past, ...this.future].sort((a, b) => a.timestamp - b.timestamp);
  }

  jumpTo(eventId: string): TimelineEvent | null {
    const idx = this.past.findIndex((e) => e.id === eventId);
    if (idx === -1) return null;
    while (this.past.length > idx + 1) {
      this.future.push(this.past.pop()!);
    }
    this.present = this.past[this.past.length - 1] ?? null;
    return this.present;
  }

  getEventsSince(lastEventId: string): TimelineEvent[] {
    const idx = this.past.findIndex((e) => e.id === lastEventId);
    if (idx === -1) return [];
    return this.past.slice(idx + 1);
  }

  clear() {
    this.past = [];
    this.present = null;
    this.future = [];
    this.branches = [{ id: this.activeBranch, name: 'Main', events: [], createdAt: Date.now() }];
  }
}

export const undoRedoManager = new UndoRedoManager();
