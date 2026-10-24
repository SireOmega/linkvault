require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = express();
app.use(express.json());
app.use(cors());

// Schema Definition
const urlSchema = new mongoose.Schema({
  originalUrl: { type: String, required: true },
  shortCode:   { type: String, required: true, unique: true },
  clicks:      { type: Number, default: 0 },
  expiresAt:   { type: Date, default: null },
}, { timestamps: true });

const Url = mongoose.model('Url', urlSchema);

let mongodInstance = null;

// Connect to MongoDB (with automatic embedded fallback)
async function connectDB(options = {}) {
  let uri = process.env.MONGO_URI ? process.env.MONGO_URI.trim() : '';
  const isPlaceholder = !uri || uri === 'your_mongodb_connection_string' || !/^mongodb(\+srv)?:\/\//i.test(uri);

  if (isPlaceholder) {
    const isTest = process.env.NODE_ENV === 'test' || options.isTest;
    const instanceConfig = {};
    if (!isTest) {
      const dbPath = path.join(__dirname, '.mongo-data');
      if (!fs.existsSync(dbPath)) {
        fs.mkdirSync(dbPath, { recursive: true });
      }
      instanceConfig.dbPath = dbPath;
      instanceConfig.storageEngine = 'wiredTiger';
    }

    try {
      mongodInstance = await MongoMemoryServer.create({
        instance: instanceConfig,
      });
      uri = mongodInstance.getUri();
    } catch {
      console.log('Database directory in use or locked. Falling back to fresh in-memory MongoDB instance...');
      mongodInstance = await MongoMemoryServer.create();
      uri = mongodInstance.getUri();
    }
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log(`Connected to MongoDB (${isPlaceholder ? 'Embedded instance' : 'External URI'})`);
  } catch (err) {
    console.error('Failed to connect to primary MongoDB:', err.message);
    if (!mongodInstance) {
      console.log('Falling back to embedded MongoDB...');
      mongodInstance = await MongoMemoryServer.create();
      await mongoose.connect(mongodInstance.getUri());
      console.log('Connected to fallback embedded MongoDB');
    } else {
      throw err;
    }
  }
}

// Helper: Normalize and validate URL
function normalizeUrl(inputUrl) {
  if (!inputUrl || typeof inputUrl !== 'string') return null;
  let trimmed = inputUrl.trim();
  if (!trimmed) return null;

  // Add protocol if missing
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = 'https://' + trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    if (!parsed.hostname || !parsed.hostname.includes('.')) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

// Helper: Generate random 6-character short code
function generateCode() {
  return crypto.randomBytes(4).toString('base64url').slice(0, 6);
}

// Reserved codes that cannot be used as short codes
const RESERVED_CODES = new Set([
  'api', 'favicon.ico', 'robots.txt', 'health', 'links', 'shorten', 'static', 'assets'
]);

// Helper: Format URL document for API response
function formatUrl(doc, req) {
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  const isExpired = Boolean(doc.expiresAt && new Date() > new Date(doc.expiresAt));
  return {
    _id: doc._id,
    originalUrl: doc.originalUrl,
    shortCode: doc.shortCode,
    shortUrl: `${baseUrl}/${doc.shortCode}`,
    clicks: doc.clicks,
    expiresAt: doc.expiresAt,
    isExpired,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    dbConnected: mongoose.connection.readyState === 1,
  });
});

// API Endpoint: Shorten URL
app.post('/api/shorten', async (req, res) => {
  try {
    const { originalUrl, customCode, expiresAt } = req.body || {};
    if (!originalUrl) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const validatedUrl = normalizeUrl(originalUrl);
    if (!validatedUrl) {
      return res.status(400).json({ error: 'Invalid URL. Please enter a valid web address (e.g. https://example.com).' });
    }

    let parsedExpiresAt = null;
    if (expiresAt) {
      parsedExpiresAt = new Date(expiresAt);
      if (isNaN(parsedExpiresAt.getTime())) {
        return res.status(400).json({ error: 'Invalid expiration date.' });
      }
      if (parsedExpiresAt <= new Date()) {
        return res.status(400).json({ error: 'Expiration date must be in the future.' });
      }
    }

    let shortCode;
    if (customCode && typeof customCode === 'string' && customCode.trim()) {
      const code = customCode.trim();
      if (!/^[a-zA-Z0-9_-]{3,30}$/.test(code)) {
        return res.status(400).json({
          error: 'Custom short code must be 3-30 characters long and contain only letters, numbers, hyphens, and underscores.'
        });
      }
      if (RESERVED_CODES.has(code.toLowerCase())) {
        return res.status(400).json({ error: `"${code}" is a reserved system keyword. Please choose another.` });
      }
      const existing = await Url.findOne({ shortCode: code });
      if (existing) {
        return res.status(409).json({ error: 'Custom short code is already taken. Please try another.' });
      }
      shortCode = code;
    } else {
      let attempts = 0;
      do {
        shortCode = generateCode();
        attempts++;
        if (attempts > 10) {
          shortCode = generateCode() + crypto.randomBytes(2).toString('hex');
        }
      } while (RESERVED_CODES.has(shortCode.toLowerCase()) || await Url.findOne({ shortCode }));
    }

    const newUrl = await Url.create({
      originalUrl: validatedUrl,
      shortCode,
      expiresAt: parsedExpiresAt,
    });

    res.status(201).json(formatUrl(newUrl, req));
  } catch (err) {
    console.error('Error creating short URL:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// API Endpoint: Fetch All Links (for Dashboard)
app.get('/api/links', async (req, res) => {
  try {
    const links = await Url.find().sort({ createdAt: -1 });
    res.json(links.map(link => formatUrl(link, req)));
  } catch (err) {
    console.error('Error fetching links:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// API Endpoint: Delete Link
app.delete('/api/links/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let deleted = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      deleted = await Url.findByIdAndDelete(id);
    }
    if (!deleted) {
      deleted = await Url.findOneAndDelete({ shortCode: id });
    }

    if (!deleted) {
      return res.status(404).json({ error: 'Link not found' });
    }

    res.json({ message: 'Link deleted successfully', id: deleted._id });
  } catch (err) {
    console.error('Error deleting link:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Favicon and robots static ignore
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/robots.txt', (req, res) => res.status(204).end());

// Redirect Endpoint
app.get('/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;
    if (RESERVED_CODES.has(shortCode.toLowerCase())) {
      return res.status(404).send('<h3>404 - Not Found</h3>');
    }

    const url = await Url.findOne({ shortCode });
    if (!url) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>404 - Link Not Found</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 80px 20px; background: #0f172a; color: #e2e8f0; }
            .card { max-width: 500px; margin: 0 auto; background: #1e293b; padding: 40px; border-radius: 12px; border: 1px solid #334155; }
            h1 { color: #f43f5e; margin-bottom: 12px; font-size: 28px; }
            p { color: #94a3b8; font-size: 16px; line-height: 1.5; }
            a { color: #38bdf8; text-decoration: none; display: inline-block; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>404 - Link Not Found</h1>
            <p>The shortened link you followed does not exist or may have been deleted.</p>
          </div>
        </body>
        </html>
      `);
    }

    // Expiry Check
    if (url.expiresAt && new Date() > new Date(url.expiresAt)) {
      return res.status(410).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>410 - Link Expired</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 80px 20px; background: #0f172a; color: #e2e8f0; }
            .card { max-width: 500px; margin: 0 auto; background: #1e293b; padding: 40px; border-radius: 12px; border: 1px solid #334155; }
            h1 { color: #fbbf24; margin-bottom: 12px; font-size: 28px; }
            p { color: #94a3b8; font-size: 16px; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>410 - Link Has Expired</h1>
            <p>This shortened link reached its expiration date on <strong>${new Date(url.expiresAt).toUTCString()}</strong> and is no longer accessible.</p>
          </div>
        </body>
        </html>
      `);
    }

    // Atomically increment click counter
    await Url.findByIdAndUpdate(url._id, { $inc: { clicks: 1 } });

    return res.redirect(url.originalUrl);
  } catch (err) {
    console.error('Error redirecting:', err);
    res.status(500).send('Server Error');
  }
});

async function startServer(customPort) {
  await connectDB();
  const listenPort = customPort !== undefined ? customPort : (process.env.PORT || 5000);
  const server = app.listen(listenPort, () => {
    const actualPort = server.address().port;
    console.log(`Server running on port ${actualPort}`);
  });
  return server;
}

if (require.main === module) {
  startServer().catch(err => {
    console.error('Fatal startup error:', err);
    process.exit(1);
  });
}

// Graceful cleanup
async function cleanup() {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongodInstance) {
      await mongodInstance.stop();
    }
  } catch (err) {
    // ignore on exit
  }
}
process.on('SIGINT', async () => {
  await cleanup();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await cleanup();
  process.exit(0);
});

module.exports = { app, startServer, cleanup, Url };
