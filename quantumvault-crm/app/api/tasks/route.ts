import { NextRequest, NextResponse } from 'next/server';
import { getApiSessionUser, unauthorizedJson } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const currentUser = await getApiSessionUser(request);

  if (!currentUser) {
    return unauthorizedJson();
  }

  const supabase = createServerClient();
  const params = request.nextUrl.searchParams;

  let query = supabase.from('tasks').select('*');

  const assignedTo = params.get('assigned_to');
  if (assignedTo && assignedTo !== 'all') query = query.eq('assigned_to', assignedTo);

  const contactId = params.get('contact_id');
  if (contactId) query = query.eq('contact_id', contactId);

  const completed = params.get('completed');
  if (completed === 'false') query = query.eq('completed', false);
  if (completed === 'true') query = query.eq('completed', true);

  query = query.order('due_date', { ascending: true });

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const currentUser = await getApiSessionUser(request);

  if (!currentUser) {
    return unauthorizedJson();
  }

  const supabase = createServerClient();
  const body = await request.json();

  const { data, error } = await supabase.from('tasks').insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const currentUser = await getApiSessionUser(request);

  if (!currentUser) {
    return unauthorizedJson();
  }

  const supabase = createServerClient();
  const { id, ...updates } = await request.json();

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { data, error } = await supabase.from('tasks').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest) {
  const currentUser = await getApiSessionUser(request);

  if (!currentUser) {
    return unauthorizedJson();
  }

  const supabase = createServerClient();
  const { id } = await request.json();

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
