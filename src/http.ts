import express from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createMcpServer } from './mcp-server';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

// In-memory store for active SSE transports
const transports = new Map<string, SSEServerTransport>();

app.get('/mcp/sse', async (req, res) => {
  try {
    const siteId = req.query.siteId ? Number(req.query.siteId) : undefined;
    
    // SSEServerTransport takes the base URL for the POST endpoint and the Express Response object.
    const transport = new SSEServerTransport('/mcp/messages', res);
    await transport.start();

    // After starting, the transport assigns a sessionId
    const sessionId = transport.sessionId;
    if (!sessionId) {
      throw new Error('Session ID not created by transport');
    }

    transports.set(sessionId, transport);

    // Create a new MCP Server instance scoped to this connection's context (e.g. siteId)
    const server = createMcpServer(siteId);
    await server.connect(transport);

    // Clean up when the connection closes
    req.on('close', () => {
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
    return res.status(404).send('Session not found');
  }

  try {
    // Pass the request to the transport to handle incoming JSON-RPC messages
    await transport.handlePostMessage(req, res);
  } catch (error) {
    console.error(`Error handling message for session ${sessionId}:`, error);
    res.status(500).end();
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`MCP HTTP Server listening on port ${PORT}`);
});
