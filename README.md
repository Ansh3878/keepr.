<div align="center">

# Keepr.

### Zero-Knowledge File Sharing, Cloud Vault & Threat Sandboxing

*Encrypted on your device. Never readable by our servers. Built on trust, protected by math.*

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Cloudflare R2](https://img.shields.io/badge/Storage-Cloudflare_R2_(10GB_Free)-F38020?logo=cloudflare&logoColor=white)](https://www.cloudflare.com/developer-platform/r2/)
[![Render](https://img.shields.io/badge/Deploy-Render-46E3B7?logo=render&logoColor=white)](https://render.com)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF?logo=clerk&logoColor=white)](https://clerk.com)

</div>

---

## Table of Contents

1. [What is Keepr?](#what-is-keepr)
2. [The Zero-Knowledge Principle](#the-zero-knowledge-principle)
3. [Features](#features)
4. [How It Works (Crypto Flows)](#how-it-works-crypto-flows)
5. [100% Free Cloud Architecture](#100-free-cloud-architecture)
6. [The Cybersecurity Aspect](#the-cybersecurity-aspect)
7. [The Web-Dev & Performance Aspect](#the-web-dev--performance-aspect)
8. [Tech Stack](#tech-stack)
9. [Project Structure](#project-structure)
10. [Getting Started](#getting-started)
11. [Environment Variables](#environment-variables)
12. [Deployment & 24/7 Uptime Guide](#deployment--247-uptime-guide)
13. [Security Notes & Disclaimer](#security-notes--disclaimer)

---

## What is Keepr?

**Keepr** is a modern, privacy-first security suite for transmitting, storing, and analyzing sensitive digital assets. It unites five zero-trust security tools under a cohesive, high-performance interface:

| Tool | What it does |
|------|--------------|
| **Send / Receive** | Share files via one-time, end-to-end encrypted burn links |
| **Secure Storage Rooms** | Persistent, encrypted vaults with dead-man's-switch lifecycle and streaming multipart uploads |
| **Ephemeral Chat** | Real-time, burn-after-reading E2EE messaging over WebSockets |
| **Link Detonator** | Open suspicious URLs inside an isolated cloud sandbox and analyze them with Google Gemini AI |
| **Malware Scan** | Scan files and URLs against 70+ antivirus engines via VirusTotal |

**Core Guarantee:** **The server is never trusted with plaintext.** All encryption and decryption occurs locally in the browser using the Web Crypto API. Encryption keys reside only in the URL fragment (`#…`), which web browsers never transmit to the server.

---

## The Zero-Knowledge Principle

Traditional cloud storage asks you to trust the service provider with your data and keys. Keepr enforces mathematical trust:

- **Client-Side Encryption:** Files and messages are encrypted with **AES-256-GCM** in the browser *before* leaving your machine.
- **Key Isolation in URL Hash:** The symmetric key is generated on-device and embedded in the URL fragment (`#key=…`). Per HTTP standards, fragments are **never sent to web servers**.
- **Opaque Storage (Zero-Egress R2):** The storage backend holds only raw ciphertext and random IVs. A complete database or bucket leak yields only unreadable random bytes.
- **Ephemerality by Design:** Share links burn on download, chat rooms evaporate on session wipe, and storage rooms enforce automated dead-man purges.

---

## Features

### 1. Send / Receive — One-Time Encrypted Transfer
- Files are encrypted in the browser with freshly generated **AES-256-GCM** keys.
- Direct-to-bucket upload via pre-signed URLs — ciphertext streams straight from browser to **Cloudflare R2** without proxying megabytes through the app server.
- Recipient accesses `https://domain/#fileId&key=...`. The browser downloads ciphertext, decrypts locally, and triggers an immediate server-side burn (`DELETE /api/burn/:id`).

### 2. Secure Storage Rooms — Zero-Trust Cloud Vaults
- Create PIN- and key-protected rooms backed by Cloudflare R2 and structured room state.
- **Chunked, Memory-Safe Uploads:** Files are sliced into 16 MB chunks, each encrypted with an independent initialization vector (IV) and uploaded via S3-compatible multipart APIs.
- **10 GB Free Storage Quota:** Per-room and workspace-wide storage meters against the 10 GB Cloudflare R2 free tier.
- **Dead-Man's-Switch Lifecycle:** Configurable inactivity timer (1 min test mode → 180 days). If expired, the room automatically **purges all files** or performs an **encrypted email handoff** via Nodemailer / Gmail SMTP.
- **Memory-Safe Streaming Decryption:** Decrypts chunk-by-chunk directly to disk with File System Access API where available.

### 3. Ephemeral Chat — Burn-After-Reading Messaging
- Real-time communication powered by **Socket.IO**.
- Every message is encrypted client-side; the server fans out ciphertext to active room peers without ever possessing decryption capabilities.
- Immediate session wipe clears all in-memory peer states and message traces.

### 4. Link Detonator — Isolated URL Sandbox + AI Heuristics
- Suspicious URLs are detonated inside a sandboxed headless browser engine:
  - **Local Dev:** Automatically detects and drives local Google Chrome or Microsoft Edge.
  - **Cloud (Render):** Automatically launches disposable `@sparticuz/chromium` in Linux container isolation.
- Captures high-resolution visual heuristics and analyzes page layout with **Google Gemini 1.5 Flash** (with fallback to 2.5 Flash) to identify phishing, fake logins, brand impersonation, and social engineering.
- Streams live step-by-step detonation terminal logs to the frontend via WebSockets.

### 5. Malware Scan — 70+ Antivirus Engine Relay
- Inspect files or URLs via the **VirusTotal API**.
- Server queries VirusTotal, tracks scan progress, and formats multi-engine detection tallies into threat assessment cards.

---

## How It Works (Crypto Flows)

### Sending a File
```
Browser                               Cloudflare R2
  │  1. generate AES-256-GCM key (Web Crypto)
  │  2. encrypt(file) → [IV | ciphertext]
  │  3. POST /api/upload-url ───────► pre-signed R2 PUT URL
  │  4. PUT ciphertext ─────────────► R2 (encrypted blob)
  │  5. build link: https://app/#<fileId>&key=<rawKey>
  ▼
Share link (key lives in # fragment — never leaves browser)
```

### Receiving a File
```
Browser                               Cloudflare R2
  │  1. parse fileId + key from URL fragment (#)
  │  2. POST /api/download-url ─────► pre-signed R2 GET URL
  │  3. GET ciphertext ◄──────────── R2
  │  4. decrypt in-browser with local key
  │  5. DELETE /api/burn/<fileId> ──► object destroyed immediately
  ▼
Plaintext file (never existed unencrypted on any server)
```

---

## 100% Free Cloud Architecture

Keepr has been architected to run permanently on free, production-grade cloud tiers with **$0 monthly costs and no hidden fees**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          BROWSER (React 19 SPA)                        │
│   AES-256-GCM client encryption · URL Fragment (#) Key Isolation       │
│   Clerk Auth (Email, Google, GitHub, Facebook OAuth)                   │
└───────┬─────────────────┬──────────────────┬───────────────────┬───────┘
        │                 │                  │                   │
   Direct R2 PUT      Socket.IO          REST APIs          VirusTotal
   (Pre-signed)     (Chat + Detonate)  (Rooms + Health)     Relay
        │                 │                  │                   │
┌───────▼────────┐ ┌──────▼──────────────────▼───────────────────▼───────┐
│ Cloudflare R2  │ │               RENDER WEB SERVICE                    │
│ (10 GB Free,   │ │  Unified Express Server (server.ts)                 │
│  0 Egress Fee) │ │  - Socket.IO Real-time Engine                       │
│  - Vault Files │ │  - Cross-Platform Headless Browser Detonator        │
│  - Room Chunks │ │  - Inactivity Watchdog Cron + Gmail SMTP Alerts     │
└────────────────┘ │  - Local JSON Room Store (rooms-db.json)            │
                   │  - Serves Built Static SPA (dist/)                  │
                   └──────────────────────▲──────────────────────────────┘
                                          │ Ping every 5 min
                                   ┌──────┴──────────────┐
                                   │  UPTIMEROBOT (Free) │
                                   │  /api/health monitor│
                                   └─────────────────────┘
```

### Free Stack Breakdown
1. **Object Storage:** **Cloudflare R2**
   - 10 GB storage free forever
   - $0 egress / bandwidth fees (unlike AWS S3)
   - S3 API compatibility (`@aws-sdk/client-s3`)
2. **Compute & Web Server:** **Render.com** (Free Web Service)
   - Runs unified Node/Express backend + serves compiled React SPA
   - Native WebSocket support
3. **Anti-Sleep Keep-Alive:** **UptimeRobot**
   - Pings `https://your-app.onrender.com/api/health` every 5 minutes
   - Prevents Render free-tier from idling after inactivity
4. **Threat Intelligence:** **Google Gemini API** & **VirusTotal** free tiers
5. **Authentication:** **Clerk** free tier (up to 10,000 monthly active users)

---

## The Cybersecurity Aspect

- **End-to-End Encryption (E2EE):** AES-256-GCM provides both confidentiality and cryptographic integrity. Tampered payloads fail authentication rather than producing corrupted data.
- **Unique Initialization Vectors:** Every chunk, file, and message generates a fresh 12-byte cryptographic IV.
- **Zero-Knowledge Architecture:** Decryption keys are stored strictly in client memory and URL hashes (`#`).
- **Disposable Execution Sandboxes:** Detonates URLs in headless Chromium to inspect threats without exposing users' personal machines.
- **Automated Lifecycle Purges:** Rooms and one-time links are automatically destroyed on download or timeout.

---

## The Web-Dev & Performance Aspect

- **Single Page App (SPA) Architecture:** Built on Vite 6 and React 19 with route-level code splitting (`React.lazy` + `Suspense`).
- **Manual Vendor Chunking:** Bundles large vendor libraries (`@clerk`, `three`, `motion`, `socket.io-client`, `jszip`) into isolated cacheable chunks.
- **Deferred WebGL Shader Canvas:** Three.js "Silk" shader mounts during browser idle time (`requestIdleCallback`) and respects `prefers-reduced-motion`.
- **Custom Clerk Auth Interface:** Handcrafted animated login/registration flows with code verification and Smart CAPTCHA.
- **Tailwind CSS v4 & Motion:** Fluid typography, 3D tilt micro-interactions, responsive mobile views, and custom scrollbar styling.

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, Vite 6, TypeScript 5, Tailwind CSS v4, `motion` (Framer Motion 12), Three.js, Lucide Icons, Radix UI |
| **Auth** | Clerk (`@clerk/clerk-react`, `@clerk/themes`) — Email, Google, GitHub, Facebook OAuth |
| **Crypto** | Web Crypto API (AES-256-GCM, SHA-256) |
| **Realtime** | Socket.IO v4 |
| **Backend** | Node.js, Express, Multer, Nodemailer, `@aws-sdk/client-s3` (R2-compatible) |
| **Storage** | Cloudflare R2 (10 GB free, zero egress) |
| **Sandboxing & AI** | Puppeteer Core, `@sparticuz/chromium`, Google Gemini 1.5/2.5 Flash |
| **Threat Intelligence** | VirusTotal API |
| **Typography** | Geist Variable, Instrument Serif |

---

## Project Structure

```
keepr./
├── index.html                  # HTML entry point
├── vite.config.ts              # Vite config with proxy & vendor chunk splitting
├── tsconfig.json               # TypeScript configuration
├── package.json                # Dependencies and build scripts
├── Dockerfile                  # Container definition for unified server
├── server.ts                   # Unified Express + Socket.IO backend:
│                               #   - Cloudflare R2 pre-signing & object burn
│                               #   - Secure Storage REST API (/api/rooms)
│                               #   - Cross-platform Link Detonator + Gemini AI
│                               #   - Inactivity watchdog & Gmail SMTP alerts
│                               #   - VirusTotal scan relay & /api/health ping
│                               #   - Static SPA serving from dist/
├── src/
│   ├── main.tsx                # App bootstrap wrapped in ClerkProvider
│   ├── App.tsx                 # Navigation, view router, Send/Receive & crypto
│   ├── index.css               # Tailwind CSS v4 styling & design tokens
│   └── components/
│       ├── AuthPage.tsx          # Custom Clerk auth UI
│       ├── SecureStorageRoom.tsx # Encrypted vault rooms with chunked upload & dead-man switch
│       ├── EphemeralChat.tsx     # E2EE WebSocket chat with auto-retry
│       ├── DetonatorView.tsx     # Link Detonator live terminal & AI analysis UI
│       ├── WhyUs.tsx             # Interactive crypto demo
│       ├── JourneySection.tsx    # 3D coverflow carousel
│       ├── TiltCard.tsx          # 3D cursor-reactive card
│       ├── Silk.tsx              # Three.js silk shader background
│       ├── MouseAurora.tsx       # Cursor-following ambient aurora
│       └── InteractiveLoader.tsx # Smooth loading transitions
```

---

## Getting Started

### Prerequisites
- **Node.js 20+**
- A free **Cloudflare account** (for R2 storage)
- Free API keys: **Clerk**, **Google Gemini**, **VirusTotal**
- A **Gmail account with App Password** (for room lifecycle notifications)

### 1. Clone & Install
```bash
git clone <your-repo-url> keepr
cd keepr
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the project root:

```env
# ── Cloudflare R2 Storage (10 GB Free) ────────────────────────
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com
R2_BUCKET_NAME=keepr-vault

# ── Frontend API Base URL ─────────────────────────────────────
VITE_API_BASE_URL=/api

# ── Gemini AI ─────────────────────────────────────────────────
GEMINI_API_KEY=your_gemini_api_key

# ── VirusTotal ────────────────────────────────────────────────
VIRUSTOTAL_API_KEY=your_virustotal_api_key

# ── Clerk Authentication ──────────────────────────────────────
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_key

# ── Gmail SMTP Notifications ──────────────────────────────────
VITE_EMAIL_USER=your_email@gmail.com
EMAIL_USER=your_email@gmail.com
EMAIL_APP_PASSWORD=your_16_character_app_password
```

### 3. Run Locally
```bash
# Terminal 1: Start the unified backend (port 8080)
npm start

# Terminal 2: Start the Vite frontend dev server (port 5173)
npm run dev
```

Open `http://localhost:5173` in your browser. Vite automatically proxies `/api` and `/socket.io` to the backend.

---

## Deployment & 24/7 Uptime Guide

### 1. Deploy on Render (Free Web Service)
1. Push your repository to **GitHub**.
2. Log into [Render Dashboard](https://dashboard.render.com/) and click **New +** ➔ **Web Service**.
3. Connect your GitHub repository.
4. Configure service settings:
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
5. In the **Environment Variables** tab, add your `.env` keys (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_BUCKET_NAME`, `VITE_API_BASE_URL=/api`, `GEMINI_API_KEY`, etc.).
6. Click **Deploy Web Service**.

### 2. Configure Bucket CORS on Cloudflare R2
In Cloudflare Dashboard ➔ **R2** ➔ Select your bucket (`keepr-vault`) ➔ **Settings** ➔ **CORS Policy**, paste:
```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

### 3. Keep Render Running 24/7 (Prevent 5-min Sleep)
Render free web services enter sleep mode after 15 minutes of inactivity. Keep your instance awake permanently at $0 cost:
1. Go to [UptimeRobot.com](https://uptimerobot.com/) and register for free.
2. Click **Add New Monitor**:
   - **Monitor Type:** `HTTP(s)`
   - **Friendly Name:** `Keepr Server Keep-Alive`
   - **URL:** `https://your-app-name.onrender.com/api/health`
   - **Monitoring Interval:** `Every 5 minutes`
3. Click **Create Monitor**. Your app will receive a periodic heartbeat and stay warm 24/7!

---

## Security Notes & Disclaimer

- **Portfolio & Security Showcase:** Demonstrates real-world zero-knowledge cryptography, browser-based AES-256-GCM pipelines, and cloud sandboxing.
- **Zero-Knowledge Key Loss:** Because encryption keys exist only in the URL fragment (`#`), **losing the link or vault key means losing access permanently**. The server cannot recover keys.
- **Credential Rotation:** Never commit real secrets to Git. Always ensure `.env` is listed in your `.gitignore`.
- **IPv4 SMTP Configuration:** The unified backend forces IPv4 (`family: 4`) for Gmail SMTP connections to prevent connectivity failures on cloud hosts that do not support outbound IPv6.

---

<div align="center">

**Keepr.** — Built on trust. Protected by math.

</div>
