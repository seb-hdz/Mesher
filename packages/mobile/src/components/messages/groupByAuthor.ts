import { peerInitials } from "../../utils/peerInitials";

export type AuthorGroup<T> = {
  authorKey: string;
  displayName: string;
  initials: string | null;
  items: T[];
};

export function groupByAuthorKey<T>(
  items: T[],
  opts: {
    getAuthorKey: (item: T) => string;
    getDisplayName: (item: T) => string;
    hasKnownAuthor: (item: T) => boolean;
    getInitialsFallback: (item: T) => string;
  }
): AuthorGroup<T>[] {
  const order: string[] = [];
  const map = new Map<string, AuthorGroup<T>>();

  for (const item of items) {
    const key = opts.getAuthorKey(item);
    let group = map.get(key);
    if (!group) {
      const displayName = opts.getDisplayName(item);
      const known = opts.hasKnownAuthor(item);
      group = {
        authorKey: key,
        displayName,
        initials: known
          ? peerInitials(displayName, opts.getInitialsFallback(item))
          : null,
        items: [],
      };
      map.set(key, group);
      order.push(key);
    }
    group.items.push(item);
  }

  return order.map((key) => map.get(key)!);
}
