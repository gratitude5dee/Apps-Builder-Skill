import type {
  AppRequirements,
  BuildPlan,
} from "../../../skills/appsBuilderSkill/schema.js";

export function renderServerBenchmark(
  plan: BuildPlan,
  requirements: AppRequirements
) {
  return `import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type BenchmarkCheck = {
  id: string;
  label: string;
  passed: boolean;
  details: string;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const EXPECTED_TOOLS = ${JSON.stringify(plan.tools.map((tool) => tool.name), null, 2)};
const EXPECTED_ROUTES = ${JSON.stringify(requirements.widgetSpec.routes, null, 2)};

async function readIfExists(...segments: string[]) {
  try {
    return await fs.readFile(path.join(ROOT_DIR, ...segments), "utf8");
  } catch {
    return "";
  }
}

async function main() {
  const [serverSource, appConfig, widgetSource, readme, pkgSource] = await Promise.all([
    readIfExists("src", "server.ts"),
    readIfExists("src", "app.config.ts"),
    readIfExists("web", "src", "App.tsx"),
    readIfExists("README.md"),
    readIfExists("package.json"),
  ]);

  const checks: BenchmarkCheck[] = [
    {
      id: "output-template",
      label: "Output template metadata",
      passed:
        serverSource.includes('"openai/outputTemplate"') &&
        serverSource.includes("registerAppResource"),
      details: "Generated server should register widget resources and output template metadata.",
    },
    {
      id: "tool-coverage",
      label: "Tool coverage",
      passed: EXPECTED_TOOLS.every((tool) => serverSource.includes(tool)),
      details: "Generated server should include every planned tool name.",
    },
    {
      id: "widget-bridge",
      label: "Widget bridge events",
      passed:
        widgetSource.includes("ui/initialize") &&
        widgetSource.includes("ui/notifications/initialized") &&
        widgetSource.includes("ui/notifications/tool-result"),
      details: "Widget should initialize the Apps SDK bridge and react to tool results.",
    },
    {
      id: "route-surface",
      label: "Route surface",
      passed: EXPECTED_ROUTES.every((route) => widgetSource.includes(route)),
      details: "Widget should render the planned route list.",
    },
    {
      id: "cache-busting",
      label: "Versioned widget URI",
      passed: /widget-v\\d+/.test(appConfig),
      details: "App config should use a cache-busted widget resource URI.",
    },
    {
      id: "developer-mode",
      label: "Developer Mode guidance",
      passed:
        readme.includes("Developer Mode") &&
        (readme.includes("cloudflared") || readme.includes("ngrok")),
      details: "README should include HTTPS tunnel instructions for ChatGPT Developer Mode.",
    },
    {
      id: "benchmark-script",
      label: "Benchmark script",
      passed: pkgSource.includes('"benchmark"'),
      details: "Generated package.json should expose a benchmark command.",
    },
  ];

  const score = checks.filter((check) => check.passed).length;
  const maxScore = checks.length;
  const report = {
    suite: "generated-app-smoke",
    generatedAt: new Date().toISOString(),
    ok: score === maxScore,
    score,
    maxScore,
    passRate: Math.round((score / maxScore) * 100),
    checks,
  };

  const outputDir = path.join(ROOT_DIR, ".supreme");
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(
    path.join(outputDir, "local-benchmark.json"),
    JSON.stringify(report, null, 2),
    "utf8"
  );

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
`;
}
