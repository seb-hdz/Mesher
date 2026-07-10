import { NativeModules, Platform } from "react-native";

export type MesherSiriContact = {
  id: string;
  displayName: string;
};

export type MesherSiriPendingAction = {
  id: string;
  peerId: string;
  body: string;
  createdAt: number;
};

export type MesherSiriScheduledJob = {
  id: string;
  peerId: string;
  body: string;
  fireAt: number;
  createdAt: number;
};

type MesherSiriBridgeNative = {
  updateContacts: (contacts: MesherSiriContact[]) => Promise<boolean>;
  getPendingActions: () => Promise<MesherSiriPendingAction[]>;
  clearPendingActions: (ids: string[]) => Promise<boolean>;
  getScheduledJobs: () => Promise<MesherSiriScheduledJob[]>;
  clearScheduledJob: (jobId: string) => Promise<boolean>;
};

function getNative(): MesherSiriBridgeNative | null {
  if (Platform.OS !== "ios") return null;
  const mod = NativeModules.MesherSiriBridge as MesherSiriBridgeNative | undefined;
  if (
    mod == null ||
    typeof mod.updateContacts !== "function" ||
    typeof mod.getPendingActions !== "function"
  ) {
    return null;
  }
  return mod;
}

export function isMesherSiriAvailable(): boolean {
  return getNative() != null;
}

export async function updateSiriContacts(contacts: MesherSiriContact[]): Promise<void> {
  const native = getNative();
  if (!native) return;
  try {
    await native.updateContacts(contacts);
  } catch (e) {
    console.warn("[mesher:siri] updateContacts failed", e);
  }
}

export async function getPendingSiriActions(): Promise<MesherSiriPendingAction[]> {
  const native = getNative();
  if (!native) return [];
  try {
    const actions = await native.getPendingActions();
    return Array.isArray(actions) ? actions : [];
  } catch (e) {
    console.warn("[mesher:siri] getPendingActions failed", e);
    return [];
  }
}

export async function clearPendingSiriActions(ids: string[]): Promise<void> {
  const native = getNative();
  if (!native || ids.length === 0) return;
  try {
    await native.clearPendingActions(ids);
  } catch (e) {
    console.warn("[mesher:siri] clearPendingActions failed", e);
  }
}

export async function getScheduledSiriJobs(): Promise<MesherSiriScheduledJob[]> {
  const native = getNative();
  if (!native) return [];
  try {
    const jobs = await native.getScheduledJobs();
    return Array.isArray(jobs) ? jobs : [];
  } catch (e) {
    console.warn("[mesher:siri] getScheduledJobs failed", e);
    return [];
  }
}

export async function clearScheduledSiriJob(jobId: string): Promise<void> {
  const native = getNative();
  if (!native || !jobId) return;
  try {
    await native.clearScheduledJob(jobId);
  } catch (e) {
    console.warn("[mesher:siri] clearScheduledJob failed", e);
  }
}
