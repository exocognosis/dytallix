import { NextRequest, NextResponse } from 'next/server';
import { getApiSessionUser, unauthorizedJson } from '@/lib/auth';
import { GoogleOAuthConfigurationError, getVerifiedGoogleAuthUrl } from '@/lib/google-auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getApiSessionUser(request);

    if (!user) {
      return unauthorizedJson();
    }

    const body = (await request.json().catch(() => ({}))) as {
      includeCalendar?: boolean;
      includeTasks?: boolean;
    };
    const { includeCalendar = true, includeTasks = true } = body;

    const authUrl = await getVerifiedGoogleAuthUrl(user.id, user.email, {
      includeCalendar,
      includeTasks,
    });
    return NextResponse.json({ url: authUrl });
  } catch (err: any) {
    console.error('Error generating Google auth URL:', err);
    const status = err instanceof GoogleOAuthConfigurationError ? err.status : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
