export const SESSION_COOKIE_NAME = 'vbg_session';

/** Password protection is enabled only when APP_PASSWORD is a non-empty string. */
export function isAuthEnabled(): boolean {
  return Boolean(process.env.APP_PASSWORD && process.env.APP_PASSWORD.length > 0);
}

function getSecret(): string {
  return process.env.AUTH_SECRET || process.env.APP_PASSWORD || 'insecure-dev-secret';
}

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return Buffer.from(signature).toString('hex');
}

/** Creates a signed session token — no server-side session store needed. */
export async function createSessionToken(): Promise<string> {
  const payload = `authenticated.${Date.now()}`;
  const signature = await hmac(payload);
  return `${Buffer.from(payload).toString('base64url')}.${signature}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const [payloadB64, signature] = token.split('.');
  if (!payloadB64 || !signature) return false;

  try {
    const payload = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const expected = await hmac(payload);
    if (expected.length !== signature.length) return false;
    // Constant-time-ish comparison (adequate for a short-lived session token).
    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
      diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}

export function checkPassword(candidate: string): boolean {
  const expected = process.env.APP_PASSWORD || '';
  if (!expected || candidate.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= candidate.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
