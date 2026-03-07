import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { isDytallixEmail, setAuthCookie, signSessionToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();
  const normalizedEmail = (email || '').trim().toLowerCase();

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }

  if (!isDytallixEmail(normalizedEmail)) {
    return NextResponse.json(
      { error: 'Only @dytallix.com accounts can access QuantumVault CRM' },
      { status: 403 }
    );
  }

  const supabase = createServerClient();

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', normalizedEmail)
    .eq('active', true)
    .single();

  if (error || !user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // Verify password
  const valid = await bcrypt.compare(password, user.password_hash || '');
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // Generate JWT
  const token = signSessionToken({ userId: user.id, email: user.email, role: user.role });

  // Set HTTP-only cookie
  const response = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar_url: user.avatar_url,
    },
  });

  setAuthCookie(response, token);

  return response;
}
