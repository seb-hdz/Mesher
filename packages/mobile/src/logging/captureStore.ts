import { queuePersistLine } from "./fileSink";

export type LogLevel = "LOG" | "WARN" | "ERROR";

export type LogEntry = {
  id: string;
  ts: number;
  level: LogLevel;
  body: string;
};

const MAX_LINES = 800;
const MAX_BODY = 2000;

let buffer: LogEntry[] = [];
let seq = 0;
const listeners = new Set<() => void>();

function notify(): void {
  for (const l of listeners) l();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getEntries(): readonly LogEntry[] {
  return buffer;
}

export function clearMemory(): void {
  buffer = [];
  notify();
}

export function pushCapture(level: LogLevel, body: string): void {
  const trimmed = body.length > MAX_BODY ? `${body.slice(0, MAX_BODY)}…` : body;
  const ts = Date.now();
  const id = `${ts}-${++seq}`;
  const entry: LogEntry = { id, ts, level, body: trimmed };
  buffer = [...buffer.slice(-(MAX_LINES - 1)), entry];
  notify();
  queuePersistLine(JSON.stringify({ ts, level, body: trimmed }) + "\n");
}

export function hydrateEntries(rows: readonly { ts: number; level: LogLevel; body: string }[]): void {
  if (rows.length === 0) return;
  const mapped: LogEntry[] = rows.map((r, i) => ({
    id: `f-${r.ts}-${i}`,
    ts: r.ts,
    level: r.level,
    body: r.body.length > MAX_BODY ? `${r.body.slice(0, MAX_BODY)}…` : r.body,
  }));
  buffer = [...mapped, ...buffer].slice(-MAX_LINES);
  notify();
}
