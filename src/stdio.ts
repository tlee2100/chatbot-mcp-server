import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './mcp-server';
import * as dotenv from 'dotenv';

dotenv.config();

async function run() {
  const transport = new StdioServerTransport();

  // For stdio testing with an explicit development context, we expect
  // the SITE_ID environment variable to be set. This allows prompts and tools
  // to avoid accidentally choosing another site's data.
  const siteId = process.env.SITE_ID ? Number(process.env.SITE_ID) : undefined;

  const server = createMcpServer(siteId);
  await server.connect(transport);

  // We use console.error for logging because stdout is reserved for the MCP JSON-RPC protocol messages.
  console.error(`MCP Stdio Server running (siteId: ${siteId || 'none'})`);
}

run().catch((error) => {
  console.error('Fatal error in MCP Stdio Server:', error);
  process.exit(1);
});
