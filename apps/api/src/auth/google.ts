import { parseCookies, serializeCookie } from '../utils/cookies';
import { randomToken } from '../utils/security';

const OAUTH_STATE_COOKIE = 'oauth_state';
const OAUTH_STATE_MAX_AGE = 10 * 60;
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

type GoogleProfile = {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

function getPublicOrigin(request: Request, requestUrl: URL): string {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const forwardedHost = request.headers.get('x-forwarded-host');
  if (forwardedHost) {
    return `${forwardedProto ?? 'http'}://${forwardedHost}`;
  }

  const host = request.headers.get('host');
  if (host) {
    return `${requestUrl.protocol}//${host}`;
  }

  return requestUrl.origin;
}

/** Creates the redirect response that begins Google OAuth. */
export function buildGoogleStartResponse(request: Request, requestUrl: URL): Response {
  const clientId = getRequiredEnv('GOOGLE_CLIENT_ID');
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ??
    `${getPublicOrigin(request, requestUrl)}/api/auth/google/callback`;
  const state = randomToken(24);

  const authUrl = new URL(GOOGLE_AUTH_URL);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  const secure = process.env.NODE_ENV === 'production';

  return new Response(null, {
    status: 302,
    headers: {
      'location': authUrl.toString(),
      'set-cookie': serializeCookie(OAUTH_STATE_COOKIE, state, {
        path: '/',
        maxAge: OAUTH_STATE_MAX_AGE,
        httpOnly: true,
        sameSite: 'Lax',
        secure,
      }),
    },
  });
}

/** Verifies the OAuth callback state against its cookie. */
export function validateGoogleCallbackState(
  request: Request,
  stateFromQuery: string | null,
): boolean {
  if (!stateFromQuery) return false;
  const cookies = parseCookies(request.headers.get('cookie'));
  const expectedState = cookies[OAUTH_STATE_COOKIE];
  return !!expectedState && expectedState === stateFromQuery;
}

/** Creates an expired cookie that clears OAuth callback state. */
export function buildClearOAuthStateCookie(): string {
  const secure = process.env.NODE_ENV === 'production';
  return serializeCookie(OAUTH_STATE_COOKIE, '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    sameSite: 'Lax',
    secure,
  });
}

/** Exchanges a Google authorization code for a validated profile. */
export async function exchangeCodeForGoogleProfile(
  request: Request,
  code: string,
  requestUrl: URL,
): Promise<GoogleProfile> {
  const clientId = getRequiredEnv('GOOGLE_CLIENT_ID');
  const clientSecret = getRequiredEnv('GOOGLE_CLIENT_SECRET');
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ??
    `${getPublicOrigin(request, requestUrl)}/api/auth/google/callback`;

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error('Failed to exchange Google OAuth code');
  }

  const tokenData = (await tokenResponse.json()) as { access_token?: string; };
  if (!tokenData.access_token) {
    throw new Error('Google token response did not include access_token');
  }

  const profileResponse = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      authorization: `Bearer ${tokenData.access_token}`,
    },
  });

  if (!profileResponse.ok) {
    throw new Error('Failed to fetch Google profile');
  }

  const profile = (await profileResponse.json()) as GoogleProfile;
  if (!profile.sub || !profile.email) {
    throw new Error('Google profile missing required fields');
  }

  return profile;
}
