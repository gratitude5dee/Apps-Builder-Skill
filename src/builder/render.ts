import { z } from "zod";
import { AppRequirementsSchema, BuildPlanSchema, type AppRequirements, type BuildPlan } from "../skills/appsBuilderSkill/schema.js";
import { renderGitignore } from "./templates/shared/gitignore.js";
import { renderEslintConfig } from "./templates/shared/eslint.config.mjs.js";
import { renderPackageJson } from "./templates/shared/package.json.js";
import { renderTsconfig } from "./templates/shared/tsconfig.json.js";
import { renderReadme } from "./templates/shared/README.md.js";
import { renderAppConfig } from "./templates/server/app.config.js";
import { renderServerIndex } from "./templates/server/index.js";
import { renderServer } from "./templates/server/server.js";
import { renderWebIndexHtml } from "./templates/web/index.html.js";
import { renderWebPackageJson } from "./templates/web/package.json.js";
import { renderViteConfig } from "./templates/web/vite.config.js";
import { renderWebTsconfig } from "./templates/web/tsconfig.json.js";
import { renderWebMain } from "./templates/web/main.tsx.js";
import { renderWebApp } from "./templates/web/App.tsx.js";
import { renderWebStyles } from "./templates/web/styles.css.js";

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
  const appName = requirements.appName ?? plan.appSlug;

  return [
    { path: "package.json", contents: renderPackageJson(plan.appSlug, appName) },
    { path: "tsconfig.json", contents: renderTsconfig() },
    { path: ".gitignore", contents: renderGitignore() },
    { path: "eslint.config.mjs", contents: renderEslintConfig() },
    { path: "README.md", contents: renderReadme(appName, requirements, plan) },
    { path: "src/index.ts", contents: renderServerIndex() },
    { path: "src/server.ts", contents: renderServer(plan) },
    { path: "src/app.config.ts", contents: renderAppConfig(appName, plan) },
    { path: "web/package.json", contents: renderWebPackageJson() },
    { path: "web/vite.config.ts", contents: renderViteConfig() },
    { path: "web/tsconfig.json", contents: renderWebTsconfig() },
    { path: "web/index.html", contents: renderWebIndexHtml() },
    { path: "web/src/main.tsx", contents: renderWebMain() },
    { path: "web/src/App.tsx", contents: renderWebApp(plan) },
    { path: "web/src/styles.css", contents: renderWebStyles() },
  ];
}
