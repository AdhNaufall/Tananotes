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

function assertCondition(label, condition) {
  if (!condition) {
    throw new Error(`${label} assertion failed`);
  }
}

async function run() {
  const email = `notes_smoke_${Date.now()}_${Math.floor(Math.random() * 10000)}@example.com`;

  const register = await request('/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Notes Smoke User',
      email,
      password: 'Password123!',
    }),
  });
  assertStatus('register', register.status, 201);

  const create = await request('/api/notes', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      title: 'Smoke Note Title',
      category: 'Smoke Category',
      content: '<p>Smoke note content</p>',
      color: '#93C5FD',
    }),
  });
  assertStatus('create note', create.status, 201);
  const createdNote = await create.json();

  assertCondition('created note id', Boolean(createdNote._id));
  assertCondition('created note slug', Boolean(createdNote.slug));

  const listBeforeUpdate = await request('/api/notes', { method: 'GET' });
  assertStatus('list notes before update', listBeforeUpdate.status, 200);
  const notesBeforeUpdate = await listBeforeUpdate.json();
  assertCondition(
    'created note exists in list',
    Array.isArray(notesBeforeUpdate) && notesBeforeUpdate.some((note) => note._id === createdNote._id)
  );

  const getBySlug = await request(`/api/notes/${createdNote.slug}`, { method: 'GET' });
  assertStatus('get note by slug', getBySlug.status, 200);

  const update = await request('/api/notes', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      id: createdNote._id,
      title: 'Smoke Note Updated',
      category: 'Smoke Category Updated',
      content: '<p>Smoke note content updated</p>',
      color: '#FDE047',
      isPinned: false,
    }),
  });
  assertStatus('update note', update.status, 200);
  const updatedNote = await update.json();

  assertCondition('updated note title', updatedNote.title === 'Smoke Note Updated');
  assertCondition('updated note category', updatedNote.category === 'Smoke Category Updated');

  const getUpdated = await request(`/api/notes/${updatedNote.slug}`, { method: 'GET' });
  assertStatus('get updated note by slug', getUpdated.status, 200);

  const pinToggle = await request('/api/notes/pin', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: createdNote._id }),
  });
  assertStatus('pin note', pinToggle.status, 200);
  const pinnedNote = await pinToggle.json();
  assertCondition('note pinned state', pinnedNote.isPinned === true);

  const deleteResponse = await request(`/api/notes?id=${encodeURIComponent(createdNote._id)}`, {
    method: 'DELETE',
  });
  assertStatus('delete note', deleteResponse.status, 200);

  const getAfterDelete = await request(`/api/notes/${updatedNote.slug}`, { method: 'GET' });
  assertStatus('get deleted note by slug', getAfterDelete.status, 404);

  const listAfterDelete = await request('/api/notes', { method: 'GET' });
  assertStatus('list notes after delete', listAfterDelete.status, 200);
  const notesAfterDelete = await listAfterDelete.json();
  assertCondition(
    'deleted note removed from list',
    Array.isArray(notesAfterDelete) && !notesAfterDelete.some((note) => note._id === createdNote._id)
  );

  console.log(
    [
      `base_url=${baseUrl}`,
      `register_email=${email}`,
      `created_note_id=${createdNote._id}`,
      `created_slug=${createdNote.slug}`,
      `updated_slug=${updatedNote.slug}`,
      'result=ok',
    ].join(' ')
  );
}

run().catch((error) => {
  console.error(`Notes smoke test failed: ${error.message}`);
  process.exit(1);
});
