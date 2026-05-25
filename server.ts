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

  // SMTP Email Dispatch Route via Nodemailer
  app.post('/api/send-email', async (req: any, res: any) => {
    try {
      const { type, userEmail, roomDetails } = req.body;

      if (!userEmail || !roomDetails) {
        return res.status(400).json({ error: 'Missing required parameters: userEmail or roomDetails' });
      }

      const {
        roomId,
        name,
        safetyStrategy,
        inactivityDays,
        transferEmail,
        rawVaultKey,
      } = roomDetails;

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_APP_PASSWORD,
        },
      });

      const isMigration = safetyStrategy === 'migration';

      if (type === 'create') {
        if (isMigration && transferEmail && rawVaultKey) {
          const receiverMailOptions = {
            from: `"Keepr Security" <${process.env.EMAIL_USER}>`,
            to: transferEmail,
            subject: '🔐 Action Required: Keeper Secure Vault Key Handoff',
            text: `You have been designated as a trusted backup receiver for a Secure Vault created by ${userEmail}.

CRITICAL SECURITY INFORMATION:
Your Vault Key is: ${rawVaultKey}

Please store this key somewhere safe immediately (like a password manager). 

When the vault creator goes inactive, you will receive a second email containing a handoff link to securely download the vault contents. You will need this key to unlock it.

Stay safe,
Keepr Security Team`,
            html: `
              <!DOCTYPE html>
              <html>
              <head><meta charset="UTF-8"></head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#040405; color:#e4e4e7; padding:32px; margin:0;">
                <div style="max-width:600px; margin:0 auto; background:#0b0b0f; border:1px solid #1f1f2e; border-radius:24px; overflow:hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.8);">
                  <div style="background:linear-gradient(135deg, #0891b2, #0284c7); padding:32px; text-align: center;">
                    <span style="font-size: 36px;">🔑</span>
                    <h1 style="margin:12px 0 0; color:#ffffff; font-size:22px; font-weight:800; text-transform:uppercase; letter-spacing:0.05em;">Backup Key Assigned</h1>
                  </div>
                  <div style="padding:40px 32px;">
                    <p style="color:#ffffff; font-size:16px; font-weight: 600; margin-top:0; line-height: 1.6;">You have been designated as a trusted backup receiver for a Secure Vault created by <strong>${userEmail}</strong>.</p>
                    <p style="color:#a1a1aa; font-size:14px; line-height:1.6; margin-bottom: 24px;">To guarantee security under our zero-knowledge architecture, the vault encryption key has been handed off to you now. Please secure it immediately.</p>
                    
                    <div style="background:#12121a; border:1px solid #27273a; border-radius:16px; padding:24px; margin-bottom:24px; text-align:center;">
                      <p style="margin:0 0 12px; color:#06b6d4; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:0.05em;">Your Vault Decryption Key</p>
                      <div style="font-family:monospace; font-size:18px; color:#10b981; font-weight:bold; letter-spacing:1px; background:#09090f; padding:12px; border-radius:8px; border:1px dashed #10b981; display:inline-block; word-break:break-all;">
                        ${rawVaultKey}
                      </div>
                      <p style="margin:12px 0 0; color:#71717a; font-size:12px;">Store this key somewhere secure (like a password manager).</p>
                    </div>
                    
                    <div style="background:#1c1917; border:1px solid #44403c; border-radius:16px; padding:20px; margin-bottom:24px;">
                      <p style="margin:0; color:#d6d3d1; font-size:13px; line-height:1.6;">
                        <strong>How does this work?</strong><br/>
                        When the vault owner goes inactive, you will receive a second email containing a secure handoff link to download the vault contents. You will need this key to unlock and decrypt the files.
                      </p>
                    </div>
                    
                    <p style="color:#52525b; font-size:11px; margin-top:32px; border-top:1px solid #1f1f2e; padding-top:20px; text-align: center; line-height: 1.5;">
                      This is an automated zero-knowledge security notification from Keepr. For security, we do not store this key and cannot retrieve it if lost.
                    </p>
                  </div>
                </div>
              </body>
              </html>
            `,
          };
          await transporter.sendMail(receiverMailOptions);
        }

        const ownerMailOptions = {
          from: `"Keepr Security" <${process.env.EMAIL_USER}>`,
          to: userEmail,
          subject: `🔐 Secure Vault "${name}" Created Successfully`,
          text: `Hello,

Your secure vault "${name}" has been successfully created.

Vault Settings:
- Vault ID: ${roomId}
- Safety Strategy: ${safetyStrategy}
- Inactivity Period: ${inactivityDays} days
${isMigration ? `- Designated Receiver: ${transferEmail}` : ''}

Your vault is secure and fully end-to-end encrypted.

Stay safe,
Keepr Security Team`,
          html: `
            <!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"></head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#040405; color:#e4e4e7; padding:32px; margin:0;">
              <div style="max-width:600px; margin:0 auto; background:#0b0b0f; border:1px solid #1f1f2e; border-radius:24px; overflow:hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.8);">
                <div style="background:linear-gradient(135deg, #10b981, #059669); padding:32px; text-align: center;">
                  <span style="font-size: 36px;">🔐</span>
                  <h1 style="margin:12px 0 0; color:#ffffff; font-size:22px; font-weight:800; text-transform:uppercase; letter-spacing:0.05em;">Vault Active</h1>
                </div>
                <div style="padding:40px 32px;">
                  <p style="color:#ffffff; font-size:16px; font-weight: 600; margin-top:0; line-height: 1.6;">Your secure room "${name}" is now online and secured.</p>
                  
                  <div style="background:#12121a; border:1px solid #27273a; border-radius:16px; padding:24px; margin-bottom:24px;">
                    <table style="width:100%; border-collapse:collapse;">
                      <tr>
                        <td style="color:#71717a; font-size:12px; font-weight:700; text-transform:uppercase; padding:6px 0; width:150px;">Vault ID</td>
                        <td style="color:#ffffff; font-size:13px; font-family:monospace; font-weight:700;">${roomId}</td>
                      </tr>
                      <tr>
                        <td style="color:#71717a; font-size:12px; font-weight:700; text-transform:uppercase; padding:6px 0;">Safety Strategy</td>
                        <td style="color:#10b981; font-size:13px; font-weight:700; text-transform:uppercase;">${safetyStrategy}</td>
                      </tr>
                      <tr>
                        <td style="color:#71717a; font-size:12px; font-weight:700; text-transform:uppercase; padding:6px 0;">Inactivity Limit</td>
                        <td style="color:#e4e4e7; font-size:13px;">${inactivityDays} days</td>
                      </tr>
                      ${isMigration ? `
                      <tr>
                        <td style="color:#71717a; font-size:12px; font-weight:700; text-transform:uppercase; padding:6px 0;">Backup Receiver</td>
                        <td style="color:#e4e4e7; font-size:13px; font-weight:700;">${transferEmail}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </div>
                  
                  <p style="color:#a1a1aa; font-size:14px; line-height:1.6; margin-bottom:0;">All data uploaded to this room is secured with absolute end-to-end encryption. The dead-man's switch is armed according to your inactivity configuration.</p>
                  
                  <p style="color:#52525b; font-size:11px; margin-top:32px; border-top:1px solid #1f1f2e; padding-top:20px; text-align: center; line-height: 1.5;">
                    Keepr Security Team • Zero-Knowledge Secure Storage
                  </p>
                </div>
              </div>
            </body>
            </html>
          `,
        };
        await transporter.sendMail(ownerMailOptions);

      } else if (type === 'update') {
        const updateMailOptions = {
          from: `"Keepr Security" <${process.env.EMAIL_USER}>`,
          to: userEmail,
          subject: `🔄 Secure Vault "${name}" Settings Updated`,
          text: `Hello,

Your secure vault "${name}" settings have been successfully updated.

New Vault Settings:
- Safety Strategy: ${safetyStrategy}
- Inactivity Period: ${inactivityDays} days
${isMigration ? `- Designated Receiver: ${transferEmail}` : ''}

Your vault is secure and fully end-to-end encrypted.

Stay safe,
Keepr Security Team`,
          html: `
            <!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"></head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#040405; color:#e4e4e7; padding:32px; margin:0;">
              <div style="max-width:600px; margin:0 auto; background:#0b0b0f; border:1px solid #1f1f2e; border-radius:24px; overflow:hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.8);">
                <div style="background:linear-gradient(135deg, #3b82f6, #1d4ed8); padding:32px; text-align: center;">
                  <span style="font-size: 36px;">🔄</span>
                  <h1 style="margin:12px 0 0; color:#ffffff; font-size:22px; font-weight:800; text-transform:uppercase; letter-spacing:0.05em;">Settings Updated</h1>
                </div>
                <div style="padding:40px 32px;">
                  <p style="color:#ffffff; font-size:16px; font-weight: 600; margin-top:0; line-height: 1.6;">Settings for secure room "${name}" have been modified.</p>
                  
                  <div style="background:#12121a; border:1px solid #27273a; border-radius:16px; padding:24px; margin-bottom:24px;">
                    <table style="width:100%; border-collapse:collapse;">
                      <tr>
                        <td style="color:#71717a; font-size:12px; font-weight:700; text-transform:uppercase; padding:6px 0; width:150px;">Vault ID</td>
                        <td style="color:#ffffff; font-size:13px; font-family:monospace; font-weight:700;">${roomId}</td>
                      </tr>
                      <tr>
                        <td style="color:#71717a; font-size:12px; font-weight:700; text-transform:uppercase; padding:6px 0;">Safety Strategy</td>
                        <td style="color:#3b82f6; font-size:13px; font-weight:700; text-transform:uppercase;">${safetyStrategy}</td>
                      </tr>
                      <tr>
                        <td style="color:#71717a; font-size:12px; font-weight:700; text-transform:uppercase; padding:6px 0;">Inactivity Limit</td>
                        <td style="color:#e4e4e7; font-size:13px;">${inactivityDays} days</td>
                      </tr>
                      ${isMigration ? `
                      <tr>
                        <td style="color:#71717a; font-size:12px; font-weight:700; text-transform:uppercase; padding:6px 0;">Backup Receiver</td>
                        <td style="color:#e4e4e7; font-size:13px; font-weight:700;">${transferEmail}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </div>
                  
                  <p style="color:#a1a1aa; font-size:14px; line-height:1.6; margin-bottom:0;">These parameters are now active. If you did not make this change, please log in and audit your room settings immediately.</p>
                  
                  <p style="color:#52525b; font-size:11px; margin-top:32px; border-top:1px solid #1f1f2e; padding-top:20px; text-align: center; line-height: 1.5;">
                    Keepr Security Team • Zero-Knowledge Secure Storage
                  </p>
                </div>
              </div>
            </body>
            </html>
          `,
        };
        await transporter.sendMail(updateMailOptions);
      }

      res.json({ success: true, message: 'Email dispatched successfully' });
    } catch (err: any) {
      console.error("Email API Route Error:", err);
      res.status(500).json({ error: "Failed to send email", details: err.message });
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

  io.on('connection', (socket) => {
    console.log('Client connected');

    // EPHEMERAL CHAT LOGIC
    const room = socket.handshake.query.room as string;
    if (room) {
      socket.join(room);
      socket.to(room).emit('peer-joined');
      
      socket.on('sendMessage', (payload) => {
        socket.to(payload.roomId).emit('chat-message', payload.data);
      });
      socket.on('wipe-session', () => {
        socket.to(room).emit('peer-wiped');
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