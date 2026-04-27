import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { jwtVerify, SignJWT } from 'jose';

export const AUTH_COOKIE_NAME = 'tananotes_session';

type AuthTokenPayload = {
  sub: string;
  email: string;
  name: string;
};

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Please define JWT_SECRET in .env.local');
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export function hashPasswordResetToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generatePasswordResetToken() {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashPasswordResetToken(rawToken);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 15);

  return { rawToken, tokenHash, expiresAt };
}

export async function createAuthToken(payload: AuthTokenPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret());
}

export function shouldUseSecureAuthCookie(request: Request) {
  if (process.env.NODE_ENV !== 'production') {
    return false;
  }

  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (forwardedProto) {
    return forwardedProto.split(',')[0]?.trim() === 'https';
  }

  try {
    const { hostname, protocol } = new URL(request.url);
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';

    if (isLocalhost) {
      return false;
    }

    return protocol === 'https:';
  } catch {
    return true;
  }
}

export async function verifyAuthToken(token: string) {
  const { payload } = await jwtVerify(token, getJwtSecret());
  return payload as unknown as AuthTokenPayload;
}

function parseCookieHeader(cookieHeader: string | null) {
  const parsed: Record<string, string> = {};
  if (!cookieHeader) return parsed;

  for (const pair of cookieHeader.split(';')) {
    const [rawKey, ...rawValue] = pair.trim().split('=');
    if (!rawKey) continue;
    parsed[rawKey] = decodeURIComponent(rawValue.join('='));
  }

  return parsed;
}

export async function getSessionFromRequest(request: Request) {
  const cookies = parseCookieHeader(request.headers.get('cookie'));
  const token = cookies[AUTH_COOKIE_NAME];
  if (!token) return null;

  try {
    return await verifyAuthToken(token);
  } catch {
    return null;
  }
}
