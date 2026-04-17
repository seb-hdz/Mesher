import { bytesToBase64, base64ToBytes, type CryptoPort } from "@mesher/domain";
import * as SecureStore from "expo-secure-store";

const KEY = "mesher.device.identity.v1";

export type DeviceIdentity = {
  signSecretKey: Uint8Array;
  signPublicKey: Uint8Array;
  boxSecretKey: Uint8Array;
  boxPublicKey: Uint8Array;
};

type Stored = {
  signSk: string;
  signPk: string;
  boxSk: string;
  boxPk: string;
};

function serialize(id: DeviceIdentity): Stored {
  return {
    signSk: bytesToBase64(id.signSecretKey),
    signPk: bytesToBase64(id.signPublicKey),
    boxSk: bytesToBase64(id.boxSecretKey),
    boxPk: bytesToBase64(id.boxPublicKey),
  };
}

function deserialize(s: Stored): DeviceIdentity {
  return {
    signSecretKey: base64ToBytes(s.signSk),
    signPublicKey: base64ToBytes(s.signPk),
    boxSecretKey: base64ToBytes(s.boxSk),
    boxPublicKey: base64ToBytes(s.boxPk),
  };
}

export async function loadOrCreateIdentity(crypto: CryptoPort): Promise<DeviceIdentity> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (raw) {
    return deserialize(JSON.parse(raw) as Stored);
  }
  const sign = await crypto.generateSignKeyPair();
  const box = await crypto.generateBoxKeyPair();
  const id: DeviceIdentity = {
    signSecretKey: sign.secretKey,
    signPublicKey: sign.publicKey,
    boxSecretKey: box.secretKey,
    boxPublicKey: box.publicKey,
  };
  await SecureStore.setItemAsync(KEY, JSON.stringify(serialize(id)));
  return id;
}
