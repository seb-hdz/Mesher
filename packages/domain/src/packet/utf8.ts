export function utf8Bytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

export function utf8String(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}
