# Link Vault 🔗

> A high-performance, full-stack URL shortener and analytics dashboard built with TypeScript, Node.js, Express, MongoDB, and React (Vite), styled with my handmade **ElectroVoid** theme.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React%2019-20232A?style=flat&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/Express.js-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Theme](https://img.shields.io/badge/UI%20Theme-ElectroVoid-8800ff?style=flat)](https://github.com/)
[![Oxlint](https://img.shields.io/badge/Lint-Oxlint-blue?style=flat)](https://oxc.rs/)

---

## Overview

**Link Vault** is an end-to-end URL shortening service designed with developer ergonomics, speed, and zero friction in mind. It pairs a robust Express REST API with an embedded MongoDB engine (zero-config local persistence out of the box) and a responsive React single-page dashboard for real-time link creation, tracking, and lifecycle management.

The entire interface is built with **ElectroVoid**, my handmade dark-and-purple theme featuring a true `#000000` void black background, radiant `#8800ff` / `#bb00ff` electric purple accents reserved for active focus states, and strict semantic color coding.

---

## ✨ Features

- **⚡ Fast URL Shortening**: Generates clean, compact 6-character short codes using cryptographic base64url encoding.
- **🏷️ Custom Vanity Aliases**: Supports user-defined custom shortcodes (e.g. `linkvault.local/portfolio`) with reserved-keyword collision protection.
- **🛡️ Protocol Normalization & Validation**: Automatically handles and prepends schemes (e.g. `google.com` &rarr; `https://google.com`), rejecting malformed hosts and invalid URIs.
- **📊 Real-Time Analytics Dashboard**: Live metrics counting total redirects, active links, and expired links with instant search filtering.
- **⏳ Link Expiration Support**: Set optional expiration timestamps. Expired links automatically serve an RFC-compliant HTTP `410 Gone` error page.
- **📋 One-Click Clipboard & Management**: Copy short links to clipboard with visual confirmation and delete unwanted links on the fly.
- **📱 Instant QR Code Generation**: Automatically generates high-contrast QR codes mapped directly to shortened URLs (preserving analytics tracking when scanned). Includes PNG and SVG download formats in an interactive modal, plus dedicated REST endpoints (`/api/links/:identifier/qr` and `/:shortCode/qr`).
- **🗄️ Zero-Config Embedded Database**: Connects to an external MongoDB cluster via `MONGO_URI`, or automatically boots an embedded, persistent instance (`mongodb-memory-server` with WiredTiger) if no URI is provided.
- **🎨 ElectroVoid UI**: Crafted with my handmade **ElectroVoid** theme — an ultra-clean, high-contrast aesthetic pairing pure `#000000` void black, glowing `#8800ff` / `#bb00ff` electric purple focus accents, sleek elevation surfaces, and live backend connection indicators.

---

## 🏗️ Architecture & Tech Stack

| Layer | Technologies |
|---|---|
| **Backend** | Node.js, Express 5, TypeScript, Mongoose 9, tsx, mongodb-memory-server, qrcode, dotenv, cors |
| **Frontend** | React 19, TypeScript, Vite 8, Axios, qrcode, Oxlint, ElectroVoid Theme (my handmade design system) |
| **Testing** | Node.js native test runner (`node:test`, `node:assert`), tsx |
| **Database** | MongoDB (External MongoDB Atlas / Docker URI or embedded local storage in `backend/.mongo-data/`) |

---

## 📁 Repository Structure

```
linkvault/
├── backend/
│   ├── src/
│   │   └── server.ts          # Express application, Mongoose models, and route controllers
│   ├── test/
│   │   └── server.test.ts     # Automated integration & unit test suite
│   ├── .env                   # Environment variable configuration
│   ├── package.json           # Backend dependencies and scripts
│   └── tsconfig.json          # Backend TypeScript configuration
├── frontend/
│   ├── public/                # Static assets (favicons, SVG icons)
│   ├── src/
│   │   ├── App.tsx            # Main application UI and dashboard
│   │   ├── main.tsx           # React DOM mounting
│   │   ├── types.ts           # Shared frontend TypeScript interfaces
│   │   └── index.css          # CSS styles and responsive design
│   ├── index.html             # Vite entry HTML
│   ├── package.json           # Frontend dependencies and scripts
│   ├── tsconfig.json          # Frontend TypeScript configuration
│   └── vite.config.ts         # Vite bundler configuration
├── package.json               # Root monorepo workspace scripts
└── README.md                  # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: Version 18.x or higher
- **npm**: Version 9.x or higher

### Installation

Clone the repository and install dependencies in both backend and frontend workspaces:

```bash
git clone https://github.com/your-username/linkvault.git
cd linkvault

# Install root, backend, and frontend packages
npm install
npm --prefix backend install
npm --prefix frontend install
```

---

## ⚙️ Environment Configuration

Backend environment configuration resides in `backend/.env`. A standard configuration looks like:

```env
# Optional: External MongoDB connection URI
# If empty or omitted, an embedded local MongoDB instance is started automatically
MONGO_URI=

# Port on which the Express server will listen (Default: 5000)
PORT=5000

# Base URL used for constructing public short links (Default: http://localhost:5000)
BASE_URL=http://localhost:5000
```

Frontend environment variables can optionally be placed in `frontend/.env`:

```env
# Base URL of the backend API
VITE_API_BASE=http://localhost:5000
```

---

## 💻 Running the Application

### Option A: Using Monorepo Root Scripts (Recommended)

From the root directory:

```bash
# Start backend server with hot-reload (tsx watch)
npm run dev:backend

# Start frontend development server (Vite)
npm run dev:frontend
```

Once running:
- **Frontend Dashboard**: [http://localhost:5173](http://localhost:5173)
- **Backend API & Shortener**: [http://localhost:5000](http://localhost:5000)

### Option B: Running Packages Individually

#### 1. Backend Server
```bash
cd backend
npm run dev
# Server will start on http://localhost:5000
```

#### 2. Frontend Application
```bash
cd frontend
npm run dev
# Vite will serve the UI on http://localhost:5173
```

---

## 📡 API Reference

### 1. Shorten URL
Create a new shortened link.

- **URL**: `/api/shorten`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "originalUrl": "https://example.com/very-long-path?param=1",
    "customCode": "my-alias",      // Optional: 3-30 alphanumeric characters, hyphens, underscores
    "expiresAt": "2026-12-31T23:59:59Z" // Optional: Future ISO timestamp
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "_id": "671a5...",
    "originalUrl": "https://example.com/very-long-path?param=1",
    "shortCode": "my-alias",
    "shortUrl": "http://localhost:5000/my-alias",
    "qrUrl": "http://localhost:5000/api/links/my-alias/qr",
    "qrCode": "data:image/png;base64,iVBORw...",
    "clicks": 0,
    "expiresAt": "2026-12-31T23:59:59.000Z",
    "isExpired": false,
    "createdAt": "2026-10-24T12:00:00.000Z",
    "updatedAt": "2026-10-24T12:00:00.000Z"
  }
  ```

---

### 2. Fetch All Links
Retrieve all links for the analytics dashboard, ordered by newest first.

- **URL**: `/api/links`
- **Method**: `GET`
- **Response** (`200 OK`):
  ```json
  [
    {
      "_id": "671a5...",
      "originalUrl": "https://example.com",
      "shortCode": "Ab3Xy9",
      "shortUrl": "http://localhost:5000/Ab3Xy9",
      "clicks": 14,
      "expiresAt": null,
      "isExpired": false,
      "createdAt": "2026-10-24T11:45:00.000Z"
    }
  ]
  ```

---

### 3. Delete Link
Delete a link by its MongoDB ObjectId or shortcode.

- **URL**: `/api/links/:id`
- **Method**: `DELETE`
- **Response** (`200 OK`):
  ```json
  {
    "message": "Link deleted successfully",
    "id": "671a5..."
  }
  ```

---

### 4. Health Check
Inspect API availability and MongoDB connection state.

- **URL**: `/api/health`
- **Method**: `GET`
- **Response** (`200 OK`):
  ```json
  {
    "status": "ok",
    "uptime": 124.56,
    "dbConnected": true
  }
  ```

---

### 5. Generate QR Code
Generate a high-contrast QR code mapped directly to the shortened URL.

- **URL**: `/api/links/:identifier/qr` or `/:shortCode/qr`
- **Method**: `GET`
- **Query Parameters**:
  - `format`: `png` (default), `svg`, or `json` (returns Data URL)
  - `download`: `true` or `1` (triggers file download)
  - `width`: Image width in pixels (64 - 2048, default: 300)
  - `margin`: Module quiet zone padding (0 - 10, default: 2)
- **Response**:
  - `format=png`: Raw image buffer (`Content-Type: image/png`)
  - `format=svg`: SVG vector markup (`Content-Type: image/svg+xml`)
  - `format=json`: JSON payload with base64 Data URL:
    ```json
    {
      "shortCode": "my-alias",
      "shortUrl": "http://localhost:5000/my-alias",
      "qrCode": "data:image/png;base64,iVBORw..."
    }
    ```

---

### 6. Redirect Endpoint
Redirects visitors to the original destination URL.

- **URL**: `/:shortCode`
- **Method**: `GET`
- **Behaviors**:
  - **Active Link**: Redirects with HTTP `302 Found` and atomically increments `clicks`.
  - **Expired Link**: Returns HTTP `410 Gone` with custom expiration screen.
  - **Nonexistent Link**: Returns HTTP `404 Not Found`.

---

## 🧪 Testing & Code Quality

Link Vault includes an automated test suite, TypeScript static checking, and ultra-fast Oxlint checks:

```bash
# Run backend automated integration tests
npm test

# Run TypeScript typechecks across both packages
npm run typecheck

# Run frontend linting with Oxlint
npm run lint

# Compile and build both backend and frontend for production
npm run build
```

---

## 🛠️ Development & Engineering Guide

This section explains the internal design decisions, architectural flows, and implementation details for contributors and developers working on Link Vault.

### 1. Dual-Database Strategy & Persistence Lifecycle

Link Vault is engineered to run out of the box with zero external database configuration:
- **Production / External Cluster**: If `MONGO_URI` is populated in `backend/.env` with a valid MongoDB connection string, Mongoose connects directly to that cluster with a 5000ms server selection timeout.
- **Embedded Local Persistence**: If `MONGO_URI` is unset or contains a placeholder, the backend automatically initializes an embedded `mongodb-memory-server` configured with the **WiredTiger** storage engine pointing to `backend/.mongo-data/`.
  - This ensures that shortened links, expiration timestamps, and click counts persist across server restarts during local development.
  - **Graceful Lock Handling**: If the database directory is locked by another running process (e.g., during rapid restarts), the server catches the lock error and falls back to a fresh in-memory instance, logging an informative notice.
- **Automated Testing Isolation**: In test runs (`NODE_ENV === 'test'`), database initialization skips the file directory and runs in an isolated ephemeral instance, resetting collections between runs.

---

### 2. URL Shortening & Collision Resolution Pipeline

When a user submits a URL to `POST /api/shorten`:

```
User Input URL
      │
      ▼
Normalize & Protocol Validation (normalizeUrl)
      │
      ├── Invalid / Disallowed Scheme ──► 400 Bad Request
      ▼
Check Custom Alias or Auto-generate:
      │
      ├─ Custom Alias:
      │    ├─ Validate pattern (3-30 chars: [a-zA-Z0-9_-])
      │    ├─ Check RESERVED_CODES collision (api, qr, health, links, etc.)
      │    └─ Check MongoDB duplicate shortCode ──► 409 Conflict if taken
      │
      └─ Auto-Generated Code:
           ├─ Generate 6-char base64url using crypto.randomBytes(4)
           ├─ Loop with exponential entropy expansion if collisions occur
           └─ Filter out reserved keywords
      │
      ▼
Save Document (Url.create)
      │
      ▼
Format API Response + Generate QR Data URL
```

1. **Protocol Normalization**: Raw URLs missing a scheme (e.g. `github.com/trending`) automatically receive `https://`. Malformed hostnames or URIs lacking a dot are rejected immediately.
2. **Cryptographic Entropy**: 6-character auto-generated codes provide $64^6 \approx 68.7 \text{ billion}$ unique combinations. If multiple collisions are detected during collision resolution loops, an extra random hex suffix is appended.
3. **Atomic Analytics Tracking**: In `GET /:shortCode`, redirects atomically call `Url.findByIdAndUpdate(url._id, { $inc: { clicks: 1 } })` before performing the 302 redirect. This eliminates race conditions under high concurrent traffic.

---

### 3. QR Code Generation Architecture

Link Vault provides end-to-end QR code generation with a strict requirement: **all QR codes map directly to the shortened URL, never the destination URL**.

#### Why Map to the Shortened URL?
By encoding the short URL (`http://localhost:5000/xyz`) rather than the target URL (`https://example.com`):
1. Any device scanning the QR code triggers the redirect endpoint.
2. The click count increments in real time on the dashboard.
3. If the link has expired, the scanner is properly greeted with the RFC-compliant `410 Gone` message.

#### Dual-Layer Generation Flow:
- **Client-Side Generation (Instant)**:
  - When opening the QR modal in the React dashboard, `qrcode.toDataURL()` renders the image canvas locally in milliseconds.
  - SVG vector files can be converted into `image/svg+xml` Blobs directly in the browser for instant vector downloads without server load.
- **Server-Side REST Endpoints (Universal Access)**:
  - `GET /api/links/:identifier/qr`: Serves the QR code in multiple formats (`png`, `svg`, `json`) via query parameter `?format=`.
  - `GET /:shortCode/qr`: Direct shortcut route. Visiting `http://localhost:5000/my-link/qr` in a browser or markdown image tag immediately outputs the QR image buffer.
  - Supports `?download=true` which attaches `Content-Disposition: attachment; filename="qr-<codebox>.png"`.

#### Scanning Reliability & ElectroVoid Palette
While Link Vault uses the dark `#000000` void theme throughout the UI, QR codes require high visual luminance contrast for phone camera lenses and barcode decoders. The modal displays the QR code on a dedicated pure white `#ffffff` canvas with a standard quiet-zone margin (2 modules), ensuring 100% scan accuracy on both iOS and Android camera apps.

---

### 4. ElectroVoid Design System in React & CSS

All frontend UI components strictly implement Shreyas's **ElectroVoid** design system tokens:

| Token | Hex / CSS Variable | Usage in Link Vault |
|---|---|---|
| `void` | `#000000` / `--bg-primary` | Main application background and modal backdrop base. |
| `surface` | `#101010` / `--bg-secondary` | Cards, panels, input fields, and modal containers. |
| `surface-alt` | `#141414` / `--bg-card` | Modal headers, stat card backgrounds, table header rows. |
| `surface-hover` | `#1a1a1a` | Outline button hovers, row hover states. |
| `border` | `#444444` / `--border-color` | Static neutral chrome borders, table row dividers. |
| `electric` | `#8800ff` / `--accent` | Base interactive accent: CTA buttons, input focus rings, active badges. |
| `electric-bright` | `#bb00ff` / `--accent-hover` | Active/hovered CTA buttons, click metric highlights. |
| `cyan` | `#00e5ff` | URLs, short links, and informational text. |
| `green` | `#00ff88` / `--success` | Active status badges, success indicators. |
| `amber` | `#ffaa00` / `--warning` | Expired status badges, expiration warnings. |
| `red` | `#ff3b5c` / `--danger` | Error alerts, delete buttons. |

> **The Accent Rule**: In ElectroVoid, electric purple (`#8800ff` / `#bb00ff`) is strictly reserved for live, focused, or active interactive elements. Static chrome, separators, and neutral borders always use neutral chrome (`#444444` / `#333333`).

---

### 5. Automated Test Suite & Ephemeral Server Architecture

The backend test suite in `backend/test/server.test.ts` uses Node.js's native test runner (`node:test`, `node:assert`):
- **Ephemeral Port Binding (`startServer(0)`)**: Tests start the HTTP server on dynamic port `0`, allowing the operating system to assign an unused ephemeral port. This prevents `EADDRINUSE` conflicts when running tests while a local development server is active.
- **Isolated In-Memory Database**: Tests run against a fresh in-memory database instance, isolating test data from local development data in `.mongo-data/`.
- **Fast Execution**: Tests execute using `tsx --test` in under 2 seconds without requiring heavy external test harnesses.
- **Linting Discipline**: Frontend code is verified with **Oxlint** (`oxlint`), enforcing clean React 19 hook patterns (e.g. avoiding cascading re-renders via `set-state-in-effect`).

---

## 🔒 Security & Validation Details

- **Input Sanitization**: Protocol enforcement rejects dangerous schemes (`javascript:`, `data:`, `file:`) and ensures valid domain formatting.
- **Reserved Routes**: System paths such as `api`, `health`, `links`, `shorten`, `favicon.ico`, and `robots.txt` are blacklisted as shortcodes to prevent routing hijacking.
- **Atomic Operations**: Redirect click metrics are incremented atomically with MongoDB `$inc` to avoid race conditions.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
