import { NativeEventEmitter, NativeModules } from "react-native";

const EVENT = "MesherNativeLog";

let installed = false;

/**
 * Subscribes once to native Mesher BLE logs and mirrors them to JS console (Metro / LogBox).
 * Call from entry (e.g. index.ts) so logs appear before any screen mounts.
 */
export function installNativeMesherLogBridge(): void {
  if (installed) return;
  const mod = NativeModules.MesherBleNative;
  if (mod == null) return;

  installed = true;
  const emitter = new NativeEventEmitter(mod);
  emitter.addListener(EVENT, (ev: { level?: string; message?: string }) => {
    const line = typeof ev?.message === "string" ? ev.message : "";
    const level = ev?.level ?? "info";
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  });
}
