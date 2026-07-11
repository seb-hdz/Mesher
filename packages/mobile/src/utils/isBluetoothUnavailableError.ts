function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

/** True when a transport/init failure is due to Bluetooth being off, denied, or missing. */
export function isBluetoothUnavailableError(error: unknown): boolean {
  const msg = errorMessage(error).toLowerCase();
  if (!msg.includes("bluetooth")) return false;
  return (
    msg.includes("unavailable") ||
    msg.includes("not available") ||
    msg.includes("powered off") ||
    msg.includes("bluetooth off") ||
    msg.includes("no bluetooth adapter") ||
    msg.includes("unauthorized") ||
    msg.includes("unsupported")
  );
}
