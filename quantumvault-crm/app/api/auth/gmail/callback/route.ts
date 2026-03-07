import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { isDytallixEmail } from '@/lib/auth';
import {
  exchangeCodeForTokens,
  getOAuth2Client,
  parseGoogleOAuthState,
  storeGoogleTokens,
} from '@/lib/google-auth';
import { google } from 'googleapis';

function buildDashboardRedirect(request: NextRequest, params: Record<string, string>) {
  const basePath = request.nextUrl.basePath || process.env.NEXT_PUBLIC_BASE_PATH || '';
  const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const url = new URL(`${basePath}/dashboard`, publicAppUrl);
  url.search = new URLSearchParams(params).toString();
  return url;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle user denying access
  if (error) {
    return NextResponse.redirect(buildDashboardRedirect(request, { auth_error: error }));
  }

  if (!code || !state) {
    return NextResponse.redirect(
      buildDashboardRedirect(request, { auth_error: 'missing_params' })
    );
  }

  try {
    // Parse user context from state
    const { userId, email } = parseGoogleOAuthState(state);

    if (!userId || !isDytallixEmail(email)) {
      throw new Error('Invalid OAuth state');
    }

    const supabase = createServerClient();
    const { data: user } = await supabase
      .from('users')
      .select('id, email, active')
      .eq('id', userId)
      .eq('active', true)
      .single();

    if (!user || user.email.toLowerCase() !== email.toLowerCase()) {
      throw new Error('User session could not be verified');
    }

    // Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Missing tokens in response');
    }

    // Get the user's Google email address
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const providerEmail = userInfo.data.email || undefined;

    if (!providerEmail || !isDytallixEmail(providerEmail)) {
      throw new Error('Google account must belong to dytallix.com');
    }

    // Store tokens in database
    await storeGoogleTokens(
      userId,
      tokens.access_token,
      tokens.refresh_token,
      tokens.expiry_date || Date.now() + 3600000,
      tokens.scope?.split(' ') || [],
      providerEmail
    );

    // Redirect back to dashboard with success
    return NextResponse.redirect(
      buildDashboardRedirect(request, {
        google_connected: 'true',
        email: providerEmail,
      })
    );
  } catch (err: any) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.redirect(
      buildDashboardRedirect(request, { auth_error: err.message })
    );
  }
}
