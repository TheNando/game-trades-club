/** Creates a JSON response while preserving caller-provided response options. */
export function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init?.headers ?? {}),
    },
  });
}

/** Creates a 400 JSON error response. */
export function badRequest(message: string): Response {
  return json({ error: message }, { status: 400 });
}

/** Creates a 401 JSON error response. */
export function unauthorized(message = 'Unauthorized'): Response {
  return json({ error: message }, { status: 401 });
}

/** Creates a 404 JSON error response. */
export function notFound(message = 'Not found'): Response {
  return json({ error: message }, { status: 404 });
}

/** Creates a 500 JSON error response. */
export function serverError(message = 'Internal server error'): Response {
  return json({ error: message }, { status: 500 });
}

/** Creates a 502 JSON error response. */
export function badGateway(message = 'Bad gateway'): Response {
  return json({ error: message }, { status: 502 });
}

/** Parses a request JSON body, returning null for invalid JSON. */
export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
