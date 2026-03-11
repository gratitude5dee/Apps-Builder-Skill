import fs from "node:fs/promises";
import path from "node:path";

import { runBenchmarkSuite } from "../src/mcp/benchmark.js";
import { createBuildPlan } from "../src/skills/appsBuilderSkill/planner.js";
import { AppRequirementsSchema } from "../src/skills/appsBuilderSkill/schema.js";
import { validateGeneratedApp } from "../src/builder/validate.js";

type BenchmarkSummary = {
  suite: string;
  generatedAt: string;
  projects: Array<{
    name: string;
    projectDir: string;
    ok: boolean;
    passRate: number;
    score: string;
  }>;
};

function readArg(flag: string) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function loadProjectRequirements(projectDir: string) {
  const readme = await fs.readFile(path.join(projectDir, "README.md"), "utf8");
  const name = path.basename(projectDir);
  const requirements = AppRequirementsSchema.parse({
    appType: readme.includes("dashboard") ? "dashboard" : "custom",
    targetUserAndSuccess: "Generated benchmark fixture. Success means validation and smoke benchmarks pass.",
    primaryFeatures: ["Primary workflow"],
    dataIntegrations: [],
    uiMode: readme.includes("multi") ? "multi_page_ui" : "simple_ui",
    deployment: { provider: "local", envNames: [] },
    appName: name,
    appDescription: `Benchmark fixture for ${name}.`,
    targetUsers: "Builder maintainers",
    successMetric: "Smoke validation passes cleanly.",
    toolSpecs: [
      {
        name: "primary-workflow",
        title: "Primary workflow",
        description: "Run the main workflow.",
        inputSchema: "prompt?: string",
        interactive: true,
      },
    ],
    widgetSpec: {
      summary: "Benchmark widget",
      components: ["summary panel"],
      routes: ["/"],
      bridgeFeatures: ["ui/initialize", "ui/notifications/tool-result"],
      charts: [],
    },
    auth: { type: "none" },
    stackPreset: "mcp_apps_kit_react",
    refinementBudget: 8,
    refinements: [],
    rawPrompt: "Benchmark project",
  });

  return requirements;
}

async function main() {
  const suite = readArg("--suite") ?? "full";
  const explicitProjectDir = readArg("--project-dir");
  const generatedRoot = path.resolve(process.cwd(), "generated");

  let projectDirs: string[] = [];
  if (explicitProjectDir) {
    projectDirs = [path.resolve(explicitProjectDir)];
  } else {
    try {
      projectDirs = (await fs.readdir(generatedRoot, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory())
        .map((entry) => path.join(generatedRoot, entry.name));
    } catch {
      projectDirs = [];
    }
  }

  const projects: BenchmarkSummary["projects"] = [];

  for (const projectDir of projectDirs) {
    const requirements = await loadProjectRequirements(projectDir);
    const plan = createBuildPlan(requirements);
    const validation = await validateGeneratedApp(projectDir, plan);
    const benchmark = await runBenchmarkSuite({
      projectDir,
      benchmarkPlan: {
        ...plan.benchmarkPlan,
        suite: suite === "smoke" ? "smoke" : "full",
      },
      validation,
    });

    projects.push({
      name: path.basename(projectDir),
      projectDir,
      ok: validation.ok && benchmark.ok,
      passRate: benchmark.passRate,
      score: `${benchmark.score}/${benchmark.maxScore}`,
    });
  }

  const summary: BenchmarkSummary = {
    suite,
    generatedAt: new Date().toISOString(),
    projects,
  };

  const outputDir = path.resolve(process.cwd(), "skillsbench", "results");
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(
    path.join(outputDir, "latest.json"),
    JSON.stringify(summary, null, 2),
    "utf8"
  );

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
