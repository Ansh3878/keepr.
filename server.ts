import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { GoogleGenAI } from "@google/genai";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── JSON file-based room persistence ──────────────────────────────────────────
// Simple, zero-dependency persistence. Rooms are stored in rooms-db.json at the
// project root. This survives normal Render restarts and redeploys (Render free
// keeps the disk between restarts; on a full redeploy data is reset, which is
// acceptable for this use case).
const DB_PATH = path.join(__dirname, 'rooms-db.json');

const readRoomsDB = (): Record<string, any> => {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    }
  } catch (e) {
    console.warn('rooms-db.json read error, starting fresh:', e);
  }
  return {};
};

const writeRoomsDB = (db: Record<string, any>) => {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  } catch (e) {
    console.error('rooms-db.json write error:', e);
  }
};

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
  const startupTransporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
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
    } else {
      console.log('✅ Gmail SMTP Ready (IPv4) — emails will be delivered successfully.');
    }
  });

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


  // ==========================================
  // FEATURE 1: ZERO-TRUST VAULT (Cloudflare R2)
  // R2 is S3-compatible — same SDK, just a different endpoint.
  // ==========================================

  const s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT, // e.g. https://<account_id>.r2.cloudflarestorage.com
    credentials: {
      accessKeyId: (process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID)!,
      secretAccessKey: (process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY)!,
    },
  });

  const BUCKET = (process.env.R2_BUCKET_NAME || process.env.AWS_BUCKET_NAME)!;

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
      res.json({ message: "File permanently burned from R2" });
    } catch (error) {
      console.error("Error burning file:", error);
      res.status(500).json({ error: "Failed to burn file" });
    }
  });


  // ==========================================
  // FEATURE: SECURE CLOUD STORAGE ROOMS
  // Replaces AWS API Gateway + DynamoDB.
  // Rooms are stored in rooms-db.json on disk.
  // Files are stored in Cloudflare R2 under rooms/<roomId>/<fileName>
  // ==========================================

  const ROOMS_BUCKET = (process.env.R2_BUCKET_NAME || process.env.AWS_BUCKET_NAME)!;

  // ── Helper: send room-related email notifications ─────────────────────────
  const sendRoomEmail = async (to: string, subject: string, html: string) => {
    const senderEmail = process.env.EMAIL_USER || process.env.SENDER_EMAIL || 'anshulspotify5@gmail.com';
    const emailPassword = process.env.EMAIL_APP_PASSWORD;
    if (!emailPassword || !to) return;
    const t = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 465, secure: true, family: 4,
      auth: { user: senderEmail, pass: emailPassword },
      tls: { rejectUnauthorized: false },
    } as any);
    await t.sendMail({ from: `"Keepr Vault" <${senderEmail}>`, to, subject, html });
  };

  // GET /api/rooms — list rooms for a user (userId from Authorization header claim)
  app.get('/api/rooms', async (req: any, res: any) => {
    try {
      // Accept userId from query (for simplicity) or parse from Bearer token sub claim
      const userId = (req.query.userId as string) || req.headers['x-user-id'] as string || 'default';
      const db = readRoomsDB();
      const userRooms = Object.values(db).filter((r: any) => r.ownerId === userId);
      return res.json({ rooms: userRooms });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // POST /api/rooms — create a new room
  app.post('/api/rooms', async (req: any, res: any) => {
    try {
      const { name, pin, encryptionKey, safetyStrategy, inactivityDays, transferEmail, userEmail } = req.body;
      const userId = (req.query.userId as string) || req.headers['x-user-id'] as string || 'default';

      const roomId = 'room-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      const inactiveDays = inactivityDays !== undefined && inactivityDays !== null && !isNaN(Number(inactivityDays))
        ? Number(inactivityDays)
        : 30;
      const expiryAt = inactiveDays === 0
        ? new Date(Date.now() + 60 * 1000).toISOString()
        : new Date(Date.now() + inactiveDays * 24 * 60 * 60 * 1000).toISOString();

      const room = {
        roomId,
        name,
        pin,
        encryptionKey,
        safetyStrategy: safetyStrategy || 'purge',
        inactivityDays: inactiveDays,
        transferEmail: transferEmail || '',
        userEmail: userEmail || '',
        ownerId: userId,
        createdAt: new Date().toISOString(),
        expiryAt,
      };

      const db = readRoomsDB();
      db[roomId] = room;
      writeRoomsDB(db);

      return res.json({ roomId, expiryAt, message: 'Room created' });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // GET /api/rooms/:roomId — get single room
  app.get('/api/rooms/:roomId', async (req: any, res: any) => {
    try {
      const db = readRoomsDB();
      const room = db[req.params.roomId];
      if (!room) return res.status(404).json({ error: 'Room not found' });
      return res.json(room);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // PUT /api/rooms/:roomId — update room settings / rename
  app.put('/api/rooms/:roomId', async (req: any, res: any) => {
    try {
      const db = readRoomsDB();
      const room = db[req.params.roomId];
      if (!room) return res.status(404).json({ error: 'Room not found' });

      const { name, safetyStrategy, inactivityDays, transferEmail, userEmail } = req.body;
      if (name !== undefined) room.name = name;
      if (safetyStrategy !== undefined) room.safetyStrategy = safetyStrategy;
      if (inactivityDays !== undefined) {
        room.inactivityDays = Number(inactivityDays);
        // Recalculate expiry from now
        const inactiveDays = Number(inactivityDays);
        room.expiryAt = inactiveDays === 0
          ? new Date(Date.now() + 60 * 1000).toISOString()
          : new Date(Date.now() + inactiveDays * 24 * 60 * 60 * 1000).toISOString();
      }
      if (transferEmail !== undefined) room.transferEmail = transferEmail;
      if (userEmail !== undefined) room.userEmail = userEmail;

      db[req.params.roomId] = room;
      writeRoomsDB(db);

      return res.json({ message: 'Room updated', expiryAt: room.expiryAt });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // DELETE /api/rooms/:roomId — delete room + all its R2 objects
  app.delete('/api/rooms/:roomId', async (req: any, res: any) => {
    try {
      const db = readRoomsDB();
      const room = db[req.params.roomId];
      if (!room) return res.status(404).json({ error: 'Room not found' });

      // Delete all objects under rooms/<roomId>/ prefix in R2
      try {
        const listCmd = new ListObjectsV2Command({ Bucket: ROOMS_BUCKET, Prefix: `rooms/${req.params.roomId}/` });
        const listed = await s3Client.send(listCmd);
        for (const obj of (listed.Contents || [])) {
          if (obj.Key) {
            await s3Client.send(new DeleteObjectCommand({ Bucket: ROOMS_BUCKET, Key: obj.Key }));
          }
        }
      } catch (s3Err) {
        console.warn('Could not delete R2 objects for room:', s3Err);
      }

      delete db[req.params.roomId];
      writeRoomsDB(db);

      return res.json({ message: 'Room and all files deleted' });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // GET /api/rooms/:roomId/files — list files in a room from R2
  app.get('/api/rooms/:roomId/files', async (req: any, res: any) => {
    try {
      const listCmd = new ListObjectsV2Command({
        Bucket: ROOMS_BUCKET,
        Prefix: `rooms/${req.params.roomId}/`,
      });
      const listed = await s3Client.send(listCmd);
      const files = (listed.Contents || []).map((obj: any) => ({
        key: obj.Key,
        fileName: (obj.Key as string).replace(`rooms/${req.params.roomId}/`, ''),
        size: obj.Size,
        lastModified: obj.LastModified,
      }));
      return res.json({ files });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // DELETE /api/rooms/:roomId/files — delete a specific file from R2
  app.delete('/api/rooms/:roomId/files', async (req: any, res: any) => {
    try {
      const { fileName } = req.body;
      if (!fileName) return res.status(400).json({ error: 'fileName is required' });
      const key = `rooms/${req.params.roomId}/${fileName}`;
      await s3Client.send(new DeleteObjectCommand({ Bucket: ROOMS_BUCKET, Key: key }));
      return res.json({ message: 'File deleted' });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // POST /api/rooms/:roomId/upload-url — presigned PUT URL for a room file
  app.post('/api/rooms/:roomId/upload-url', async (req: any, res: any) => {
    try {
      const { fileName, contentType } = req.body;
      const key = `rooms/${req.params.roomId}/${fileName}`;
      const cmd = new PutObjectCommand({ Bucket: ROOMS_BUCKET, Key: key, ContentType: contentType || 'application/octet-stream' });
      const uploadUrl = await getSignedUrl(s3Client, cmd, { expiresIn: 600 });
      return res.json({ uploadUrl });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // POST /api/rooms/:roomId/download-url — presigned GET URL for a room file
  app.post('/api/rooms/:roomId/download-url', async (req: any, res: any) => {
    try {
      const { fileName } = req.body;
      const key = `rooms/${req.params.roomId}/${fileName}`;
      const cmd = new GetObjectCommand({ Bucket: ROOMS_BUCKET, Key: key });
      const downloadUrl = await getSignedUrl(s3Client, cmd, { expiresIn: 600 });
      return res.json({ downloadUrl });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // POST /api/rooms/:roomId/multipart/create — start multipart upload
  app.post('/api/rooms/:roomId/multipart/create', async (req: any, res: any) => {
    try {
      const { fileName, contentType } = req.body;
      const s3Key = `rooms/${req.params.roomId}/${fileName}`;
      const cmd = new CreateMultipartUploadCommand({
        Bucket: ROOMS_BUCKET,
        Key: s3Key,
        ContentType: contentType || 'application/octet-stream',
      });
      const result = await s3Client.send(cmd);
      return res.json({ uploadId: result.UploadId, s3Key });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // POST /api/rooms/:roomId/multipart/part-url — presign one part
  app.post('/api/rooms/:roomId/multipart/part-url', async (req: any, res: any) => {
    try {
      const { s3Key, uploadId, partNumber } = req.body;
      const cmd = new UploadPartCommand({ Bucket: ROOMS_BUCKET, Key: s3Key, UploadId: uploadId, PartNumber: partNumber });
      const url = await getSignedUrl(s3Client, cmd, { expiresIn: 3600 });
      return res.json({ url });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // POST /api/rooms/:roomId/multipart/complete — complete multipart upload
  app.post('/api/rooms/:roomId/multipart/complete', async (req: any, res: any) => {
    try {
      const { s3Key, uploadId, parts } = req.body;
      const cmd = new CompleteMultipartUploadCommand({
        Bucket: ROOMS_BUCKET,
        Key: s3Key,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts },
      });
      await s3Client.send(cmd);
      return res.json({ message: 'Multipart upload complete' });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // POST /api/rooms/:roomId/multipart/abort — abort multipart upload
  app.post('/api/rooms/:roomId/multipart/abort', async (req: any, res: any) => {
    try {
      const { s3Key, uploadId } = req.body;
      const cmd = new AbortMultipartUploadCommand({ Bucket: ROOMS_BUCKET, Key: s3Key, UploadId: uploadId });
      await s3Client.send(cmd);
      return res.json({ message: 'Multipart upload aborted' });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // POST /api/rooms/:roomId/trigger-cleanup — manual purge trigger (replaces Lambda cron)
  app.post('/api/rooms/:roomId/trigger-cleanup', async (req: any, res: any) => {
    try {
      const db = readRoomsDB();
      const room = db[req.params.roomId];
      if (!room) return res.status(404).json({ error: 'Room not found' });

      // Delete all R2 objects for this room
      try {
        const listCmd = new ListObjectsV2Command({ Bucket: ROOMS_BUCKET, Prefix: `rooms/${req.params.roomId}/` });
        const listed = await s3Client.send(listCmd);
        for (const obj of (listed.Contents || [])) {
          if (obj.Key) {
            await s3Client.send(new DeleteObjectCommand({ Bucket: ROOMS_BUCKET, Key: obj.Key }));
          }
        }
      } catch (s3Err) {
        console.warn('Could not delete R2 objects during trigger-cleanup:', s3Err);
      }

      // Send notification email
      try {
        const emailTo = room.userEmail || room.transferEmail;
        if (emailTo) {
          await sendRoomEmail(
            emailTo,
            `Keepr: Room "${room.name}" has been purged`,
            `<p>Your Keepr room <strong>${room.name}</strong> has been purged as requested. All files have been permanently deleted from Cloudflare R2.</p>`
          );
        }
      } catch (mailErr) {
        console.warn('Email send failed during trigger-cleanup:', mailErr);
      }

      delete db[req.params.roomId];
      writeRoomsDB(db);

      return res.json({ message: 'Room purged and notification sent.' });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });


  // ==========================================
  // FEATURE 2: VIRUSTOTAL SCANNER
  // ==========================================

  async function pollAnalysis(id: string, apiKey: string) {
    const maxRetries = 20;
    for (let i = 0; i < maxRetries; i++) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      const res = await fetch(`https://www.virustotal.com/api/v3/analyses/${id}`, {
        headers: { 'x-apikey': apiKey }
      });
      if (!res.ok) throw new Error(`VT poll error: ${res.statusText}`);
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
      if (!apiKey) return res.status(500).json({ error: "VIRUSTOTAL_API_KEY not configured." });

      if (!req.file) return res.status(400).json({ error: "No file uploaded." });

      const fileBlob = new Blob([new Uint8Array(req.file.buffer)], { type: req.file.mimetype || 'application/octet-stream' });
      const formData = new FormData();
      formData.append('file', fileBlob, req.file.originalname || 'upload.bin');

      const uploadRes = await fetch('https://www.virustotal.com/api/v3/files', {
        method: 'POST',
        headers: { 'x-apikey': apiKey },
        body: formData as any
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadData.error?.message || `Failed to upload file to VirusTotal (HTTP ${uploadRes.status})`);
      }

      const finalResult = await pollAnalysis(uploadData.data.id, apiKey);
      res.json(finalResult);
    } catch (err: any) {
      console.error('Scan File Error:', err);
      res.status(500).json({ error: err.message || 'Unknown error during scan' });
    }
  });

  app.post('/api/scan-url', async (req, res) => {
    try {
      const apiKey = process.env.VIRUSTOTAL_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "VIRUSTOTAL_API_KEY not configured." });

      const { url } = req.body;
      if (!url) return res.status(400).json({ error: "No URL provided." });

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
      if (!uploadRes.ok) {
        throw new Error(uploadData.error?.message || `Failed to submit URL to VirusTotal (HTTP ${uploadRes.status})`);
      }

      const finalResult = await pollAnalysis(uploadData.data.id, apiKey);
      res.json(finalResult);
    } catch (err: any) {
      console.error('Scan URL Error:', err);
      res.status(500).json({ error: err.message || 'Unknown error during scan' });
    }
  });


  // ==========================================
  // FEATURE 3: LINK DETONATOR (Inline Puppeteer on Render)
  // Replaced AWS Lambda with local headless Chromium via @sparticuz/chromium
  // ==========================================

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
      let browser: any = null;
      try {
        socket.emit('log', 'Initializing secure Sandbox...');

        // Dynamically import Puppeteer packages
        const puppeteer = (await import('puppeteer-core')).default;

        // Auto-detect browser executable path across Windows, macOS, and Linux (Render)
        const fs = await import('fs');
        const path = await import('path');
        let execPath = '';
        let browserArgs: string[] = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'];

        if (process.platform === 'win32') {
          const localAppData = process.env.LOCALAPPDATA || '';
          const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
          const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

          const winCandidates = [
            path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
            path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
            path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
            path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
            path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
            path.join(programFiles, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
            'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
          ];

          for (const cand of winCandidates) {
            if (cand && fs.existsSync(cand)) {
              execPath = cand;
              break;
            }
          }
        } else if (process.platform === 'darwin') {
          const macCandidates = [
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
            '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
            '/Applications/Chromium.app/Contents/MacOS/Chromium',
          ];
          for (const cand of macCandidates) {
            if (fs.existsSync(cand)) {
              execPath = cand;
              break;
            }
          }
        } else {
          // Linux (Render, Docker, AWS Lambda) -> Use @sparticuz/chromium
          try {
            const chromium = (await import('@sparticuz/chromium')).default;
            execPath = await chromium.executablePath();
            browserArgs = chromium.args;
          } catch (spartErr) {
            console.warn('Could not load @sparticuz/chromium:', spartErr);
          }

          if (!execPath || !fs.existsSync(execPath)) {
            const linuxCandidates = ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
            for (const cand of linuxCandidates) {
              if (fs.existsSync(cand)) {
                execPath = cand;
                break;
              }
            }
          }
        }

        if (!execPath) {
          throw new Error('No compatible Chrome, Edge, or Chromium browser binary found.');
        }

        socket.emit('log', `Spinning up sandbox browser for ${url}...`);

        browser = await puppeteer.launch({
          args: browserArgs,
          defaultViewport: { width: 1280, height: 800 },
          executablePath: execPath,
          headless: true,
        });

        const page = await browser.newPage();
        await page.setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        socket.emit('log', 'Browser node launched. Navigating to target...');

        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        } catch (navErr: any) {
          // Even on navigation errors (e.g. cert issues), try to screenshot what loaded
          console.warn('Navigation warning (screenshot still attempted):', navErr.message);
        }

        // Brief pause for dynamic content
        await new Promise(r => setTimeout(r, 1500));

        const screenshotBuffer = await page.screenshot({ type: 'png', fullPage: false });
        await browser.close();
        browser = null;

        let screenshotBase64 = (screenshotBuffer as Buffer).toString('base64');
        screenshotBase64 = Buffer.from(screenshotBase64, 'base64').toString('base64');

        socket.emit('log', 'Visual heuristics captured successfully.');
        socket.emit('screenshot', screenshotBase64);

        socket.emit('log', 'Analyzing visuals for phishing & impersonation tokens...');

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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

        let result: any = null;
        try {
          result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
              parts: [
                { inlineData: { data: screenshotBase64, mimeType: 'image/png' } },
                { text: prompt }
              ]
            },
            config: {
              responseMimeType: 'application/json'
            }
          });
        } catch (primaryErr: any) {
          console.warn('[Detonator] Primary model (gemini-2.5-flash) failed:', primaryErr?.message || primaryErr);
          try {
            result = await ai.models.generateContent({
              model: 'gemini-3.6-flash',
              contents: {
                parts: [
                  { inlineData: { data: screenshotBase64, mimeType: 'image/png' } },
                  { text: prompt }
                ]
              },
              config: {
                responseMimeType: 'application/json'
              }
            });
          } catch (fallbackErr: any) {
            console.warn('[Detonator] Fallback model (gemini-3.6-flash) also failed:', fallbackErr?.message || fallbackErr);
            // Both models failed — continue with a safe default analysis
          }
        }

        let analysis = { riskScore: 0, verdict: 'Analysis Unavailable', reason: 'AI vision analysis could not be completed for this URL. Manual review recommended.' };
        const rawText = ((result?.text) || '').replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
        if (rawText) {
          try {
            const parsed = JSON.parse(rawText);
            if (parsed && typeof parsed.riskScore !== 'undefined') {
              analysis = parsed;
            }
          } catch (jsonErr) {
            console.warn('[Detonator] Could not parse Gemini JSON response, raw text was:', rawText);
          }
        } else {
          console.warn('[Detonator] Gemini returned empty/blocked response — using fallback analysis defaults.');
        }

        socket.emit('log', 'Threat analysis synthesis complete.');
        socket.emit('analysis', analysis);

      } catch (error: any) {
        if (browser) {
          try { await browser.close(); } catch { /* ignore */ }
        }
        console.error('Detonation Error:', error);
        let errorMsg = error.message || 'Detonation sequence failed due to atmospheric interference.';
        if (typeof errorMsg === 'string' && errorMsg.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(errorMsg);
            if (parsed.error && parsed.error.message) {
              errorMsg = parsed.error.message;
            }
          } catch (e) { }
        }
        socket.emit('error', errorMsg);
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected from core');
    });
  });


  // ==========================================
  // INACTIVITY WATCHDOG (Dead-Man Switch Cron)
  // Runs every 5 minutes to auto-purge / hand off expired rooms
  // ==========================================

  const runInactivityWatchdog = async () => {
    try {
      const db = readRoomsDB();
      const now = new Date();
      let changed = false;

      for (const [roomId, room] of Object.entries(db)) {
        if (room && room.expiryAt && new Date(room.expiryAt) <= now) {
          console.log(`[Watchdog] Room ${roomId} ("${room.name}") expired at ${room.expiryAt}. Executing ${room.safetyStrategy}...`);

          // 1. Delete all R2 objects for this room
          try {
            const listCmd = new ListObjectsV2Command({ Bucket: ROOMS_BUCKET, Prefix: `rooms/${roomId}/` });
            const listed = await s3Client.send(listCmd);
            for (const obj of (listed.Contents || [])) {
              if (obj.Key) {
                await s3Client.send(new DeleteObjectCommand({ Bucket: ROOMS_BUCKET, Key: obj.Key }));
              }
            }
          } catch (r2Err) {
            console.warn(`[Watchdog] Failed to clean R2 files for room ${roomId}:`, r2Err);
          }

          // 2. Send notification or handoff email
          try {
            if (room.safetyStrategy === 'migration' && room.transferEmail) {
              await sendRoomEmail(
                room.transferEmail,
                `Keepr Vault Handoff: "${room.name}" timeout triggered`,
                `<p>The inactivity safeguard timer for room <strong>${room.name}</strong> has expired.</p>
                 <p>All stored assets have been archived and purged from active storage per vault safety policy.</p>`
              );
            } else if (room.userEmail) {
              await sendRoomEmail(
                room.userEmail,
                `Keepr Vault Auto-Purged: "${room.name}"`,
                `<p>Your room <strong>${room.name}</strong> was automatically purged due to inactivity timeout.</p>
                 <p>All files have been permanently destroyed from Cloudflare R2.</p>`
              );
            }
          } catch (mailErr) {
            console.warn(`[Watchdog] Failed to send email for room ${roomId}:`, mailErr);
          }

          delete db[roomId];
          changed = true;
        }
      }

      if (changed) {
        writeRoomsDB(db);
        console.log('[Watchdog] Database updated after purging expired rooms.');
      }
    } catch (watchErr) {
      console.error('[Watchdog] Error during sweep:', watchErr);
    }
  };

  // Run watchdog after 10s startup delay, then every 5 minutes
  setTimeout(runInactivityWatchdog, 10000);
  setInterval(runInactivityWatchdog, 5 * 60 * 1000);


  // ==========================================
  // STATIC FRONTEND SERVING
  // ==========================================

  const distPath = path.join(__dirname, 'dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
  }

  app.get('*', (req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(200).send('Keepr unified backend is running. For local UI, run "npm run dev" on port 5173, or run "npm run build" to produce dist/ for production.');
    }
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Unified Keepr Backend running on port ${PORT}`);
  });
}

startServer();