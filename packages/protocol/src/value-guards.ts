/** Scalar shape checks shared by independent transport decoders. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isTransportId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 128;
}
