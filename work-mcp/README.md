# Ralphy Work — MCP server

Exposes the Work module (projects, tasks, time logs, DTR accomplishments) to an
MCP client over a personal access token.

The server is a transport. Authorisation happens in the API: the token resolves
server-side to one work user and inherits exactly that user's project visibility,
so this process cannot widen what the token can see and does not try to.

## Setup

1. **Issue a token.** With a Work login, `POST /api/work/tokens`:

   ```json
   { "name": "Claude Desktop", "scopes": ["tasks:read"] }
   ```

   The plaintext comes back once and is never retrievable again — only its
   SHA-256 is stored. Give **Claude Desktop a read-only token** and **Claude Code
   a read-write one**; that split is enforced server-side, not here.

2. **Install:**

   ```bash
   cd work-mcp && npm install
   ```

3. **Register it.**

   Claude Code:

   ```bash
   claude mcp add ralphy-work --env RALPHY_PAT=rpat_… -- node /absolute/path/to/work-mcp/src/index.js
   ```

   Claude Desktop — in `claude_desktop_config.json`:

   ```json
   {
     "mcpServers": {
       "ralphy-work": {
         "command": "node",
         "args": ["/absolute/path/to/work-mcp/src/index.js"],
         "env": { "RALPHY_PAT": "rpat_…" }
       }
     }
   }
   ```

| Variable | Required | Default |
|---|---|---|
| `RALPHY_PAT` | yes | — |
| `RALPHY_API_URL` | no | `https://ralph-portfolio-production.up.railway.app` |

> Leave `RALPHY_API_URL` alone unless you are pointing at a local API. The
> `ralphy-production` host routes through Fastly and 405s on OPTIONS preflight.

## Tools

**`tasks:read`** — `list_projects`, `get_project`, `list_work_items`,
`get_work_item`, `get_accomplishments`, `list_time_logs`

**`tasks:write`** — `create_project`, `create_work_item`,
`create_project_with_timeline`, `update_work_item`, `move_work_item`, `log_time`

`create_project_with_timeline` is the project-planning case: one call lays out a
project and its dated tasks instead of N round-trips. Tasks are created
sequentially because board order is assigned per insert, and it reports per-item
results — a task that fails does not roll back the project or the tasks already
created.

`update_work_item` is a full replace, not a patch. Read the task first and send
back the whole shape, or omitted fields are cleared.

## Accomplishment reports

`get_accomplishments(from, to)` returns the DTR shape directly, replacing the
CSV export the report has been parsing:

- Always self-scoped. Sharing a project never pools other people's hours.
- Grouped on the raw date portion of `loggedAt` with no timezone conversion —
  shifting them would move work across a cutoff boundary.
- Several logs against one task on one day collapse into one entry with merged
  descriptions. Unlinked legacy logs have no task to collapse onto and stay
  separate, matching what the CSV produced.
- Weekends are flagged, not dropped.

Before trusting it for a live cutoff, run it over a period you have already
reported on and diff against what the CSV produced (spec WM-B54). If they
disagree, the grouping is wrong and a cutoff is the worst time to find out.

## Tests

```bash
npm test
```

Drives a real child process over JSON-RPC against a stub API, covering the
handshake, tool listing, envelope unwrapping, and scope refusals. It does not hit
the live API — whether the API returns the right rows is the .NET suite's job.
