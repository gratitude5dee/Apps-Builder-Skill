import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { validateGeneratedApp } from "./validate.js";

const tempRoots: string[] = [];

async function makeFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "apps-builder-validate-"));
  tempRoots.push(root);

  const files: Record<string, string> = {
    "package.json": JSON.stringify(
      {
        scripts: {
          dev: "dev",
          build: "build",
          benchmark: "benchmark",
          lint: "lint",
          test: "test",
          typecheck: "typecheck",
        },
      },
      null,
      2
    ),
    "tsconfig.json": "{}",
    "eslint.config.mjs": "export default [];",
    "README.md": "Developer Mode\ncloudflared",
    "src/index.ts": "",
    "src/server.ts":
      'registerAppResource(); registerAppTool(); "openai/outputTemplate"; manifestCandidates;',
    "src/benchmark.ts": "console.log('benchmark');",
    "src/app.config.ts": 'export const appConfig = { widget: { resourceUri: "ui://widget/example-widget-v1.html" } };',
    "src/server.test.ts": "",
    "web/package.json": "{}",
    "web/src/main.tsx": "",
    "web/src/App.tsx":
      'window.parent.postMessage({ method: "ui/initialize" }, "*"); window.parent.postMessage({ method: "ui/notifications/initialized" }, "*"); "ui/notifications/tool-result";',
    "web/src/styles.css": "",
  };

  for (const [filePath, contents] of Object.entries(files)) {
    const fullPath = path.join(root, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, contents, "utf8");
  }

  return root;
}

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))
  );
});

describe("validateGeneratedApp", () => {
  it("returns a passing report for a complete fixture", async () => {
    const root = await makeFixture();
    const report = await validateGeneratedApp(root);
    expect(report.ok).toBe(true);
  });
});
