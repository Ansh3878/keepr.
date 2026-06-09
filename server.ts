import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import AWS from 'aws-sdk';
import { GoogleGenAI } from "@google/genai";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  const PORT = Number(process.env.PORT || process.env.SERVER_PORT || 8080);

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', domain: req.hostname });
  });

  // ── SMTP startup verification ──────────────────────────────────────
  // This runs once on server start. Watch Render logs for the result.
  const startupTransporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    // family:4 forces IPv4 DNS resolution — Render blocks outbound IPv6 (ENETUNREACH)
    // Without this, smtp.gmail.com resolves to an IPv6 addr (2607:f8b0:...) and fails
    family: 4,
    auth: {
      user: process.env.EMAIL_USER || process.env.SENDER_EMAIL || 'anshulspotify5@gmail.com',
      pass: process.env.EMAIL_APP_PASSWORD,
    },
    tls: { rejectUnauthorized: false },
  } as any);
  startupTransporter.verify((error) => {
    if (error) {
      console.error('❌ Gmail SMTP FAILED to connect at startup:', error.message);
      console.error('   → Make sure EMAIL_USER and EMAIL_APP_PASSWORD env vars are set in Render Dashboard!');
    } else {
      console.log('✅ Gmail SMTP Ready (IPv4) — emails will be delivered successfully.');
    }
  });
  // ── Quick SMTP test endpoint — hit GET /api/test-email in browser to verify ──
  app.get('/api/test-email', async (req: any, res: any) => {
    const senderEmail = process.env.EMAIL_USER || process.env.SENDER_EMAIL || 'anshulspotify5@gmail.com';
    const emailPassword = process.env.EMAIL_APP_PASSWORD;
    console.log('[TEST-EMAIL] EMAIL_USER:', senderEmail);
    console.log('[TEST-EMAIL] EMAIL_APP_PASSWORD set?', !!emailPassword);
    if (!emailPassword) {
      return res.json({ ok: false, error: 'EMAIL_APP_PASSWORD not set on server' });
    }
    try {
      const t = nodemailer.createTransport({
        host: 'smtp.gmail.com', port: 465, secure: true, family: 4,
        auth: { user: senderEmail, pass: emailPassword },
        tls: { rejectUnauthorized: false },
      } as any);
      await t.verify();
      await t.sendMail({
        from: `"Keepr Test" <${senderEmail}>`,
        to: senderEmail,
        subject: 'Keepr SMTP Test — Render',
        text: 'If you got this, SMTP works on Render.',
      });
      console.log('[TEST-EMAIL] ✅ Test email sent successfully to', senderEmail);
      return res.json({ ok: true, message: `Test email sent to ${senderEmail}` });
    } catch (err: any) {
      console.error('[TEST-EMAIL] ❌ FAILED:', err.message);
      return res.json({ ok: false, error: err.message });
    }
  });





  // FEATURE 1: ZERO-TRUST VAULT (AWS S3)


  const s3Client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  const BUCKET = process.env.AWS_BUCKET_NAME!;

  app.post('/api/upload-url', async (req, res) => {
    try {
      const { fileId } = req.body;
      const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: fileId,
        ContentType: 'application/octet-stream',
      });
      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
      res.json({ uploadUrl });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
      const { fileId } = req.body;
      if (!fileId || !req.file) {
        return res.status(400).json({ error: 'Missing fileId or file payload' });
      }

      const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: fileId,
        Body: req.file.buffer,
        ContentType: 'application/octet-stream',
      });

      await s3Client.send(command);
      return res.json({ message: 'Uploaded successfully' });
    } catch (error) {
      console.error("Error uploading encrypted file:", error);
      return res.status(500).json({ error: 'Failed to upload encrypted file' });
    }
  });

  app.post('/api/download-url', async (req, res) => {
    try {
      const { fileId } = req.body;
      const command = new GetObjectCommand({ Bucket: BUCKET, Key: fileId });
      const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
      res.json({ downloadUrl });
    } catch (error) {
      console.error("Error generating download URL:", error);
      res.status(500).json({ error: "Failed to generate download URL" });
    }
  });

  app.delete('/api/burn/:fileId', async (req, res) => {
    try {
      const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: req.params.fileId });
      await s3Client.send(command);
      res.json({ message: "File permanently burned from AWS" });
    } catch (error) {
      console.error("Error burning file:", error);
      res.status(500).json({ error: "Failed to burn file" });
    }
  });

  // ==========================================
  // FEATURE 2: VIRUSTOTAL SCANNER
  // ==========================================

  const pollAnalysis = async (analysisId: string, apiKey: string) => {
    for (let i = 0; i < 20; i++) {
      const res = await fetch(`https://www.virustotal.com/api/v3/analyses/${analysisId}`, {
        headers: { 'x-apikey': apiKey }
      });
      if (!res.ok) throw new Error('Failed to get analysis');
      const data = await res.json();
      if (data.data.attributes.status === 'completed') {
        return data;
      }
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    const res = await fetch(`https://www.virustotal.com/api/v3/analyses/${analysisId}`, {
      headers: { 'x-apikey': apiKey }
    });
    return await res.json();
  };

  app.post('/api/scan', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file provided' });
      const vtApiKey = process.env.VIRUSTOTAL_API_KEY;
      if (!vtApiKey) return res.status(500).json({ error: 'VirusTotal API key missing' });

      const blob = new Blob([new Uint8Array(req.file.buffer)], { type: req.file.mimetype || 'application/octet-stream' });
      const formData = new FormData();
      formData.append('file', blob, req.file.originalname || 'upload.bin');

      const scanRes = await fetch('https://www.virustotal.com/api/v3/files', {
        method: 'POST',
        headers: { 'x-apikey': vtApiKey },
        body: formData as any
      });

      if (!scanRes.ok) {
        const text = await scanRes.text();
        throw new Error(`VT API error: ${text}`);
      }

      const data = await scanRes.json();
      const analysisId = data.data.id;

      const result = await pollAnalysis(analysisId, vtApiKey);
      res.json(result);
    } catch (error: any) {
      console.error('File scan error:', error);
      res.status(500).json({ error: 'Failed to scan file: ' + (error.message || 'Unknown error') });
    }
  });

  app.post('/api/scan-url', async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: 'No URL provided' });

      const vtApiKey = process.env.VIRUSTOTAL_API_KEY;
      if (!vtApiKey) return res.status(500).json({ error: 'VirusTotal API key missing' });

      const formData = new URLSearchParams();
      formData.append('url', url);

      const scanRes = await fetch('https://www.virustotal.com/api/v3/urls', {
        method: 'POST',
        headers: {
          'x-apikey': vtApiKey,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      });

      if (!scanRes.ok) {
        const text = await scanRes.text();
        throw new Error(`VT API error: ${text}`);
      }

      const data = await scanRes.json();
      const analysisId = data.data.id;
      const result = await pollAnalysis(analysisId, vtApiKey);
      res.json(result);

    } catch (error: any) {
      console.error('URL scan error:', error);
      res.status(500).json({ error: 'Failed to scan URL: ' + (error.message || 'Unknown error') });
    }
  });


  // FEATURE 3: LINK DETONATOR

  const activeRooms = new Set<string>();
  const destroyedRooms = new Set<string>();

  io.on('connection', (socket) => {
    console.log('Client connected');

    // EPHEMERAL CHAT LOGIC
    const room = socket.handshake.query.room as string;
    if (room) {
      if (destroyedRooms.has(room)) {
        socket.emit('error', 'This room has been destroyed and cannot be re-opened.');
        socket.disconnect(true);
        return;
      }

      activeRooms.add(room);
      socket.join(room);
      socket.to(room).emit('peer-joined');
      
      socket.on('sendMessage', (payload) => {
        if (destroyedRooms.has(payload.roomId)) return;
        socket.to(payload.roomId).emit('chat-message', payload.data);
      });
      socket.on('wipe-session', () => {
        destroyedRooms.add(room);
        activeRooms.delete(room);
        socket.to(room).emit('peer-wiped');

        // Forcefully disconnect all sockets currently in this room
        const roomSockets = io.sockets.adapter.rooms.get(room);
        if (roomSockets) {
          for (const socketId of roomSockets) {
            const clientSocket = io.sockets.sockets.get(socketId);
            if (clientSocket) {
              clientSocket.emit('error', 'This room was wiped and destroyed.');
              clientSocket.disconnect(true);
            }
          }
        }
      });
      socket.on('disconnect', () => {
        socket.to(room).emit('peer-disconnected');
      });
    }

    socket.on('detonate-link', async ({ url }) => {
      try {
        socket.emit('log', 'Initializing secure AWS Sandbox...');

        const lambda = new AWS.Lambda({
          region: process.env.AWS_REGION || 'ap-south-1',
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        });

        socket.emit('log', `Spinning up Chromium node for ${url}...`);

        const lambdaParams = {
          FunctionName: process.env.LAMBDA_FUNCTION_NAME || 'KeeprLinkDetonator',
          Payload: JSON.stringify({ targetUrl: url })
        };

        const lambdaResult = await lambda.invoke(lambdaParams).promise();
        const payload = JSON.parse(lambdaResult.Payload as string);

        if (payload.errorMessage || payload.error) {
          const errorText = payload.errorMessage || payload.error;
          if (errorText.includes('Task timed out')) {
            throw new Error(`AWS Sandbox Timeout: The website took too long to load (over 60 seconds). This usually happens on heavy sites with continuous trackers. To fix this, increase your AWS Lambda timeout to 120 seconds or change your Puppeteer script to use 'domcontentloaded' instead of 'networkidle2'.`);
          }
          throw new Error(errorText);
        }

        if (payload.statusCode && payload.statusCode !== 200) {
          let errorMsg = 'Unknown Sandbox Error';
          try {
            const parsedError = JSON.parse(payload.body);
            errorMsg = parsedError.error || errorMsg;
          } catch (e) {
            errorMsg = payload.body;
          }
          throw new Error(`AWS Sandbox Error: ${errorMsg}`);
        }

        let screenshotBase64 = payload.body;
        if (typeof screenshotBase64 === 'string' && screenshotBase64.startsWith('{')) {
          try {
            const parsedBody = JSON.parse(screenshotBase64);
            if (parsedBody.screenshot) {
              screenshotBase64 = parsedBody.screenshot;
            } else if (parsedBody.data) {
              screenshotBase64 = parsedBody.data;
            }
          } catch (e) { }
        }

        let mimeType = 'image/png';
        if (typeof screenshotBase64 === 'string') {
          if (screenshotBase64.startsWith('UklG')) mimeType = 'image/webp';
          else if (screenshotBase64.startsWith('/9j/')) mimeType = 'image/jpeg';
          else if (screenshotBase64.startsWith('iVBORw')) mimeType = 'image/png';

          screenshotBase64 = screenshotBase64.replace(/^data:image\/\w+;base64,/, '');

          // Completely sanitize the base64 string using Node's Buffer
          screenshotBase64 = Buffer.from(screenshotBase64, 'base64').toString('base64');
        }

        socket.emit('log', 'Visual heuristics captured successfully.');
        socket.emit('screenshot', screenshotBase64);

        socket.emit('log', 'Analyzing visuals for phishing & impersonation tokens...');

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const model = 'gemini-2.5-flash';

        const prompt = `You are a cybersecurity expert. Analyze this website screenshot and its URL: "${url}". 
        Check for:
        1. Phishing or Credential Harvesting.
        2. Brand Impersonation (Does the visuals match the domain?).
        3. Suspicious UI elements (fake login forms, urgent warnings).
        
        Return a JSON object with: 
        "riskScore" (0-100), 
        "verdict" (string), 
        "reason" (string). 
        BE EXTREMELY STRICT.`;

        const result = await ai.models.generateContent({
          model,
          contents: {
            parts: [
              { inlineData: { data: screenshotBase64, mimeType } },
              { text: prompt }
            ]
          },
          config: {
            responseMimeType: 'application/json'
          }
        });

        const analysis = JSON.parse(result.text || '{}');
        socket.emit('log', 'Threat analysis synthesis complete.');
        socket.emit('analysis', analysis);

      } catch (error: any) {
        console.error('Detonation Error:', error);
        socket.emit('error', error.message || 'Detonation sequence failed due to atmospheric interference.');
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected from core');
    });
  });


  // FEATURE 3: VIRUSTOTAL SCANNER


  async function pollVtAnalysis(id: string, apiKey: string) {
    const maxRetries = 20; // 1 min max (3s interval)
    for (let i = 0; i < maxRetries; i++) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      const res = await fetch(`https://www.virustotal.com/api/v3/analyses/${id}`, {
        headers: { 'x-apikey': apiKey }
      });
      const data = await res.json();
      if (data.data?.attributes?.status === 'completed') {
        return data;
      }
    }
    throw new Error("VirusTotal analysis timed out. The file might still be processing on their end.");
  }

  app.post('/api/scan', upload.single('file'), async (req, res) => {
    try {
      const apiKey = process.env.VIRUSTOTAL_API_KEY;
      if (!apiKey) throw new Error("VIRUSTOTAL_API_KEY not configured.");

      if (!req.file) throw new Error("No file uploaded.");

      const fileBlob = new Blob([new Uint8Array(req.file.buffer)], { type: req.file.mimetype });
      const formData = new FormData();
      formData.append('file', fileBlob, req.file.originalname);

      const uploadRes = await fetch('https://www.virustotal.com/api/v3/files', {
        method: 'POST',
        headers: { 'x-apikey': apiKey },
        body: formData
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error?.message || "Failed to upload file to VirusTotal");

      const finalResult = await pollVtAnalysis(uploadData.data.id, apiKey);
      res.json(finalResult);
    } catch (err: any) {
      console.error('Scan File Error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/scan-url', async (req, res) => {
    try {
      const apiKey = process.env.VIRUSTOTAL_API_KEY;
      if (!apiKey) throw new Error("VIRUSTOTAL_API_KEY not configured.");

      const { url } = req.body;
      if (!url) throw new Error("No URL provided.");

      const formData = new URLSearchParams();
      formData.append('url', url);

      const uploadRes = await fetch('https://www.virustotal.com/api/v3/urls', {
        method: 'POST',
        headers: {
          'x-apikey': apiKey,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error?.message || "Failed to submit URL to VirusTotal");

      const finalResult = await pollVtAnalysis(uploadData.data.id, apiKey);
      res.json(finalResult);
    } catch (err: any) {
      console.error('Scan URL Error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // STATIC FRONTEND SERVING
  // ==========================================

  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Unified Keepr Backend running on port ${PORT}`);
  });
}

startServer();