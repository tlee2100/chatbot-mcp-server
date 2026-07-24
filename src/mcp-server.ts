import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = process.env.CHATBOT_API_URL || 'http://localhost:3000/api/internal/mcp';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'default-internal-secret-key-123';

// Configure Axios defaults to pass the internal API key securely
axios.defaults.headers.common['x-internal-api-key'] = INTERNAL_API_KEY;

// We can pass siteId via the factory if it's derived per-connection (like in HTTP SSE)
// Or we can rely on tool arguments if it's not provided by connection (but the prompt says "derive siteId from validated MCP request context")
export function createMcpServer(contextSiteId?: number, contextConversationId?: string) {
  const server = new Server(
    {
      name: 'chatbot-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'getConversationContext',
          description:
            'Get conversation context including status, visitor details, recent messages, and summary.',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'getUserDetails',
          description: 'Get user details by email to provide agent context.',
          inputSchema: {
            type: 'object',
            properties: {
              email: { type: 'string', description: 'The email address of the user to query' },
            },
            required: ['email'],
          },
        },
        {
          name: 'getSiteConfig',
          description: 'Get the site configuration and branding for the current site.',
          inputSchema: {
            type: 'object',
            properties: {
              siteId: {
                type: 'number',
                description: 'The ID of the site. Optional if derived from context.',
              },
            },
            required: [],
          },
        },
        {
          name: 'searchKnowledge',
          description: 'Search the knowledge base for the current site.',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'The search query string' },
              siteId: {
                type: 'number',
                description: 'The ID of the site. Optional if derived from context.',
              },
            },
            required: ['query'],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      if (name === 'getConversationContext') {
        const { conversationId: argConvId } = args as { conversationId?: string };
        const conversationId = contextConversationId || argConvId;
        if (!conversationId) {
          throw new Error('conversationId is required but could not be derived from context');
        }
        const response = await axios.get(`${API_BASE_URL}/conversations/${conversationId}/context`);
        let dataStr = JSON.stringify(response.data);
        if (dataStr.length > 7000) {
          dataStr = dataStr.substring(0, 7000) + '... (truncated)';
        }
        return {
          content: [{ type: 'text', text: dataStr }],
        };
      }

      if (name === 'getUserDetails') {
        const { email } = args as { email: string };
        const response = await axios.get(`${API_BASE_URL}/users`, { params: { email } });
        return {
          content: [{ type: 'text', text: JSON.stringify(response.data) }],
        };
      }

      if (name === 'getSiteConfig') {
        const { siteId: argSiteId } = args as { siteId?: number };
        // Derive siteId from arguments, context, or env
        const siteId = argSiteId || contextSiteId || process.env.SITE_ID;
        if (!siteId) {
          throw new Error('siteId is required but could not be derived from arguments or context');
        }
        const response = await axios.get(`${API_BASE_URL}/sites/${siteId}/config`);
        return {
          content: [{ type: 'text', text: JSON.stringify(response.data) }],
        };
      }

      if (name === 'searchKnowledge') {
        const { query, siteId: argSiteId } = args as { query: string; siteId?: number };
        const siteId = argSiteId || contextSiteId || process.env.SITE_ID;
        if (!siteId) {
          throw new Error('siteId is required but could not be derived from arguments or context');
        }
        const response = await axios.post(`${API_BASE_URL}/knowledge/search`, {
          siteId: Number(siteId),
          query,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(response.data) }],
        };
      }

      throw new Error(`Unknown tool: ${name}`);
    } catch (error: any) {
      console.error(`Error executing tool ${name}:`, error.message);
      return {
        content: [
          {
            type: 'text',
            text: `Error executing tool ${name}: ${error.response?.data?.message || error.message}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}
