const B64 =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** RFC 4648 base64 (no URL variant). Pure JS for RN + Node. */
export function bytesToBase64(bytes: Uint8Array): string {
  let out = "";
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i]!;
    const b1 = i + 1 < len ? bytes[i + 1]! : 0;
    const b2 = i + 2 < len ? bytes[i + 2]! : 0;
    const triplet = (b0 << 16) | (b1 << 8) | b2;
    const pad = len - i;
    out += B64[(triplet >> 18) & 63];
    out += B64[(triplet >> 12) & 63];
    out += pad >= 2 ? B64[(triplet >> 6) & 63] : "=";
    out += pad >= 3 ? B64[triplet & 63] : "=";
  }
  return out;
}

const INV = new Uint8Array(128).fill(64);
for (let i = 0; i < B64.length; i++) {
  INV[B64.charCodeAt(i)] = i;
}

export function base64ToBytes(b64: string): Uint8Array {
  const s = b64.replace(/\s/g, "");
  const len = s.length;
  if (len % 4 !== 0) throw new Error("Invalid base64 length");
  const padding = s.endsWith("==") ? 2 : s.endsWith("=") ? 1 : 0;
  const outLen = (len * 3) / 4 - padding;
  const out = new Uint8Array(outLen);
  let o = 0;
  for (let i = 0; i < len; i += 4) {
    const c0 = INV[s.charCodeAt(i)]!;
    const c1 = INV[s.charCodeAt(i + 1)]!;
    const c2 = s.charCodeAt(i + 2) === 61 ? 0 : INV[s.charCodeAt(i + 2)]!;
    const c3 = s.charCodeAt(i + 3) === 61 ? 0 : INV[s.charCodeAt(i + 3)]!;
    if (c0 > 63 || c1 > 63 || c2 > 63 || c3 > 63) throw new Error("Invalid base64");
    const triplet = (c0 << 18) | (c1 << 12) | (c2 << 6) | c3;
    if (o < outLen) out[o++] = (triplet >> 16) & 255;
    if (o < outLen) out[o++] = (triplet >> 8) & 255;
    if (o < outLen) out[o++] = triplet & 255;
  }
  return out;
}
