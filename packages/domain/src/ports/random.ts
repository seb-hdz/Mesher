export interface SecureRandomPort {
  /** May be async on mobile runtimes (e.g. expo-crypto). */
  randomBytes(length: number): Uint8Array | Promise<Uint8Array>;
}
