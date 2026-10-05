# Data analyst, Playbooks and the agent workbench

Every agent screen talks to the **Elze-backend ADK API** (`adk_agents/api/main.py`,
`VITE_ADK_API_BASE_URL`, `/svc/adk` behind nginx). The Mojo agent service it used to call was
retired on 2026-09-30, together with its Redux store and its hardcoded user id.

## Screens

| Screen | Route | ADK surface |
|---|---|---|
| `pages/agent/DataAnalystPage.tsx` | `/data-analyst/:connectionId/:sessionId?` | `workspaces/{ws}/agents/data_analyst/sessions…` |
| `pages/agent/PlaybooksPage.tsx` | `/playbooks/:connectionId` | `workspaces/{ws}/playbooks` (read-only list); Analyse = a `data_analyst` session with `playbook_id` |
| `pages/agent/PlaybookBuilderPage.tsx` | `/playbook-builder/:connectionId/:sessionId?` | `workspaces/{ws}/playbook-builder/sessions…` |

- A connection must be chosen first (`components/common/agent/ConnectionPicker.tsx`): the
  ADK `workspace_id` is a Metadata Lakehouse connection id.
- **Context picker** (`components/common/agent/ContextPicker.tsx`, beside the attach button,
  Data analyst only, needs `context.read`): every published version of every context — the
  Metadata Lakehouse "Published" list — grouped per context, live marked; **no context by
  default**. The choice is sent once, when the chat is created, as the session's
  `initial_state` (`context_version_id`, `context_connection_id`, `context_name`,
  `context_version`); a reopened chat shows it locked. **The `data_analyst` agent does not
  read it yet** — it still answers from the connection's live `context_objects`.
- The chat UI is `components/common/agent/AdkChatWorkbench.tsx`; agent responses render
  through `components/common/agent/tools/ToolEngine.tsx`.
- All calls go through `api/adk.api.ts` → `adkRequest` (`api/client.ts`), which renews an
  expired session once and explains a refusal from the backend's agent gate.

## Access

- The backend decides: nginx asks `GET /api/gate/agents` before every `/svc/adk` call
  (`backend/src/services/agentGate.service.ts`). The company must have the feature and the
  role the permission; the workspace must be one of the company's connections.
- Routes and buttons mirror it: `analyst.use` or `playbook.run` (Data analyst),
  `playbook.read` (Playbooks), `playbook.create` or `playbook.update` (builder),
  `playbook.run` (Analyse), `playbook.update` (Edit / Publish a draft).

## Not there yet

- The ToolEngine's "Add to action tracker" and "Notify" buttons are placeholders: the action
  tracker lived in Mojo and Elze-backend has no equivalent.
- No playbook run history or schedule triggers (also Mojo's).
- The ADK API scopes by workspace only; it does not know which user is calling.
