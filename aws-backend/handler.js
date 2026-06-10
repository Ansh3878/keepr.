const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, DeleteCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.CONNECTIONS_TABLE;

const createApiClient = (event) => {
  const domain = event.requestContext.domainName;
  const stage = event.requestContext.stage;
  const endpoint = `https://${domain}/${stage}`;
  return new ApiGatewayManagementApiClient({ endpoint });
};

// ── $connect ──────────────────────────────────────────────────────────────────
module.exports.connectionHandler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const routeKey = event.requestContext.routeKey;

  if (routeKey === '$connect') {
    // roomId comes as ?room=XXXX in the WebSocket URL
    const roomId =
      (event.queryStringParameters && event.queryStringParameters.room) ||
      'LOBBY';

    const ttl = Math.floor(Date.now() / 1000) + 3600; // 1 hour TTL

    try {
      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: { connectionId, roomId, ttl }
      }));
      console.log(`CONNECT  | connId=${connectionId} room=${roomId}`);
    } catch (e) {
      console.error('DynamoDB PutItem error on $connect:', e);
      return { statusCode: 500, body: 'Failed to store connection' };
    }
  }

  if (routeKey === '$disconnect') {
    try {
      await docClient.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { connectionId }
      }));
      console.log(`DISCONNECT | connId=${connectionId}`);
    } catch (e) {
      console.error('DynamoDB DeleteItem error on $disconnect:', e);
    }
  }

  return { statusCode: 200, body: 'OK' };
};

// ── $default ──────────────────────────────────────────────────────────────────
module.exports.defaultHandler = async () => ({
  statusCode: 200,
  body: 'Default route'
});

// ── sendMessage ───────────────────────────────────────────────────────────────
module.exports.sendMessageHandler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const apiClient = createApiClient(event);

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Bad request body' };
  }

  const roomId = body.roomId || 'LOBBY';

  // Build the ciphertext payload (server NEVER decrypts this)
  const messagePayload = Buffer.from(JSON.stringify({
    data: body.data,
    timestamp: new Date().toISOString()
  }));

  // ---- Fetch all connections in this room ----
  let items = [];
  try {
    const result = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'roomId = :r',
      ExpressionAttributeValues: { ':r': roomId },
      ProjectionExpression: 'connectionId'
    }));
    items = result.Items || [];
    console.log(`BROADCAST | room=${roomId} recipients=${items.length - 1} (excl. sender)`);
  } catch (e) {
    console.error('DynamoDB Scan error:', e);
    return { statusCode: 500, body: 'Failed to query room' };
  }

  // ---- Fan-out to every connection in the same room except the sender ----
  const sends = items
    .filter(({ connectionId: id }) => id !== connectionId)
    .map(async ({ connectionId: targetId }) => {
      try {
        await apiClient.send(new PostToConnectionCommand({
          ConnectionId: targetId,
          Data: messagePayload
        }));
      } catch (e) {
        // Connection is stale – remove it
        if (e.$metadata?.httpStatusCode === 410 || e.name === 'GoneException') {
          await docClient.send(new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { connectionId: targetId }
          })).catch(() => {});
        }
      }
    });

  await Promise.all(sends);
  return { statusCode: 200, body: 'sent' };
};
