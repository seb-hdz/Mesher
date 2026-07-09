import { PeerRecord } from "@mesher/domain";

export const SECTION_OTHER = "__OTHER__";

export function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "");
}

export function sortName(peer: PeerRecord, unknownLabel: string): string {
  const n = peer.displayName.trim();
  if (n) return n;
  return unknownLabel || peer.id;
}

export function bucketKeyForPeer(
  peer: PeerRecord,
  unknownLabel: string
): string {
  const key = sortName(peer, unknownLabel);
  const first = stripDiacritics(key).charAt(0);
  if (!first) return SECTION_OTHER;
  const upper = first.toLocaleUpperCase();
  if (/^[A-Z]$/.test(upper)) return upper;
  return SECTION_OTHER;
}

export function buildSections(
  peers: PeerRecord[],
  unknownLabel: string,
  otherSectionTitle: string
): { title: string; data: PeerRecord[] }[] {
  const collator = new Intl.Collator(undefined, { sensitivity: "base" });
  const sorted = [...peers].sort((a, b) =>
    collator.compare(sortName(a, unknownLabel), sortName(b, unknownLabel))
  );

  const byLetter = new Map<string, PeerRecord[]>();
  for (const p of sorted) {
    const key = bucketKeyForPeer(p, unknownLabel);
    const list = byLetter.get(key) ?? [];
    list.push(p);
    byLetter.set(key, list);
  }

  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const out: { title: string; data: PeerRecord[] }[] = [];
  for (const L of letters) {
    const data = byLetter.get(L);
    if (data?.length) out.push({ title: L, data });
  }
  const other = byLetter.get(SECTION_OTHER);
  if (other?.length) {
    out.push({ title: otherSectionTitle, data: other });
  }
  return out;
}

export function filterPeersByQuery(
  peers: PeerRecord[],
  query: string,
  unknownLabel: string
): PeerRecord[] {
  const q = stripDiacritics(query.trim().toLowerCase());
  if (!q) return peers;
  return peers.filter((p) => {
    const name = stripDiacritics(sortName(p, unknownLabel).toLowerCase());
    const id = p.id.toLowerCase();
    return name.includes(q) || id.includes(q);
  });
}
