import type { BuildPlan } from "../../../skills/appsBuilderSkill/schema.js";

export function renderServer(plan: BuildPlan) {
  const toolDefinitions = plan.tools
    .map(
      (tool) => `  {
    name: ${JSON.stringify(tool.name)},
    title: ${JSON.stringify(tool.title)},
    description: ${JSON.stringify(tool.description)},
    readOnlyHint: ${tool.readOnlyHint},
    openWorldHint: ${tool.openWorldHint},
    destructiveHint: ${tool.destructiveHint},
  }`
    )
    .join(",\n");

  return `import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";

import { appConfig } from "./app.config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const WEB_DIST = path.resolve(ROOT_DIR, "web", "dist");

const TOOL_DEFINITIONS = [
${toolDefinitions}
];

function readWidgetHtml(): string {
  const manifestPath = path.join(WEB_DIST, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      "Missing web build manifest at " +
        manifestPath +
        '. Run "pnpm --dir web build" first.'
    );
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const entry = manifest["index.html"] ?? manifest["src/main.tsx"];
  if (!entry?.file) {
    throw new Error("Unable to locate web entry in manifest.json");
  }

  const jsPath = path.join(WEB_DIST, entry.file);
  const js = fs.readFileSync(jsPath, "utf8");
  const css = (entry.css ?? [])
    .map((cssFile: string) =>
      fs.readFileSync(path.join(WEB_DIST, cssFile), "utf8")
    )
    .join("\n");

  return [
    '<div id="app-root"></div>',
    css ? "<style>" + css + "</style>" : "",
    '<script type="module">' + js + "</script>",
  ]
    .filter(Boolean)
    .join("\n");
}

export function getServer(): McpServer {
  const server = new McpServer({
    name: appConfig.name,
    version: appConfig.version,
  });

  const widgetHtml = readWidgetHtml();

  registerAppResource(
    server,
    "app-widget",
    appConfig.widget.resourceUri,
    {},
    async () => ({
      contents: [
        {
          uri: appConfig.widget.resourceUri,
          mimeType: RESOURCE_MIME_TYPE,
          text: widgetHtml,
          _meta: {
            ui: {
              domain: appConfig.widget.domain,
              prefersBorder: appConfig.widget.prefersBorder,
              csp: appConfig.widget.csp,
            },
          },
        },
      ],
    })
  );

  const baseInputSchema = { prompt: z.string().optional() };

  TOOL_DEFINITIONS.forEach((tool) => {
    registerAppTool(
      server,
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: baseInputSchema,
        _meta: {
          ui: { resourceUri: appConfig.widget.resourceUri },
          "openai/outputTemplate": appConfig.widget.resourceUri,
        },
        annotations: {
          readOnlyHint: tool.readOnlyHint,
          openWorldHint: tool.openWorldHint,
          destructiveHint: tool.destructiveHint,
        },
      },
      async ({ prompt }) => {
        return {
          structuredContent: {
            appName: appConfig.name,
            tool: tool.name,
            prompt: prompt ?? "",
            message: "Ran " + tool.name,
          },
          content: [
            {
              type: "text",
              text: "Executed " + tool.title + ".",
            },
          ],
        };
      }
    );
  });

  return server;
}
`;
}
