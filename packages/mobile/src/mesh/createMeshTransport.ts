import type { TransportPort } from "@mesher/domain";
import { NativeModules, Platform } from "react-native";
import { MockBleMeshTransport } from "../adapters/mock-ble-transport";

export function createMeshTransport(signPublicKey: Uint8Array): TransportPort {
  const hasMesherBleNative =
    (Platform.OS === "android" || Platform.OS === "ios") &&
    NativeModules.MesherBleNative?.startPeripheral != null;
  if (hasMesherBleNative) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- avoid bundling ble-plx on web
    const { PlxBleMeshTransport } = require("../adapters/plx-ble-mesh-transport") as {
      PlxBleMeshTransport: new (pk: Uint8Array) => TransportPort;
    };
    return new PlxBleMeshTransport(signPublicKey);
  }
  return new MockBleMeshTransport();
}
