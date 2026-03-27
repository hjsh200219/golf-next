/**
 * UUID v4 regex — matches the canonical 8-4-4-4-12 hex format where:
 * - the third group starts with "4"  (version 4)
 * - the fourth group starts with 8, 9, a, or b  (variant bits)
 */
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Returns true when `id` is a valid UUID v4 string.
 *
 * @example
 * isValidUUIDv4('550e8400-e29b-41d4-a716-446655440000') // false (v1-style)
 * isValidUUIDv4('f47ac10b-58cc-4372-a567-0e02b2c3d479') // true
 */
export function isValidUUIDv4(id: string): boolean {
  return UUID_V4_REGEX.test(id);
}
