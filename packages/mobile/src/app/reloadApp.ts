import * as Updates from "expo-updates";

/** Reloads the JS bundle — used after a full local data wipe. */
export async function reloadApp(): Promise<void> {
  await Updates.reloadAsync();
}
