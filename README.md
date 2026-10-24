# Link Vault - Full-Stack URL Shortener

A modern, full-stack URL shortener and analytics dashboard built with Node.js/Express, MongoDB/Mongoose, and React (Vite).

## Features

- **Fast URL Shortening**: Generates unique, compact short links.
- **Custom Aliases**: Create custom vanity short codes (e.g. `/my-portfolio`).
- **Protocol Normalization & Validation**: Automatically handles and normalizes web protocols (`https://`).
- **Real-time Analytics Dashboard**: Tracks total clicks, active vs. expired links, and click counts per link.
- **Link Expiration**: Set optional expiration dates with automatic 410 Expired responses.
- **One-Click Copy & Delete**: Instant clipboard copying with visual confirmation and link deletion.
- **Zero-Config Database**: Automatically connects to your MongoDB cluster via `MONGO_URI`, or seamlessly starts an embedded, persistent local MongoDB instance if no URI is provided.
- **Modern Responsive UI**: Clean, accessible design with dark mode styling, search filtering, and live backend connection status.

---

## Quick Start

### 1. Start the Backend Server

```bash
cd backend
npm install
npm run dev
# Server will start on http://localhost:5000
```

> **Note on MongoDB**: If you don't have a MongoDB cluster, you don't need to do anything! The backend automatically initializes an embedded local database and persists data to `backend/.mongo-data/`. If you want to use MongoDB Atlas or an external instance, simply specify `MONGO_URI` in `backend/.env`.

### 2. Start the Frontend Application

```bash
cd frontend
npm install
npm run dev
# Frontend will run on http://localhost:5173
```

### 3. Or Run From the Root Directory

```bash
npm run dev:backend   # Starts the Express API server
npm run dev:frontend  # Starts the Vite React dev server
npm test              # Runs the automated backend test suite
npm run lint          # Runs oxlint checks on frontend code
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/shorten` | Create a short link (`{ originalUrl, customCode?, expiresAt? }`) |
| `GET` | `/api/links` | Fetch all links sorted by creation date with click counts and status |
| `DELETE` | `/api/links/:id` | Delete a shortened link by ID or short code |
| `GET` | `/api/health` | Health check endpoint returning uptime and database status |
| `GET` | `/:shortCode` | Redirects to the original URL (302) and atomically increments click count |

---

## Running Automated Tests

Run the complete backend test suite:

```bash
npm test
```
