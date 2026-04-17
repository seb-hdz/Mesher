import {
  deleteAsync,
  documentDirectory,
  readAsStringAsync,
  writeAsStringAsync,
} from "expo-file-system/legacy";

type StoredLevel = "LOG" | "WARN" | "ERROR";

const MAX_FILE_BYTES = 512 * 1024;
const FLUSH_MS = 800;

let logUri: string | null = null;
const pending: string[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;

function getLogUri(): string | null {
  if (logUri) return logUri;
  const base = documentDirectory;
  if (!base) return null;
  logUri = `${base}mesher-debug.ndjson`;
  return logUri;
}

export function queuePersistLine(line: string): void {
  pending.push(line);
  if (flushTimer != null) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushNow();
  }, FLUSH_MS);
}

async function flushNow(): Promise<void> {
  if (pending.length === 0 || flushing) return;
  flushing = true;
  const uri = getLogUri();
  if (!uri) {
    pending.length = 0;
    flushing = false;
    return;
  }
  const batch = pending.splice(0, pending.length);
  const chunk = batch.join("");
  try {
    const prev = await readAsStringAsync(uri).catch(() => "");
    let next = prev + chunk;
    if (next.length > MAX_FILE_BYTES) {
      next = next.slice(-MAX_FILE_BYTES);
      const firstNl = next.indexOf("\n");
      if (firstNl >= 0) next = next.slice(firstNl + 1);
    }
    await writeAsStringAsync(uri, next, { encoding: "utf8" });
  } catch {
    /* ignore disk errors */
  } finally {
    flushing = false;
    if (pending.length > 0) {
      flushTimer = setTimeout(() => {
        flushTimer = null;
        void flushNow();
      }, 100);
    }
  }
}

export async function readTailEntries(
  maxLines: number,
): Promise<{ ts: number; level: StoredLevel; body: string }[]> {
  const uri = getLogUri();
  if (!uri) return [];
  const raw = await readAsStringAsync(uri).catch(() => "");
  const lines = raw.split("\n").filter((l) => l.trim().length > 0);
  const slice = lines.slice(-maxLines);
  const out: { ts: number; level: StoredLevel; body: string }[] = [];
  for (const line of slice) {
    try {
      const o = JSON.parse(line) as { ts?: number; level?: StoredLevel; body?: string };
      if (
        typeof o.ts === "number" &&
        (o.level === "LOG" || o.level === "WARN" || o.level === "ERROR") &&
        typeof o.body === "string"
      ) {
        out.push({ ts: o.ts, level: o.level, body: o.body });
      }
    } catch {
      /* skip bad line */
    }
  }
  return out;
}

export async function clearLogFile(): Promise<void> {
  const uri = getLogUri();
  if (!uri) return;
  await deleteAsync(uri, { idempotent: true }).catch(() => {});
}

export async function flushPendingForShutdown(): Promise<void> {
  if (flushTimer != null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  await flushNow();
}
