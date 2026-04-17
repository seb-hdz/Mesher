import { hydrateEntries, pushCapture } from "./captureStore";
import { readTailEntries } from "./fileSink";

function serializeLogArgs(args: unknown[]): string {
  return args
    .map((a) => {
      if (a instanceof Error) return `${a.name}: ${a.message}`;
      if (typeof a === "string") return a;
      if (typeof a === "number" || typeof a === "boolean" || a == null)
        return String(a);
      try {
        const s = JSON.stringify(a);
        return s.length > 500 ? `${s.slice(0, 500)}…` : s;
      } catch {
        return String(a);
      }
    })
    .join(" ");
}

const log = console.log;
const warn = console.warn;
const err = console.error;

console.log = (...args: unknown[]) => {
  log.apply(console, args);
  pushCapture("LOG", serializeLogArgs(args));
};

console.warn = (...args: unknown[]) => {
  warn.apply(console, args);
  pushCapture("WARN", serializeLogArgs(args));
};

console.error = (...args: unknown[]) => {
  err.apply(console, args);
  pushCapture("ERROR", serializeLogArgs(args));
};

void readTailEntries(400).then((rows) => hydrateEntries(rows));
