export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...headers,
    },
  });
}

export function error(code, status = 400) {
  return json({ error: code }, status);
}

export function nowIso() {
  return new Date().toISOString();
}

export function getCookie(request, name) {
  const cookie = request.headers.get('Cookie') ?? '';
  const part = cookie.split(';').map((p) => p.trim()).find((p) => p.startsWith(`${name}=`));
  return part ? decodeURIComponent(part.slice(name.length + 1)) : null;
}

export function sessionCookie(sessionId, expiresAt, secure = true) {
  const parts = [
    `examdraft_session=${encodeURIComponent(sessionId)}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Expires=${new Date(expiresAt).toUTCString()}`,
  ];
  if (secure) parts.splice(2, 0, 'Secure');
  return parts.join('; ');
}

export function clearSessionCookie() {
  return 'examdraft_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0';
}

export async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomToken(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function appOrigin(request, env) {
  return env.APP_ORIGIN || new URL(request.url).origin;
}
