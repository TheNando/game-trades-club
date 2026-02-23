const encoder = new TextEncoder();

export function randomToken(bytes = 32): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(bytes))).toString('base64url');
}

export function toIsoAfterDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export async function hashIp(ip: string, secret: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`${secret}:${ip}`));
  return Buffer.from(digest).toString('hex');
}
