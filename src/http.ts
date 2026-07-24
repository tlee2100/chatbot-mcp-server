import express from 'express';
import cors from 'cors';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createMcpServer } from './mcp-server';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// In-memory store for active SSE transports
const transports = new Map<string, SSEServerTransport>();

app.get('/mcp/sse', async (req, res) => {
  try {
    const siteId = req.query.siteId ? Number(req.query.siteId) : undefined;

    // SSEServerTransport takes the base URL for the POST endpoint and the Express Response object.
    const transport = new SSEServerTransport('/mcp/messages', res);

    // Create a new MCP Server instance scoped to this connection's context (e.g. siteId)
    const server = createMcpServer(siteId);

    // Server.connect() will automatically call transport.start()
    await server.connect(transport);

    // After starting, the transport assigns a sessionId
    const sessionId = transport.sessionId;
    if (!sessionId) {
      throw new Error('Session ID not created by transport');
    }

    transports.set(sessionId, transport);
    console.log(`[HTTP] Connected server for session ${sessionId}`);

    // Clean up when the connection closes
    req.on('close', () => {
      console.log(`[HTTP] Connection closed for session ${sessionId}`);
      transports.delete(sessionId);
    });
  } catch (error) {
    console.error('Error establishing SSE connection:', error);
    res.status(500).end();
  }
});

app.post('/mcp/messages', async (req, res) => {
  const sessionId = req.query.sessionId as string;
  if (!sessionId) {
    return res.status(400).send('Missing sessionId');
  }

  const transport = transports.get(sessionId);
  if (!transport) {
    console.log(`[HTTP POST] Session not found: ${sessionId}`);
    return res.status(404).send('Session not found');
  }

  try {
    console.log(`[HTTP POST] Handling message for session ${sessionId}`);
    // Pass the request to the transport to handle incoming JSON-RPC messages
    await transport.handlePostMessage(req, res, req.body);
  } catch (error) {
    console.error(`Error handling message for session ${sessionId}:`, error);
    res.status(500).end();
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`MCP HTTP Server listening on port ${PORT}`);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});
