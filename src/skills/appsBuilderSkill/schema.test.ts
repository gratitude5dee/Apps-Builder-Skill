import { describe, expect, it } from "vitest";

import { AppRequirementsSchema } from "./schema.js";

const base = {
  appType: "tool",
  targetUserAndSuccess: "Teams want a production helper. Success means faster execution.",
  primaryFeatures: ["Feature A"],
  dataIntegrations: [],
  uiMode: "simple_ui",
  deployment: { provider: "local", envNames: [] },
  appName: "Helper",
  appDescription: "A production helper.",
  targetUsers: "Operations teams",
  successMetric: "Faster completion time",
  toolSpecs: [
    {
      name: "feature-a",
      title: "Feature A",
      description: "Run feature A",
      inputSchema: "prompt?: string",
      interactive: true,
    },
  ],
  widgetSpec: {
    summary: "Primary widget",
    components: ["summary panel"],
    routes: ["/"],
    bridgeFeatures: ["ui/initialize"],
    charts: [],
  },
  auth: { type: "none" },
  stackPreset: "mcp_apps_kit_react",
  refinementBudget: 8,
  refinements: [],
};

describe("AppRequirementsSchema", () => {
  it("accepts the local deployment provider", () => {
    const result = AppRequirementsSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("rejects refinement budgets above 8", () => {
    const result = AppRequirementsSchema.safeParse({
      ...base,
      refinementBudget: 9,
    });
    expect(result.success).toBe(false);
  });
});
