import type { BuildPlan } from "../../../skills/appsBuilderSkill/schema.js";

export function renderAppConfig(appName: string, plan: BuildPlan) {
  return `export const appConfig = {
  name: ${JSON.stringify(appName)},
  version: "0.1.0",
  description: "Generated ChatGPT App",
  widget: {
    resourceUri: "ui://widget/app-widget.html",
    domain: "https://${plan.appSlug}.example.com",
    prefersBorder: true,
    csp: {
      connectDomains: [],
      resourceDomains: [],
    },
  },
  server: {
    port: Number(process.env.PORT ?? 8787),
    mcpPath: "/mcp",
  },
};
`;
}
