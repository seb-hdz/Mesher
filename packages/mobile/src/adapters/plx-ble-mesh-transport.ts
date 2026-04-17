import {
  base64ToBytes,
  bytesToBase64,
  type IncomingChunkHandler,
  type NeighborInfo,
  type TransportPort,
} from "@mesher/domain";
import { NativeEventEmitter, NativeModules, PermissionsAndroid, Platform } from "react-native";
import { BleManager, type BleRestoredState, type Device, State } from "react-native-ble-plx";

const MESHER_SERVICE = "a0b10001-4d65-7368-6572-000000000001";
const MESHER_CHUNK = "a0b10002-4d65-7368-6572-000000000001";

const MESHER_SERVICE_NORM = MESHER_SERVICE.replace(/-/g, "").toLowerCase();

const IOS_BLE_RESTORE_ID = "com.sebhdz.mesher.ble-central";

type MesherBleNativeType = {
  startPeripheral: (peerPkPrefixHex: string) => Promise<boolean>;
  stopPeripheral: () => Promise<boolean>;
  notifySubscribers: (base64Chunk: string) => Promise<number>;
  addListener?: (event: string) => void;
  removeListeners?: (n: number) => void;
};

function getNative(): MesherBleNativeType {
  return NativeModules.MesherBleNative as MesherBleNativeType;
}

/** Metro/device logs; use Xcode console for native `print("[MesherBleNative] …")` lines. */
function bleDebug(msg: string): void {
  console.log(`[mesher:ble] ${msg}`);
}

function normalizeUuid(u: string): string {
  return u.replace(/-/g, "").toLowerCase();
}

function pkPrefixHex(signPublicKey: Uint8Array): string {
  const slice = signPublicKey.slice(0, 8);
  return Array.from(slice, (b) => b.toString(16).padStart(2, "0")).join("");
}

function lexLess(a: Uint8Array, b: Uint8Array): boolean {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const av = a[i]!;
    const bv = b[i]!;
    if (av !== bv) return av < bv;
  }
  return a.length < b.length;
}

const MESHER_LOCAL_PK_RE = /^m[0-9a-fA-F]{16}$/;

/** Android: 8-byte prefix in BLE service data (scan response; primary ADU keeps only the 128-bit service UUID). iOS: same bytes as advertised local name `m` + hex. */
function parsePeerPkFromDevice(d: Device): Uint8Array | null {
  const sd = d.serviceData;
  if (sd) {
    for (const [k, v] of Object.entries(sd)) {
      if (normalizeUuid(k) === MESHER_SERVICE_NORM && v) {
        try {
          const b = base64ToBytes(v);
          if (b.length >= 8) return b.subarray(0, 8);
          return b.byteLength ? b : null;
        } catch {
          return null;
        }
      }
    }
  }
  const local = d.localName ?? d.name;
  if (local && MESHER_LOCAL_PK_RE.test(local)) {
    const hex = local.slice(1);
    try {
      const out = new Uint8Array(8);
      for (let i = 0; i < 8; i++) {
        out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
      }
      return out;
    } catch {
      return null;
    }
  }
  return null;
}

function serviceMatchesScan(d: Device): boolean {
  const uuids = d.serviceUUIDs;
  if (!uuids?.length) return true;
  return uuids.some((u) => normalizeUuid(u) === MESHER_SERVICE_NORM);
}

/** Android 12+ requires runtime grants for GATT server, advertise, and scan — manifest alone is not enough. */
async function ensureAndroidBlePermissions(): Promise<void> {
  if (Platform.OS !== "android") return;
  const api = typeof Platform.Version === "number" ? Platform.Version : 0;
  if (api >= 31) {
    const perms = [
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
    ];
    const granted = await PermissionsAndroid.requestMultiple(perms);
    const denied = perms.filter((p) => granted[p] !== PermissionsAndroid.RESULTS.GRANTED);
    if (denied.length > 0) {
      throw new Error(
        "Mesher needs Bluetooth Connect, Scan, and Advertise permissions for the mesh radio. Enable them in Settings.",
      );
    }
    return;
  }
  const loc = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
  if (loc !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error("Mesher needs location permission for Bluetooth scan on this Android version.");
  }
}

function bleManagerOptionsForPlatform(): ConstructorParameters<typeof BleManager>[0] {
  if (Platform.OS !== "ios") {
    return {};
  }
  return {
    restoreStateIdentifier: IOS_BLE_RESTORE_ID,
    restoreStateFunction: (restored: BleRestoredState | null) => {
      PlxBleMeshTransport.enqueueRestoredState(restored);
    },
  };
}

/**
 * Android: BLE peripheral (GATT server) via native module + central role via react-native-ble-plx.
 * Uses Mesher service UUID; only the lexicographically smaller signPublicKey prefix opens the
 * central connection to avoid duplicate links and double delivery.
 */
export class PlxBleMeshTransport implements TransportPort {
  private static restoredQueue: BleRestoredState | null = null;
  private static restoredFlushTarget: PlxBleMeshTransport | null = null;

  /** Called from BleManager restore callback (iOS). */
  static enqueueRestoredState(restored: BleRestoredState | null): void {
    if (restored != null) {
      PlxBleMeshTransport.restoredQueue = restored;
    }
    const t = PlxBleMeshTransport.restoredFlushTarget;
    if (t?.running) {
      void t.flushRestoredPeripherals();
    }
  }

  private readonly bleManager: BleManager;
  private readonly handlers = new Set<IncomingChunkHandler>();
  private readonly ourPk8: Uint8Array;
  private running = false;
  private readonly centralById = new Map<string, Device>();
  private readonly connecting = new Set<string>();
  private readonly subscriptionsById = new Map<string, { remove: () => void }>();
  private readonly scanHits = new Map<string, { rssi: number; lastMs: number }>();
  private nativeSub?: { remove: () => void };

  constructor(signPublicKey: Uint8Array) {
    this.ourPk8 = signPublicKey.slice(0, 8);
    PlxBleMeshTransport.restoredFlushTarget = this;
    this.bleManager = new BleManager(bleManagerOptionsForPlatform());
  }

  subscribeIncoming(handler: IncomingChunkHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  private async dispatchIncoming(chunk: Uint8Array): Promise<void> {
    const copy = new Uint8Array(chunk);
    for (const h of [...this.handlers]) {
      try {
        await Promise.resolve(h(copy));
      } catch {
        /* keep notifying */
      }
    }
  }

  private async flushRestoredPeripherals(): Promise<void> {
    const pending = PlxBleMeshTransport.restoredQueue;
    PlxBleMeshTransport.restoredQueue = null;
    if (!pending?.connectedPeripherals?.length) return;
    for (const device of pending.connectedPeripherals) {
      await this.tryConnect(device);
    }
  }

  async start(): Promise<void> {
    if (this.running) return;
    bleDebug(`start enter os=${Platform.OS}`);
    await ensureAndroidBlePermissions();
    this.running = true;

    bleDebug("start phase=bleManager.state");
    const s = await this.bleManager.state();
    bleDebug(`start phase=bleManager.state ok state=${String(s)}`);
    if (s !== State.PoweredOn) {
      bleDebug("start phase=wait PoweredOn (up to 10s)");
      await new Promise<void>((resolve) => {
        const sub = this.bleManager.onStateChange((st) => {
          if (st === State.PoweredOn) {
            sub.remove();
            resolve();
          }
        }, true);
        setTimeout(() => {
          sub.remove();
          resolve();
        }, 10_000);
      });
      bleDebug("start phase=wait PoweredOn done");
    }

    const pkHex = pkPrefixHex(this.ourPk8);
    bleDebug(`start phase=native.startPeripheral invoke pkHexLen=${pkHex.length}`);
    const native = getNative();
    try {
      await native.startPeripheral(pkHex);
      bleDebug("start phase=native.startPeripheral ok (promise resolved)");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      bleDebug(`start phase=native.startPeripheral FAILED msg=${msg}`);
      throw e;
    }

    bleDebug("start phase=NativeEventEmitter construct");
    const emitter = new NativeEventEmitter(NativeModules.MesherBleNative);
    bleDebug("start phase=NativeEventEmitter addListener MesherBleChunkIn");
    this.nativeSub = emitter.addListener("MesherBleChunkIn", (ev: { b64?: string }) => {
      if (!ev?.b64 || !this.running) return;
      try {
        const u = base64ToBytes(ev.b64);
        void this.dispatchIncoming(u);
      } catch {
        /* ignore */
      }
    });
    bleDebug("start phase=addListener ok");

    bleDebug("start phase=flushRestoredPeripherals");
    await this.flushRestoredPeripherals();
    bleDebug("start phase=flushRestoredPeripherals ok");

    bleDebug(`start phase=startDeviceScan service=${MESHER_SERVICE}`);
    this.bleManager.startDeviceScan([MESHER_SERVICE], { allowDuplicates: true }, (error, device) => {
      if (!this.running) return;
      if (error || !device) return;
      if (!serviceMatchesScan(device)) return;

      const rssi = device.rssi ?? -99;
      this.scanHits.set(device.id, { rssi, lastMs: Date.now() });

      const theirPk = parsePeerPkFromDevice(device);
      if (theirPk && theirPk.length >= 8 && !lexLess(this.ourPk8, theirPk)) {
        return;
      }

      void this.tryConnect(device);
    });
    bleDebug("start phase=startDeviceScan invoked (callback mode)");
    bleDebug("start complete");
  }

  private async tryConnect(device: Device): Promise<void> {
    if (!this.running) return;
    if (this.centralById.has(device.id)) return;
    if (this.connecting.has(device.id)) return;
    this.connecting.add(device.id);
    try {
      const already = await this.bleManager.isDeviceConnected(device.id);
      let d = device;
      if (!already) {
        d = await this.bleManager.connectToDevice(device.id, { requestMTU: 517 });
      }
      if (!this.running) {
        if (!already) await d.cancelConnection().catch(() => {});
        return;
      }
      await d.discoverAllServicesAndCharacteristics();
      const sub = d.monitorCharacteristicForService(MESHER_SERVICE, MESHER_CHUNK, (_err, c) => {
        if (!c?.value || !this.running) return;
        try {
          const bytes = base64ToBytes(c.value);
          void this.dispatchIncoming(bytes);
        } catch {
          /* ignore */
        }
      });
      this.subscriptionsById.set(device.id, sub);
      d.onDisconnected(() => {
        this.centralById.delete(device.id);
        this.subscriptionsById.get(device.id)?.remove();
        this.subscriptionsById.delete(device.id);
      });
      this.centralById.set(device.id, d);
    } catch {
      /* scan will retry */
    } finally {
      this.connecting.delete(device.id);
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    this.bleManager.stopDeviceScan();
    this.nativeSub?.remove();
    this.nativeSub = undefined;
    for (const s of this.subscriptionsById.values()) {
      s.remove();
    }
    this.subscriptionsById.clear();
    for (const d of this.centralById.values()) {
      void d.cancelConnection();
    }
    this.centralById.clear();
    this.connecting.clear();
    try {
      await getNative().stopPeripheral();
    } catch {
      /* ignore */
    }
  }

  async broadcastChunk(chunk: Uint8Array): Promise<void> {
    if (!this.running) return;
    const b64 = bytesToBase64(new Uint8Array(chunk));
    try {
      await getNative().notifySubscribers(b64);
    } catch {
      /* ignore */
    }
    for (const d of [...this.centralById.values()]) {
      try {
        await d.writeCharacteristicWithoutResponseForService(MESHER_SERVICE, MESHER_CHUNK, b64);
      } catch {
        /* ignore */
      }
    }
  }

  async getNeighbors(): Promise<NeighborInfo[]> {
    const now = Date.now();
    const out: NeighborInfo[] = [];
    for (const [id, v] of this.scanHits) {
      if (now - v.lastMs < 45_000) {
        out.push({ id, rssi: v.rssi, lastSeenMs: v.lastMs });
      }
    }
    return out;
  }
}
