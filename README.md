# Chatbot MCP Server

This is a Model Context Protocol (MCP) server designed to safely expose chatbot tools to AI coding assistants (like Cursor, Claude Desktop, and Claude Code) and to your own AI agents.

## Local Testing Setup (Cursor / Claude Desktop)

To connect an AI assistant to this server, you must provide your assistant with the absolute path to your local clone of this project.

1. Copy the contents of `mcp.example.json`.
2. Add it to your assistant's MCP configuration file (e.g. Cursor Settings > MCP Servers).
3. **CRITICAL**: Change `<YOUR_ABSOLUTE_PATH_TO_PROJECT>` to the actual absolute path where you cloned this repo on your machine (e.g., `C:\\Users\\John\\Documents\\chatbot-mcp-server` or `/Users/John/Projects/chatbot-mcp-server`).
4. **CRITICAL**: Update the `env` block in the configuration to include a valid `SITE_ID` and `CONVERSATION_ID` for local testing. The AI will be securely locked to these IDs.
5. Reload your assistant window to pick up the tools!

## Environment Setup

You must create a `.env` file from the `.env.example` file:

```bash
cp .env.example .env
```

Ensure that `INTERNAL_API_KEY` matches the secret key running on the main `chatbot-api` backend, otherwise your MCP requests will be blocked with a 401 Unauthorized error!

## Running the Server

To start the MCP server in HTTP/SSE mode (which is required for the `chatbot-api` to connect):

```bash
npm run start:http
```

The server listens on **port 3002** by default (e.g. `http://localhost:3002/mcp/sse`). Ensure this matches the `MCP_SERVER_URL` in the `chatbot-api` configuration.
