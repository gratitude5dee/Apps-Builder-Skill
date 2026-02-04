import type { AppRequirements, BuildPlan } from "../../../skills/appsBuilderSkill/schema.js";

export function renderReadme(
  appName: string,
  requirements: AppRequirements,
  plan: BuildPlan
) {
  return `# ${appName}

Generated with the Apps Builder Skill.

## Quick Start

1. Install dependencies: pnpm install
2. Build the web bundle: pnpm build:web
3. Start the MCP server: pnpm dev:server
4. Expose the server over HTTPS and connect the /mcp URL in ChatGPT Developer Mode.

## Developer Mode

- Enable developer mode: Settings -> Apps & Connectors -> Advanced settings.
- Create a connector with your HTTPS /mcp URL.
- Start a chat and add the connector from the More menu.

## Build Plan Snapshot

- App type: ${requirements.appType}
- UI mode: ${requirements.uiMode}
- Deployment: ${plan.deploy}
- Tools: ${plan.tools.map((tool) => tool.name).join(", ")}

## Deployment

Deploy via your chosen provider or follow the instructions returned by the Apps Builder.

## Notes

Update src/app.config.ts to set a unique widget domain and CSP if you plan to submit to the Apps Directory.
`;
}
