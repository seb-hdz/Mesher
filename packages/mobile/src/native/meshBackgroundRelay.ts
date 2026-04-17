import { NativeModules, PermissionsAndroid, Platform } from "react-native";

type MesherBleNativeExtended = {
  startBackgroundRelay?: () => Promise<boolean>;
  stopBackgroundRelay?: () => Promise<boolean>;
};

function getNative(): MesherBleNativeExtended {
  return NativeModules.MesherBleNative as MesherBleNativeExtended;
}

async function ensurePostNotificationsIfNeeded(): Promise<void> {
  if (Platform.OS !== "android") return;
  const api = typeof Platform.Version === "number" ? Platform.Version : 0;
  if (api < 33) return;
  const perm = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
  if (!perm) return;
  const r = await PermissionsAndroid.request(perm);
  if (r !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error(
      "Mesher needs notification permission to run the Bluetooth relay as a foreground service on this Android version.",
    );
  }
}

/** Android: starts connectedDevice FGS. No-op on iOS. */
export async function startMeshBackgroundRelay(): Promise<void> {
  if (Platform.OS !== "android") return;
  await ensurePostNotificationsIfNeeded();
  const n = getNative();
  if (typeof n.startBackgroundRelay !== "function") return;
  await n.startBackgroundRelay();
}

/** Android: stops FGS. No-op on iOS. */
export async function stopMeshBackgroundRelay(): Promise<void> {
  if (Platform.OS !== "android") return;
  const n = getNative();
  if (typeof n.stopBackgroundRelay !== "function") return;
  await n.stopBackgroundRelay();
}
