import path from "node:path";

import type {
  AppRequirements,
  BenchmarkTask,
  BuildPlan,
  ToolPlan,
  ToolSpec,
  ValidationGate,
} from "./schema.js";

const MAX_SLUG_LENGTH = 40;

export function slugify(input: string): string {
  const normalized = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH);
  return normalized || "chatgpt-app";
}

function buildToolPlan(requirements: AppRequirements): ToolPlan[] {
  const used = new Set<string>();
  const baseReadOnly = requirements.appType !== "workflow_automation";
  const specs: ToolSpec[] =
    requirements.toolSpecs.length > 0
      ? requirements.toolSpecs
      : requirements.primaryFeatures.map((feature) => ({
          name: slugify(feature),
          title: feature,
          description: `Use this when the user wants to ${feature.toLowerCase()}.`,
          inputSchema: "prompt?: string",
          interactive: true,
        }));

  return specs.map((spec, index) => {
    let name = slugify(spec.name || spec.title || `feature-${index + 1}`);
    if (!name) {
      name = `feature-${index + 1}`;
    }
    if (used.has(name)) {
      name = `${name}-${index + 1}`;
    }
    used.add(name);

    return {
      name: name.slice(0, 40),
      title: spec.title,
      description: spec.description,
      readOnlyHint: baseReadOnly,
      openWorldHint: requirements.dataIntegrations.length > 0,
      destructiveHint: false,
    };
  });
}

function createValidationGates(): ValidationGate[] {
  return [
    {
      id: "required-files",
      label: "Required files",
      description: "Generated scaffold includes the expected server, widget, and docs files.",
      blocking: true,
    },
    {
      id: "scripts",
      label: "Scripts",
      description: "package.json includes dev, build, lint, test, and typecheck commands.",
      blocking: true,
    },
    {
      id: "widget-metadata",
      label: "Widget metadata",
      description: "Generated server registers app resource metadata and output template hints.",
      blocking: true,
    },
    {
      id: "tool-registration",
      label: "Tool registration",
      description: "Generated server exposes at least one tool with stable metadata.",
      blocking: true,
    },
    {
      id: "tests",
      label: "Generated tests",
      description: "Generated project includes test coverage for the server scaffold.",
      blocking: true,
    },
    {
      id: "deploy-readiness",
      label: "Deploy readiness",
      description: "Generated README and config include local preview and tunnel guidance.",
      blocking: false,
    },
  ];
}

function createBenchmarkTasks(requirements: AppRequirements): BenchmarkTask[] {
  return [
    { id: "widget-render", label: "Widget render contract" },
    { id: "tool-contract", label: "Tool registration contract" },
    { id: "meta-output-template", label: "Output template metadata" },
    {
      id: "ux-surface",
      label:
        requirements.uiMode === "chat_only"
          ? "Chat-first experience"
          : "Interactive widget experience",
    },
  ];
}

export function createBuildPlan(requirements: AppRequirements): BuildPlan {
  const appSlug = slugify(requirements.appName);
  const routes =
    requirements.widgetSpec.routes.length > 0
      ? requirements.widgetSpec.routes
      : requirements.uiMode === "multi_page_ui"
        ? ["/", "/detail"]
        : ["/"];
  const projectDir = path.resolve(process.cwd(), "generated", appSlug);
  const resultsDir = path.join(projectDir, ".supreme");

  return {
    appSlug,
    appType: requirements.appType,
    uiMode: requirements.uiMode,
    tools: buildToolPlan(requirements),
    routes,
    deploy: requirements.deployment.provider,
    templateFamily: "mcp-apps-kit-react",
    validationPlan: {
      gates: createValidationGates(),
    },
    benchmarkPlan: {
      suite: "smoke",
      tasks: createBenchmarkTasks(requirements),
    },
    artifactPaths: {
      projectDir,
      webDir: path.join(projectDir, "web"),
      resultsDir,
      benchmarkReport: path.join(resultsDir, "benchmark-smoke.json"),
    },
  };
}

export function buildPlanSummary(plan: BuildPlan, requirements: AppRequirements) {
  return {
    appSlug: plan.appSlug,
    appType: plan.appType,
    uiMode: plan.uiMode,
    templateFamily: plan.templateFamily,
    tools: plan.tools.map((tool) => tool.name),
    routes: plan.routes,
    deploy: plan.deploy,
    targetUserAndSuccess: requirements.targetUserAndSuccess,
    stackPreset: requirements.stackPreset,
    refinementBudget: requirements.refinementBudget,
    validationGates: plan.validationPlan.gates.length,
    benchmarkTasks: plan.benchmarkPlan.tasks.map((task) => task.id),
  };
}
