import { NextRequest, NextResponse } from 'next/server';

import { getApiSessionUser, unauthorizedJson } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getApiSessionUser(request);

  if (!user) {
    return unauthorizedJson();
  }

  return NextResponse.json({ user });
}