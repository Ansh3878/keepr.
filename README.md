# Keepr. — Absolute Privacy & Zero-Trust Transmit

![Keepr Banner](https://images.unsplash.com/photo-1633265485768-3066373b177e?auto=format&fit=crop&q=80&w=1200)

Keepr. is a premium, high-security digital vault and communication suite designed for individuals and enterprises who demand absolute privacy. Built on a **Zero-Knowledge Architecture**, Keepr ensures that your data remains yours alone—encrypted on your device and never accessible by our servers.

---

## 🔒 The Zero-Knowledge Core
Unlike traditional cloud services, Keepr operates on the principle of maximum distrust. 
- **Client-Side Encryption:** All files are encrypted using **AES-256-GCM** in your browser before they are uploaded.
- **Key Isolation:** The encryption keys never touch our database or logs. They are stored only in the URL fragment (`#`), which is never sent to the server.
- **Ephemeral Infrastructure:** Chat messages and links are designed to expire, leaving no digital footprint.

---

## 🚀 Key Features

### 1. Zero-Trust Vault (Send/Receive)
Transfer files up to 10GB with enterprise-grade security.
- **Direct S3 Upload:** Uses AWS Pre-signed URLs to upload files directly from your browser to S3, bypassing server bottlenecks and ensuring 100% privacy.
- **Automatic Expiry:** Files are set to auto-delete after 7 days via S3 Lifecycle Policies.
- **Instant Retrieval:** Recipients can decrypt files instantly using the unique cryptographic link.

### 2. Ephemeral Secure Chat
A "Burn-after-reading" messaging experience.
- **E2EE Messaging:** Every message is encrypted with a unique session key.
- **WebSocket Driven:** Real-time communication powered by AWS API Gateway and DynamoDB.
- **No Persistence:** Once a room is closed or cleared, the data is gone forever.

### 3. Link Detonator (Visual Sandbox)
Safely analyze suspicious links without risking your local machine.
- **Isolated Sandbox:** Uses a headless Chromium instance inside an AWS Lambda function to "visit" the site for you.
- **AI Visual Heuristics:** Powered by **Google Gemini 2.5 Flash**, the detonator analyzes screenshots for phishing, brand impersonation, and malicious UI patterns.
- **Real-Time Logs:** Watch the analysis happen live via Socket.io logs.

### 4. Advanced Malware Scan
Deep threat analysis for files and URLs.
- **Multi-Engine Detection:** Integrated with the **VirusTotal API** to scan against 70+ antivirus engines.
- **Risk Scoring:** Get a clear verdict on whether a file is safe to open.

---

## 🛠 Tech Stack

### Frontend
- **React 18** with **Vite** for lightning-fast performance.
- **Framer Motion** for premium, fluid micro-animations.
- **Lucide React** for clean, modern iconography.
- **Web Crypto API** for browser-level encryption.

### Backend & AI
- **Node.js & TypeScript** for a robust, type-safe server.
- **Socket.io** for real-time sandbox logging.
- **Google GenAI** (Gemini) for sophisticated visual threat analysis.

### Infrastructure (AWS Serverless)
- **AWS Lambda:** Scalable, pay-as-you-go compute.
- **AWS S3:** Secure, durable object storage.
- **AWS DynamoDB:** Low-latency NoSQL database for chat sessions.
- **AWS API Gateway:** Secure entry point for WebSockets and REST APIs.
- **Serverless Framework:** Infrastructure as Code (IaC) for reproducible deployments.

---

## 📦 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/your-repo/keepr.git
cd keepr
```

### 2. Configure Environment Variables
Create a `.env` file in the root and backend directories:
```env
# AWS Credentials
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=ap-south-1

# S3 & Lambda
AWS_BUCKET_NAME=keepr-vault-storage-anshul
LAMBDA_FUNCTION_NAME=KeeprLinkDetonator

# AI & Threat Intelligence
GEMINI_API_KEY=your_gemini_key
VIRUSTOTAL_API_KEY=your_vt_key

# Frontend (Vite)
VITE_WEBSOCKET_URL=wss://your-api-gateway-url.com/dev
```

### 3. Install Dependencies
```bash
# Install frontend & backend dependencies
npm install
cd keepr-ephemeral-chat-backend && npm install
```

### 4. Run Locally
```bash
# Start backend server
npx tsx server.ts

# Start frontend (new terminal)
npm run dev
```

---

## ☁️ Deployment

Keepr is designed to live in the AWS cloud.
1. Deploy the backend infrastructure:
   ```bash
   cd keepr-ephemeral-chat-backend
   npx serverless deploy
   ```
2. Manually upload `lambda-detonator.zip` to your S3 staging bucket.
3. Update the `VITE_WEBSOCKET_URL` with the generated endpoint.

---

## 📜 License
This project is licensed under the MIT License - see the LICENSE file for details.

---

<p align="center">
  <b>Built on Trust. Protected by Math.</b><br>
  © 2024 Keepr. All Rights Reserved.
</p>
