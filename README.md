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
- **🗄️ Zero-Config Embedded Database**: Connects to an external MongoDB cluster via `MONGO_URI`, or automatically boots an embedded, persistent instance (`mongodb-memory-server` with WiredTiger) if no URI is provided.
- **🎨 ElectroVoid UI**: Crafted with my handmade **ElectroVoid** theme — an ultra-clean, high-contrast aesthetic pairing pure `#000000` void black, glowing `#8800ff` / `#bb00ff` electric purple focus accents, sleek elevation surfaces, and live backend connection indicators.

---

## 🏗️ Architecture & Tech Stack

| Layer | Technologies |
|---|---|
| **Backend** | Node.js, Express 5, TypeScript, Mongoose 9, tsx, mongodb-memory-server, dotenv, cors |
| **Frontend** | React 19, TypeScript, Vite 8, Axios, Oxlint, ElectroVoid Theme (my handmade design system) |
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

### 5. Redirect Endpoint
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

## 🔒 Security & Validation Details

- **Input Sanitization**: Protocol enforcement rejects dangerous schemes (`javascript:`, `data:`, `file:`) and ensures valid domain formatting.
- **Reserved Routes**: System paths such as `api`, `health`, `links`, `shorten`, `favicon.ico`, and `robots.txt` are blacklisted as shortcodes to prevent routing hijacking.
- **Atomic Operations**: Redirect click metrics are incremented atomically with MongoDB `$inc` to avoid race conditions.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
