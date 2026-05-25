/**
 * Secure Cloud Storage Room – Daily Cron Job Handler
 *
 * Runs daily (default: 2:00 AM UTC) to:
 *   1. Find expired rooms and delete their S3 objects
 *   2. Transfer room contents to Google Drive (if safetyStrategy = 'migration')
 *   3. Send email notification to the room owner via AWS SES
 *   4. Clean up DynamoDB records
 */

import {
  S3Client,
  DeleteObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import {
  DynamoDBClient,
  ScanCommand,
  DeleteItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import nodemailer from "nodemailer";
import { unmarshall, marshall } from "@aws-sdk/util-dynamodb";

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
// Transporter for Gmail SMTP using Nodemailer
const mailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

const SECURE_ROOM_BUCKET = process.env.SECURE_ROOM_BUCKET!;
const ROOM_SETTINGS_TABLE = process.env.ROOM_SETTINGS_TABLE!;
const SENDER_EMAIL = process.env.SENDER_EMAIL || process.env.EMAIL_USER || "anshulspotify5@gmail.com";

// ─────────────────────────────────────────────────────────────────
// HELPER: Send SES Email Handoff Link
// ─────────────────────────────────────────────────────────────────
async function sendHandoffEmail(room: any, migratedFiles: string[]): Promise<void> {
  const toEmail = room.transferEmail || SENDER_EMAIL;
  const websiteUrl = process.env.WEBSITE_URL || "https://keepr-4j2p.onrender.com";
  if (!toEmail) {
    console.warn("No transfer email configured for room, skipping notification.");
    return;
  }

  const fileList = migratedFiles.length > 0
    ? migratedFiles.map(f => `  • ${f}`).join("\n")
    : "  (no files were found in this room)";

  const subject = `[Action Required] Your Keepr secure room "${room.name}" has timed out — download data within 3 days`;
  const bodyText = `
Hi there,

Your Keepr secure room "${room.name}" has reached its inactivity limit and has timed out.

To protect your data, the room has been unlocked for data handoff/migration for the next 3 days.

You must log in to Keepr immediately and download your secure room data in the form of a ZIP file.

Room Name:          ${room.name}
Timeout Time:       ${new Date().toUTCString()}
Destruction Date:   ${new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toUTCString()}
Files Pending:
${fileList}

IMPORTANT: If you do not download your files within 3 days, the room, its S3 storage, and all associated metadata will be permanently and irreversibly destroyed.

All files are stored in a fully zero-knowledge, end-to-end encrypted state. You will need your original Vault Key to unlock the room and download the ZIP.

Stay safe,
Keepr Security System
`;

  const bodyHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background:#040405; color:#e4e4e7; padding:32px; margin:0;">
  <div style="max-width:600px; margin:0 auto; background:#0b0b0f; border:1px solid #1f1f2e; border-radius:24px; overflow:hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.8);">
    <!-- Header with vibrant gradient -->
    <div style="background:linear-gradient(135deg, #0891b2, #0284c7); padding:32px; text-align: center;">
      <span style="font-size: 32px;">🔐</span>
      <h1 style="margin:12px 0 0; color:#ffffff; font-size:22px; font-weight:800; letter-spacing:-0.02em; text-transform:uppercase; tracking:0.1em;">Keepr Secure Handoff</h1>
    </div>
    
    <div style="padding:40px 32px;">
      <p style="color:#ffffff; font-size:16px; font-weight: 600; margin-top:0; line-height: 1.6;">Your room "${room.name}" has timed out due to inactivity.</p>
      <p style="color:#a1a1aa; font-size:14px; line-height:1.6; margin-bottom: 24px;">As a safety protocol, the room has been unlocked for data handoff/migration. You have exactly <strong>3 days</strong> to retrieve your files as a ZIP archive before they are permanently and irreversibly destroyed.</p>
      
      <!-- Room details card -->
      <div style="background:#12121a; border:1px solid #27273a; border-radius:16px; padding:24px; margin-bottom:24px;">
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="color:#71717a; font-size:12px; font-weight:700; text-transform:uppercase; padding:6px 0; width:150px;">Room Name</td>
            <td style="color:#ffffff; font-size:13px; font-weight:700;">${room.name}</td>
          </tr>
          <tr>
            <td style="color:#71717a; font-size:12px; font-weight:700; text-transform:uppercase; padding:6px 0;">Timeout Time</td>
            <td style="color:#e4e4e7; font-size:13px; font-family:monospace;">${new Date().toUTCString()}</td>
          </tr>
          <tr>
            <td style="color:#f43f5e; font-size:12px; font-weight:700; text-transform:uppercase; padding:6px 0;">Destruction Date</td>
            <td style="color:#f43f5e; font-size:13px; font-weight:700; font-family:monospace;">${new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toUTCString()}</td>
          </tr>
          <tr>
            <td style="color:#71717a; font-size:12px; font-weight:700; text-transform:uppercase; padding:6px 0;">Files to Migrate</td>
            <td style="color:#e4e4e7; font-size:13px; font-weight:700;">${migratedFiles.length} file(s)</td>
          </tr>
        </table>
      </div>
      
      <!-- File list preview -->
      \${migratedFiles.length > 0 ? \`
      <div style="background:#09090f; border:1px solid #1f1f2e; border-radius:16px; padding:20px; margin-bottom:24px;">
        <p style="margin:0 0 12px; color:#06b6d4; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:0.05em;">Pending Safe Files</p>
        \${migratedFiles.map(f => \`<p style="margin:6px 0; color:#e2e8f0; font-size:13px; font-family:monospace; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">• \${f}</p>\`).join('')}
      </div>\` : ''}
      
      <!-- Warning box -->
      <div style="background:#450a0a; border:1px solid #991b1b; border-radius:16px; padding:20px; margin-bottom:32px;">
        <p style="margin:0 0 8px; color:#fecdd3; font-size:14px; font-weight:700;">⚠️ Critical Action Required</p>
        <p style="margin:0; color:#fca5a5; font-size:13px; line-height:1.6;">
          You must log in to Keepr and download your room contents as a <strong>ZIP archive</strong>. 
          All files remain fully end-to-end encrypted. You will need your original <strong>Vault Key</strong> to unlock the room and download the ZIP file.
          <br/><br/>
          If this action is not completed within 3 days, all S3 file storage and security parameters will be permanently and irreversibly destroyed.
        </p>
      </div>
      
      <!-- Action Button -->
      <div style="text-align: center; margin-bottom: 32px;">
        <a href="${websiteUrl}/?roomId=${room.roomId}" style="display: inline-block; background: #ffffff; color: #000000; font-size: 14px; font-weight: 800; text-decoration: none; padding: 14px 36px; border-radius: 12px; box-shadow: 0 10px 20px rgba(255,255,255,0.1); text-transform: uppercase; letter-spacing: 0.05em;">Log In & Migrate Now</a>
      </div>
      
      <p style="color:#52525b; font-size:11px; margin-top:32px; border-top:1px solid #1f1f2e; padding-top:20px; text-align: center; line-height: 1.5;">
        This is an automated security protocol notification from Keepr. For your safety, we do not store your Vault Keys, and our support team cannot retrieve your data if deleted.
      </p>
    </div>
  </div>
</body>
</html>`;

  try {
    await mailTransporter.sendMail({
      from: `"Keepr Security" <${process.env.EMAIL_USER || SENDER_EMAIL}>`,
      to: toEmail,
      subject: subject,
      text: bodyText,
      html: bodyHtml,
    });
    console.log(`✓ Migration notification email sent to ${toEmail}`);
  } catch (err: any) {
    // Don't throw — email failure should not block cleanup
    console.error(`✗ Failed to send migration email to ${toEmail}:`, err.message);
  }
}

// ─────────────────────────────────────────────────────────────────
// HELPER: Send SES email notification after PURGE
// ─────────────────────────────────────────────────────────────────
async function sendPurgeEmail(room: any, deletedFiles: string[]): Promise<void> {
  const toEmail = room.transferEmail || SENDER_EMAIL;
  if (!toEmail) {
    console.warn("No transfer email configured for room, skipping purge notification.");
    return;
  }

  const fileList = deletedFiles.length > 0
    ? deletedFiles.map(f => `  • ${f}`).join("\n")
    : "  (no files were found in this room)";

  const subject = `[Keepr] Your secure room "${room.name}" has been permanently purged`;
  const bodyText = `
Hi there,

Your Keepr secure room has reached its inactivity limit and has been automatically purged.

Room Name:    ${room.name}
Purge Time:   ${new Date().toUTCString()}
Files Purged:
${fileList}

All files and room records have been permanently deleted from Keepr servers. This action is irreversible.

If this was unexpected, please note that you can disable auto-purge in your room settings before the inactivity limit is reached.

Stay safe,
Keepr Security System
`;

  const bodyHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#0a0a0a; color:#e4e4e7; padding:32px;">
  <div style="max-width:600px; margin:0 auto; background:#18181b; border:1px solid #27272a; border-radius:12px; overflow:hidden;">
    <div style="background:linear-gradient(135deg,#7f1d1d,#991b1b); padding:24px 32px;">
      <h1 style="margin:0; color:#fff; font-size:20px; font-weight:700;">🔥 Keepr — Vault Purged</h1>
    </div>
    <div style="padding:32px;">
      <p style="color:#a1a1aa; margin-top:0;">Your secure room has reached its inactivity limit and has been automatically purged.</p>
      <table style="width:100%; border-collapse:collapse; margin:16px 0;">
        <tr><td style="color:#71717a; padding:6px 0; width:140px;">Room Name</td><td style="color:#e4e4e7; font-weight:600;">${room.name}</td></tr>
        <tr><td style="color:#71717a; padding:6px 0;">Purge Time</td><td style="color:#e4e4e7;">${new Date().toUTCString()}</td></tr>
        <tr><td style="color:#71717a; padding:6px 0;">Files Purged</td><td style="color:#e4e4e7;">${deletedFiles.length}</td></tr>
      </table>
      ${deletedFiles.length > 0 ? `
      <div style="background:#1c0a0a; border:1px solid #7f1d1d; border-radius:8px; padding:16px; margin:16px 0;">
        <p style="margin:0 0 8px; color:#fca5a5; font-size:12px; text-transform:uppercase; letter-spacing:0.05em;">Permanently Deleted Files</p>
        ${deletedFiles.map(f => `<p style="margin:4px 0; color:#e2e8f0; font-size:13px;">• ${f}</p>`).join('')}
      </div>` : ''}
      <div style="background:#1c1500; border:1px solid #92400e; border-radius:8px; padding:16px; margin:16px 0;">
        <p style="margin:0; color:#fcd34d; font-size:13px;">⚠️ This action is irreversible. All files and room records have been permanently deleted from Keepr servers.</p>
      </div>
      <p style="color:#52525b; font-size:12px; margin-top:24px; border-top:1px solid #27272a; padding-top:16px;">If this was unexpected, you can disable auto-purge in your room settings before the inactivity limit is reached.</p>
    </div>
  </div>
</body>
</html>`;

  try {
    await mailTransporter.sendMail({
      from: `"Keepr Security" <${process.env.EMAIL_USER || SENDER_EMAIL}>`,
      to: toEmail,
      subject: subject,
      text: bodyText,
      html: bodyHtml,
    });
    console.log(`✓ Purge notification email sent to ${toEmail}`);
  } catch (err: any) {
    console.error(`✗ Failed to send purge email to ${toEmail}:`, err.message);
  }
}



// ─────────────────────────────────────────────────────────────────
// HANDLER – Main Cron Job Entry Point
// ─────────────────────────────────────────────────────────────────
export async function handler(event: any) {
  console.log("Cron Job Started:", new Date().toISOString());
  console.log("Event:", JSON.stringify(event, null, 2));

  try {
    // Step 1: Query for rooms that are past expiry
    const expiredRooms = await findExpiredRooms();
    console.log(`Found ${expiredRooms.length} expired rooms`);

    // Step 2: Process each expired room
    for (const room of expiredRooms) {
      try {
        console.log(`Processing expired room ${room.roomId} (${room.name}) with strategy: ${room.safetyStrategy}`);

        // Collect file names for email notification before deleting
        const fileNames = await listRoomFileNames(room.roomId);

        if (room.safetyStrategy === 'migration') {
          await sendHandoffEmail(room, fileNames);
          
          // Update room to handoff_unlocked and extend TTL by 3 days
          const newExpiry = Date.now() + 3 * 24 * 60 * 60 * 1000;
          const newTtl = Math.floor(newExpiry / 1000);
          await dynamoClient.send(new UpdateItemCommand({
            TableName: ROOM_SETTINGS_TABLE,
            Key: marshall({ roomId: room.roomId }),
            UpdateExpression: 'SET safetyStrategy = :s, expiryTimestamp = :e, #ttl = :t',
            ExpressionAttributeNames: { '#ttl': 'ttl' },
            ExpressionAttributeValues: marshall({ ':s': 'handoff_unlocked', ':e': newExpiry, ':t': newTtl })
          }));
          console.log(`✓ Room ${room.roomId} set to handoff_unlocked (extended by 3 days)`);
          continue; // Skip deletion!
        } else if (room.safetyStrategy === 'handoff_unlocked') {
           console.log(`Handoff expired, deleting room ${room.roomId}`);
           await sendPurgeEmail(room, fileNames);
        } else {
          await sendPurgeEmail(room, fileNames);
        }

        // Delete S3 objects for this room
        await deleteRoomS3Objects(room.roomId);

        // Delete DynamoDB record
        await deleteRoomSettings(room.roomId);

        console.log(`✓ Cleaned up room: ${room.roomId}`);
      } catch (error: any) {
        console.error(`✗ Failed to clean up room ${room.roomId}:`, error);
        // Continue with next room even if one fails
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Cron job completed successfully",
        roomsCleaned: expiredRooms.length,
      }),
    };
  } catch (error: any) {
    console.error("Cron Job Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Cron job failed",
        message: error.message,
      }),
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// FIND EXPIRED ROOMS
// ─────────────────────────────────────────────────────────────────
async function findExpiredRooms(): Promise<any[]> {
  const now = Date.now();
  console.log(`Scanning table ${ROOM_SETTINGS_TABLE} for expired rooms relative to: ${now}`);

  try {
    const result = await dynamoClient.send(
      new ScanCommand({
        TableName: ROOM_SETTINGS_TABLE,
      })
    );

    const rooms = (result.Items || []).map((item) => unmarshall(item) as any);
    const expired = rooms.filter((room) => {
      return room.expiryTimestamp && room.expiryTimestamp <= now;
    });

    return expired;
  } catch (error: any) {
    console.error("Failed to retrieve expired rooms via scan:", error);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────
// LIST ROOM FILE NAMES (for email notification before deletion)
// ─────────────────────────────────────────────────────────────────
async function listRoomFileNames(roomId: string): Promise<string[]> {
  try {
    const listResult = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: SECURE_ROOM_BUCKET,
        Prefix: `${roomId}/`,
      })
    );
    return (listResult.Contents || [])
      .map(obj => obj.Key?.split("/")[1] || "")
      .filter(Boolean);
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────
// DELETE ROOM S3 OBJECTS
// ─────────────────────────────────────────────────────────────────
async function deleteRoomS3Objects(roomId: string): Promise<void> {
  try {
    const listResult = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: SECURE_ROOM_BUCKET,
        Prefix: `${roomId}/`,
      })
    );

    const objects = listResult.Contents || [];
    console.log(`Deleting ${objects.length} S3 objects for room ${roomId}`);

    for (const obj of objects) {
      if (!obj.Key) continue;
      try {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: SECURE_ROOM_BUCKET,
            Key: obj.Key,
          })
        );
        console.log(`  ✓ Deleted S3 object: ${obj.Key}`);
      } catch (error: any) {
        console.error(`  ✗ Failed to delete ${obj.Key}:`, error.message);
      }
    }
  } catch (error: any) {
    throw new Error(`Failed to delete room S3 objects: ${error.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────
// DELETE ROOM SETTINGS FROM DYNAMODB
// ─────────────────────────────────────────────────────────────────
async function deleteRoomSettings(roomId: string): Promise<void> {
  try {
    await dynamoClient.send(
      new DeleteItemCommand({
        TableName: ROOM_SETTINGS_TABLE,
        Key: marshall({ roomId }),
      })
    );
    console.log(`✓ Deleted DynamoDB record for room ${roomId}`);
  } catch (error: any) {
    throw new Error(`Failed to delete room settings: ${error.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────
// EXPORTED HELPERS (used by secureRoomApi.ts for on-demand triggers)
// ─────────────────────────────────────────────────────────────────
export {
  deleteRoomS3Objects,
  deleteRoomSettings,
  sendHandoffEmail,
  sendPurgeEmail,
  listRoomFileNames,
};
