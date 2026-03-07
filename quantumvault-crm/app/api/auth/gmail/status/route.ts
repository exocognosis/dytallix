import { NextRequest, NextResponse } from 'next/server';
import { getApiSessionUser, unauthorizedJson } from '@/lib/auth';
import { getGoogleConnectionStatus } from '@/lib/google-auth';

export async function GET(request: NextRequest) {
  const user = await getApiSessionUser(request);

  if (!user) {
    return unauthorizedJson();
  }

  try {
    const status = await getGoogleConnectionStatus(user.id);
    return NextResponse.json(status);
  } catch (err: any) {
    console.error('Error checking Google connection:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
