import { db } from '../db/client';
import { parseCookies, serializeCookie } from '../utils/cookies';
import { hashIp, randomToken, toIsoAfterDays } from '../utils/security';

const SESSION_COOKIE = 'session_id';
const SESSION_DAYS = 30;

type SessionRow = {
  id: string;
  user_id: string;
  expires_at: string;
  revoked_at: string | null;
};

const createSessionStmt = db.query(
  `INSERT INTO sessions (id, user_id, expires_at, user_agent, ip_hash)
   VALUES (?, ?, ?, ?, ?)`
);

const getSessionStmt = db.query<SessionRow, [string]>(
  `SELECT id, user_id, expires_at, revoked_at
   FROM sessions
   WHERE id = ?`
);

const revokeSessionStmt = db.query(`UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE id = ?`);

export async function createSession(userId: string, request: Request): Promise<{ id: string; expiresAt: string }> {
  const id = randomToken(48);
  const expiresAt = toIsoAfterDays(SESSION_DAYS);
  const userAgent = request.headers.get('user-agent');
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const ipHash = await hashIp(ip, process.env.SESSION_SECRET ?? 'dev-session-secret');

  createSessionStmt.run(id, userId, expiresAt, userAgent, ipHash);
  return { id, expiresAt };
}

export function getSessionIdFromRequest(request: Request): string | null {
  const cookies = parseCookies(request.headers.get('cookie'));
  return cookies[SESSION_COOKIE] ?? null;
}

export function getValidSession(sessionId: string): SessionRow | null {
  const session = getSessionStmt.get(sessionId);
  if (!session) return null;
  if (session.revoked_at) return null;
  if (new Date(session.expires_at).getTime() <= Date.now()) return null;
  return session;
}

export function revokeSession(sessionId: string): void {
  revokeSessionStmt.run(sessionId);
}

export function buildSessionCookie(sessionId: string): string {
  const secure = process.env.NODE_ENV === 'production';
  return serializeCookie(SESSION_COOKIE, sessionId, {
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
    secure,
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export function buildSessionClearCookie(): string {
  const secure = process.env.NODE_ENV === 'production';
  return serializeCookie(SESSION_COOKIE, '', {
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
    secure,
    maxAge: 0,
  });
}
