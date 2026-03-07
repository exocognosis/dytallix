import { NextRequest, NextResponse } from 'next/server';
import { getApiSessionUser, unauthorizedJson } from '@/lib/auth';
import { disconnectGoogle } from '@/lib/google-auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getApiSessionUser(request);

    if (!user) {
      return unauthorizedJson();
    }

    await disconnectGoogle(user.id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error disconnecting Google:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
