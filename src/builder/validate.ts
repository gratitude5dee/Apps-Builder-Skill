import fs from "node:fs/promises";
import path from "node:path";

const REQUIRED_FILES = [
  "package.json",
  "tsconfig.json",
  "eslint.config.mjs",
  "src/index.ts",
  "src/server.ts",
  "web/package.json",
  "web/src/main.tsx",
];

export async function validateGeneratedApp(projectDir: string) {
  const missing: string[] = [];
  for (const file of REQUIRED_FILES) {
    try {
      await fs.access(path.join(projectDir, file));
    } catch {
      missing.push(file);
    }
  }

  if (missing.length) {
    throw new Error(`Generated app is missing files: ${missing.join(", ")}`);
  }

  const pkgPath = path.join(projectDir, "package.json");
  const pkg = JSON.parse(await fs.readFile(pkgPath, "utf8")) as {
    scripts?: Record<string, string>;
  };

  const scripts = pkg.scripts ?? {};
  const requiredScripts = ["dev", "build", "lint", "typecheck"];
  const missingScripts = requiredScripts.filter((script) => !scripts[script]);

  if (missingScripts.length) {
    throw new Error(
      `Generated app package.json is missing scripts: ${missingScripts.join(", ")}`
    );
  }

  if (process.env.APPS_BUILDER_VALIDATE_COMMANDS === "1") {
    // Optional command validation hook for CI environments.
    // Do not execute commands by default to avoid side effects.
  }
}
