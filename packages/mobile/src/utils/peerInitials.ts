/** Two-letter initials from a display name, or from a fallback id when the name is empty. */
export function peerInitials(displayName: string, fallbackId: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) {
    const id = fallbackId.replace(/[^a-zA-Z0-9]/g, "") || "?";
    return id.slice(0, 2).toUpperCase();
  }
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    const w = parts[0]!;
    const chars = [...w].slice(0, 2).join("");
    return chars.toUpperCase();
  }
  const first = [...parts[0]!][0] ?? "";
  const last = [...parts[parts.length - 1]!][0] ?? "";
  return `${first}${last}`.toUpperCase();
}
