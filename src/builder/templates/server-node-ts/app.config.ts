import type {
  AppRequirements,
  BuildPlan,
} from "../../../skills/appsBuilderSkill/schema.js";

export function renderServerAppConfig(
  appName: string,
  plan: BuildPlan,
  requirements: AppRequirements
) {
  return `export const appConfig = {
  name: ${JSON.stringify(appName)},
  version: "0.1.0",
  description: ${JSON.stringify(requirements.appDescription)},
  widget: {
    resourceUri: "ui://widget/${plan.appSlug}-widget-v1.html",
    domain: "https://${plan.appSlug}.example.com",
    prefersBorder: true,
    csp: {
      connectDomains: [],
      resourceDomains: [],
    },
  },
  localPreviewUrl: "http://localhost:8787",
  tunnelHints: [
    "cloudflared tunnel --url http://localhost:8787",
    "ngrok http http://localhost:8787",
  ],
  server: {
    port: Number(process.env.PORT ?? 8787),
    mcpPath: "/mcp",
  },
};
`;
}
