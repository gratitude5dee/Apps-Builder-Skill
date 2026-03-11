# Apps Builder Skill (SupremeAppsBuilder v2)

An upgraded ChatGPT Apps SDK builder that interviews the user adaptively, generates a modern widget + MCP server scaffold, validates the result, runs a smoke benchmark, and returns deployment or local preview instructions.

## Quick Start

1. Install dependencies: `pnpm install`
2. Start dev servers: `pnpm dev`
3. Build the widget bundle once: `pnpm build:web`
4. Start the MCP server if needed: `pnpm dev:server`

## Skill Surfaces

- `skill/chatgpt-apps-builder/`: compatibility skill manifest that now targets the v2 runtime.
- `skill/supreme-apps-builder/`: side-by-side marketplace-ready v2 manifest.
- `src/skills/appsBuilderSkill/`: adaptive interview, refinement loop, planning, and generation.
- `src/builder/templates/`: v2 template families for `mcp-apps-kit-react` and `server-node-ts`.
- `src/mcp/`: smoke harness and benchmark primitives.
- `skillsbench/`: explicit benchmark CLI and JSON artifact writer.

## Developer Mode Testing

1. Enable developer mode in ChatGPT.
2. Expose your MCP server over HTTPS with `cloudflared` or `ngrok`.
3. Create a connector with your HTTPS `/mcp` URL.
4. Open a new chat, add the connector from More, and prompt it.

## Commands

- `pnpm dev`: run server and builder UI in watch mode.
- `pnpm build:web`: build the widget bundle used by the MCP server.
- `pnpm test`: run repository Vitest tests.
- `pnpm typecheck`: run TypeScript checks.
- `pnpm apps-benchmark`: alias for the SkillsBench harness.
- `pnpm benchmark -- --suite full`: benchmark generated apps and write `skillsbench/results/latest.json`.

## Deployment

Supported builder outputs:

- `local`: return preview and tunnel instructions.
- `vercel`, `netlify`, `cloudflare`: use MCP adapters if configured, else return CLI fallback steps.

## Troubleshooting

- Widget does not render: run `pnpm build:web` and confirm either `web/dist/manifest.json` or `web/dist/.vite/manifest.json` exists.
- MCP returns method errors: confirm the connector uses an HTTPS URL ending with `/mcp` and ChatGPT is POSTing to it.
- Deployment adapter fails: verify MCP tool names or use the returned CLI fallback.
