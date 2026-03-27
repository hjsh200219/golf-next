/**
 * Unit tests for GET /api/clubs
 *
 * The route fetches all active golf clubs and, for each club, fetches its
 * active courses, then merges them before returning.  Two Supabase calls are
 * made: one against `golf_clubs` and one against `golf_club_courses`.  We use
 * per-table response overrides from our mock helper to simulate both calls
 * independently.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMockSupabase } from '../helpers/mock-supabase';
import type { MockSupabase } from '../helpers/mock-supabase';

// ---------------------------------------------------------------------------
// Supabase mock wired up BEFORE importing the route handler
// ---------------------------------------------------------------------------
const mockSupabase: MockSupabase = createMockSupabase();

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabase),
  createAdminClient: vi.fn(() => mockSupabase),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}));

import { GET } from '@/app/api/clubs/route';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const makeClub = (overrides: Record<string, unknown> = {}) => ({
  id: 'ga',
  name: 'GA Korea',
  address: '경기도 어딘가',
  lat: 37.4,
  lon: 127.1,
  phone: null,
  website: null,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const makeCourse = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  club_id: 'ga',
  course_name: 'East',
  holes: 18,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('GET /api/clubs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.__reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a list of active clubs', async () => {
    const clubs = [makeClub(), makeClub({ id: 'hilldeloci', name: 'Hilldeloci' })];
    const courses = [
      makeCourse({ club_id: 'ga' }),
      makeCourse({ id: 2, club_id: 'hilldeloci', course_name: 'West' }),
    ];

    mockSupabase.__setResponseForTable('golf_clubs', { data: clubs, error: null });
    mockSupabase.__setResponseForTable('golf_club_courses', { data: courses, error: null });

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(2);
    expect(body.map((c: { id: string }) => c.id)).toContain('ga');
    expect(body.map((c: { id: string }) => c.id)).toContain('hilldeloci');
  });

  it('includes courses nested under each club', async () => {
    const clubs = [makeClub()];
    const courses = [
      makeCourse({ course_name: 'East' }),
      makeCourse({ id: 2, course_name: 'West' }),
    ];

    mockSupabase.__setResponseForTable('golf_clubs', { data: clubs, error: null });
    mockSupabase.__setResponseForTable('golf_club_courses', { data: courses, error: null });

    const res = await GET();
    const body = await res.json();

    expect(body[0].courses).toHaveLength(2);
    const courseNames = body[0].courses.map((c: { course_name: string }) => c.course_name);
    expect(courseNames).toContain('East');
    expect(courseNames).toContain('West');
  });

  it('attaches an empty courses array when a club has no courses', async () => {
    const clubs = [makeClub({ id: 'nocourse' })];

    mockSupabase.__setResponseForTable('golf_clubs', { data: clubs, error: null });
    mockSupabase.__setResponseForTable('golf_club_courses', { data: [], error: null });

    const res = await GET();
    const body = await res.json();

    expect(body[0].courses).toEqual([]);
  });

  it('returns an empty array when there are no active clubs', async () => {
    mockSupabase.__setResponseForTable('golf_clubs', { data: [], error: null });
    mockSupabase.__setResponseForTable('golf_club_courses', { data: [], error: null });

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it('returns an empty array when clubs data is null', async () => {
    mockSupabase.__setResponseForTable('golf_clubs', { data: null, error: null });

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it('returns 500 when fetching clubs fails', async () => {
    mockSupabase.__setResponseForTable('golf_clubs', {
      data: null,
      error: { message: 'connection refused' },
    });

    const res = await GET();

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/failed to fetch clubs/i);
  });

  it('returns 500 when fetching courses fails', async () => {
    const clubs = [makeClub()];
    mockSupabase.__setResponseForTable('golf_clubs', { data: clubs, error: null });
    mockSupabase.__setResponseForTable('golf_club_courses', {
      data: null,
      error: { message: 'timeout' },
    });

    const res = await GET();

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/failed to fetch club courses/i);
  });

  it('correctly groups courses by club when multiple clubs share course records', async () => {
    const clubs = [makeClub({ id: 'club-a' }), makeClub({ id: 'club-b', name: 'Club B' })];
    const courses = [
      makeCourse({ id: 10, club_id: 'club-a', course_name: 'Alpha' }),
      makeCourse({ id: 11, club_id: 'club-b', course_name: 'Beta' }),
      makeCourse({ id: 12, club_id: 'club-a', course_name: 'Gamma' }),
    ];

    mockSupabase.__setResponseForTable('golf_clubs', { data: clubs, error: null });
    mockSupabase.__setResponseForTable('golf_club_courses', { data: courses, error: null });

    const res = await GET();
    const body = await res.json();

    const clubA = body.find((c: { id: string }) => c.id === 'club-a');
    const clubB = body.find((c: { id: string }) => c.id === 'club-b');

    expect(clubA.courses).toHaveLength(2);
    expect(clubB.courses).toHaveLength(1);
    expect(clubB.courses[0].course_name).toBe('Beta');
  });
});
