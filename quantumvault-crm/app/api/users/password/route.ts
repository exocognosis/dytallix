import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

import { getApiSessionUser, unauthorizedJson } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const currentUser = await getApiSessionUser(request);

  if (!currentUser) {
    return unauthorizedJson();
  }

  const { currentPassword, newPassword } = await request.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: 'Current password and new password are required' },
      { status: 400 }
    );
  }

  if (String(newPassword).length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('id, password_hash')
    .eq('id', currentUser.id)
    .single();

  if (fetchError || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const valid = await bcrypt.compare(String(currentPassword), user.password_hash || '');

  if (!valid) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
  }

  const password_hash = await bcrypt.hash(String(newPassword), 10);
  const { error: updateError } = await supabase
    .from('users')
    .update({ password_hash })
    .eq('id', currentUser.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}