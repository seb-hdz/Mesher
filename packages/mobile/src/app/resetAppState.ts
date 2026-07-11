import * as SecureStore from "expo-secure-store";
import { deleteDatabaseAsync } from "expo-sqlite";
import { clearStoredMessageAtRestKey } from "../adapters/messageAtRestCrypto";
import { MESHER_DB_NAME } from "../adapters/sqlite-persistence";
import { clearStoredIdentity } from "../identity/secureIdentity";
import { clearMemory } from "../logging/captureStore";
import { clearLogFile } from "../logging/fileSink";
import { disposeMeshRuntime } from "../mesh/meshRuntime";
import { stopMeshBackgroundRelay } from "../native/meshBackgroundRelay";
import {
  clearPendingSiriActions,
  clearScheduledSiriJob,
  getPendingSiriActions,
  getScheduledSiriJobs,
  updateSiriContacts,
} from "../native/mesherSiri";
import { useIncomingMessagePreviewStore } from "../state/incomingMessagePreviewStore";

const BG_RELAY_SECURE_KEY = "mesher_bg_relay_v1";
const DISPLAY_NAME_SECURE_KEY = "mesher_display_name_v1";

/** Wipes local mesh data: DB, identity, messages, contacts, and secure preferences. */
export async function resetAppState(): Promise<void> {
  await stopMeshBackgroundRelay().catch(() => {});

  const pending = await getPendingSiriActions();
  if (pending.length > 0) {
    await clearPendingSiriActions(pending.map((a) => a.id));
  }
  const jobs = await getScheduledSiriJobs();
  for (const job of jobs) {
    await clearScheduledSiriJob(job.id);
  }
  await updateSiriContacts([]);

  await disposeMeshRuntime();

  await Promise.all([
    clearStoredIdentity(),
    clearStoredMessageAtRestKey(),
    SecureStore.deleteItemAsync(BG_RELAY_SECURE_KEY).catch(() => {}),
    SecureStore.deleteItemAsync(DISPLAY_NAME_SECURE_KEY).catch(() => {}),
  ]);

  await deleteDatabaseAsync(MESHER_DB_NAME);

  useIncomingMessagePreviewStore.getState().dismiss();
  clearMemory();
  await clearLogFile().catch(() => {});
}
