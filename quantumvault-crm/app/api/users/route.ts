import { NextRequest, NextResponse } from 'next/server';
import { forbiddenJson, getApiSessionUser, isAdmin, isDytallixEmail, unauthorizedJson } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

const CREATABLE_ROLES = new Set(['admin', 'rep']);
const EDITABLE_ROLES = new Set(['rep']);

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function getTargetUser(id: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase.from('users').select('id, role').eq('id', id).single();

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
}

export async function GET(request: NextRequest) {
  const currentUser = await getApiSessionUser(request);

  if (!currentUser) {
    return unauthorizedJson();
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, avatar_url, role, active, created_at, updated_at')
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const currentUser = await getApiSessionUser(request);

  if (!currentUser) {
    return unauthorizedJson();
  }

  if (!isAdmin(currentUser)) {
    return forbiddenJson();
  }

  const body = await request.json();
  const email = normalizeEmail(body.email || '');
  const role = String(body.role || '');
  const password = String(body.password || '');

  if (!body.name || !email || !password) {
    return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
  }

  if (!isDytallixEmail(email)) {
    return NextResponse.json({ error: 'User email must end in @dytallix.com' }, { status: 400 });
  }

  if (!CREATABLE_ROLES.has(role)) {
    return NextResponse.json(
      { error: 'Admins can create admin and rep accounts only' },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const supabase = createServerClient();
  const insertPayload = {
    name: String(body.name).trim(),
    email,
    role,
    active: body.active ?? true,
    password_hash: await bcrypt.hash(password, 10),
  };

  const { data, error } = await supabase
    .from('users')
    .insert(insertPayload)
    .select('id, email, name, avatar_url, role, active, created_at, updated_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const currentUser = await getApiSessionUser(request);

  if (!currentUser) {
    return unauthorizedJson();
  }

  if (!isAdmin(currentUser)) {
    return forbiddenJson();
  }

  const { id, ...updates } = await request.json();

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const targetUser = await getTargetUser(id);

  if (targetUser.error) {
    return NextResponse.json({ error: targetUser.error.message }, { status: 500 });
  }

  if (!targetUser.data) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (targetUser.data.role === 'admin') {
    return forbiddenJson('Admin accounts cannot be modified here');
  }

  const sanitizedUpdates: Record<string, unknown> = {};

  if (updates.email && !isDytallixEmail(updates.email)) {
    return NextResponse.json({ error: 'User email must end in @dytallix.com' }, { status: 400 });
  }

  if (updates.name !== undefined) {
    sanitizedUpdates.name = String(updates.name).trim();
  }

  if (updates.email !== undefined) {
    sanitizedUpdates.email = normalizeEmail(String(updates.email));
  }

  if (updates.role !== undefined) {
    const role = String(updates.role);

    if (!EDITABLE_ROLES.has(role)) {
      return NextResponse.json(
        { error: 'Admin accounts must be created directly and cannot be assigned here' },
        { status: 400 }
      );
    }

    sanitizedUpdates.role = role;
  }

  if (updates.active !== undefined) {
    sanitizedUpdates.active = Boolean(updates.active);
  }

  if (updates.password) {
    if (String(updates.password).length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    sanitizedUpdates.password_hash = await bcrypt.hash(String(updates.password), 10);
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('users')
    .update(sanitizedUpdates)
    .eq('id', id)
    .select('id, email, name, avatar_url, role, active, created_at, updated_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest) {
  const currentUser = await getApiSessionUser(request);

  if (!currentUser) {
    return unauthorizedJson();
  }

  if (!isAdmin(currentUser)) {
    return forbiddenJson();
  }

  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const targetUser = await getTargetUser(id);

  if (targetUser.error) {
    return NextResponse.json({ error: targetUser.error.message }, { status: 500 });
  }

  if (!targetUser.data) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (targetUser.data.role === 'admin') {
    return forbiddenJson('Admin accounts cannot be deleted here');
  }

  const supabase = createServerClient();
  const { error } = await supabase.from('users').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
