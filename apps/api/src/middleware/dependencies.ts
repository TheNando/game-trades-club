import { AuthContext, isAuthContext, requireAuth } from "./requireAuth";

export type RouteDependencies = {
  auth: AuthContext;
  url: URL;
};

export const NO_AUTH = { authorized: false };

const fakeAuth: AuthContext = {
  userId: '',
  sessionId: ''
};

export function withDeps(
  fn: (request: Bun.BunRequest<string>, deps: RouteDependencies) => Promise<Response>,
  { authorized } = { authorized: true }
) {
  return function (request: Bun.BunRequest<string>) {
    // Create fake authorization for routes that do not require authorization
    const auth = authorized ? requireAuth(request) : fakeAuth;

    if (!isAuthContext(auth)) return auth;

    const args: RouteDependencies = {
      auth,
      url: new URL(request.url)
    };

    return fn(request, args);
  };
}