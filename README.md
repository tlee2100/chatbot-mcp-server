# Chatbot MCP Server — Model Context Protocol Tools for AI Agents & Developer Assistants

[![Model Context Protocol](https://img.shields.io/badge/MCP-v1.29-blue?logo=protocol)](https://modelcontextprotocol.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-5.2-black?logo=express)](https://expressjs.com/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green?logo=node.js)](https://nodejs.org/)

A **Model Context Protocol (MCP)** server built with TypeScript that safely exposes chatbot knowledge, conversation context, site configurations, and user details to AI models. Designed to operate across dual transports: it runs as an **HTTP Server-Sent Events (SSE)** service for the **NestJS Chatbot API** backend and as a **Stdio** process for AI developer assistants (such as **Cursor**, **Claude Desktop**, and **Antigravity IDE**).

---

## 📖 Table of Contents

- [Overview & Architecture](#-overview--architecture)
- [Available MCP Tools](#-available-mcp-tools)
- [Dual-Transport Modes](#-dual-transport-modes)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Local Installation & Setup](#-local-installation--setup)
- [Environment Variables](#-environment-variables)
- [Running the Server](#-running-the-server)
  - [Mode A: HTTP / SSE Mode (for Chatbot API)](#mode-a-http--sse-mode-for-chatbot-api)
  - [Mode B: Stdio Mode (for Cursor & Claude Desktop)](#mode-b-stdio-mode-for-cursor--claude-desktop)
- [Security & Authentication](#-security--authentication)
- [Available Scripts](#-available-scripts)
- [Companion Services](#-companion-services)

---

## 🔭 Overview & Architecture

The Chatbot MCP Server standardizes how AI agents communicate with the internal domain services of the customer support platform:

```
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│     Cursor / Claude Desktop     │       │       NestJS Chatbot API        │
│      (Developer Assistant)      │       │     (LangGraph Agent Engine)    │
└────────────────┬────────────────┘       └────────────────┬────────────────┘
                 │ stdio transport                         │ HTTP SSE transport
                 │ (JSON-RPC)                              │ (/mcp/sse, /mcp/messages)
                 ▼                                         ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                          Chatbot MCP Server                               │
│                             (Port 3002)                                   │
│  - Tool Registry: getConversationContext, getUserDetails,                 │
│                   getSiteConfig, searchKnowledge                          │
│  - Session Management & Request Multiplexing                              │
└────────────────────────────────────┬──────────────────────────────────────┘
                                     │ HTTP REST + x-internal-api-key
                                     ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                 Chatbot API (Internal Controller)                         │
│                    http://localhost:3000/api/internal/mcp                 │
│  - Context Retrieval                                                      │
│  - pgvector Knowledge Base Similarity Search                              │
└───────────────────────────────────────────────────────────────────────────┘
```

1. **Decoupled AI Capabilities**: Separates LLM tool definitions from backend database entities, allowing changes to tool schemas without altering backend controllers.
2. **Dynamic Context Resolution**: Derives tenant context (`siteId`, `conversationId`) automatically from the connection's session parameters.
3. **Internal Zero-Trust Security**: Uses shared internal API keys (`x-internal-api-key`) so that sensitive knowledge search and customer data cannot be called by unauthorized external callers.

---

## 🛠️ Available MCP Tools

The server exposes four specialized tools conforming to the Model Context Protocol:

| Tool Name                    | Parameters                                    | Description                                                                                                 |
| :--------------------------- | :-------------------------------------------- | :---------------------------------------------------------------------------------------------------------- |
| **`searchKnowledge`**        | `query` (string, req), `siteId` (number, opt) | Queries the vector knowledge base (`pgvector`) for relevant documentation chunks matching the search query. |
| **`getConversationContext`** | `conversationId` (string, opt)                | Fetches conversation status, visitor metadata, recent message history, and memory summary.                  |
| **`getSiteConfig`**          | `siteId` (number, opt)                        | Retrieves site settings, branding, tone of voice, and configuration for the target website.                 |
| **`getUserDetails`**         | `email` (string, req)                         | Looks up user/agent profile details by email to provide contextual assistance.                              |

_Note: For `searchKnowledge`, `getConversationContext`, and `getSiteConfig`, `siteId` or `conversationId` are automatically derived from the active session context if omitted._

---

## 🔄 Dual-Transport Modes

1. **HTTP SSE Mode (`/mcp/sse`)**:
   - Spawns an Express HTTP server on port `3002`.
   - Used in production and local development by `chatbot-api`'s LangGraph agent via `@langchain/mcp-adapters`.
   - Supports multiplexed client sessions via SSE (`/mcp/sse`) and incoming JSON-RPC POST requests (`/mcp/messages?sessionId=...`).

2. **Stdio Mode**:
   - Communicates directly over standard input and standard output using JSON-RPC.
   - Designed for local inspection with desktop developer tools like Cursor, Claude Desktop, and Antigravity IDE.

---

## 🛠️ Tech Stack

- **Protocol**: [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) (`@modelcontextprotocol/sdk`)
- **Server Framework**: [Express 5](https://expressjs.com/)
- **HTTP Client**: [Axios](https://axios-http.com/) (configured with global internal auth headers)
- **Language & Runtime**: [TypeScript 5](https://www.typescriptlang.org/) & [Node.js](https://nodejs.org/)
- **Code Quality**: ESLint, Prettier, Husky, lint-staged

---

## 📁 Project Structure

```text
chatbot-mcp-server/
├── src/
│   ├── http.ts            # Express server handling SSE transport (/mcp/sse, /mcp/messages)
│   ├── mcp-server.ts      # Core MCP server factory, tool schemas, and execution handlers
│   └── stdio.ts           # Stdio transport entry point for desktop AI clients
├── mcp.example.json       # Example configuration snippet for Cursor / Claude Desktop
├── .env.example           # Example environment configuration
├── package.json           # Dependencies and runtime scripts
└── tsconfig.json          # TypeScript compiler configuration
```

---

## 📋 Prerequisites

- **Node.js**: `v20.x` or later (LTS recommended)
- **npm** (comes with Node) or **yarn** / **pnpm**
- **Chatbot API**: The NestJS backend (`chatbot-api`) running on port `3000`

---

## ⚙️ Local Installation & Setup

### 1. Clone and Navigate to Directory

```bash
git clone <repository-url>
cd chatbot-mcp-server
```

### 2. Install Dependencies

```bash
npm install
```

---

### 3. Configure Environment Variables

Create your local `.env` file from the example:

```bash
cp .env.example .env
```

Open `.env` and verify the values:

```env
# Shared secret matching INTERNAL_API_KEY in chatbot-api (.env)
INTERNAL_API_KEY=super-secret-key-36

# Endpoint pointing to the internal MCP controller of chatbot-api
CHATBOT_API_URL=http://localhost:3000/api/internal/mcp

# Port for the HTTP/SSE transport
PORT=3002
```

> ⚠️ **Important**: Ensure that `INTERNAL_API_KEY` matches the exact value defined in `chatbot-api/.env`. If the keys do not match, the backend will reject tool requests with `401 Unauthorized`.

---

## 🚀 Running the Server

### Mode A: HTTP / SSE Mode (for Chatbot API)

This is the standard mode used when connecting the **NestJS Chatbot API** to MCP:

```bash
npm run start:http
```

- The server will listen on **`http://localhost:3002`**.
- The SSE endpoint is available at **`http://localhost:3002/mcp/sse`**.
- Message handlers listen on **`POST http://localhost:3002/mcp/messages`**.

In `chatbot-api/.env`, configure:

```env
MCP_SERVER_URL=http://localhost:3002/mcp/sse
INTERNAL_API_KEY=super-secret-key-36
```

---

### Mode B: Stdio Mode (for Cursor & Claude Desktop)

To use these tools directly within your AI coding assistant:

1. Locate your assistant's MCP configuration:
   - **Cursor**: `Settings` > `Features` > `MCP Servers` > `Add new MCP server`
   - **Claude Desktop**: `%APPDATA%\Claude\claude_desktop_config.json` (Windows) or `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)
2. Add the server definition (referencing `mcp.example.json`):

```json
{
  "mcpServers": {
    "chatbot-mcp-server": {
      "command": "npm",
      "args": [
        "--prefix",
        "<YOUR_ABSOLUTE_PATH_TO_PROJECT>/chatbot-mcp-server",
        "run",
        "start:stdio"
      ],
      "env": {
        "SITE_ID": "1"
      }
    }
  }
}
```

3. Replace `<YOUR_ABSOLUTE_PATH_TO_PROJECT>` with your absolute filesystem path (e.g., `D:\\Web\\Intern\\Day3\\chatbot-mcp-server`).
4. Restart your assistant. The assistant will detect the four tools (`searchKnowledge`, `getSiteConfig`, `getConversationContext`, `getUserDetails`) and allow you to interact with your knowledge base directly!

---

## 🔒 Security & Authentication

All outgoing requests from `chatbot-mcp-server` to `chatbot-api` inject the HTTP header:

```http
x-internal-api-key: <INTERNAL_API_KEY>
```

On `chatbot-api`, the `InternalApiKeyGuard` validates this header against `process.env.INTERNAL_API_KEY`. Unauthenticated calls from unauthorized clients are blocked immediately.

---

## 📜 Available Scripts

| Command               | Description                                                       |
| :-------------------- | :---------------------------------------------------------------- |
| `npm run start:http`  | Starts the MCP server with HTTP/SSE transport on port `3002`      |
| `npm run start:stdio` | Starts the MCP server with Stdio transport for desktop assistants |
| `npm run build`       | Compiles TypeScript files into JavaScript in `dist/`              |
| `npm run lint`        | Runs ESLint to check for syntax and style issues                  |
| `npm run lint:fix`    | Runs ESLint and automatically applies fixes                       |
| `npm run format`      | Formats all code files using Prettier                             |

---

## 🔗 Companion Services

This service operates as part of the 3-tier customer support system:

- **[chatbot-api](../chatbot-api)** (`http://localhost:3000`): NestJS backend running PostgreSQL/pgvector, WebSockets, and LangGraph agent workflow.
- **[admin-dashboard](../admin-dashboard)** (`http://localhost:3001`): Next.js 16 management portal and customer chat simulator.
