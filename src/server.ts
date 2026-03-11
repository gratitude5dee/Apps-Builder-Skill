import fs from "node:fs";
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
import { registerAppsBuilderSkill } from "./skills/appsBuilderSkill/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const WEB_DIST = path.resolve(ROOT_DIR, "web", "dist");

function readWidgetHtml(): string {
  const manifestCandidates = [
    path.join(WEB_DIST, "manifest.json"),
    path.join(WEB_DIST, ".vite", "manifest.json"),
  ];
  const manifestPath = manifestCandidates.find((candidate) =>
    fs.existsSync(candidate)
  );
  if (!manifestPath) {
    throw new Error(
      `Missing web build manifest at ${manifestCandidates.join(" or ")}. Run "pnpm --dir web build" first.`
    );
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Record<
    string,
    { file: string; css?: string[] }
  >;

  const entry = manifest["index.html"] ?? manifest["src/main.tsx"];
  if (!entry?.file) {
    throw new Error(
      `Unable to locate web entry in manifest.json. Expected keys: index.html or src/main.tsx.`
    );
  }

  const jsPath = path.join(WEB_DIST, entry.file);
  const js = fs.readFileSync(jsPath, "utf8");
  const css = (entry.css ?? [])
    .map((cssFile) => fs.readFileSync(path.join(WEB_DIST, cssFile), "utf8"))
    .join("\n");

  return [
    '<div id="apps-builder-root"></div>',
    css ? `<style>${css}</style>` : "",
    `<script type="module">${js}</script>`,
  ]
    .filter(Boolean)
    .join("\n");
}

function toolDescriptorMeta() {
  return {
    "openai/outputTemplate": appConfig.widget.resourceUri,
    "openai/toolInvocation/invoking": "Preparing Apps Builder",
    "openai/toolInvocation/invoked": "Apps Builder ready",
  } as const;
}

export function getServer(): McpServer {
  const server = new McpServer({
    name: "apps-builder",
    version: appConfig.version,
  });

  const widgetHtml = readWidgetHtml();

  registerAppResource(
    server,
    "apps-builder-ui",
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
            "openai/widgetDescription":
              "Interactive build plan view for the Apps Builder skill.",
          },
        },
      ],
    })
  );

  registerAppsBuilderSkill(server, toolDescriptorMeta());

  // Legacy health tool (hidden) so inspector can ping.
  registerAppTool(
    server,
    "apps_builder_ping",
    {
      title: "Ping Apps Builder",
      description: "Returns a simple heartbeat response.",
      inputSchema: { message: z.string().optional() },
      _meta: { ui: { resourceUri: appConfig.widget.resourceUri } },
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
        destructiveHint: false,
      },
    },
    async ({ message }) => ({
      structuredContent: {
        stage: "done",
        logs: ["Apps Builder is online."],
        deployment: { provider: "local" },
        requirements: null,
        buildPlan: null,
        question: null,
      },
      content: [
        {
          type: "text",
          text: message ? `Ping: ${message}` : "Apps Builder is online.",
        },
      ],
      _meta: {},
    })
  );

  return server;
}
