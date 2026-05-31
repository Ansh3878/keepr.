/**
 * Secure Cloud Storage Room – REST API Handler
 * 
 * Handles:
 *   POST /rooms – Create a new secure room
 *   GET /rooms/{roomId} – Get room metadata
 *   POST /rooms/{roomId}/upload-url – Generate S3 presigned upload URL
 *   POST /rooms/{roomId}/download-url – Generate S3 presigned download URL
 *   GET /rooms/{roomId}/files – List files in a room
 */

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  UpdateItemCommand,
  QueryCommand,
  DeleteItemCommand,
} from "@aws-sdk/client-dynamodb";
// AWS SES removed in favor of Next.js Nodemailer API
import { unmarshall, marshall } from "@aws-sdk/util-dynamodb";
import { v4 as uuidv4 } from "uuid";
import * as crypto from "crypto";
import {
  deleteRoomS3Objects as cronDeleteS3,
  deleteRoomSettings as cronDeleteSettings,
  sendHandoffEmail,
  sendPurgeEmail,
  listRoomFileNames,
  sendCreationEmail,
  sendUpdateEmail,
} from "./secureRoomCron";

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
// sesClient removed in favor of Next.js Nodemailer API

const SECURE_ROOM_BUCKET = process.env.SECURE_ROOM_BUCKET!;
const ROOM_SETTINGS_TABLE = process.env.ROOM_SETTINGS_TABLE!;
const SENDER_EMAIL = process.env.SENDER_EMAIL || process.env.EMAIL_USER || "anshulspotify5@gmail.com";

// Helper: Extract user ID from Authorization header (JWT token)
// In production, validate the JWT signature properly
function extractUserIdFromAuth(authHeader?: string): string {
  if (!authHeader) throw new Error("Unauthorized");
  // For now, extract from JWT or custom header
  // In production, use AWS Cognito or similar
  const token = authHeader.replace("Bearer ", "");
  // Decode JWT: split and decode payload
  try {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Invalid token format");
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
    return payload.sub || payload.userId;
  } catch {
    throw new Error("Unauthorized");
  }
}

// Response helper
function response(statusCode: number, body: any) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
      "Access-Control-Allow-Methods": "DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT"
    },
    body: JSON.stringify(body),
  };
}

// ─────────────────────────────────────────────────────────────────
// HANDLER – Main Router
// ─────────────────────────────────────────────────────────────────
export async function handler(event: any) {
  console.log("Event:", JSON.stringify(event, null, 2));

  const httpMethod = event.httpMethod;
  const path = event.path;
  const userId = extractUserIdFromAuth(event.headers?.Authorization);

  try {
    // POST /rooms – Create a new secure room
    if (httpMethod === "POST" && path === "/rooms") {
      return await createRoom(event, userId);
    }

    // GET /rooms – List all secure rooms
    if (httpMethod === "GET" && path === "/rooms") {
      return await listUserRooms(userId);
    }

    // GET /rooms/{roomId} – Get room metadata
    if (httpMethod === "GET" && path.match(/^\/rooms\/[^/]+$/)) {
      const roomId = path.split("/")[2];
      return await getRoomMetadata(roomId, userId);
    }

    // PUT /rooms/{roomId} – Update room settings
    if (httpMethod === "PUT" && path.match(/^\/rooms\/[^/]+$/)) {
      const roomId = path.split("/")[2];
      return await updateRoom(event, roomId, userId);
    }

    // DELETE /rooms/{roomId} – Dismantle/delete room
    if (httpMethod === "DELETE" && path.match(/^\/rooms\/[^/]+$/)) {
      const roomId = path.split("/")[2];
      return await deleteRoom(roomId, userId);
    }

    // POST /rooms/{roomId}/upload-url – Generate presigned upload URL
    if (
      httpMethod === "POST" &&
      path.match(/^\/rooms\/[^/]+\/upload-url$/)
    ) {
      const roomId = path.split("/")[2];
      return await generateUploadUrl(event, roomId, userId);
    }

    // POST /rooms/{roomId}/multipart/create – Start a multipart upload (large files)
    if (
      httpMethod === "POST" &&
      path.match(/^\/rooms\/[^/]+\/multipart\/create$/)
    ) {
      const roomId = path.split("/")[2];
      return await createMultipartUpload(event, roomId, userId);
    }

    // POST /rooms/{roomId}/multipart/part-url – Get a presigned URL for one part
    if (
      httpMethod === "POST" &&
      path.match(/^\/rooms\/[^/]+\/multipart\/part-url$/)
    ) {
      const roomId = path.split("/")[2];
      return await getMultipartPartUrl(event, roomId, userId);
    }

    // POST /rooms/{roomId}/multipart/complete – Finalise a multipart upload
    if (
      httpMethod === "POST" &&
      path.match(/^\/rooms\/[^/]+\/multipart\/complete$/)
    ) {
      const roomId = path.split("/")[2];
      return await completeMultipartUpload(event, roomId, userId);
    }

    // POST /rooms/{roomId}/multipart/abort – Abort a multipart upload
    if (
      httpMethod === "POST" &&
      path.match(/^\/rooms\/[^/]+\/multipart\/abort$/)
    ) {
      const roomId = path.split("/")[2];
      return await abortMultipartUpload(event, roomId, userId);
    }

    // POST /rooms/{roomId}/download-url – Generate presigned download URL
    if (
      httpMethod === "POST" &&
      path.match(/^\/rooms\/[^/]+\/download-url$/)
    ) {
      const roomId = path.split("/")[2];
      return await generateDownloadUrl(event, roomId, userId);
    }

    // GET /rooms/{roomId}/files – List files in a room
    if (httpMethod === "GET" && path.match(/^\/rooms\/[^/]+\/files$/)) {
      const roomId = path.split("/")[2];
      return await listRoomFiles(roomId, userId);
    }

    // DELETE /rooms/{roomId}/files – Delete a specific file in a room
    if (httpMethod === "DELETE" && path.match(/^\/rooms\/[^/]+\/files$/)) {
      const roomId = path.split("/")[2];
      return await deleteRoomFile(event, roomId, userId);
    }

    // POST /rooms/{roomId}/trigger-cleanup – Trigger purge-only cleanup (no migration)
    if (httpMethod === "POST" && path.match(/^\/rooms\/[^/]+\/trigger-cleanup$/)) {
      const roomId = path.split("/")[2];
      return await triggerCleanup(roomId, userId);
    }

    return response(404, { error: "Not found" });
  } catch (error: any) {
    console.error("Error:", error);
    return response(500, {
      error: error.message || "Internal server error",
    });
  }
}

// ─────────────────────────────────────────────────────────────────
// CREATE ROOM
// ─────────────────────────────────────────────────────────────────
async function createRoom(event: any, userId: string) {
  const body = JSON.parse(event.body || "{}");
  const roomId = uuidv4();
  const now = Date.now();

  // Extract room settings from request
  const {
    name = "Secure Room",
    passkey = uuidv4(), // Auto-generate if not provided
    expiryHours = 24, // Default 24 hours
    autoDeleteAfterDownload = false,
    safetyStrategy = "purge",
    inactivityDays = 30,
    transferEmail = "",
    rawVaultKey = "", // Extract rawVaultKey for Day 1 Email
    userEmail = "",   // Extract user email passed from frontend
  } = body;

  // Calculate expiry: 0 = 1 minute (test mode), otherwise convert days to ms
  const expiryTimestamp = inactivityDays === 0
    ? now + 60 * 1000                             // 1 minute test mode
    : now + inactivityDays * 24 * 60 * 60 * 1000; // N days production
  const ttl = Math.floor(expiryTimestamp / 1000); // DynamoDB TTL is in seconds

  // Save room settings to DynamoDB
  const roomSettings = {
    roomId,
    ownerId: userId,
    createdAt: now,
    expiryTimestamp,
    passkey, // Hash this in production!
    autoDeleteAfterDownload,
    maxFileSize: 500 * 1024 * 1024, // 500 MB default
    ttl,
    name,
    safetyStrategy,
    inactivityDays,
    transferEmail,
    pin: body.pin || "",
    encryptionKey: body.encryptionKey || "",
  };

  try {
    await dynamoClient.send(
      new PutItemCommand({
        TableName: ROOM_SETTINGS_TABLE,
        Item: marshall(roomSettings),
      })
    );

    // Day 1 Zero-Knowledge Email Handoff is sent directly from this Lambda function!
    if (userEmail) {
      console.log(`[Create Room] Triggering creation email for: ${userEmail}`);
      await sendCreationEmail(roomSettings, userEmail);
    }

    return response(201, {
      roomId,
      passkey,
      expiryAt: new Date(expiryTimestamp).toISOString(),
      name,
      safetyStrategy,
      inactivityDays,
      transferEmail,
      message: "Room created successfully",
    });
  } catch (error: any) {
    throw new Error(`Failed to create room: ${error.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────
// GET ROOM METADATA
// ─────────────────────────────────────────────────────────────────
async function getRoomMetadata(roomId: string, userId: string) {
  try {
    const result = await dynamoClient.send(
      new GetItemCommand({
        TableName: ROOM_SETTINGS_TABLE,
        Key: marshall({ roomId }),
      })
    );

    if (!result.Item) {
      return response(404, { error: "Room not found" });
    }

    const room = unmarshall(result.Item) as any;

    // Verify ownership or passkey
    if (room.ownerId !== userId) {
      return response(403, { error: "Unauthorized access" });
    }

    return response(200, {
      roomId: room.roomId,
      createdAt: new Date(room.createdAt).toISOString(),
      expiryAt: new Date(room.expiryTimestamp).toISOString(),
      autoDeleteAfterDownload: room.autoDeleteAfterDownload,
    });
  } catch (error: any) {
    throw new Error(`Failed to fetch room metadata: ${error.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────
// GENERATE UPLOAD URL (Presigned)
// ─────────────────────────────────────────────────────────────────
async function generateUploadUrl(
  event: any,
  roomId: string,
  userId: string
) {
  const body = JSON.parse(event.body || "{}");
  const { fileName, contentType = "application/octet-stream" } = body;

  if (!fileName) {
    return response(400, { error: "fileName is required" });
  }

  try {
    // Verify room exists and user owns it
    const roomResult = await dynamoClient.send(
      new GetItemCommand({
        TableName: ROOM_SETTINGS_TABLE,
        Key: marshall({ roomId }),
      })
    );

    if (!roomResult.Item) {
      return response(404, { error: "Room not found" });
    }

    const room = unmarshall(roomResult.Item) as any;
    if (room.ownerId !== userId) {
      return response(403, { error: "Unauthorized access" });
    }

    // Generate presigned URL
    const s3Key = `${roomId}/${fileName}`;
    const command = new PutObjectCommand({
      Bucket: SECURE_ROOM_BUCKET,
      Key: s3Key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // 1 hour
    });

    return response(200, {
      uploadUrl,
      s3Key,
      expiresIn: 3600,
      message: "Upload URL generated successfully",
    });
  } catch (error: any) {
    throw new Error(`Failed to generate upload URL: ${error.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────
// MULTIPART UPLOAD (large files — bounded memory, streamed in parts)
// ─────────────────────────────────────────────────────────────────

// Shared helper: verify the room exists and the caller owns it.
async function assertRoomOwner(roomId: string, userId: string) {
  const roomResult = await dynamoClient.send(
    new GetItemCommand({
      TableName: ROOM_SETTINGS_TABLE,
      Key: marshall({ roomId }),
    })
  );
  if (!roomResult.Item) {
    return { error: response(404, { error: "Room not found" }) };
  }
  const room = unmarshall(roomResult.Item) as any;
  if (room.ownerId !== userId) {
    return { error: response(403, { error: "Unauthorized access" }) };
  }
  return { room };
}

// 1) Start a multipart upload — returns an uploadId the client reuses for every part.
async function createMultipartUpload(event: any, roomId: string, userId: string) {
  const body = JSON.parse(event.body || "{}");
  const { fileName, contentType = "application/octet-stream" } = body;
  if (!fileName) {
    return response(400, { error: "fileName is required" });
  }

  const guard = await assertRoomOwner(roomId, userId);
  if (guard.error) return guard.error;

  try {
    const s3Key = `${roomId}/${fileName}`;
    const result = await s3Client.send(
      new CreateMultipartUploadCommand({
        Bucket: SECURE_ROOM_BUCKET,
        Key: s3Key,
        ContentType: contentType,
      })
    );

    return response(200, {
      uploadId: result.UploadId,
      s3Key,
      message: "Multipart upload initiated",
    });
  } catch (error: any) {
    throw new Error(`Failed to start multipart upload: ${error.message}`);
  }
}

// 2) Presign a single part — client PUTs one encrypted chunk directly to S3.
async function getMultipartPartUrl(event: any, roomId: string, userId: string) {
  const body = JSON.parse(event.body || "{}");
  const { s3Key, uploadId, partNumber } = body;
  if (!s3Key || !uploadId || !partNumber) {
    return response(400, { error: "s3Key, uploadId and partNumber are required" });
  }
  // Make sure the key actually belongs to this room (prevents cross-room writes).
  if (!String(s3Key).startsWith(`${roomId}/`)) {
    return response(400, { error: "s3Key does not belong to this room" });
  }

  const guard = await assertRoomOwner(roomId, userId);
  if (guard.error) return guard.error;

  try {
    const command = new UploadPartCommand({
      Bucket: SECURE_ROOM_BUCKET,
      Key: s3Key,
      UploadId: uploadId,
      PartNumber: Number(partNumber),
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return response(200, { url, partNumber: Number(partNumber), expiresIn: 3600 });
  } catch (error: any) {
    throw new Error(`Failed to presign upload part: ${error.message}`);
  }
}

// 3) Complete — stitches the uploaded parts into the final object.
async function completeMultipartUpload(event: any, roomId: string, userId: string) {
  const body = JSON.parse(event.body || "{}");
  const { s3Key, uploadId, parts } = body;
  if (!s3Key || !uploadId || !Array.isArray(parts) || parts.length === 0) {
    return response(400, { error: "s3Key, uploadId and parts[] are required" });
  }
  if (!String(s3Key).startsWith(`${roomId}/`)) {
    return response(400, { error: "s3Key does not belong to this room" });
  }

  const guard = await assertRoomOwner(roomId, userId);
  if (guard.error) return guard.error;

  try {
    // Parts must be ordered by part number with their ETags.
    const sortedParts = [...parts]
      .map((p: any) => ({ ETag: p.ETag, PartNumber: Number(p.PartNumber) }))
      .sort((a, b) => a.PartNumber - b.PartNumber);

    const result = await s3Client.send(
      new CompleteMultipartUploadCommand({
        Bucket: SECURE_ROOM_BUCKET,
        Key: s3Key,
        UploadId: uploadId,
        MultipartUpload: { Parts: sortedParts },
      })
    );

    return response(200, {
      s3Key,
      location: result.Location,
      message: "Multipart upload completed",
    });
  } catch (error: any) {
    throw new Error(`Failed to complete multipart upload: ${error.message}`);
  }
}

// 4) Abort — cleans up parts if the client cancels or errors out.
async function abortMultipartUpload(event: any, roomId: string, userId: string) {
  const body = JSON.parse(event.body || "{}");
  const { s3Key, uploadId } = body;
  if (!s3Key || !uploadId) {
    return response(400, { error: "s3Key and uploadId are required" });
  }
  if (!String(s3Key).startsWith(`${roomId}/`)) {
    return response(400, { error: "s3Key does not belong to this room" });
  }

  const guard = await assertRoomOwner(roomId, userId);
  if (guard.error) return guard.error;

  try {
    await s3Client.send(
      new AbortMultipartUploadCommand({
        Bucket: SECURE_ROOM_BUCKET,
        Key: s3Key,
        UploadId: uploadId,
      })
    );
    return response(200, { message: "Multipart upload aborted" });
  } catch (error: any) {
    throw new Error(`Failed to abort multipart upload: ${error.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────
// GENERATE DOWNLOAD URL (Presigned)
// ─────────────────────────────────────────────────────────────────
async function generateDownloadUrl(
  event: any,
  roomId: string,
  userId: string
) {
  const body = JSON.parse(event.body || "{}");
  const { fileName } = body;

  if (!fileName) {
    return response(400, { error: "fileName is required" });
  }

  try {
    // Verify room exists and user owns it
    const roomResult = await dynamoClient.send(
      new GetItemCommand({
        TableName: ROOM_SETTINGS_TABLE,
        Key: marshall({ roomId }),
      })
    );

    if (!roomResult.Item) {
      return response(404, { error: "Room not found" });
    }

    const room = unmarshall(roomResult.Item) as any;
    if (room.ownerId !== userId) {
      return response(403, { error: "Unauthorized access" });
    }

    // Generate presigned download URL
    const s3Key = `${roomId}/${fileName}`;
    const command = new GetObjectCommand({
      Bucket: SECURE_ROOM_BUCKET,
      Key: s3Key,
    });

    const downloadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // 1 hour
    });

    // Optionally delete after download
    if (room.autoDeleteAfterDownload) {
      // Schedule deletion or handle immediately
      // For now, just log it
      console.log(
        `File ${s3Key} will be auto-deleted after download (feature pending)`
      );
    }

    return response(200, {
      downloadUrl,
      expiresIn: 3600,
      message: "Download URL generated successfully",
    });
  } catch (error: any) {
    throw new Error(`Failed to generate download URL: ${error.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────
// LIST ROOM FILES
// ─────────────────────────────────────────────────────────────────
async function listRoomFiles(roomId: string, userId: string) {
  try {
    // Verify room exists and user owns it
    const roomResult = await dynamoClient.send(
      new GetItemCommand({
        TableName: ROOM_SETTINGS_TABLE,
        Key: marshall({ roomId }),
      })
    );

    if (!roomResult.Item) {
      return response(404, { error: "Room not found" });
    }

    const room = unmarshall(roomResult.Item) as any;
    if (room.ownerId !== userId) {
      return response(403, { error: "Unauthorized access" });
    }

    // List objects in S3 for this room
    const listResult = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: SECURE_ROOM_BUCKET,
        Prefix: `${roomId}/`,
      })
    );

    const files = (listResult.Contents || []).map((obj) => ({
      key: obj.Key,
      fileName: obj.Key?.split("/")[1],
      size: obj.Size,
      lastModified: obj.LastModified?.toISOString(),
    }));

    return response(200, {
      roomId,
      fileCount: files.length,
      files,
    });
  } catch (error: any) {
    throw new Error(`Failed to list room files: ${error.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────
// LIST USER ROOMS
// ─────────────────────────────────────────────────────────────────
async function listUserRooms(userId: string) {
  try {
    const result = await dynamoClient.send(
      new QueryCommand({
        TableName: ROOM_SETTINGS_TABLE,
        IndexName: "OwnerIdIndex",
        KeyConditionExpression: "ownerId = :o",
        ExpressionAttributeValues: marshall({
          ":o": userId
        }),
      })
    );

    const now = Date.now();
    const rooms = await Promise.all((result.Items || []).map(async (item) => {
      const room = unmarshall(item) as any;

      // Dynamic check if the room has expired and needs data migration
      if (room.expiryTimestamp && room.expiryTimestamp <= now && room.safetyStrategy === 'migration') {
        console.log(`[Dynamic Expiration] Room ${room.roomId} (${room.name}) has timed out. Initiating handoff...`);
        try {
          const fileNames = await listRoomFileNames(room.roomId);
          await sendHandoffEmail(room, fileNames);

          // Update DynamoDB record: strategy -> handoff_unlocked, extend by 3 days
          const newExpiry = now + 3 * 24 * 60 * 60 * 1000;
          const newTtl = Math.floor(newExpiry / 1000);
          await dynamoClient.send(
            new UpdateItemCommand({
              TableName: ROOM_SETTINGS_TABLE,
              Key: marshall({ roomId: room.roomId }),
              UpdateExpression: 'SET safetyStrategy = :s, expiryTimestamp = :e, #ttl = :t',
              ExpressionAttributeNames: { '#ttl': 'ttl' },
              ExpressionAttributeValues: marshall({ ':s': 'handoff_unlocked', ':e': newExpiry, ':t': newTtl })
            })
          );
          room.safetyStrategy = 'handoff_unlocked';
          room.expiryTimestamp = newExpiry;
        } catch (err: any) {
          console.error(`[Dynamic Expiration Error] Failed to expire room ${room.roomId}:`, err.message);
        }
      }

      return {
        roomId: room.roomId,
        name: room.name || `Secure Room (${room.roomId.substring(0, 8)})`,
        createdAt: new Date(room.createdAt).toISOString(),
        expiryAt: new Date(room.expiryTimestamp).toISOString(),
        autoDeleteAfterDownload: room.autoDeleteAfterDownload,
        passkey: room.passkey,
        safetyStrategy: room.safetyStrategy ?? (room.autoDeleteAfterDownload ? 'purge' : 'migration'),
        inactivityDays: room.inactivityDays ?? 30,
        transferEmail: room.transferEmail || '',
        pin: room.pin || '',
        encryptionKey: room.encryptionKey || room.passkey || '',
      };
    }));

    return response(200, { rooms });
  } catch (error: any) {
    throw new Error(`Failed to list user rooms: ${error.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────
// UPDATE ROOM SETTINGS
// ─────────────────────────────────────────────────────────────────
async function updateRoom(event: any, roomId: string, userId: string) {
  const body = JSON.parse(event.body || "{}");
  try {
    // Verify room exists and user owns it
    const roomResult = await dynamoClient.send(
      new GetItemCommand({
        TableName: ROOM_SETTINGS_TABLE,
        Key: marshall({ roomId }),
      })
    );

    if (!roomResult.Item) {
      return response(404, { error: "Room not found" });
    }

    const room = unmarshall(roomResult.Item) as any;
    if (room.ownerId !== userId) {
      return response(403, { error: "Unauthorized access" });
    }

    // Update fields while protecting keys
    const oldInactivityDays = room.inactivityDays !== undefined ? Number(room.inactivityDays) : 30;
    const newInactivityDays = body.inactivityDays !== undefined ? Number(body.inactivityDays) : oldInactivityDays;
    const hasTimerChanged = body.inactivityDays !== undefined && newInactivityDays !== oldInactivityDays;

    const now = Date.now();
    // Recalculate expiry from NOW: 0 = 1 minute test mode, otherwise N days
    const newExpiryTimestamp = newInactivityDays === 0
      ? now + 60 * 1000
      : now + newInactivityDays * 24 * 60 * 60 * 1000;
    const newTtl = Math.floor(newExpiryTimestamp / 1000);

    const updatedRoom: any = {
      ...room,
      ...body,
      roomId,
      ownerId: userId,
      expiryTimestamp: newExpiryTimestamp,
      ttl: newTtl,
    };

    await dynamoClient.send(
      new PutItemCommand({
        TableName: ROOM_SETTINGS_TABLE,
        Item: marshall(updatedRoom),
      })
    );

    // If inactivity timer has changed, trigger settings update notification email!
    if (hasTimerChanged) {
      const userEmail = body.userEmail || room.transferEmail || "";
      if (userEmail) {
        console.log(`[Update Room] Inactivity timer changed from ${oldInactivityDays} to ${newInactivityDays}. Sending update email to ${userEmail}.`);
        try {
          await sendUpdateEmail(room, oldInactivityDays, newInactivityDays, userEmail);
        } catch (err: any) {
          console.error("Failed to send settings update email:", err.message);
        }
      }
    }

    return response(200, {
      message: "Room settings updated successfully",
      room: {
        roomId: updatedRoom.roomId,
        name: updatedRoom.name,
        safetyStrategy: updatedRoom.safetyStrategy,
        inactivityDays: updatedRoom.inactivityDays,
        transferEmail: updatedRoom.transferEmail,
      }
    });
  } catch (error: any) {
    throw new Error(`Failed to update room settings: ${error.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────
// DELETE / DISMANTLE ROOM
// ─────────────────────────────────────────────────────────────────
async function deleteRoom(roomId: string, userId: string) {
  try {
    // Verify room exists and user owns it
    const roomResult = await dynamoClient.send(
      new GetItemCommand({
        TableName: ROOM_SETTINGS_TABLE,
        Key: marshall({ roomId }),
      })
    );

    if (!roomResult.Item) {
      return response(404, { error: "Room not found" });
    }

    const room = unmarshall(roomResult.Item) as any;
    if (room.ownerId !== userId) {
      return response(403, { error: "Unauthorized access" });
    }

    // 1. List S3 objects for this room
    const listResult = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: SECURE_ROOM_BUCKET,
        Prefix: `${roomId}/`,
      })
    );

    const objects = listResult.Contents || [];
    if (objects.length > 0) {
      const deleteParams = {
        Bucket: SECURE_ROOM_BUCKET,
        Delete: {
          Objects: objects.map((obj) => ({ Key: obj.Key! })),
        },
      };
      await s3Client.send(new DeleteObjectsCommand(deleteParams));
    }

    // 2. Delete room settings from DynamoDB
    await dynamoClient.send(
      new DeleteItemCommand({
        TableName: ROOM_SETTINGS_TABLE,
        Key: marshall({ roomId }),
      })
    );

    return response(200, { message: "Room and all S3 objects permanently dismantled" });
  } catch (error: any) {
    throw new Error(`Failed to delete room: ${error.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────
// DELETE FILE FROM ROOM
// ─────────────────────────────────────────────────────────────────
async function deleteRoomFile(event: any, roomId: string, userId: string) {
  const body = JSON.parse(event.body || "{}");
  const { fileName } = body;
  if (!fileName) {
    return response(400, { error: "fileName is required" });
  }

  try {
    // Verify room exists and user owns it
    const roomResult = await dynamoClient.send(
      new GetItemCommand({
        TableName: ROOM_SETTINGS_TABLE,
        Key: marshall({ roomId }),
      })
    );

    if (!roomResult.Item) {
      return response(404, { error: "Room not found" });
    }

    const room = unmarshall(roomResult.Item) as any;
    if (room.ownerId !== userId) {
      return response(403, { error: "Unauthorized access" });
    }

    // Delete S3 object
    const s3Key = `${roomId}/${fileName}`;
    const deleteParams = {
      Bucket: SECURE_ROOM_BUCKET,
      Delete: {
        Objects: [{ Key: s3Key }],
      },
    };
    await s3Client.send(new DeleteObjectsCommand(deleteParams));

    return response(200, { message: "File successfully purged from storage" });
  } catch (error: any) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}





// ─────────────────────────────────────────────────────────────────
// TRIGGER CLEANUP (Purge-only, no migration)
// ─────────────────────────────────────────────────────────────────
async function triggerCleanup(roomId: string, userId: string) {
  try {
    const result = await dynamoClient.send(
      new GetItemCommand({
        TableName: ROOM_SETTINGS_TABLE,
        Key: marshall({ roomId }),
      })
    );

    if (!result.Item) {
      return response(404, { error: "Room not found" });
    }

    const room = unmarshall(result.Item) as any;
    if (room.ownerId !== userId) {
      return response(403, { error: "Unauthorized access" });
    }

    // Full purge lifecycle: collect file names → send purge email → delete S3 → delete DynamoDB
    const fileNames = await listRoomFileNames(roomId);
    await sendPurgeEmail(room, fileNames);
    await cronDeleteS3(roomId);
    await cronDeleteSettings(roomId);

    return response(200, {
      success: true,
      filesDeleted: fileNames.length,
      message: `Purge complete. ${fileNames.length} file(s) permanently deleted, notification email sent, room removed from Keepr.`
    });
  } catch (error: any) {
    console.error("Trigger Cleanup Error:", error);
    return response(500, { error: error.message || "Failed to execute cleanup" });
  }
}



