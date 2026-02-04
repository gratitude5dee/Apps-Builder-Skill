import { describe, it, expect } from "vitest";
import { renderProjectFiles } from "./render.js";

const requirements = {
  appType: "tool",
  targetUserAndSuccess: "Team wants summaries",
  primaryFeatures: ["Summarize"],
  dataIntegrations: [],
  uiMode: "simple_ui",
  deployment: { provider: "vercel", envNames: [] },
  appName: "Summary Helper",
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
  deploy: "vercel",
};

describe("renderProjectFiles", () => {
  it("renders required files", () => {
    const files = renderProjectFiles({ requirements, plan });
    const paths = files.map((file) => file.path);
    expect(paths).toContain("package.json");
    expect(paths).toContain("src/index.ts");
    expect(paths).toContain("web/src/App.tsx");
  });
});
