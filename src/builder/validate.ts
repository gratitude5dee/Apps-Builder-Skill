import fs from "node:fs/promises";
import path from "node:path";

import type { BuildPlan } from "../skills/appsBuilderSkill/schema.js";
import { runGeneratedAppStaticSmoke } from "../mcp/harness.js";

export type ValidationGateResult = {
  id: string;
  label: string;
  blocking: boolean;
  passed: boolean;
  details: string;
};

export type ValidationReport = {
  ok: boolean;
  summary: string;
  gates: ValidationGateResult[];
};

const REQUIRED_FILES = [
  "package.json",
  "tsconfig.json",
  "eslint.config.mjs",
  "README.md",
  "src/index.ts",
  "src/server.ts",
  "src/benchmark.ts",
  "src/app.config.ts",
  "src/server.test.ts",
  "web/package.json",
  "web/src/main.tsx",
  "web/src/App.tsx",
  "web/src/styles.css",
];

async function hasFile(root: string, filePath: string) {
  try {
    await fs.access(path.join(root, filePath));
    return true;
  } catch {
    return false;
  }
}

function resolveGateLabel(plan: BuildPlan | undefined, gateId: string) {
  return plan?.validationPlan.gates.find((gate) => gate.id === gateId);
}

export async function validateGeneratedApp(
  projectDir: string,
  plan?: BuildPlan
): Promise<ValidationReport> {
  const missingFiles: string[] = [];
  for (const file of REQUIRED_FILES) {
    if (!(await hasFile(projectDir, file))) {
      missingFiles.push(file);
    }
  }

  const pkgPath = path.join(projectDir, "package.json");
  let scripts: Record<string, string> = {};
  try {
    const pkg = JSON.parse(await fs.readFile(pkgPath, "utf8")) as {
      scripts?: Record<string, string>;
    };
    scripts = pkg.scripts ?? {};
  } catch {
    scripts = {};
  }
  const requiredScripts = [
    "dev",
    "build",
    "benchmark",
    "lint",
    "test",
    "typecheck",
  ];
  const missingScripts = requiredScripts.filter((script) => !scripts[script]);

  const smoke = await runGeneratedAppStaticSmoke(projectDir);
  const smokeMap = new Map(smoke.checks.map((check) => [check.id, check]));

  const gates: ValidationGateResult[] = [
    {
      id: "required-files",
      label: resolveGateLabel(plan, "required-files")?.label ?? "Required files",
      blocking: resolveGateLabel(plan, "required-files")?.blocking ?? true,
      passed: missingFiles.length === 0,
      details:
        missingFiles.length === 0
          ? "All expected scaffold files are present."
          : `Missing files: ${missingFiles.join(", ")}`,
    },
    {
      id: "scripts",
      label: resolveGateLabel(plan, "scripts")?.label ?? "Scripts",
      blocking: resolveGateLabel(plan, "scripts")?.blocking ?? true,
      passed: missingScripts.length === 0,
      details:
        missingScripts.length === 0
          ? "All required scripts are present."
          : `Missing scripts: ${missingScripts.join(", ")}`,
    },
    {
      id: "widget-metadata",
      label:
        resolveGateLabel(plan, "widget-metadata")?.label ?? "Widget metadata",
      blocking: resolveGateLabel(plan, "widget-metadata")?.blocking ?? true,
      passed:
        Boolean(smokeMap.get("output-template")?.passed) &&
        Boolean(smokeMap.get("cache-busting")?.passed),
      details:
        "Expected output template metadata and a cache-busted widget resource URI.",
    },
    {
      id: "tool-registration",
      label:
        resolveGateLabel(plan, "tool-registration")?.label ?? "Tool registration",
      blocking: resolveGateLabel(plan, "tool-registration")?.blocking ?? true,
      passed: Boolean(smokeMap.get("server-registration")?.passed),
      details: smokeMap.get("server-registration")?.details ?? "",
    },
    {
      id: "tests",
      label: resolveGateLabel(plan, "tests")?.label ?? "Generated tests",
      blocking: resolveGateLabel(plan, "tests")?.blocking ?? true,
      passed: await hasFile(projectDir, "src/server.test.ts"),
      details: "Expected a generated Vitest file for the server scaffold.",
    },
    {
      id: "deploy-readiness",
      label:
        resolveGateLabel(plan, "deploy-readiness")?.label ?? "Deploy readiness",
      blocking: resolveGateLabel(plan, "deploy-readiness")?.blocking ?? false,
      passed:
        Boolean(smokeMap.get("local-preview")?.passed) &&
        Boolean(smokeMap.get("manifest-strategy")?.passed),
      details:
        "Expected local tunnel guidance and a manifest lookup strategy compatible with Vite.",
    },
  ];

  return {
    ok: gates.every((gate) => !gate.blocking || gate.passed),
    summary: gates.every((gate) => gate.passed)
      ? "All validation gates passed."
      : "One or more validation gates failed.",
    gates,
  };
}
