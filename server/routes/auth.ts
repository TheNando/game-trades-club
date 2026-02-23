import { buildGoogleStartResponse, buildClearOAuthStateCookie, exchangeCodeForGoogleProfile, validateGoogleCallbackState } from '../auth/google';
import { buildSessionClearCookie, buildSessionCookie, createSession, getSessionIdFromRequest, revokeSession } from '../auth/session';
import { requireAuth } from '../middleware/requireAuth';
import { findUserById, upsertGoogleUser } from '../repos/usersRepo';
import { randomToken } from '../utils/security';
import { json, unauthorized } from '../utils/http';

export async function handleAuthRoutes(request: Request, url: URL): Promise<Response | null> {
  if (request.method === 'GET' && url.pathname === '/api/auth/google/start') {
    try {
      return buildGoogleStartResponse(request, url);
    } catch (error) {
      console.error(error);
      return json({ error: 'Google OAuth is not configured' }, { status: 500 });
    }
  }

  if (request.method === 'GET' && url.pathname === '/api/auth/google/callback') {
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

  if (request.method === 'POST' && url.pathname === '/api/auth/logout') {
    const sessionId = getSessionIdFromRequest(request);
    if (sessionId) revokeSession(sessionId);

    return new Response(null, {
      status: 204,
      headers: {
        'set-cookie': buildSessionClearCookie(),
      },
    });
  }

  if (request.method === 'GET' && url.pathname === '/api/me') {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;

    const user = findUserById(auth.userId);
    if (!user) return unauthorized();

    return json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatar_url,
    });
  }

  return null;
}
