process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert');
const { app, startServer, cleanup, Url } = require('../server');

let server;
let baseUrl;

test.before(async () => {
  server = await startServer(0); // ephemeral port
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  await Url.deleteMany({});
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await cleanup();
});

test('GET /api/health should return ok', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.status, 'ok');
  assert.strictEqual(data.dbConnected, true);
});

test('POST /api/shorten rejects empty URL', async () => {
  const res = await fetch(`${baseUrl}/api/shorten`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /URL is required/i);
});

test('POST /api/shorten rejects invalid URL', async () => {
  const res = await fetch(`${baseUrl}/api/shorten`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ originalUrl: 'not a url' }),
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /invalid url/i);
});

test('POST /api/shorten generates short link with prepended https protocol', async () => {
  const res = await fetch(`${baseUrl}/api/shorten`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ originalUrl: 'example.com' }),
  });
  assert.strictEqual(res.status, 201);
  const data = await res.json();
  assert.strictEqual(data.originalUrl, 'https://example.com/');
  assert.ok(data.shortCode);
  assert.ok(data.shortUrl);
  assert.strictEqual(data.clicks, 0);
});

test('POST /api/shorten accepts custom code', async () => {
  const res = await fetch(`${baseUrl}/api/shorten`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      originalUrl: 'https://github.com',
      customCode: 'my-custom-git',
    }),
  });
  assert.strictEqual(res.status, 201);
  const data = await res.json();
  assert.strictEqual(data.shortCode, 'my-custom-git');
});

test('POST /api/shorten rejects duplicate custom code', async () => {
  const res = await fetch(`${baseUrl}/api/shorten`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      originalUrl: 'https://github.com/two',
      customCode: 'my-custom-git',
    }),
  });
  assert.strictEqual(res.status, 409);
  const data = await res.json();
  assert.match(data.error, /already taken/i);
});

test('POST /api/shorten rejects reserved keywords', async () => {
  const res = await fetch(`${baseUrl}/api/shorten`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      originalUrl: 'https://github.com',
      customCode: 'api',
    }),
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /reserved/i);
});

test('GET /api/links returns all shortened links', async () => {
  const res = await fetch(`${baseUrl}/api/links`);
  assert.strictEqual(res.status, 200);
  const links = await res.json();
  assert.ok(Array.isArray(links));
  assert.ok(links.length >= 2);
});

test('GET /:shortCode redirects and increments click count', async () => {
  const res = await fetch(`${baseUrl}/my-custom-git`, {
    redirect: 'manual',
  });
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.headers.get('location'), 'https://github.com/');

  // Verify click count incremented
  const doc = await Url.findOne({ shortCode: 'my-custom-git' });
  assert.strictEqual(doc.clicks, 1);
});

test('GET /:shortCode returns 410 when expired', async () => {
  // Create an expired link directly in DB
  const pastDate = new Date(Date.now() - 60000);
  await Url.create({
    originalUrl: 'https://expired-site.com',
    shortCode: 'expired1',
    expiresAt: pastDate,
  });

  const res = await fetch(`${baseUrl}/expired1`);
  assert.strictEqual(res.status, 410);
  const html = await res.text();
  assert.match(html, /Link Has Expired/i);
});

test('DELETE /api/links/:id removes link', async () => {
  const doc = await Url.findOne({ shortCode: 'expired1' });
  const res = await fetch(`${baseUrl}/api/links/${doc._id}`, {
    method: 'DELETE',
  });
  assert.strictEqual(res.status, 200);

  const found = await Url.findById(doc._id);
  assert.strictEqual(found, null);
});
