import type { AppRequirements, BuildPlan, ToolPlan } from "./schema.js";

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
  const baseReadOnly = requirements.appType !== "workflow_automation";
  const features = requirements.primaryFeatures.length
    ? requirements.primaryFeatures
    : ["Primary action"];
  const used = new Set<string>();

  return features.map((feature, index) => {
    const slug = slugify(feature || `feature-${index + 1}`)
      .replace(/^-+/, "")
      .replace(/-+$/, "");
    let name = slug ? `${slug}` : `feature-${index + 1}`;
    if (used.has(name)) {
      name = `${name}-${index + 1}`;
    }
    used.add(name);

    return {
      name: name.slice(0, 40),
      title: feature || `Feature ${index + 1}`,
      description: `Use this when the user wants to ${feature || "run a feature"}.`,
      readOnlyHint: baseReadOnly,
      openWorldHint: false,
      destructiveHint: false,
    };
  });
}

export function createBuildPlan(requirements: AppRequirements): BuildPlan {
  const appName =
    requirements.appName ??
    `${requirements.appType.replace(/_/g, "-")}-app`;
  const appSlug = slugify(appName);

  const routes = requirements.uiMode === "multi_page_ui" ? ["/", "/about"] : ["/"];

  return {
    appSlug,
    appType: requirements.appType,
    uiMode: requirements.uiMode,
    tools: buildToolPlan(requirements),
    routes,
    deploy: requirements.deployment.provider,
  };
}

export function buildPlanSummary(plan: BuildPlan, requirements: AppRequirements) {
  return {
    appSlug: plan.appSlug,
    appType: plan.appType,
    uiMode: plan.uiMode,
    tools: plan.tools.map((tool) => tool.name),
    routes: plan.routes,
    deploy: plan.deploy,
    targetUserAndSuccess: requirements.targetUserAndSuccess,
  };
}
