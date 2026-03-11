import { z } from "zod";

export const AppTypeEnum = z.enum([
  "tool",
  "content_guide",
  "workflow_automation",
  "dashboard",
  "chat_first_assistant",
  "custom",
]);

export const UiModeEnum = z.enum(["chat_only", "simple_ui", "multi_page_ui"]);
export const DeploymentProviderEnum = z.enum([
  "local",
  "netlify",
  "cloudflare",
  "vercel",
]);
export const StackPresetEnum = z.enum(["mcp_apps_kit_react"]);
export const AuthTypeEnum = z.enum(["none", "api_key", "oauth", "session"]);
export const TemplateFamilyEnum = z.enum(["mcp-apps-kit-react"]);
export const BenchmarkSuiteEnum = z.enum(["smoke", "full"]);

export const DeploymentConfigSchema = z.object({
  provider: DeploymentProviderEnum,
  envNames: z.array(z.string().min(1)).max(20).default([]),
});

export const AuthConfigSchema = z.object({
  type: AuthTypeEnum,
  provider: z.string().min(1).optional(),
  notes: z.string().min(1).optional(),
});

export const ToolSpecSchema = z.object({
  name: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  inputSchema: z.string().min(1).default("prompt?: string"),
  interactive: z.boolean().default(true),
});

export const WidgetSpecSchema = z.object({
  summary: z.string().min(1),
  components: z.array(z.string().min(1)).min(1).max(10),
  routes: z.array(z.string().min(1)).min(1).max(5),
  bridgeFeatures: z.array(z.string().min(1)).max(10).default([]),
  charts: z.array(z.string().min(1)).max(10).default([]),
});

export const AppRequirementsSchema = z.object({
  appType: AppTypeEnum,
  targetUserAndSuccess: z.string().min(1),
  primaryFeatures: z.array(z.string().min(1)).min(1).max(7),
  dataIntegrations: z.array(z.string().min(1)).max(10).default([]),
  uiMode: UiModeEnum,
  deployment: DeploymentConfigSchema,
  appName: z.string().min(1),
  appDescription: z.string().min(1),
  targetUsers: z.string().min(1),
  successMetric: z.string().min(1),
  toolSpecs: z.array(ToolSpecSchema).min(1).max(7),
  widgetSpec: WidgetSpecSchema,
  auth: AuthConfigSchema,
  stackPreset: StackPresetEnum.default("mcp_apps_kit_react"),
  refinementBudget: z.number().int().min(1).max(8).default(8),
  refinements: z.array(z.string().min(1)).default([]),
  rawPrompt: z.string().min(1).optional(),
});

export const ToolPlanSchema = z.object({
  name: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  readOnlyHint: z.boolean(),
  openWorldHint: z.boolean(),
  destructiveHint: z.boolean(),
});

export const ValidationGateSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  blocking: z.boolean(),
});

export const ValidationPlanSchema = z.object({
  gates: z.array(ValidationGateSchema).min(1),
});

export const BenchmarkTaskSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});

export const BenchmarkPlanSchema = z.object({
  suite: BenchmarkSuiteEnum,
  tasks: z.array(BenchmarkTaskSchema).min(1),
});

export const ArtifactPathsSchema = z.object({
  projectDir: z.string().min(1),
  webDir: z.string().min(1),
  resultsDir: z.string().min(1),
  benchmarkReport: z.string().min(1),
});

export const BuildPlanSchema = z.object({
  appSlug: z.string().min(1),
  appType: AppTypeEnum,
  uiMode: UiModeEnum,
  tools: z.array(ToolPlanSchema).min(1),
  routes: z.array(z.string().min(1)).min(1),
  deploy: DeploymentProviderEnum,
  templateFamily: TemplateFamilyEnum,
  validationPlan: ValidationPlanSchema,
  benchmarkPlan: BenchmarkPlanSchema,
  artifactPaths: ArtifactPathsSchema,
});

export type AppRequirements = z.infer<typeof AppRequirementsSchema>;
export type DeploymentConfig = z.infer<typeof DeploymentConfigSchema>;
export type AuthConfig = z.infer<typeof AuthConfigSchema>;
export type ToolSpec = z.infer<typeof ToolSpecSchema>;
export type WidgetSpec = z.infer<typeof WidgetSpecSchema>;
export type ValidationGate = z.infer<typeof ValidationGateSchema>;
export type ValidationPlan = z.infer<typeof ValidationPlanSchema>;
export type BenchmarkTask = z.infer<typeof BenchmarkTaskSchema>;
export type BenchmarkPlan = z.infer<typeof BenchmarkPlanSchema>;
export type ArtifactPaths = z.infer<typeof ArtifactPathsSchema>;
export type BuildPlan = z.infer<typeof BuildPlanSchema>;
export type ToolPlan = z.infer<typeof ToolPlanSchema>;
