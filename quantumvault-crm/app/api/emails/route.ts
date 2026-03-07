import { NextRequest, NextResponse } from 'next/server';

import { getApiSessionUser, unauthorizedJson } from '@/lib/auth';
import { sendEmail, syncEmails } from '@/lib/gmail';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const currentUser = await getApiSessionUser(request);

  if (!currentUser) {
    return unauthorizedJson();
  }

  const shouldSync = request.nextUrl.searchParams.get('sync') === 'true';
  const limit = Number.parseInt(request.nextUrl.searchParams.get('limit') || '50', 10);

  let syncSummary: { synced: number; total: number } | null = null;

  if (shouldSync) {
    syncSummary = await syncEmails(currentUser.id);
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('email_messages')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('date', { ascending: false })
    .limit(limit);

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

  const { to, subject, body, threadId } = await request.json();

  if (!to || !subject || !body) {
    return NextResponse.json(
      { error: 'to, subject, and body are required' },
      { status: 400 }
    );
  }

  const data = await sendEmail(currentUser.id, to, subject, body, threadId);
  return NextResponse.json({ data }, { status: 201 });
}