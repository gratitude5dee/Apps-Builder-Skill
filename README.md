# Apps Builder Skill (Apps SDK)

A production-ready builder that interviews users, generates a full ChatGPT Apps SDK project, validates it, and deploys via Netlify/Cloudflare/Vercel.

## Quick Start (1-2 minutes)

1. Install dependencies:
   `pnpm install`
2. Start dev servers:
   `pnpm dev`
3. Build the widget bundle (once):
   `pnpm build:web`
4. Start the MCP server if not already running:
   `pnpm dev:server`

## Developer Mode Testing

1. Enable developer mode: Settings -> Apps & Connectors -> Advanced settings.
2. Expose your MCP server over HTTPS (ngrok or Cloudflare Tunnel).
3. Create a connector with your HTTPS `/mcp` URL.
4. Open a new chat, add the connector from "More," and prompt it.

**Test prompt**
"Build me an app that summarizes meeting notes and emails a recap."

## Local Dev Flow

- `pnpm dev`: runs server + UI in watch mode.
- `pnpm build:web`: builds the UI bundle used by the MCP server.
- `pnpm build:server`: compiles server TS to `dist/`.
- `pnpm lint` / `pnpm typecheck`: static checks.

## Deployment Credentials + MCP Env Vars

Set env vars for MCP deployment adapters:

- `NETLIFY_MCP_URL`, `NETLIFY_MCP_TOOL_CREATE`, `NETLIFY_MCP_TOOL_SET_ENV`, `NETLIFY_MCP_TOOL_DEPLOY`
- `CLOUDFLARE_MCP_URL`, `CLOUDFLARE_MCP_TOOL_CREATE`, `CLOUDFLARE_MCP_TOOL_SET_ENV`, `CLOUDFLARE_MCP_TOOL_DEPLOY`
- `VERCEL_MCP_URL`, `VERCEL_MCP_TOOL_CREATE`, `VERCEL_MCP_TOOL_SET_ENV`, `VERCEL_MCP_TOOL_DEPLOY`

If MCP URLs are missing, the builder returns CLI fallback steps.

## Troubleshooting

- **Widget doesn't render**: run `pnpm build:web` and confirm `web/dist/manifest.json` exists.
- **No tools listed**: ensure the connector URL is `https://<host>/mcp`.
- **CSP errors**: update `src/app.config.ts` with correct domains.
- **Deployment adapter fails**: verify MCP tool names or use CLI fallback.

## Golden Path Example

**Prompt**
"Build me a dashboard for tracking quarterly OKRs."

**Example answers**
- App type: dashboard
- Target user + success: "Leaders need a quick view of OKR progress each quarter."
- Features: "OKR list, status summary, progress by team"
- Data/integrations: "none"
- UI: simple UI
- Deployment: Vercel MCP
- Secrets: "none"

**Expected result**
- Generated project under `generated/okr-dashboard-app/`
- Deployment URL returned in the tool response

## Editing Templates

Template sources live in:
- `src/builder/templates/` for scaffolded apps
- `web/` for the builder UI
- `src/skills/appsBuilderSkill/` for conversation and generator logic
