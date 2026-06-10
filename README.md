<div align="center">

# 🔐 Keepr.

### Zero-Knowledge File Sharing, Storage & Secure Communication

*Encrypted on your device. Never readable by our servers. Built on trust, protected by math.*

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![AWS](https://img.shields.io/badge/AWS-Serverless-FF9900?logo=amazonaws&logoColor=white)](https://aws.amazon.com)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

</div>

---

## Table of Contents

1. [What is Keepr?](#what-is-keepr)
2. [The Zero-Knowledge Principle](#the-zero-knowledge-principle)
3. [Features](#features)
4. [How It Works (Crypto Flows)](#how-it-works-crypto-flows)
5. [Architecture Overview](#architecture-overview)
6. [The Cybersecurity Aspect](#the-cybersecurity-aspect)
7. [The AWS & Cloud Aspect](#the-aws--cloud-aspect)
8. [The Web-Dev Aspect](#the-web-dev-aspect)
9. [Tech Stack](#tech-stack)
10. [Project Structure](#project-structure)
11. [Getting Started](#getting-started)
12. [Environment Variables](#environment-variables)
13. [Deployment](#deployment)
14. [Security Notes & Disclaimer](#security-notes--disclaimer)

---

## What is Keepr?

**Keepr** is a privacy-first security suite for sending, storing, and discussing sensitive
information. It bundles five tools behind a single authenticated, premium interface:

| Tool | What it does |
|------|--------------|
| **Send / Receive** | Share a file via a one-time, end-to-end encrypted link |
| **Secure Storage Rooms** | Persistent, encrypted cloud vaults with a dead-man's-switch lifecycle |
| **Ephemeral Chat** | Real-time, burn-after-reading E2EE messaging |
| **Link Detonator** | Open a suspicious URL inside an isolated cloud sandbox and analyze it with AI |
| **Malware Scan** | Scan files and URLs against 70+ antivirus engines via VirusTotal |

The defining idea: **the server is never trusted with plaintext.** All encryption and
decryption happens in the browser using the Web Crypto API. The encryption key lives only
in the URL fragment (`#…`), which browsers never transmit to the server.

---

## The Zero-Knowledge Principle

Traditional cloud storage asks you to trust the provider. Keepr is designed so that trust
isn't required:

- **Client-side encryption** — files and messages are encrypted with **AES-256-GCM** in the
  browser *before* anything leaves the device.
- **Key isolation** — the symmetric key is generated locally and embedded in the URL
  *fragment* (everything after `#`). Per the HTTP spec, the fragment is **never sent to the
  server**, so the backend physically cannot see the key.
- **Opaque storage** — the server (S3 / DynamoDB) only ever holds ciphertext + an IV. A
  database breach yields random bytes, not your data.
- **Ephemerality** — chat rooms, share links, and storage rooms are built to expire and
  self-destruct, minimizing the window of exposure.

> If Keepr's entire backend were leaked tomorrow, an attacker would have encrypted blobs and
> nothing to decrypt them with.

---

## Features

### 1. Send / Receive — One-Time Encrypted Transfer
- File is encrypted client-side with a freshly generated AES-256-GCM key.
- The ciphertext is uploaded to **AWS S3** via a short-lived **pre-signed URL** (the file
  goes browser → S3 directly; the app server never touches the bytes).
- The recipient gets a link of the form `…/#fileId&key=…`. Opening it fetches the ciphertext,
  decrypts it in their browser, and then **burns the object from S3** (`DELETE /api/burn/:id`).
- S3 **lifecycle rules** auto-expire any leftover objects after 7 days as a backstop.

### 2. Secure Storage Rooms — Persistent Encrypted Vaults
- Create PIN- + key-protected rooms backed by a dedicated S3 bucket and a **DynamoDB**
  settings table.
- **Chunked, memory-safe uploads:** files are sliced into 16 MB chunks, each encrypted with
  its own IV and streamed to S3 via **multipart upload**. This keeps browser memory bounded
  to ~one chunk, so multi-gigabyte files upload without crashing the tab.
- **Real-time storage accounting** against the 5 GB AWS S3 free-tier quota, shown per-room
  and workspace-wide.
- **Dead-man's-switch lifecycle:** each room has an inactivity timer (1 min test mode →
  180 days). When it fires, the room either **auto-purges** or performs an **email handoff**
  to a trusted recipient. A scheduled **Lambda cron** (every 5 minutes) enforces this
  server-side; the client also detects expiry on open and shows a migration/destroy panel.
- Streaming, chunk-by-chunk **decryption on download** (writes straight to disk via the File
  System Access API when available) so large downloads never sit fully in RAM.

### 3. Ephemeral Chat — Burn-After-Reading Messaging
- Real-time messaging over **WebSockets** (AWS API Gateway + Lambda + DynamoDB in
  production; Socket.IO for local dev).
- Every message is **encrypted client-side**; the server only ever fans out ciphertext to the
  other connections in the room — it **never decrypts**.
- Connections carry a 1-hour **TTL** in DynamoDB and are auto-pruned. "Wipe session" and
  disconnect events notify peers and clear history.

### 4. Link Detonator — Isolated URL Sandbox + AI Heuristics
- A suspicious URL is opened inside a **headless Chromium instance running in an AWS Lambda**
  — never on your machine.
- The sandbox captures a screenshot, which is analyzed by **Google Gemini 2.5 Flash** for
  phishing, brand impersonation, and malicious UI patterns.
- Returns a structured verdict (`riskScore`, `verdict`, `reason`) with a **live log stream**
  of the analysis over Socket.IO.

### 5. Malware Scan — Multi-Engine Threat Analysis
- Upload a file or submit a URL; it's relayed to the **VirusTotal API** and scanned against
  70+ antivirus engines.
- The server polls the analysis to completion and returns the aggregated detection results.

### Plus
- **Authentication & billing** via **Clerk** (the whole app is gated behind sign-in, with a
  Free vs Pro plan controlling access to premium tools).
- A premium animated UI: Three.js "silk" background, cursor-reactive aurora, 3D tilt cards,
  and motion-driven transitions — all lazy-loaded and tuned for mobile.

---

## How It Works (Crypto Flows)

### Sending a file
```
Browser                                   AWS
  │  1. generate AES-256-GCM key (Web Crypto)
  │  2. encrypt(file) → [IV | ciphertext]
  │  3. POST /api/upload-url  ───────────►  pre-signed S3 PUT URL
  │  4. PUT ciphertext  ─────────────────►  S3 (ciphertext only)
  │  5. build link:  https://app/#<fileId>&key=<rawKey>
  ▼
Share link (key lives in the # fragment — never sent to any server)
```

### Receiving a file
```
Browser
  │  1. read fileId + key from the URL fragment
  │  2. POST /api/download-url ──────────►  pre-signed S3 GET URL
  │  3. fetch ciphertext  ◄──────────────  S3
  │  4. decrypt in-browser with the key
  │  5. DELETE /api/burn/<fileId> ───────►  object destroyed from S3
  ▼
Plaintext file (only ever existed decrypted on the two endpoints)
```

### Secure storage (large files)
```
For each 16 MB slice:
  encrypt(slice, fresh IV) → segment  →  presigned multipart PUT → S3 part
Finalize: S3 stitches the parts into one object (CompleteMultipartUpload)
Download: stream parts back, decrypt each chunk, write to disk
```

### Chat
```
Sender browser:  encrypt(message) ─► WS sendMessage ─► API Gateway ─► Lambda
Lambda:          scan room connections in DynamoDB, fan out CIPHERTEXT only
Recipient(s):    receive ciphertext ─► decrypt in-browser
```

---

## Architecture Overview

Keepr is split into a **static SPA frontend** and a **serverless backend**, with an optional
unified Node server (`server.ts`) used for local development and single-host deployments.

```
┌──────────────────────────────────────────────────────────────────────┐
│                          BROWSER (React SPA)                           │
│   AES-256-GCM via Web Crypto · keys held only in URL fragment          │
└───────┬───────────────┬───────────────┬───────────────┬───────────────┘
        │               │               │               │
   pre-signed       WebSocket       Lambda invoke    VirusTotal
   S3 URLs          (API GW)       (detonator)        relay
        │               │               │               │
┌───────▼───────┐ ┌─────▼───────┐ ┌─────▼────────┐ ┌────▼──────────┐
│  S3 buckets   │ │ API Gateway │ │ Lambda +     │ │ server.ts     │
│  (vault +     │ │ + Lambda +  │ │ headless     │ │ (Express)     │
│  secure rooms)│ │ DynamoDB    │ │ Chromium +   │ │ VT + email +  │
│  lifecycle    │ │ (chat conns)│ │ Gemini AI    │ │ S3 presign    │
└───────────────┘ └─────────────┘ └──────────────┘ └───────────────┘
        │               │               │
        └──── DynamoDB room settings + cron (auto-expire / handoff) ────┘
```

**Two backends, by design:**
- `aws-backend/` — the **AWS Serverless Framework** stack: WebSocket chat
  handlers, the Secure Room REST API (presigned uploads, multipart, room CRUD), and the
  scheduled cleanup/handoff cron.
- `server.ts` — a unified **Express + Socket.IO** server for local dev and simple hosting
  (e.g. Render). Serves the built SPA and handles the Vault presign/burn, VirusTotal scans,
  the Link Detonator Lambda invocation, and transactional email (Nodemailer/Gmail SMTP).

---

## The Cybersecurity Aspect

Keepr is fundamentally a **security engineering** project. The principles applied:

- **End-to-end encryption (E2EE):** AES-256-GCM, an authenticated cipher providing both
  confidentiality and integrity (tampered ciphertext fails to decrypt rather than producing
  garbage).
- **Per-payload IVs:** every file, chunk, and message uses a fresh 12-byte random
  initialization vector, never reused with the same key.
- **Zero-knowledge key handling:** keys are generated client-side and transported only in the
  URL fragment, which the browser excludes from requests — the server has no path to the key.
- **Least-privilege cloud IAM:** Lambda roles are scoped to exactly the S3/DynamoDB resources
  they need; the detonator's role can only read its staging bucket.
- **Ephemeral surface area:** DynamoDB TTLs on chat connections, S3 lifecycle expiry on
  vault objects, and inactivity-based room destruction all shrink the time data is at risk.
- **Sandbox isolation:** untrusted URLs are detonated in a disposable headless-Chromium Lambda
  so malicious pages never execute on a user's device.
- **Defense in depth on uploads:** multipart streaming bounds memory (preventing client-side
  DoS / crashes), and a quota guard rejects oversized uploads before they start.
- **Auth & access control:** Clerk handles authentication, session JWTs, and plan-gated access
  to premium features.

> ⚠️ This is a portfolio / educational project demonstrating security patterns. See the
> [disclaimer](#security-notes--disclaimer) before treating it as production-grade.

---

## The AWS & Cloud Aspect

The infrastructure is **100% serverless** and defined as code with the Serverless Framework
(`serverless.yml`):

- **AWS Lambda** — WebSocket chat handlers, the Secure Room REST API, the scheduled cleanup
  cron, and the headless-Chromium link detonator. Pay-per-use, auto-scaling, no servers to
  manage.
- **Amazon S3** — durable object storage for the vault and the secure rooms. Uses
  **pre-signed URLs** (browser uploads/downloads directly), **server-side encryption (SSE)**,
  blocked public access, **CORS** rules, and **lifecycle policies** for auto-expiry.
- **Amazon DynamoDB** — low-latency NoSQL for live chat connections (with a Global Secondary
  Index per room and a TTL attribute) and for room settings (with owner/expiry indexes and a
  DynamoDB Stream).
- **Amazon API Gateway** — the WebSocket API (`$connect` / `$disconnect` / `sendMessage`
  routes) and the REST API for secure rooms.
- **EventBridge (scheduled rule)** — fires the cleanup Lambda every 5 minutes to enforce room
  expiry and email handoffs.
- **IAM** — fine-grained, least-privilege roles per function.
- **Region:** `ap-south-1` (Mumbai). Multipart upload support added so the secure rooms can
  ingest large files without overrunning browser memory.

---

## The Web-Dev Aspect

- **SPA architecture** with a single `App.tsx` view router and lazy-loaded feature views, so
  the landing page ships a fraction of the JS.
- **Performance:** Vite manual-chunk splitting (React, Clerk, Three.js, motion, socket.io,
  jszip each cached separately), `React.lazy` + `Suspense` for feature routes, and a
  **deferred WebGL background** that mounts after first paint and is skipped on
  reduced-motion / low-power devices.
- **Resilience:** WebGL context-loss recovery, render-error guards, and pausing animation when
  off-screen/backgrounded to prevent mobile crashes.
- **Responsive & accessible-minded:** aspect-corrected shaders, touch-aware interactions
  (cursor effects disabled on touch), and global overflow guards for small screens.
- **Polished UX:** Tailwind v4 styling, `motion` (Framer Motion) transitions, 3D tilt cards,
  and an animated carousel — built to feel premium without feeling AI-generated.

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, Vite 6, TypeScript, Tailwind CSS v4, `motion` (Framer Motion), Three.js, Lucide icons |
| **Auth & Billing** | Clerk (`@clerk/clerk-react`, Clerk themes, checkout) |
| **Crypto** | Web Crypto API (AES-256-GCM, SHA-256, PBKDF2-style key handling) |
| **Realtime** | Socket.IO (local dev) · AWS API Gateway WebSockets (production) |
| **Dev/Unified server** | Node.js, Express, Multer, Nodemailer |
| **Serverless backend** | AWS Lambda, S3, DynamoDB, API Gateway, EventBridge, Serverless Framework v4 |
| **AI / Threat Intel** | Google Gemini 2.5 Flash (visual phishing analysis), VirusTotal API |
| **Tooling** | esbuild (via Serverless v4), `tsx`, Docker |

---

## Project Structure

```
keepr. new/
├── index.html                  # SPA entry; mounts #root, loads /src/main.tsx
├── vite.config.ts              # Vite config: React + Tailwind plugins, manual vendor chunking
├── tsconfig.json               # TypeScript compiler config
├── components.json             # shadcn-style component registry config
├── Dockerfile                  # Container build for the unified server
├── server.ts                   # Express + Socket.IO unified server (dev / single-host):
│                               #   Vault presign + burn, VirusTotal scans, Link Detonator
│                               #   Lambda invoke, Gemini analysis, email (Nodemailer)
├── package.json                # Frontend deps + scripts (dev / build / start / preview)
│
├── lib/
│   └── utils.ts                # Shared utility helpers (e.g. className merging)
│
├── public/
│   └── favicon.ico
│
├── src/
│   ├── main.tsx                # React entry; wraps <App/> in Clerk <ClerkProvider>
│   ├── App.tsx                 # Root: nav, view router, Send/Receive/Scan/Pricing views,
│   │                           #   crypto helpers, lazy-loaded feature views, Suspense
│   ├── index.css               # Tailwind v4 base, fonts (Outfit + Instrument Serif),
│   │                           #   global mobile/overflow guards, scrollbar styling
│   ├── vite-env.d.ts
│   └── components/
│       ├── AuthPage.tsx          # Clerk sign-in / sign-up / email-verification UI
│       ├── SecureStorageRoom.tsx # Encrypted vault rooms: chunked multipart upload,
│       │                         #   streaming decrypt, quota meters, dead-man's switch
│       ├── EphemeralChat.tsx     # E2EE WebSocket chat with auto-retry + burn
│       ├── DetonatorView.tsx     # Link Detonator UI: live logs + AI verdict
│       ├── WhyUs.tsx             # Marketing "Why Us" view + live encryption demo
│       ├── JourneySection.tsx    # 3D coverflow carousel (autoplay, cursor tilt)
│       ├── TiltCard.tsx          # Reusable 3D cursor-tilt frosted-glass card
│       ├── Silk.tsx              # Three.js flowing-silk shader background
│       ├── MouseAurora.tsx       # Cursor-tracking aurora glow (touch-aware)
│       └── AnimatedSVG.tsx       # Minimal animated Lucide icon illustrations
│
└── aws-backend/      # AWS Serverless Framework stack
    ├── serverless.yml                 # IaC: Lambdas, S3, DynamoDB, API GW, IAM, cron
    ├── handler.js                     # WebSocket chat: $connect/$disconnect/sendMessage,
    │                                  #   DynamoDB connection tracking, ciphertext fan-out
    ├── handlers/
    │   ├── secureRoomApi.ts           # REST API: room CRUD, presigned uploads, multipart
    │   │                              #   create/part-url/complete/abort, file listing
    │   └── secureRoomCron.ts          # Scheduled cleanup: expiry purge + email handoff
    ├── package.json
    └── tsconfig.json
```

---

## Getting Started

### Prerequisites
- **Node.js 20+**
- An **AWS account** (for S3, DynamoDB, Lambda) and AWS credentials
- API keys: **Clerk**, **Google Gemini**, **VirusTotal**
- A Gmail account with an **app password** (for transactional email), optional

### 1. Clone & install
```bash
git clone <your-repo-url> keepr
cd keepr

# Frontend dependencies
npm install

# Backend (serverless) dependencies
cd aws-backend
npm install
cd ..
```

### 2. Configure environment
Create a `.env` in the project root (see [Environment Variables](#environment-variables)).

### 3. Run locally
```bash
# Terminal 1 — unified server (API + Socket.IO) on :8080
npm start            # runs: npx tsx server.ts

# Terminal 2 — Vite dev server (frontend)
npm run dev
```

The Vite dev server proxies `/api` and `/socket.io` to the unified server on port 8080.

### 4. Production build
```bash
npm run build        # tsc + vite build  → dist/
npm run preview      # preview the production bundle locally
```

---

## Environment Variables

Create a root `.env`. **Never commit real secrets** — `.env*` is already gitignored.
Use placeholders like the ones below:

```env
# ── Frontend (exposed to the browser via Vite — only use publishable/public values) ──
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxx
VITE_WEBSOCKET_URL=wss://<api-id>.execute-api.<region>.amazonaws.com/dev
VITE_SECURE_ROOM_API_ENDPOINT=https://<api-id>.execute-api.<region>.amazonaws.com/dev
VITE_EMAIL_USER=you@example.com

# ── Server-side only (NEVER prefix these with VITE_ — they must stay off the client) ──
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=ap-south-1
AWS_BUCKET_NAME=keepr-vault-storage-<name>
LAMBDA_FUNCTION_NAME=KeeprLinkDetonator

GEMINI_API_KEY=your_gemini_api_key
VIRUSTOTAL_API_KEY=your_virustotal_api_key

EMAIL_USER=you@example.com
EMAIL_APP_PASSWORD=your_gmail_app_password
```

> **Important:** Anything prefixed `VITE_` is bundled into the client and is publicly
> visible. Only put publishable/non-secret values there. AWS keys, the Gemini key, the
> VirusTotal key, and the email password must remain **server-side only**.

---

## Deployment

### Backend (AWS Serverless)
```bash
cd aws-backend
npx serverless deploy          # provisions Lambda, S3, DynamoDB, API GW, cron, IAM
```
After deploying, copy the generated WebSocket + REST endpoints into your frontend env
(`VITE_WEBSOCKET_URL`, `VITE_SECURE_ROOM_API_ENDPOINT`).

### Link Detonator Lambda
The detonator runs a separate headless-Chromium function (`KeeprLinkDetonator`). Package and
upload its `lambda-detonator.zip` to the configured staging bucket, then ensure
`LAMBDA_FUNCTION_NAME` matches.

### Frontend + unified server
```bash
npm run build                  # produces dist/
# Serve dist/ via server.ts (Express serves the SPA + APIs), or host on
# Vercel / Render / any static host. A Dockerfile is included for containerized hosting.
```

---

## Security Notes & Disclaimer

- **Educational/portfolio project.** It demonstrates real security patterns (E2EE,
  zero-knowledge key handling, serverless least-privilege, sandboxing) but has **not** been
  independently audited. Don't rely on it for life-or-safety-critical secrets.
- **Rotate any leaked credentials.** If real API keys or AWS credentials were ever committed
  or shared, treat them as compromised: rotate the AWS access key, Gemini key, VirusTotal
  key, Clerk key, and Gmail app password, and confirm `.env*` stays gitignored.
- **Key recovery:** because keys live only in the share URL fragment, **losing the link means
  losing the data** — there is no server-side recovery. That's the trade-off of true
  zero-knowledge.
- **WCAG/accessibility:** full accessibility compliance requires manual testing with
  assistive technologies and expert review; this project applies good practices but is not
  formally certified.

---

<div align="center">

**Keepr.** — Built on trust. Protected by math.

</div>
