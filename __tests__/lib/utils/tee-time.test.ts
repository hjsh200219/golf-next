import { describe, it, expect } from 'vitest';
import { dedupeTeeTimeRows } from '@/lib/utils/tee-time';

type Row = {
  club_id: string;
  date: string;
  teeoff: string;
  course: string;
  cc_name?: string;
  price?: number | null;
};

function r(over: Partial<Row> = {}): Row {
  return { club_id: 'c', date: '2026-06-07', teeoff: '06:40', course: '서', ...over };
}

describe('dedupeTeeTimeRows', () => {
  it('removes rows with a duplicate (club_id,date,teeoff,course) key', () => {
    const rows = [r(), r(), r({ course: '동' })];
    const out = dedupeTeeTimeRows(rows);
    expect(out).toHaveLength(2);
    expect(out.map((x) => x.course).sort()).toEqual(['동', '서']);
  });

  it('keeps the LAST occurrence on conflict (freshest wins)', () => {
    const rows = [r({ price: 100 }), r({ price: 200 })];
    const out = dedupeTeeTimeRows(rows);
    expect(out).toHaveLength(1);
    expect(out[0].price).toBe(200);
  });

  it('treats different teeoff or course as distinct', () => {
    const rows = [r({ teeoff: '06:40' }), r({ teeoff: '06:47' }), r({ course: '동' })];
    expect(dedupeTeeTimeRows(rows)).toHaveLength(3);
  });

  it('collapses a fully-doubled table (philosgc UpdatePanel case) to half', () => {
    const base = [r({ teeoff: '06:20', course: '서' }), r({ teeoff: '06:20', course: '동' }), r({ teeoff: '06:27', course: '서' })];
    const doubled = [...base, ...base];
    expect(dedupeTeeTimeRows(doubled)).toHaveLength(3);
  });

  it('returns empty for empty input', () => {
    expect(dedupeTeeTimeRows([])).toEqual([]);
  });

  it('normalizes missing/empty course consistently with the conflict key', () => {
    const rows = [r({ course: '' }), { club_id: 'c', date: '2026-06-07', teeoff: '06:40' } as Row];
    // both resolve to course '' → same key → one row
    expect(dedupeTeeTimeRows(rows)).toHaveLength(1);
  });
});
