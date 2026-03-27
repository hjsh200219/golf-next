/**
 * isValidUUIDv4 utility tests
 */
import { describe, it, expect } from 'vitest';
import { isValidUUIDv4 } from '@/lib/utils/uuid';

// ── Valid UUID v4 values ───────────────────────────────────────────────────────

describe('isValidUUIDv4 — valid inputs', () => {
  it('accepts a well-formed UUID v4 (lowercase)', () => {
    expect(isValidUUIDv4('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true);
  });

  it('accepts a UUID v4 whose variant nibble is 8', () => {
    expect(isValidUUIDv4('6ba7b810-9dad-4f11-80b4-00c04fd430c8')).toBe(true);
  });

  it('accepts a UUID v4 whose variant nibble is 9', () => {
    expect(isValidUUIDv4('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')).toBe(true);
  });

  it('accepts a UUID v4 whose variant nibble is a', () => {
    expect(isValidUUIDv4('110e8400-e29b-41d4-a716-446655440001')).toBe(true);
  });

  it('accepts a UUID v4 whose variant nibble is b', () => {
    expect(isValidUUIDv4('110e8400-e29b-41d4-b716-446655440002')).toBe(true);
  });

  it('accepts an uppercase UUID v4', () => {
    // The regex uses the /i flag so uppercase letters are valid.
    expect(isValidUUIDv4('F47AC10B-58CC-4372-A567-0E02B2C3D479')).toBe(true);
  });

  it('accepts a mixed-case UUID v4', () => {
    expect(isValidUUIDv4('F47ac10b-58CC-4372-a567-0E02b2c3D479')).toBe(true);
  });
});

// ── Invalid: wrong version ─────────────────────────────────────────────────────

describe('isValidUUIDv4 — wrong version', () => {
  it('rejects a UUID v1 (third group starts with 1)', () => {
    // Version nibble is 1, not 4.
    expect(isValidUUIDv4('550e8400-e29b-11d4-a716-446655440000')).toBe(false);
  });

  it('rejects a UUID v3 (third group starts with 3)', () => {
    expect(isValidUUIDv4('550e8400-e29b-31d4-a716-446655440000')).toBe(false);
  });

  it('rejects a UUID v5 (third group starts with 5)', () => {
    expect(isValidUUIDv4('550e8400-e29b-51d4-a716-446655440000')).toBe(false);
  });
});

// ── Invalid: wrong variant bits ────────────────────────────────────────────────

describe('isValidUUIDv4 — wrong variant', () => {
  it('rejects a UUID where variant nibble is 0 (not 8/9/a/b)', () => {
    expect(isValidUUIDv4('f47ac10b-58cc-4372-0567-0e02b2c3d479')).toBe(false);
  });

  it('rejects a UUID where variant nibble is c', () => {
    expect(isValidUUIDv4('f47ac10b-58cc-4372-c567-0e02b2c3d479')).toBe(false);
  });

  it('rejects a UUID where variant nibble is f', () => {
    expect(isValidUUIDv4('f47ac10b-58cc-4372-f567-0e02b2c3d479')).toBe(false);
  });
});

// ── Invalid: empty / non-UUID strings ─────────────────────────────────────────

describe('isValidUUIDv4 — empty or non-UUID strings', () => {
  it('rejects an empty string', () => {
    expect(isValidUUIDv4('')).toBe(false);
  });

  it('rejects a plain word', () => {
    expect(isValidUUIDv4('hello')).toBe(false);
  });

  it('rejects a numeric-only string', () => {
    expect(isValidUUIDv4('12345678')).toBe(false);
  });

  it('rejects a UUID-like string with missing hyphens', () => {
    expect(isValidUUIDv4('f47ac10b58cc4372a5670e02b2c3d479')).toBe(false);
  });

  it('rejects a UUID-like string with extra hyphens', () => {
    expect(isValidUUIDv4('f47ac10b-58cc-4372-a567-0e02-b2c3d479')).toBe(false);
  });

  it('rejects a UUID where one group has the wrong length', () => {
    // First group is only 7 hex chars instead of 8.
    expect(isValidUUIDv4('f47ac1b-58cc-4372-a567-0e02b2c3d479')).toBe(false);
  });

  it('rejects a UUID containing invalid (non-hex) characters', () => {
    expect(isValidUUIDv4('g47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(false);
  });

  it('rejects a string that is only whitespace', () => {
    expect(isValidUUIDv4('   ')).toBe(false);
  });

  it('rejects a UUID with a leading/trailing space', () => {
    expect(isValidUUIDv4(' f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(false);
    expect(isValidUUIDv4('f47ac10b-58cc-4372-a567-0e02b2c3d479 ')).toBe(false);
  });
});
