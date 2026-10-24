process.env.NODE_ENV = 'test';
import test from 'node:test';
import assert from 'node:assert';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { startServer, cleanup, Url } from '../src/server';

let server: Server;
let baseUrl: string;

test.before(async () => {
  server = await startServer(0); // ephemeral port
  const address = server.address() as AddressInfo;
  const port = address.port;
  baseUrl = `http://127.0.0.1:${port}`;
  await Url.deleteMany({});
});

test.after(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  await cleanup();
});

test('GET /api/health should return ok', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.strictEqual(res.status, 200);
  const data = (await res.json()) as { status: string; dbConnected: boolean };
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
  const data = (await res.json()) as { error: string };
  assert.match(data.error, /URL is required/i);
});

test('POST /api/shorten rejects invalid URL', async () => {
  const res = await fetch(`${baseUrl}/api/shorten`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ originalUrl: 'not a url' }),
  });
  assert.strictEqual(res.status, 400);
  const data = (await res.json()) as { error: string };
  assert.match(data.error, /invalid url/i);
});

test('POST /api/shorten generates short link with prepended https protocol', async () => {
  const res = await fetch(`${baseUrl}/api/shorten`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ originalUrl: 'example.com' }),
  });
  assert.strictEqual(res.status, 201);
  const data = (await res.json()) as {
    originalUrl: string;
    shortCode: string;
    shortUrl: string;
    qrUrl: string;
    qrCode: string;
    clicks: number;
  };
  assert.strictEqual(data.originalUrl, 'https://example.com/');
  assert.ok(data.shortCode);
  assert.ok(data.shortUrl);
  assert.strictEqual(data.clicks, 0);
  assert.ok(data.qrUrl);
  assert.ok(data.qrCode);
  assert.match(data.qrCode, /^data:image\/png;base64,/);
  assert.match(data.qrUrl, new RegExp(`/api/links/${data.shortCode}/qr$`));
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
  const data = (await res.json()) as { shortCode: string };
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
  const data = (await res.json()) as { error: string };
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
  const data = (await res.json()) as { error: string };
  assert.match(data.error, /reserved/i);
});

test('GET /api/links returns all shortened links', async () => {
  const res = await fetch(`${baseUrl}/api/links`);
  assert.strictEqual(res.status, 200);
  const links = (await res.json()) as unknown[];
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
  assert.strictEqual(doc?.clicks, 1);
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
  assert.ok(doc);
  const res = await fetch(`${baseUrl}/api/links/${doc._id}`, {
    method: 'DELETE',
  });
  assert.strictEqual(res.status, 200);

  const found = await Url.findById(doc._id);
  assert.strictEqual(found, null);
});

test('GET /api/links/:shortCode/qr returns PNG QR code by default', async () => {
  const res = await fetch(`${baseUrl}/api/links/my-custom-git/qr`);
  assert.strictEqual(res.status, 200);
  assert.match(res.headers.get('content-type') || '', /^image\/png/);
  const buffer = await res.arrayBuffer();
  assert.ok(buffer.byteLength > 100);
});

test('GET /api/links/:shortCode/qr?format=svg returns SVG QR code', async () => {
  const res = await fetch(`${baseUrl}/api/links/my-custom-git/qr?format=svg`);
  assert.strictEqual(res.status, 200);
  assert.match(res.headers.get('content-type') || '', /^image\/svg\+xml/);
  const svg = await res.text();
  assert.match(svg, /<svg/);
  assert.match(svg, /<\/svg>/);
});

test('GET /api/links/:shortCode/qr?format=json returns QR code data url mapping to shortUrl', async () => {
  const res = await fetch(`${baseUrl}/api/links/my-custom-git/qr?format=json`);
  assert.strictEqual(res.status, 200);
  const data = (await res.json()) as { shortCode: string; shortUrl: string; qrCode: string };
  assert.strictEqual(data.shortCode, 'my-custom-git');
  assert.match(data.shortUrl, /\/my-custom-git$/);
  assert.match(data.qrCode, /^data:image\/png;base64,/);
});

test('GET /api/links/:shortCode/qr?download=true sets attachment content-disposition', async () => {
  const res = await fetch(`${baseUrl}/api/links/my-custom-git/qr?download=true`);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(
    res.headers.get('content-disposition'),
    'attachment; filename="qr-my-custom-git.png"'
  );
});

test('GET /:shortCode/qr convenience route returns PNG QR code', async () => {
  const res = await fetch(`${baseUrl}/my-custom-git/qr`);
  assert.strictEqual(res.status, 200);
  assert.match(res.headers.get('content-type') || '', /^image\/png/);
});

test('GET /api/links/:id/qr finds link by MongoDB ID', async () => {
  const doc = await Url.findOne({ shortCode: 'my-custom-git' });
  assert.ok(doc);
  const res = await fetch(`${baseUrl}/api/links/${doc._id}/qr?format=json`);
  assert.strictEqual(res.status, 200);
  const data = (await res.json()) as { shortCode: string; shortUrl: string };
  assert.strictEqual(data.shortCode, 'my-custom-git');
  assert.match(data.shortUrl, /\/my-custom-git$/);
});

test('GET /api/links/nonexistent/qr returns 404', async () => {
  const res = await fetch(`${baseUrl}/api/links/nonexistent123/qr`, {
    headers: { Accept: 'application/json' },
  });
  assert.strictEqual(res.status, 404);
  const data = (await res.json()) as { error: string };
  assert.match(data.error, /not found/i);
});
