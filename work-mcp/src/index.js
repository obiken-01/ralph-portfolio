#!/usr/bin/env node
/**
 * Ralphy Work — MCP stdio server.
 *
 * Exposes projects, tasks, time logs and the DTR accomplishment shape to an MCP
 * client (Claude Desktop, Claude Code) over a personal access token.
 *
 * Authorisation is not decided here. The token resolves server-side to one work
 * user and inherits exactly that user's project visibility, so this process is a
 * transport — it cannot widen what the token can see, and does not try to.
 *
 *   RALPHY_PAT       required — an rpat_… token
 *   RALPHY_API_URL   optional — defaults to the Railway production host
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { WorkApiClient } from './client.js';
import { buildTools } from './tools.js';

async function main() {
  let api;
  try {
    api = new WorkApiClient();
  } catch (error) {
    // stderr, never stdout: stdout is the JSON-RPC channel and anything written
    // there that is not a message corrupts the session.
    process.stderr.write(`ralphy-work-mcp: ${error.message}\n`);
    process.exit(1);
  }

  const tools = buildTools(api);
  const byName = new Map(tools.map((tool) => [tool.name, tool]));

  const server = new Server(
    { name: 'ralphy-work', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((tool) => ({
      name: tool.name,
      description: `${tool.description} (requires ${tool.scope})`,
      inputSchema: tool.inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = byName.get(request.params.name);

    if (!tool) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Unknown tool: ${request.params.name}` }],
      };
    }

    try {
      const result = await tool.handler(request.params.arguments ?? {});

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      // Returned as an error result rather than thrown: the model can act on a
      // "this token cannot write" message, but a transport-level failure just
      // ends the turn.
      return {
        isError: true,
        content: [{ type: 'text', text: `${tool.name} failed: ${error.message}` }],
      };
    }
  });

  await server.connect(new StdioServerTransport());
  process.stderr.write(`ralphy-work-mcp: ready against ${api.baseUrl}\n`);
}

main().catch((error) => {
  process.stderr.write(`ralphy-work-mcp: fatal — ${error.stack ?? error.message}\n`);
  process.exit(1);
});
