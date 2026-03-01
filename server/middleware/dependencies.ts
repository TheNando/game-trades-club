import { AuthContext, requireAuth } from "./requireAuth";

export type RouteDependencies = {
    auth: AuthContext;
    url: URL;
};

export function withDeps(
    fn: (request: Bun.BunRequest<string>, deps: RouteDependencies) => Promise<Response>
) {
    return function (request: Bun.BunRequest<string>) {
        const auth = requireAuth(request);

        // All routes require auth
        if (auth instanceof Response) return auth;

        const args: RouteDependencies = {
            auth,
            url: new URL(request.url)
        };

        return fn(request, args);
    };
}