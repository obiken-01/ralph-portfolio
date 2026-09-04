/**
 * Drives the MCP server the way a client does — a real child process, real
 * JSON-RPC over stdio — against a stub of the Work API.
 *
 * A stub rather than the live API on purpose: this asserts the wiring (handshake,
 * tool listing, envelope unwrapping, error surfacing), which is what breaks
 * silently. Whether the API returns the right rows is the .NET suite's job.
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SERVER = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'index.js');

let api;
let baseUrl;
const seen = [];

before(async () => {
  api = createServer((req, res) => {
    seen.push(`${req.method} ${req.url}`);
    res.setHeader('Content-Type', 'application/json');

    const send = (body, status = 200) => {
      res.statusCode = status;
      res.end(JSON.stringify(body));
    };

    if (req.headers.authorization !== 'Bearer rpat_testtoken') {
      return send({ success: false, statusCode: 401, message: 'nope' }, 401);
    }

    if (req.url.startsWith('/api/work/projects')) {
      return send({
        success: true,
        statusCode: 200,
        message: 'OK',
        data: [{ publicId: 'p-1', name: 'PPDO portal', myRole: 'Admin' }],
      });
    }

    if (req.url.startsWith('/api/work/tasks')) {
      // A 403 is what a read-only token gets when it tries to write, and the
      // client must turn it into something the model can act on.
      if (req.method === 'POST') {
        return send({ success: false, statusCode: 403, message: 'forbidden' }, 403);
      }
      return send({
        success: true,
        statusCode: 200,
        message: 'OK',
        data: { items: [], totalCount: 0, page: 1, pageSize: 25 },
      });
    }

    send({ success: false, statusCode: 404, message: 'Not found' }, 404);
  });

  await new Promise((resolve) => api.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${api.address().port}`;
});

after(() => api?.close());

/** Runs one MCP session and returns the responses to the requests sent. */
function session(requests, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [SERVER], {
      env: {
        ...process.env,
        RALPHY_PAT: 'rpat_testtoken',
        RALPHY_API_URL: baseUrl,
        ...env,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const responses = [];
    let buffer = '';
    let stderr = '';

    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });

    child.stdout.on('data', (chunk) => {
      buffer += chunk;

      let newline;
      while ((newline = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (!line) continue;

        responses.push(JSON.parse(line));

        if (responses.length === requests.filter((r) => r.id !== undefined).length) {
          child.kill();
          resolve({ responses, stderr });
        }
      }
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (responses.length === 0) {
        reject(new Error(`server exited (${code}) before responding.\n${stderr}`));
      }
    });

    for (const request of requests) {
      child.stdin.write(`${JSON.stringify(request)}\n`);
    }
  });
}

const HANDSHAKE = [
  {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test', version: '1.0' },
    },
  },
];

test('completes the MCP handshake', async () => {
  const { responses } = await session(HANDSHAKE);

  assert.equal(responses[0].id, 1);
  assert.equal(responses[0].result.serverInfo.name, 'ralphy-work');
});

test('advertises every read and write tool with its scope', async () => {
  const { responses } = await session([
    ...HANDSHAKE,
    { jsonrpc: '2.0', id: 2, method: 'tools/list' },
  ]);

  const tools = responses.find((r) => r.id === 2).result.tools;
  const names = tools.map((t) => t.name).sort();

  assert.deepEqual(names, [
    'create_project',
    'create_project_with_timeline',
    'create_work_item',
    'get_accomplishments',
    'get_project',
    'get_work_item',
    'list_projects',
    'list_time_logs',
    'list_work_items',
    'log_time',
    'move_work_item',
    'update_work_item',
  ]);

  // The scope belongs in the description: the model should be able to explain
  // why a call failed rather than just retrying it.
  assert.match(tools.find((t) => t.name === 'list_projects').description, /tasks:read/);
  assert.match(tools.find((t) => t.name === 'log_time').description, /tasks:write/);
});

test('calls the API and unwraps the ApiResponse envelope', async () => {
  const { responses } = await session([
    ...HANDSHAKE,
    {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: 'list_projects', arguments: {} },
    },
  ]);

  const result = responses.find((r) => r.id === 2).result;
  const payload = JSON.parse(result.content[0].text);

  assert.equal(result.isError, undefined);
  assert.equal(payload[0].name, 'PPDO portal');
  assert.ok(seen.some((r) => r.startsWith('GET /api/work/projects')));
});

test('turns a scope refusal into an actionable message', async () => {
  const { responses } = await session([
    ...HANDSHAKE,
    {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: 'create_work_item', arguments: { title: 'Nope' } },
    },
  ]);

  const result = responses.find((r) => r.id === 2).result;

  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /tasks:write/);
});

test('refuses to start without a token', async () => {
  await assert.rejects(
    () => session(HANDSHAKE, { RALPHY_PAT: '' }),
    /exited .* before responding|RALPHY_PAT|personal access token/s,
  );
});
