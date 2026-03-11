import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { runInterview, getConfirmedRequirements } from "./conversation.js";
import { createBuildPlan, buildPlanSummary } from "./planner.js";
import { generateApp } from "./generator.js";
import { deployGeneratedApp } from "../../deploy/index.js";

function buildPromptInstructions(url?: string) {
  if (!url) {
    return "Deployment complete. Follow the returned instructions to expose /mcp over HTTPS and add it in ChatGPT Developer Mode.";
  }
  return `Try it in ChatGPT Developer Mode by adding ${url}/mcp as a connector, then start a new chat and enable the connector from the More menu.`;
}

export function registerAppsBuilderSkill(
  server: McpServer,
  meta: Record<string, unknown>
) {
  registerAppTool(
    server,
    "apps_builder_interview",
    {
      title: "Apps Builder interview",
      description:
        "Collect app requirements adaptively, ask the next question, and summarize a v2 build plan.",
      inputSchema: {
        message: z.string().optional(),
        command: z.string().optional(),
      },
      _meta: {
        ...meta,
        ui: { resourceUri: "ui://widget/apps-builder.html" },
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
        destructiveHint: false,
      },
    },
    async ({ message, command }, { _meta }) => {
      const result = runInterview({ message, command }, _meta);

      return {
        structuredContent: result,
        content: [
          {
            type: "text",
            text:
              result.stage === "collecting"
                ? result.question?.prompt ?? "Continue the spec."
                : "Build plan ready.",
          },
        ],
        _meta: {},
      };
    }
  );

  registerAppTool(
    server,
    "apps_builder_generate",
    {
      title: "Generate and deploy app",
      description:
        "Generate the app scaffold, validate it, run the smoke benchmark, and deploy once the blocking gates pass.",
      inputSchema: {
        confirm: z.boolean().optional(),
        command: z.string().optional(),
      },
      _meta: {
        ...meta,
        ui: { resourceUri: "ui://widget/apps-builder.html" },
      },
      annotations: {
        readOnlyHint: false,
        openWorldHint: true,
        destructiveHint: false,
      },
    },
    async ({ confirm, command }, { _meta }) => {
      if (command?.toLowerCase().includes("restart")) {
        const interview = runInterview({ command: "restart" }, _meta);
        return {
          structuredContent: interview,
          content: [
            {
              type: "text",
              text: "Restarted the interview.",
            },
          ],
        };
      }

      const requirements = getConfirmedRequirements(_meta);
      if (!requirements) {
        const interview = runInterview({ message: "" }, _meta);
        return {
          structuredContent: interview,
          content: [
            {
              type: "text",
              text: "A few v2 spec details are still missing before generation can start.",
            },
          ],
        };
      }

      const plan = createBuildPlan(requirements);

      if (!confirm) {
        return {
          structuredContent: {
            stage: "confirm",
            question: null,
            requirements,
            buildPlan: buildPlanSummary(plan, requirements),
            deployment: { provider: requirements.deployment.provider },
            logs: ["Awaiting confirmation to run the generation, validation, and deployment loop."],
            completeness: {
              answered: 7,
              total: 7,
              percent: 100,
              missing: [],
              ready: true,
            },
            spec: {
              appName: requirements.appName,
              appDescription: requirements.appDescription,
              targetUsers: requirements.targetUsers,
              successMetric: requirements.successMetric,
              stackPreset: requirements.stackPreset,
            },
            validation: null,
            benchmark: null,
            artifacts: null,
            iterations: [],
          },
          content: [
            {
              type: "text",
              text: "Ready to generate. Confirm to start the refinement loop.",
            },
          ],
        };
      }

      const logs: string[] = ["Starting SupremeAppsBuilder v2 generation loop."];

      try {
        const generated = await generateApp(requirements, plan);
        logs.push(`Generated ${generated.filesWritten} files in ${generated.projectDir}.`);
        logs.push(generated.validation.summary);
        logs.push(
          `Smoke benchmark: ${generated.benchmark.passRate}% (${generated.benchmark.score}/${generated.benchmark.maxScore}).`
        );

        const deployment = await deployGeneratedApp({
          provider: requirements.deployment.provider,
          projectDir: generated.projectDir,
          projectName: requirements.appName,
          envNames: requirements.deployment.envNames,
        });

        deployment.instructions = deployment.instructions
          ? `${deployment.instructions}\n\n${buildPromptInstructions(deployment.url)}`
          : buildPromptInstructions(deployment.url);

        return {
          structuredContent: {
            stage: "done",
            question: null,
            requirements,
            buildPlan: buildPlanSummary(generated.plan, requirements),
            deployment,
            logs,
            completeness: {
              answered: 7,
              total: 7,
              percent: 100,
              missing: [],
              ready: true,
            },
            spec: {
              appName: requirements.appName,
              appDescription: requirements.appDescription,
              targetUsers: requirements.targetUsers,
              successMetric: requirements.successMetric,
              stackPreset: requirements.stackPreset,
            },
            validation: generated.validation,
            benchmark: generated.benchmark,
            artifacts: generated.artifacts,
            iterations: generated.iterations,
          },
          content: [
            {
              type: "text",
              text: deployment.url
                ? `Generation complete: ${deployment.url}`
                : "Generation complete. Follow the deployment instructions to finish.",
            },
          ],
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown generation error";
        logs.push(`Error: ${message}`);
        return {
          structuredContent: {
            stage: "error",
            question: null,
            requirements,
            buildPlan: buildPlanSummary(plan, requirements),
            deployment: { provider: requirements.deployment.provider },
            logs,
            completeness: {
              answered: 7,
              total: 7,
              percent: 100,
              missing: [],
              ready: true,
            },
            spec: {
              appName: requirements.appName,
              appDescription: requirements.appDescription,
              targetUsers: requirements.targetUsers,
              successMetric: requirements.successMetric,
              stackPreset: requirements.stackPreset,
            },
            validation: null,
            benchmark: null,
            artifacts: null,
            iterations: [],
          },
          content: [
            {
              type: "text",
              text: message,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
