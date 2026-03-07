import { NextRequest, NextResponse } from 'next/server';

import { getApiSessionUser, unauthorizedJson } from '@/lib/auth';
import { getGoogleConnectionStatus } from '@/lib/google-auth';
import { syncGoogleTasks } from '@/lib/google-tasks';

export async function POST(request: NextRequest) {
  const currentUser = await getApiSessionUser(request);

  if (!currentUser) {
    return unauthorizedJson();
  }

  try {
    const googleStatus = await getGoogleConnectionStatus(currentUser.id);

    if (!googleStatus.connected || !googleStatus.hasTasks) {
      return NextResponse.json(
        { error: 'Google Tasks is not connected. Reconnect Google and grant Tasks access.' },
        { status: 400 }
      );
    }

    const result = await syncGoogleTasks(currentUser.id);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to sync Google Tasks';
    console.error('Error syncing Google Tasks:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}