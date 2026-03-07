const GOOGLE_AUTHORIZATION_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const PLACEHOLDER_PREFIXES = ['your_google_', 'change_me'];

function fail(message) {
  console.error(`Google OAuth verification failed: ${message}`);
  process.exit(1);
}

function isPlaceholder(value) {
  if (!value) {
    return true;
  }

  return PLACEHOLDER_PREFIXES.some((prefix) => value.trim().toLowerCase().startsWith(prefix));
}

function getRequiredEnv(name) {
  const value = process.env[name]?.trim();

  if (!value || isPlaceholder(value)) {
    fail(`${name} is missing or still using a placeholder value.`);
  }

  return value;
}

function getRedirectUri() {
  const explicitRedirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();

  if (explicitRedirectUri && !isPlaceholder(explicitRedirectUri)) {
    return explicitRedirectUri;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!appUrl) {
    fail('Set GOOGLE_REDIRECT_URI or NEXT_PUBLIC_APP_URL before verifying Google OAuth.');
  }

  const normalizedBasePath = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '');
  return new URL(`${normalizedBasePath}/api/auth/gmail/callback`, appUrl).toString();
}

async function main() {
  const clientId = getRequiredEnv('GOOGLE_CLIENT_ID');
  getRequiredEnv('GOOGLE_CLIENT_SECRET');

  const redirectUri = getRedirectUri();
  const params = new URLSearchParams({
    access_type: 'offline',
    client_id: clientId,
    prompt: 'consent',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/tasks',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' '),
    state: 'deployment-verification',
  });

  const response = await fetch(`${GOOGLE_AUTHORIZATION_URL}?${params.toString()}`, {
    cache: 'no-store',
    redirect: 'follow',
    headers: {
      'user-agent': 'QuantumVault CRM deploy verifier',
    },
  });

  if (!response.url.includes('/signin/oauth/error')) {
    console.log(`Google OAuth verification passed for ${redirectUri}`);
    return;
  }

  const responseText = await response.text();

  if (
    responseText.includes('invalid_client') ||
    responseText.includes('The OAuth client was not found.')
  ) {
    fail('Google does not recognize GOOGLE_CLIENT_ID. Use an active Google Cloud web OAuth client.');
  }

  if (responseText.includes('redirect_uri_mismatch')) {
    fail(`Authorize this redirect URI in Google Cloud: ${redirectUri}`);
  }

  fail(`Unexpected Google OAuth error page returned for ${redirectUri}.`);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});