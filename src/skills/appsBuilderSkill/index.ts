import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { runInterview, getConfirmedRequirements } from "./conversation.js";
import { createBuildPlan, buildPlanSummary } from "./planner.js";
import { generateApp } from "./generator.js";
import { deployGeneratedApp } from "../../deploy/index.js";

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
        "Collects app requirements, asks the next question, and summarizes a build plan.",
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
                ? result.question?.prompt ?? "Let's continue."
                : "Build plan ready."
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
        "Generates the app scaffold, validates it, and deploys via the chosen provider.",
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
        const result = runInterview({ command: "restart" }, _meta);
        return {
          structuredContent: result,
          content: [
            {
              type: "text",
              text: "Restarted the interview.",
            },
          ],
        };
      }

      if (!confirm) {
        const requirements = getConfirmedRequirements(_meta);
        if (!requirements) {
          const interview = runInterview({ message: "" }, _meta);
          return {
            structuredContent: interview,
            content: [
              {
                type: "text",
                text: "We still need a few details before generating.",
              },
            ],
          };
        }

        const plan = createBuildPlan(requirements);
        return {
          structuredContent: {
            stage: "confirm",
            requirements,
            buildPlan: buildPlanSummary(plan, requirements),
            deployment: { provider: requirements.deployment.provider },
            question: null,
            logs: ["Awaiting confirmation to generate and deploy."],
          },
          content: [
            {
              type: "text",
              text: "Ready to generate and deploy. Please confirm.",
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
              text: "We still need a few details before generating.",
            },
          ],
        };
      }

      const plan = createBuildPlan(requirements);
      const logs: string[] = [];

      try {
        logs.push("Generating app scaffold...");
        const generated = await generateApp(requirements, plan);
        logs.push(`Generated ${generated.filesWritten} files.`);

        logs.push("Validating generated app...");

        logs.push("Starting deployment...");
        const deployment = await deployGeneratedApp({
          provider: requirements.deployment.provider,
          projectDir: generated.projectDir,
          projectName: requirements.appName ?? plan.appSlug,
          envNames: requirements.deployment.envNames,
        });

        logs.push("Deployment step complete.");

        const devModeInstructions = deployment.url
          ? `Try it now in ChatGPT Developer Mode: add ${deployment.url}/mcp as a connector, then start a new chat and enable the connector from the More menu.`
          : "Once deployed, add https://<your-domain>/mcp as a connector in ChatGPT Developer Mode.";

        deployment.instructions = deployment.instructions
          ? `${deployment.instructions}\\n\\n${devModeInstructions}`
          : devModeInstructions;

        return {
          structuredContent: {
            stage: "done",
            requirements,
            buildPlan: buildPlanSummary(plan, requirements),
            deployment,
            question: null,
            logs,
          },
          content: [
            {
              type: "text",
              text:
                deployment.url
                  ? `Deployed successfully: ${deployment.url}`
                  : "Deployment complete. Follow the instructions to finish.",
            },
          ],
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error occurred";
        logs.push(`Error: ${message}`);
        return {
          structuredContent: {
            stage: "error",
            requirements,
            buildPlan: buildPlanSummary(plan, requirements),
            deployment: { provider: requirements.deployment.provider },
            question: null,
            logs,
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
