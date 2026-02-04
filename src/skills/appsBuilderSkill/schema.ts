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

export const DeploymentProviderEnum = z.enum(["netlify", "cloudflare", "vercel"]);

export const DeploymentConfigSchema = z.object({
  provider: DeploymentProviderEnum,
  envNames: z.array(z.string().min(1)).max(20).default([]),
});

export const AppRequirementsSchema = z.object({
  appType: AppTypeEnum,
  targetUserAndSuccess: z.string().min(1),
  primaryFeatures: z.array(z.string().min(1)).min(1).max(7),
  dataIntegrations: z.array(z.string().min(1)).max(10),
  uiMode: UiModeEnum,
  deployment: DeploymentConfigSchema,
  appName: z.string().min(1).optional(),
  rawPrompt: z.string().optional(),
});

export const ToolPlanSchema = z.object({
  name: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  readOnlyHint: z.boolean(),
  openWorldHint: z.boolean(),
  destructiveHint: z.boolean(),
});

export const BuildPlanSchema = z.object({
  appSlug: z.string().min(1),
  appType: AppTypeEnum,
  uiMode: UiModeEnum,
  tools: z.array(ToolPlanSchema).min(1),
  routes: z.array(z.string()),
  deploy: DeploymentProviderEnum,
});

export type AppRequirements = z.infer<typeof AppRequirementsSchema>;
export type DeploymentConfig = z.infer<typeof DeploymentConfigSchema>;
export type BuildPlan = z.infer<typeof BuildPlanSchema>;
export type ToolPlan = z.infer<typeof ToolPlanSchema>;
