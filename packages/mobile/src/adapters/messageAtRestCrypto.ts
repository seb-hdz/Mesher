import { bytesToBase64, base64ToBytes } from "@mesher/domain";
import * as ExpoCrypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import nacl from "tweetnacl";

const KEY = "mesher.message.at.rest.v1";

let cachedKey: Uint8Array | null = null;

async function getKey(): Promise<Uint8Array> {
  if (cachedKey) return cachedKey;
  const raw = await SecureStore.getItemAsync(KEY);
  if (raw) {
    cachedKey = base64ToBytes(raw);
    return cachedKey;
  }
  const key = ExpoCrypto.getRandomBytes(32);
  await SecureStore.setItemAsync(KEY, bytesToBase64(key));
  cachedKey = key;
  return key;
}

export async function clearStoredMessageAtRestKey(): Promise<void> {
  cachedKey = null;
  await SecureStore.deleteItemAsync(KEY);
}

/** Encrypt UTF-8 message body for SQLite storage. Returns base64(nonce || secretbox). */
export async function encryptMessageBody(plaintext: string): Promise<string> {
  if (!plaintext) return "";
  const key = await getKey();
  const nonce = ExpoCrypto.getRandomBytes(nacl.secretbox.nonceLength);
  const msg = new TextEncoder().encode(plaintext);
  const boxed = nacl.secretbox(msg, nonce, key);
  const out = new Uint8Array(nonce.length + boxed.length);
  out.set(nonce, 0);
  out.set(boxed, nonce.length);
  return bytesToBase64(out);
}

/** Decrypt body_cipher from SQLite. Returns empty string on missing/invalid cipher. */
export async function decryptMessageBody(cipher: string): Promise<string> {
  if (!cipher) return "";
  try {
    const key = await getKey();
    const raw = base64ToBytes(cipher);
    if (raw.length < nacl.secretbox.nonceLength + nacl.secretbox.overheadLength) return "";
    const nonce = raw.subarray(0, nacl.secretbox.nonceLength);
    const box = raw.subarray(nacl.secretbox.nonceLength);
    const opened = nacl.secretbox.open(box, nonce, key);
    if (!opened) return "";
    return new TextDecoder().decode(opened);
  } catch {
    return "";
  }
}
