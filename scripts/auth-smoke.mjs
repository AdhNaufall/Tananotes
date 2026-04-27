const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

let sessionCookie = '';

function readCookieFromResponse(response) {
  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) return null;
  return setCookie.split(';')[0];
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (sessionCookie) {
    headers.cookie = sessionCookie;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
    redirect: 'manual',
  });

  const updatedCookie = readCookieFromResponse(response);
  if (updatedCookie !== null) {
    sessionCookie = updatedCookie;
  }

  return response;
}

function assertStatus(label, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${label} expected ${expected} but got ${actual}`);
  }
}

async function run() {
  const email = `smoke_${Date.now()}_${Math.floor(Math.random() * 10000)}@example.com`;

  const unauthNotes = await request('/api/notes', { method: 'GET' });
  assertStatus('unauth notes', unauthNotes.status, 401);

  const register = await request('/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Smoke User',
      email,
      password: 'Password123!',
    }),
  });
  assertStatus('register', register.status, 201);

  const me = await request('/api/auth/me', { method: 'GET' });
  assertStatus('me after register', me.status, 200);

  const logout = await request('/api/auth/logout', { method: 'POST' });
  assertStatus('logout', logout.status, 200);

  const meAfterLogout = await request('/api/auth/me', { method: 'GET' });
  assertStatus('me after logout', meAfterLogout.status, 401);

  console.log(
    [
      `base_url=${baseUrl}`,
      `register_email=${email}`,
      `unauth_notes=${unauthNotes.status}`,
      `register=${register.status}`,
      `me=${me.status}`,
      `logout=${logout.status}`,
      `me_after_logout=${meAfterLogout.status}`,
      'result=ok',
    ].join(' ')
  );
}

run().catch((error) => {
  console.error(`Auth smoke test failed: ${error.message}`);
  process.exit(1);
});
