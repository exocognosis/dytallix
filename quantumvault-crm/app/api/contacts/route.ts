import { NextRequest, NextResponse } from 'next/server';
import { getApiSessionUser, unauthorizedJson } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';

// ─── GET: List contacts with filters ─────────────────────────────

export async function GET(request: NextRequest) {
  const currentUser = await getApiSessionUser(request);

  if (!currentUser) {
    return unauthorizedJson();
  }

  const supabase = createServerClient();
  const params = request.nextUrl.searchParams;

  let query = supabase.from('contacts').select('*', { count: 'exact' });

  // Filters
  const stage = params.get('stage');
  if (stage && stage !== 'all') query = query.eq('stage', stage);

  const industry = params.get('industry');
  if (industry && industry !== 'all') query = query.eq('industry', industry);

  const assignedTo = params.get('assigned_to');
  if (assignedTo === '') query = query.is('assigned_to', null);
  else if (assignedTo && assignedTo !== 'all') query = query.eq('assigned_to', assignedTo);

  const search = params.get('search');
  if (search) query = query.or(`name.ilike.%${search}%,company.ilike.%${search}%`);

  // Pagination
  const page = parseInt(params.get('page') || '1');
  const perPage = parseInt(params.get('per_page') || '50');
  const from = (page - 1) * perPage;
  query = query.range(from, from + perPage - 1);

  // Sort
  const sortBy = params.get('sort') || 'updated_at';
  const sortDir = params.get('dir') === 'asc' ? true : false;
  query = query.order(sortBy, { ascending: sortDir });

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    data,
    total: count || 0,
    page,
    per_page: perPage,
    total_pages: Math.ceil((count || 0) / perPage),
  });
}

// ─── POST: Create contact ────────────────────────────────────────

export async function POST(request: NextRequest) {
  const currentUser = await getApiSessionUser(request);

  if (!currentUser) {
    return unauthorizedJson();
  }

  const supabase = createServerClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from('contacts')
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}

// ─── PATCH: Update contact ───────────────────────────────────────

export async function PATCH(request: NextRequest) {
  const currentUser = await getApiSessionUser(request);

  if (!currentUser) {
    return unauthorizedJson();
  }

  const supabase = createServerClient();
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const { data, error } = await supabase
    .from('contacts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// ─── DELETE: Remove contact ──────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const currentUser = await getApiSessionUser(request);

  if (!currentUser) {
    return unauthorizedJson();
  }

  const supabase = createServerClient();
  const { id } = await request.json();

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const { error } = await supabase.from('contacts').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
