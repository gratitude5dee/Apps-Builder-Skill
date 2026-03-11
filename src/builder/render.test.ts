import { describe, expect, it } from "vitest";

import { renderProjectFiles } from "./render.js";

const requirements = {
  appType: "tool",
  targetUserAndSuccess: "Team wants summaries. Success means faster briefing.",
  primaryFeatures: ["Summarize"],
  dataIntegrations: [],
  uiMode: "simple_ui",
  deployment: { provider: "local", envNames: [] },
  appName: "Summary Helper",
  appDescription: "Summarize project updates.",
  targetUsers: "Delivery teams",
  successMetric: "Less time spent reading updates",
  toolSpecs: [
    {
      name: "summarize",
      title: "Summarize",
      description: "Summarize the latest updates.",
      inputSchema: "prompt?: string",
      interactive: true,
    },
  ],
  widgetSpec: {
    summary: "Summary widget",
    components: ["summary panel", "action bar"],
    routes: ["/"],
    bridgeFeatures: ["ui/initialize", "ui/notifications/tool-result"],
    charts: [],
  },
  auth: { type: "none" },
  stackPreset: "mcp_apps_kit_react",
  refinementBudget: 8,
  refinements: [],
};

const plan = {
  appSlug: "summary-helper",
  appType: "tool",
  uiMode: "simple_ui",
  tools: [
    {
      name: "summarize",
      title: "Summarize",
      description: "Use this when the user wants to summarize.",
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false,
    },
  ],
  routes: ["/"],
  deploy: "local",
  templateFamily: "mcp-apps-kit-react",
  validationPlan: {
    gates: [
      {
        id: "required-files",
        label: "Required files",
        description: "Has scaffold files",
        blocking: true,
      },
    ],
  },
  benchmarkPlan: {
    suite: "smoke",
    tasks: [{ id: "widget-render", label: "Widget render contract" }],
  },
  artifactPaths: {
    projectDir: "/tmp/summary-helper",
    webDir: "/tmp/summary-helper/web",
    resultsDir: "/tmp/summary-helper/.supreme",
    benchmarkReport: "/tmp/summary-helper/.supreme/benchmark-smoke.json",
  },
};

describe("renderProjectFiles", () => {
  it("renders required v2 files", () => {
    const files = renderProjectFiles({ requirements, plan });
    const paths = files.map((file) => file.path);
    expect(paths).toContain("package.json");
    expect(paths).toContain("src/benchmark.ts");
    expect(paths).toContain("src/server.test.ts");
    expect(paths).toContain("web/src/App.tsx");
  });
});
