export function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init?.headers ?? {}),
    },
  });
}

export function badRequest(message: string): Response {
  return json({ error: message }, { status: 400 });
}

export function unauthorized(message = 'Unauthorized'): Response {
  return json({ error: message }, { status: 401 });
}

export function notFound(message = 'Not found'): Response {
  return json({ error: message }, { status: 404 });
}

export function serverError(message = 'Internal server error'): Response {
  return json({ error: message }, { status: 500 });
}

export function badGateway(message = 'Bad gateway'): Response {
  return json({ error: message }, { status: 502 });
}

export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
