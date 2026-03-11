import type {
  AppRequirements,
  BuildPlan,
} from "../../../skills/appsBuilderSkill/schema.js";

export function renderReadme(
  appName: string,
  requirements: AppRequirements,
  plan: BuildPlan
) {
  return `# ${appName}

Generated with SupremeAppsBuilder v2.

## Quick Start

1. Install dependencies: pnpm install
2. Install web dependencies: pnpm --dir web install
3. Build the web bundle: pnpm build:web
4. Run the generated benchmark: pnpm benchmark
5. Start the MCP server: pnpm dev:server
6. Expose the server over HTTPS and connect the /mcp URL in ChatGPT Developer Mode.

## Local Preview

- Local URL: http://localhost:8787
- Cloudflare Tunnel: cloudflared tunnel --url http://localhost:8787
- ngrok: ngrok http http://localhost:8787

## Developer Mode

- Enable developer mode: Settings -> Apps & Connectors -> Advanced settings.
- Create a connector with your HTTPS /mcp URL.
- Start a chat and add the connector from the More menu.

## Build Plan Snapshot

- App type: ${requirements.appType}
- UI mode: ${requirements.uiMode}
- Deployment: ${plan.deploy}
- Template family: ${plan.templateFamily}
- Stack preset: ${requirements.stackPreset}
- Tools: ${plan.tools.map((tool) => tool.name).join(", ")}

## Deployment

Deploy via your chosen provider or follow the instructions returned by the builder.

## Validation And Benchmark

- Server tests: pnpm test
- Static typecheck: pnpm typecheck
- Local smoke benchmark: pnpm benchmark
- Benchmark artifact: .supreme/local-benchmark.json

## Notes

Update src/app.config.ts to set a unique widget domain and CSP if you plan to submit to the Apps Directory.
The generated widget resource URI is versioned to reduce stale widget caching.
`;
}
