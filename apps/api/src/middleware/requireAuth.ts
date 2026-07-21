import { getSessionIdFromRequest, getValidSession } from '../auth/session';
import { unauthorized } from '../utils/http';

/** Identifies the authenticated user and session for a request. */
export type AuthContext = {
  userId: string;
  sessionId: string;
};

/** Determines whether a value is an authentication context. */
export const isAuthContext = (value: unknown): value is AuthContext =>
  typeof value === 'object' &&
  value !== null &&
  'userId' in value &&
  'sessionId' in value &&
  typeof value.userId === 'string' &&
  typeof value.sessionId === 'string';

/** Resolves request authentication or returns an unauthorized response. */
export function requireAuth(request: Request): AuthContext | Response {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) return unauthorized();

  const session = getValidSession(sessionId);
  if (!session) return unauthorized();

  return {
    userId: session.user_id,
    sessionId,
  };
}
