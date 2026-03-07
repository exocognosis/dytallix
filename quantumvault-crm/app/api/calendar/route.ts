import { NextRequest, NextResponse } from 'next/server';

import { createCalendarEvent, deleteCalendarEvent, syncCalendarEvents } from '@/lib/calendar';
import { getApiSessionUser, unauthorizedJson } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const currentUser = await getApiSessionUser(request);

  if (!currentUser) {
    return unauthorizedJson();
  }

  const shouldSync = request.nextUrl.searchParams.get('sync') === 'true';
  const upcomingOnly = request.nextUrl.searchParams.get('upcoming') !== 'false';

  let syncSummary: { synced: number; updated: number } | null = null;

  if (shouldSync) {
    syncSummary = await syncCalendarEvents(currentUser.id);
  }

  const supabase = createServerClient();
  let query = supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('start_time', { ascending: true });

  if (upcomingOnly) {
    query = query.gte('end_time', new Date().toISOString());
  }

  const { data, error } = await query.limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, sync: syncSummary });
}

export async function POST(request: NextRequest) {
  const currentUser = await getApiSessionUser(request);

  if (!currentUser) {
    return unauthorizedJson();
  }

  const { title, description, startTime, endTime, location, attendees, contactId } =
    await request.json();

  if (!title || !startTime || !endTime) {
    return NextResponse.json(
      { error: 'title, startTime, and endTime are required' },
      { status: 400 }
    );
  }

  const data = await createCalendarEvent(currentUser.id, {
    title,
    description,
    startTime,
    endTime,
    location,
    attendees,
    contactId,
  });

  return NextResponse.json({ data }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const currentUser = await getApiSessionUser(request);

  if (!currentUser) {
    return unauthorizedJson();
  }

  const { googleEventId } = await request.json();

  if (!googleEventId) {
    return NextResponse.json({ error: 'googleEventId is required' }, { status: 400 });
  }

  await deleteCalendarEvent(currentUser.id, googleEventId);
  return NextResponse.json({ success: true });
}