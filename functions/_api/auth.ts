import type { Env, GoogleTokenResponse, GoogleUserInfo, JWTPayload, User } from './types';

// --- JWT Helpers (Web Crypto API, HS256) ---

function base64UrlEncode(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>, secret: string, expiresInSec = 7 * 24 * 3600): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSec,
  };

  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(fullPayload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await getHmacKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signingInput));

  return `${signingInput}.${base64UrlEncode(signature)}`;
}

export async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const signingInput = `${headerB64}.${payloadB64}`;
    const encoder = new TextEncoder();

    const key = await getHmacKey(secret);
    const signatureBytes = base64UrlDecode(signatureB64);
    const valid = await crypto.subtle.verify('HMAC', key, signatureBytes, encoder.encode(signingInput));

    if (!valid) return null;

    const payloadStr = new TextDecoder().decode(base64UrlDecode(payloadB64));
    const payload: JWTPayload = JSON.parse(payloadStr);

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

// --- Google OAuth ---

export async function exchangeGoogleCode(code: string, env: Env): Promise<GoogleTokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google token exchange failed: ${response.status} ${errorText}`);
  }

  return response.json() as Promise<GoogleTokenResponse>;
}

export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Google user info: ${response.status}`);
  }

  return response.json() as Promise<GoogleUserInfo>;
}

export async function findOrCreateUser(googleUser: GoogleUserInfo, env: Env): Promise<User> {
  // Try to find existing user
  const existing = await env.DB.prepare(
    'SELECT * FROM users WHERE google_id = ?'
  ).bind(googleUser.id).first<User>();

  if (existing) {
    // Update profile info
    await env.DB.prepare(
      'UPDATE users SET name = ?, avatar_url = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(googleUser.name, googleUser.picture, googleUser.email, existing.id).run();
    return { ...existing, name: googleUser.name, avatar_url: googleUser.picture, email: googleUser.email };
  }

  // Create new user
  const userId = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT INTO users (id, google_id, email, name, avatar_url, plan, credits) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(userId, googleUser.id, googleUser.email, googleUser.name, googleUser.picture, 'free', 3).run();

  const newUser = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first<User>();
  if (!newUser) throw new Error('Failed to create user');
  return newUser;
}

export function buildGoogleAuthUrl(env: Env): string {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
