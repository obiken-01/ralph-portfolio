/**
 * Tool definitions for the Work MCP server.
 *
 * Each entry is { name, description, scope, inputSchema, handler }. The scope is
 * documentation for the reader and for the tool listing — the API is what
 * actually enforces it, since the token, not this process, holds the grant.
 */

const DATE = { type: 'string', description: 'Date as YYYY-MM-DD.' };
const GUID = { type: 'string', description: 'The entity public id (a GUID).' };

const STATUSES = ['Backlog', 'Todo', 'InProgress', 'Blocked', 'Done', 'Cancelled'];
const PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'];
const PROJECT_STATUSES = ['Planned', 'Active', 'OnHold', 'Completed', 'Cancelled'];

export function buildTools(api) {
  return [
    // ── tasks:read ────────────────────────────────────────────────

    {
      name: 'list_projects',
      scope: 'tasks:read',
      description:
        'List the Work projects you are a member of, with item counts and your role in each.',
      inputSchema: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: PROJECT_STATUSES },
          search: { type: 'string', description: 'Matches name or description.' },
        },
      },
      handler: (args) => api.get('/projects', { status: args.status, search: args.search }),
    },

    {
      name: 'get_project',
      scope: 'tasks:read',
      description:
        'One project in full: members, milestones, and — unless timeline is false — its Gantt ' +
        'timeline. Items with no dates are returned separately under undatedItems.',
      inputSchema: {
        type: 'object',
        properties: {
          publicId: GUID,
          timeline: {
            type: 'boolean',
            description: 'Include the timeline. Defaults to true.',
          },
        },
        required: ['publicId'],
      },
      handler: async (args) => {
        const detail = await api.get(`/projects/${args.publicId}`);

        if (args.timeline === false) return detail;

        // Two calls because the API keeps them separate; the caller almost always
        // wants both, and a round-trip saved here is a round-trip saved in chat.
        const timeline = await api.get(`/projects/${args.publicId}/timeline`);
        return { ...detail, timeline };
      },
    },

    {
      name: 'list_work_items',
      scope: 'tasks:read',
      description:
        'Search tasks visible to you. A task is visible if you created it and it has no project, ' +
        'or it belongs to a project you are a member of.',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: GUID,
          status: { type: 'string', enum: STATUSES },
          priority: { type: 'string', enum: PRIORITIES },
          assignee: {
            type: 'string',
            description: '"me", "unassigned", or a user public id.',
          },
          from: DATE,
          to: DATE,
          search: { type: 'string' },
          page: { type: 'integer', minimum: 1 },
          pageSize: { type: 'integer', minimum: 1, maximum: 200 },
        },
      },
      handler: (args) =>
        api.get('/tasks', {
          projectPublicId: args.projectId,
          status: args.status,
          priority: args.priority,
          assignee: args.assignee,
          from: args.from,
          to: args.to,
          search: args.search,
          page: args.page,
          pageSize: args.pageSize,
        }),
    },

    {
      name: 'get_work_item',
      scope: 'tasks:read',
      description:
        'One task in full, including your own logged hours against it. Other people’s hours ' +
        'are never included, even on a shared project.',
      inputSchema: {
        type: 'object',
        properties: { publicId: GUID },
        required: ['publicId'],
      },
      handler: (args) => api.get(`/tasks/${args.publicId}`),
    },

    {
      name: 'get_accomplishments',
      scope: 'tasks:read',
      description:
        'Your own logged work for a date range, grouped by day and collapsed per task — the ' +
        'shape the DTR accomplishment report needs. Always self-scoped; weekends are flagged, ' +
        'not dropped.',
      inputSchema: {
        type: 'object',
        properties: { from: DATE, to: DATE },
        required: ['from', 'to'],
      },
      handler: (args) => api.get('/accomplishments', { from: args.from, to: args.to }),
    },

    {
      name: 'list_time_logs',
      scope: 'tasks:read',
      description: 'Your raw time logs for a range, optionally narrowed to one task.',
      inputSchema: {
        type: 'object',
        properties: {
          from: DATE,
          to: DATE,
          workItemId: GUID,
          page: { type: 'integer', minimum: 1 },
          pageSize: { type: 'integer', minimum: 1 },
        },
      },
      handler: (args) =>
        api.get('/logs', {
          from: args.from,
          to: args.to,
          workItemId: args.workItemId,
          page: args.page,
          pageSize: args.pageSize,
        }),
    },

    // ── tasks:write ───────────────────────────────────────────────

    {
      name: 'create_project',
      scope: 'tasks:write',
      description: 'Create a project. You become its owner and an Admin member.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', maxLength: 150 },
          description: { type: 'string' },
          colorHex: { type: 'string', description: 'Six-digit hex, e.g. #3B82F6.' },
          status: { type: 'string', enum: PROJECT_STATUSES },
          startDate: DATE,
          targetEndDate: DATE,
        },
        required: ['name'],
      },
      handler: (args) => api.post('/projects', args),
    },

    {
      name: 'create_work_item',
      scope: 'tasks:write',
      description:
        'Create a task. Omit projectId for a standalone task private to you. Creating inside a ' +
        'project requires the Member role there.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', maxLength: 200 },
          summary: { type: 'string', maxLength: 280 },
          description: { type: 'string' },
          projectId: GUID,
          status: { type: 'string', enum: STATUSES },
          priority: { type: 'string', enum: PRIORITIES },
          startDate: DATE,
          dueDate: DATE,
          assigneeId: GUID,
          labelIds: { type: 'array', items: { type: 'integer' } },
        },
        required: ['title'],
      },
      handler: (args) => api.post('/tasks', toCreateWorkItemBody(args)),
    },

    {
      name: 'create_project_with_timeline',
      scope: 'tasks:write',
      description:
        'Create a project and its dated tasks in one call — the project-planning case, instead ' +
        'of one round-trip per task. Reports per-item results; a task that fails does not roll ' +
        'back the project or the tasks already created.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', maxLength: 150 },
          description: { type: 'string' },
          colorHex: { type: 'string' },
          startDate: DATE,
          endDate: DATE,
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                summary: { type: 'string' },
                description: { type: 'string' },
                status: { type: 'string', enum: STATUSES },
                priority: { type: 'string', enum: PRIORITIES },
                startDate: DATE,
                dueDate: DATE,
              },
              required: ['title'],
            },
          },
        },
        required: ['name', 'items'],
      },
      handler: async (args) => {
        const project = await api.post('/projects', {
          name: args.name,
          description: args.description,
          colorHex: args.colorHex,
          startDate: args.startDate,
          targetEndDate: args.endDate,
          status: 'Active',
        });

        const created = [];
        const failed = [];

        // Sequential, not Promise.all: BoardOrder is assigned per insert, and
        // racing them would produce a column ordered by whichever request won.
        for (const item of args.items) {
          try {
            const task = await api.post(
              '/tasks',
              toCreateWorkItemBody({ ...item, projectId: project.publicId }),
            );
            created.push({ publicId: task.publicId, title: task.title });
          } catch (error) {
            failed.push({ title: item.title, reason: error.message });
          }
        }

        return {
          project: { publicId: project.publicId, name: project.name },
          created,
          failed,
          summary:
            failed.length === 0
              ? `Created "${project.name}" with ${created.length} task(s).`
              : `Created "${project.name}" with ${created.length} task(s); ${failed.length} failed.`,
        };
      },
    },

    {
      name: 'update_work_item',
      scope: 'tasks:write',
      description:
        'Replace a task’s fields. This is a full update — fields you omit are cleared, so ' +
        'read the task first and send back the whole shape.',
      inputSchema: {
        type: 'object',
        properties: {
          publicId: GUID,
          title: { type: 'string', maxLength: 200 },
          summary: { type: 'string', maxLength: 280 },
          description: { type: 'string' },
          projectId: GUID,
          status: { type: 'string', enum: STATUSES },
          priority: { type: 'string', enum: PRIORITIES },
          startDate: DATE,
          dueDate: DATE,
          assigneeId: GUID,
          labelIds: { type: 'array', items: { type: 'integer' } },
        },
        required: ['publicId', 'title'],
      },
      handler: (args) => api.put(`/tasks/${args.publicId}`, toCreateWorkItemBody(args)),
    },

    {
      name: 'move_work_item',
      scope: 'tasks:write',
      description:
        'Move a task to another board column and position. Moving it into a different project ' +
        'requires the Member role in the destination.',
      inputSchema: {
        type: 'object',
        properties: {
          publicId: GUID,
          status: { type: 'string', enum: STATUSES },
          newIndex: { type: 'integer', minimum: 0, description: 'Defaults to the top.' },
          projectId: GUID,
        },
        required: ['publicId', 'status'],
      },
      handler: (args) =>
        api.patch(`/tasks/${args.publicId}/move`, {
          status: args.status,
          newIndex: args.newIndex ?? 0,
          projectPublicId: args.projectId ?? null,
        }),
    },

    {
      name: 'log_time',
      scope: 'tasks:write',
      description:
        'Book hours. workItemId is optional — omit it for work that has no task, which is how ' +
        'every pre-Work-module log looks.',
      inputSchema: {
        type: 'object',
        properties: {
          description: { type: 'string', maxLength: 500 },
          hours: { type: 'number', exclusiveMinimum: 0, maximum: 24 },
          loggedAt: {
            type: 'string',
            description: 'ISO 8601 instant, e.g. 2026-09-04T09:00:00Z.',
          },
          workItemId: GUID,
        },
        required: ['description', 'hours', 'loggedAt'],
      },
      handler: (args) =>
        api.post('/logs', {
          taskDescription: args.description,
          duration: args.hours,
          loggedAt: args.loggedAt,
          workItemId: args.workItemId ?? null,
        }),
    },
  ];
}

/** The API speaks projectPublicId/assigneePublicId; the tools speak projectId/assigneeId. */
function toCreateWorkItemBody(args) {
  return {
    title: args.title,
    summary: args.summary,
    description: args.description,
    status: args.status ?? 'Todo',
    priority: args.priority ?? 'Normal',
    startDate: args.startDate,
    dueDate: args.dueDate,
    projectPublicId: args.projectId ?? null,
    assigneePublicId: args.assigneeId ?? null,
    labelIds: args.labelIds ?? [],
  };
}
