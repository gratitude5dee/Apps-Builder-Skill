import fs from "node:fs/promises";
import path from "node:path";

export type SmokeCheck = {
  id: string;
  label: string;
  passed: boolean;
  details: string;
};

async function readIfExists(filePath: string) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

export async function detectManifestCandidate(projectDir: string) {
  const candidates = [
    path.join(projectDir, "web", "dist", "manifest.json"),
    path.join(projectDir, "web", "dist", ".vite", "manifest.json"),
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // continue
    }
  }

  return null;
}

export async function runGeneratedAppStaticSmoke(projectDir: string) {
  const serverSource = await readIfExists(path.join(projectDir, "src", "server.ts"));
  const widgetSource = await readIfExists(
    path.join(projectDir, "web", "src", "App.tsx")
  );
  const readme = await readIfExists(path.join(projectDir, "README.md"));
  const appConfig = await readIfExists(
    path.join(projectDir, "src", "app.config.ts")
  );
  const manifestCandidate = await detectManifestCandidate(projectDir);

  const checks: SmokeCheck[] = [
    {
      id: "server-registration",
      label: "Server registers widget and tools",
      passed:
        serverSource.includes("registerAppResource") &&
        serverSource.includes("registerAppTool"),
      details: "Expected registerAppResource and registerAppTool in generated server.",
    },
    {
      id: "output-template",
      label: "Tool output template metadata",
      passed:
        serverSource.includes('"openai/outputTemplate"') &&
        serverSource.includes("resourceUri"),
      details: "Expected _meta.openai/outputTemplate to point at the widget resource.",
    },
    {
      id: "bridge-events",
      label: "Widget bridge events",
      passed:
        widgetSource.includes("ui/initialize") &&
        widgetSource.includes("ui/notifications/initialized") &&
        widgetSource.includes("ui/notifications/tool-result"),
      details: "Expected the widget to initialize and listen for tool results.",
    },
    {
      id: "cache-busting",
      label: "Cache-busted widget resource",
      passed:
        appConfig.includes("resourceUri") &&
        /ui:\/\/widget\/.+(?:v|widget-version|-v)/.test(appConfig),
      details: "Expected a versioned widget resource URI in app config.",
    },
    {
      id: "local-preview",
      label: "Local preview guidance",
      passed:
        readme.includes("Developer Mode") &&
        (readme.includes("cloudflared") || readme.includes("ngrok")),
      details: "Expected local HTTPS tunnel instructions in the generated README.",
    },
    {
      id: "manifest-strategy",
      label: "Manifest resolution strategy",
      passed:
        serverSource.includes(".vite") ||
        serverSource.includes("manifestCandidates") ||
        Boolean(manifestCandidate),
      details: "Expected generated server code to support Vite manifest lookup.",
    },
  ];

  return {
    ok: checks.every((check) => check.passed),
    checks,
  };
}
