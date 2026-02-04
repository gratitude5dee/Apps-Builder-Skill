export const appConfig = {
  name: "Apps Builder",
  version: "0.1.0",
  description: "Build, scaffold, and deploy ChatGPT Apps SDK projects.",
  widget: {
    resourceUri: "ui://widget/apps-builder.html",
    domain: process.env.APP_WIDGET_DOMAIN ?? "https://apps-builder.example.com",
    prefersBorder: true,
    csp: {
      connectDomains: [] as string[],
      resourceDomains: [] as string[],
    },
  },
  server: {
    port: Number(process.env.PORT ?? 8787),
    mcpPath: "/mcp",
  },
};

export type AppConfig = typeof appConfig;
