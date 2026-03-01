import { BunRequest } from 'bun';
import { buildGoogleStartResponse, buildClearOAuthStateCookie, exchangeCodeForGoogleProfile, validateGoogleCallbackState } from '../auth/google';
import { buildSessionClearCookie, buildSessionCookie, createSession, getSessionIdFromRequest, revokeSession } from '../auth/session';
import { findUserById, upsertGoogleUser } from '../db/usersTable';
import { RouteDependencies } from '../middleware/dependencies';
import { json, unauthorized } from '../utils/http';
import { randomToken } from '../utils/security';

export async function getAuthGoogleCallback(
  request: BunRequest<"/api/auth/google/callback">,
  { url }: RouteDependencies
) {
  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');

  if (!validateGoogleCallbackState(request, state) || !code) {
    return unauthorized('Invalid OAuth callback');
  }

  try {
    const profile = await exchangeCodeForGoogleProfile(request, code, url);
    const user = upsertGoogleUser(randomToken(18), profile);
    const session = await createSession(user.id, request);
    const headers = new Headers();
    headers.set('location', '/');
    headers.append('set-cookie', buildSessionCookie(session.id));
    headers.append('set-cookie', buildClearOAuthStateCookie());

    return new Response(null, {
      status: 302,
      headers,
    });
  } catch (error) {
    console.error(error);
    return unauthorized('Google authentication failed');
  }
}

export async function getAuthGoogleStart(
  request: BunRequest<"/api/auth/google/start">,
  { url }: RouteDependencies) {
  try {
    return buildGoogleStartResponse(request, url);
  } catch (error) {
    console.error(error);
    return json({ error: 'Google OAuth is not configured' }, { status: 500 });
  }
}

export async function postAuthLogout(request: BunRequest<"/api/auth/logout">) {
  const sessionId = getSessionIdFromRequest(request);
  if (sessionId) revokeSession(sessionId);

  return new Response(null, {
    status: 204,
    headers: {
      'set-cookie': buildSessionClearCookie(),
    },
  });
}

export async function getMe(request: BunRequest<"/api/me">, { auth }: RouteDependencies) {
  const user = findUserById(auth.userId);
  if (!user) return unauthorized();

  return json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatar_url,
  });
}