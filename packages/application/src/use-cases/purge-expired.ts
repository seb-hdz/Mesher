import type { AppDeps } from "../deps.js";

export async function purgeExpired(deps: AppDeps): Promise<void> {
  const now = deps.clock.nowMs();
  await deps.persistence.purgeExpiredSeen(now);
}
