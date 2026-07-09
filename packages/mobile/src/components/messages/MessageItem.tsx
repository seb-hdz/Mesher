function startOfLocalDayMs(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function formatMessageTimestamp(
  createdAtMs: number,
  language: "es" | "en",
  yesterdayLabel: string
): string {
  const d = new Date(createdAtMs);
  const now = new Date();
  const todayStart = startOfLocalDayMs(now);
  const yesterdayStart = todayStart - 86400000;
  const t = d.getTime();
  const localeTag = language === "es" ? "es" : "en-GB";

  if (t >= todayStart) {
    return new Intl.DateTimeFormat(localeTag, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  }
  if (t >= yesterdayStart) return yesterdayLabel;

  const itemDayStart = startOfLocalDayMs(d);
  const daysAgo = Math.floor((todayStart - itemDayStart) / 86400000);
  if (daysAgo < 7) {
    return new Intl.DateTimeFormat(localeTag, { weekday: "short" }).format(d);
  }
  return new Intl.DateTimeFormat(localeTag, {
    day: "numeric",
    month: "short",
  }).format(d);
}

export function isSameLocalMinute(aMs: number, bMs: number): boolean {
  const a = new Date(aMs);
  const b = new Date(bMs);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate() &&
    a.getHours() === b.getHours() &&
    a.getMinutes() === b.getMinutes()
  );
}

// Returns a string with hour, minute, and SECOND components (HH:mm:ss, localized)
export function formatMessageTimeHMS(
  createdAtMs: number,
  language: "es" | "en"
): string {
  const d = new Date(createdAtMs);
  const localeTag = language === "es" ? "es" : "en-GB";
  return new Intl.DateTimeFormat(localeTag, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
}