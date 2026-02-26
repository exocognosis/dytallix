const AUTH_COOKIE_NAME = 'qv_access_token';

function formatCookie(name: string, value: string, secure: boolean, maxAge?: number): string {
  const parts = [`${name}=${value}`, 'HttpOnly', 'Path=/', 'SameSite=Strict'];

  if (typeof maxAge === 'number') {
    parts.push(`Max-Age=${Math.max(0, Math.floor(maxAge))}`);
    const expiresAt = new Date(Date.now() + Math.max(0, Math.floor(maxAge)) * 1000);
    parts.push(`Expires=${expiresAt.toUTCString()}`);
  }

  if (secure) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

export function buildAuthCookie(token: string, expiresAt: Date | string, secureCookie: boolean): string {
  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  const maxAgeSeconds = Math.floor((expiry.getTime() - Date.now()) / 1000);
  return formatCookie(AUTH_COOKIE_NAME, encodeURIComponent(token), secureCookie, maxAgeSeconds);
}

export function buildClearedAuthCookie(secureCookie: boolean): string {
  return formatCookie(AUTH_COOKIE_NAME, '', secureCookie, 0);
}

export function extractAuthTokenFromRequest(req: any): string {
  const header = req?.headers?.authorization;
  if (typeof header === 'string' && header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }

  const cookieHeader = req?.headers?.cookie;
  if (typeof cookieHeader === 'string') {
    const tokenPair = cookieHeader
      .split(';')
      .map((part: string) => part.trim())
      .find((part: string) => part.startsWith(`${AUTH_COOKIE_NAME}=`));

    if (tokenPair) {
      return decodeURIComponent(tokenPair.slice(`${AUTH_COOKIE_NAME}=`.length));
    }
  }

  return '';
}
