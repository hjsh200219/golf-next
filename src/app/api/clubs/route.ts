import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/types/database';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

type GolfClub = Database['public']['Tables']['golf_clubs']['Row'];
type GolfCourse = Database['public']['Tables']['golf_club_courses']['Row'];

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data: clubs, error: clubsError } = await supabase
      .from('golf_clubs')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true }) as unknown as {
        data: GolfClub[] | null;
        error: { message: string } | null;
      };

    if (clubsError) {
      console.error('[clubs] Failed to fetch clubs:', clubsError);
      return NextResponse.json(
        { error: 'Failed to fetch clubs' },
        { status: 500 },
      );
    }

    if (!clubs || clubs.length === 0) {
      return NextResponse.json([]);
    }

    const clubIds = clubs.map((c) => c.id);

    const { data: courses, error: coursesError } = await supabase
      .from('golf_club_courses')
      .select('*')
      .in('club_id', clubIds)
      .eq('is_active', true)
      .order('course_name', { ascending: true }) as unknown as {
        data: GolfCourse[] | null;
        error: { message: string } | null;
      };

    if (coursesError) {
      console.error('[clubs] Failed to fetch courses:', coursesError);
      return NextResponse.json(
        { error: 'Failed to fetch club courses' },
        { status: 500 },
      );
    }

    // Group courses by club_id
    const coursesByClub: Record<string, GolfCourse[]> = {};
    for (const course of courses ?? []) {
      if (!coursesByClub[course.club_id]) {
        coursesByClub[course.club_id] = [];
      }
      coursesByClub[course.club_id].push(course);
    }

    // Attach courses to each club
    const result = clubs.map((club) => ({
      ...club,
      courses: coursesByClub[club.id] ?? [],
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error('[clubs] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
