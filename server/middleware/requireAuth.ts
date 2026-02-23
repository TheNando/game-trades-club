import { getSessionIdFromRequest, getValidSession } from '../auth/session';
import { unauthorized } from '../utils/http';

export type AuthContext = {
  userId: string;
  sessionId: string;
};

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
