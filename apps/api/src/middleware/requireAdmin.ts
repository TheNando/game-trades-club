import { findUserById, type UserRecord } from '../db/usersTable';
import { notFound } from '../utils/http';
import type { AuthContext } from './requireAuth';

/** Configures user lookup for admin authorization. */
export type RequireAdminOptions = {
  findUser?: (id: string) => UserRecord | null;
};

function isAdminUser(user: UserRecord | null): boolean {
  return !!user && user.is_admin === 1;
}

/** Returns a not-found response unless the authenticated user is an admin. */
export function requireAdmin(
  auth: AuthContext,
  { findUser = findUserById }: RequireAdminOptions = {},
): Response | null {
  const user = findUser(auth.userId);
  if (!isAdminUser(user)) return notFound();
  return null;
}
