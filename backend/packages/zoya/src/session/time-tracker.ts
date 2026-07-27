import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';

const TRACKER_PATH = path.join(homedir(), '.config', 'zoya', 'time-tracker.json');

interface SessionTrack {
  sessionId: string;
  lastActive: number;
  lastMessageId: string;
  totalActiveSeconds: number;
  pendingTasks: string[];
  interruptedTask: string | null;
  greetingSent: boolean;
  visitCount: number;
}

interface TimeTrackerData {
  sessions: Record<string, SessionTrack>;
  globalLastActive: number;
  globalVisitCount: number;
}

function load(): TimeTrackerData {
  try {
    const dir = path.dirname(TRACKER_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const raw = fs.readFileSync(TRACKER_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { sessions: {}, globalLastActive: Date.now(), globalVisitCount: 0 };
  }
}

function save(data: TimeTrackerData): void {
  try {
    fs.writeFileSync(TRACKER_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch {}
}

export function trackActivity(sessionId: string, messageId: string, pendingTasks: string[] = [], interruptedTask: string | null = null): void {
  const data = load();
  const now = Date.now();
  const existing = data.sessions[sessionId];
  if (existing) {
    existing.lastActive = now;
    existing.lastMessageId = messageId;
    existing.totalActiveSeconds += existing.lastActive ? Math.round((now - existing.lastActive) / 1000) : 0;
    existing.pendingTasks = pendingTasks.length > 0 ? pendingTasks : existing.pendingTasks;
    if (interruptedTask) existing.interruptedTask = interruptedTask;
    existing.visitCount++;
  } else {
    data.sessions[sessionId] = {
      sessionId,
      lastActive: now,
      lastMessageId: messageId,
      totalActiveSeconds: 0,
      pendingTasks,
      interruptedTask,
      greetingSent: false,
      visitCount: 1,
    };
  }
  data.globalLastActive = now;
  save(data);
}

export function markGreetingSent(sessionId: string): void {
  const data = load();
  if (data.sessions[sessionId]) {
    data.sessions[sessionId].greetingSent = true;
    save(data);
  }
}

export function getTimeSinceLastActive(sessionId: string): { seconds: number; label: string; isNewVisit: boolean } {
  const data = load();
  const now = Date.now();
  const session = data.sessions[sessionId];
  const lastActive = session?.lastActive || data.globalLastActive;
  const diffSeconds = Math.round((now - lastActive) / 1000);
  const isNewVisit = session ? !session.greetingSent : data.globalVisitCount === 0;

  let label: string;
  if (diffSeconds < 300) {
    label = `${Math.round(diffSeconds / 60)} minutes`;
  } else if (diffSeconds < 3600) {
    label = `${Math.round(diffSeconds / 60)} minutes`;
  } else if (diffSeconds < 86400) {
    const hours = Math.round(diffSeconds / 3600);
    label = hours === 1 ? '1 hour' : `${hours} hours`;
  } else if (diffSeconds < 604800) {
    const days = Math.round(diffSeconds / 86400);
    label = days === 1 ? '1 day' : `${days} days`;
  } else {
    const weeks = Math.round(diffSeconds / 604800);
    label = weeks === 1 ? '1 week' : `${weeks} weeks`;
  }

  return { seconds: diffSeconds, label, isNewVisit };
}

export function getPendingTasks(sessionId: string): string[] {
  const data = load();
  return data.sessions[sessionId]?.pendingTasks || [];
}

export function getInterruptedTask(sessionId: string): string | null {
  const data = load();
  return data.sessions[sessionId]?.interruptedTask || null;
}

export function clearPendingTask(sessionId: string, task: string): void {
  const data = load();
  if (data.sessions[sessionId]) {
    data.sessions[sessionId].pendingTasks = data.sessions[sessionId].pendingTasks.filter((t) => t !== task);
    save(data);
  }
}

export function clearInterruptedTask(sessionId: string): void {
  const data = load();
  if (data.sessions[sessionId]) {
    data.sessions[sessionId].interruptedTask = null;
    save(data);
  }
}

export function buildTimeContext(sessionId: string): string {
  const { seconds, label, isNewVisit } = getTimeSinceLastActive(sessionId);
  const pending = getPendingTasks(sessionId);
  const interrupted = getInterruptedTask(sessionId);

  const parts: string[] = [];
  parts.push(`  Time Since Last Activity: ${label} (${seconds}s)`);

  if (isNewVisit) {
    if (seconds < 60) {
      parts.push('  Visit Type: CONTINUOUS (user just sent another message)');
    } else if (seconds < 3600) {
      parts.push('  Visit Type: SHORT_BREAK (user was away <1 hour)');
    } else if (seconds < 86400) {
      parts.push('  Visit Type: DAY_BREAK (user was away 1-24 hours)');
    } else {
      parts.push('  Visit Type: LONG_BREAK (user was away 1+ days)');
    }
  } else {
    parts.push('  Visit Type: FIRST_MESSAGE (new session, welcome warmly)');
  }

  if (pending.length > 0) {
    parts.push(`  Pending Tasks: ${pending.join(', ')}`);
  }
  if (interrupted) {
    parts.push(`  Interrupted Task: ${interrupted}`);
  }
  parts.push(`  Greeting Needed: ${isNewVisit ? 'YES — craft a time-aware welcome' : 'NO — continue conversation'}`);

  return parts.join('\n');
}
