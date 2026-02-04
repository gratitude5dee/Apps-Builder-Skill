import fs from "node:fs";
import path from "node:path";

import type { AppRequirements, BuildPlan } from "./schema.js";
import { renderProjectFiles } from "../../builder/render.js";
import { writeFiles } from "../../builder/filesystem.js";
import { validateGeneratedApp } from "../../builder/validate.js";

export type GenerateResult = {
  projectDir: string;
  filesWritten: number;
};

export async function generateApp(
  requirements: AppRequirements,
  plan: BuildPlan
): Promise<GenerateResult> {
  const projectDir = path.resolve(process.cwd(), "generated", plan.appSlug);

  if (fs.existsSync(projectDir)) {
    const existing = fs.readdirSync(projectDir);
    if (existing.length > 0) {
      throw new Error(
        `Target directory already exists: ${projectDir}. Choose a different app name or delete the directory.`
      );
    }
  }

  const files = renderProjectFiles({ requirements, plan });
  await writeFiles(projectDir, files, { overwrite: false });
  await validateGeneratedApp(projectDir);

  return {
    projectDir,
    filesWritten: files.length,
  };
}
