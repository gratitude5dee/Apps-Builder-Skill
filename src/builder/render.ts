import { z } from "zod";

import {
  AppRequirementsSchema,
  BuildPlanSchema,
  type AppRequirements,
  type BuildPlan,
} from "../skills/appsBuilderSkill/schema.js";
import { renderServerAppConfig } from "./templates/server-node-ts/app.config.js";
import { renderServerBenchmark } from "./templates/server-node-ts/benchmark.js";
import { renderServerIndex } from "./templates/server-node-ts/index.js";
import { renderServer } from "./templates/server-node-ts/server.js";
import { renderServerTest } from "./templates/server-node-ts/server.test.js";
import { renderReadme } from "./templates/shared/README.md.js";
import { renderEslintConfig } from "./templates/shared/eslint.config.mjs.js";
import { renderGitignore } from "./templates/shared/gitignore.js";
import { renderPackageJson } from "./templates/shared/package.json.js";
import { renderTsconfig } from "./templates/shared/tsconfig.json.js";
import { renderWebApp } from "./templates/mcp-apps-kit-react/App.tsx.js";
import { renderWebIndexHtml } from "./templates/mcp-apps-kit-react/index.html.js";
import { renderWebMain } from "./templates/mcp-apps-kit-react/main.tsx.js";
import { renderWebPackageJson } from "./templates/mcp-apps-kit-react/package.json.js";
import { renderWebStyles } from "./templates/mcp-apps-kit-react/styles.css.js";
import { renderWebTsconfig } from "./templates/mcp-apps-kit-react/tsconfig.json.js";
import { renderViteConfig } from "./templates/mcp-apps-kit-react/vite.config.js";

import type { GeneratedFile } from "./filesystem.js";

const TemplateContextSchema = z.object({
  requirements: AppRequirementsSchema,
  plan: BuildPlanSchema,
});

export function renderProjectFiles(context: {
  requirements: AppRequirements;
  plan: BuildPlan;
}): GeneratedFile[] {
  const parsed = TemplateContextSchema.parse(context);
  const { requirements, plan } = parsed;

  return [
    {
      path: "package.json",
      contents: renderPackageJson(plan.appSlug, requirements.appName),
    },
    { path: "tsconfig.json", contents: renderTsconfig() },
    { path: ".gitignore", contents: renderGitignore() },
    { path: "eslint.config.mjs", contents: renderEslintConfig() },
    {
      path: "README.md",
      contents: renderReadme(requirements.appName, requirements, plan),
    },
    { path: "src/index.ts", contents: renderServerIndex() },
    {
      path: "src/server.ts",
      contents: renderServer(plan, requirements),
    },
    {
      path: "src/benchmark.ts",
      contents: renderServerBenchmark(plan, requirements),
    },
    {
      path: "src/app.config.ts",
      contents: renderServerAppConfig(requirements.appName, plan, requirements),
    },
    { path: "src/server.test.ts", contents: renderServerTest() },
    { path: "web/package.json", contents: renderWebPackageJson() },
    { path: "web/vite.config.ts", contents: renderViteConfig() },
    { path: "web/tsconfig.json", contents: renderWebTsconfig() },
    {
      path: "web/index.html",
      contents: renderWebIndexHtml(requirements.appName),
    },
    { path: "web/src/main.tsx", contents: renderWebMain() },
    {
      path: "web/src/App.tsx",
      contents: renderWebApp(plan, requirements),
    },
    { path: "web/src/styles.css", contents: renderWebStyles() },
  ];
}
