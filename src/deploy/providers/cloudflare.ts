import type { DeploymentOptions, DeploymentResult } from "../index.js";

async function callMcpTool(url: string, name: string, args: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: { name, arguments: args },
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message ?? "MCP tool call failed");
  }
  return data.result ?? data;
}

export async function deployCloudflare(
  options: DeploymentOptions
): Promise<DeploymentResult> {
  const url = process.env.CLOUDFLARE_MCP_URL;
  const createTool =
    process.env.CLOUDFLARE_MCP_TOOL_CREATE ?? "cloudflare_create_project";
  const envTool =
    process.env.CLOUDFLARE_MCP_TOOL_SET_ENV ?? "cloudflare_set_env";
  const deployTool =
    process.env.CLOUDFLARE_MCP_TOOL_DEPLOY ?? "cloudflare_deploy";

  if (url) {
    try {
      await callMcpTool(url, createTool, {
        name: options.projectName,
        path: options.projectDir,
      });

      if (options.envNames.length) {
        await callMcpTool(url, envTool, {
          name: options.projectName,
          envNames: options.envNames,
        });
      }

      const deployResult = await callMcpTool(url, deployTool, {
        name: options.projectName,
        path: options.projectDir,
      });

      const deploymentUrl = deployResult?.structuredContent?.url;

      return {
        provider: "cloudflare",
        url: deploymentUrl,
        instructions: deploymentUrl
          ? undefined
          : "Deployment triggered via Cloudflare MCP. Check Cloudflare Pages for the URL.",
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Cloudflare MCP deployment failed";
      return {
        provider: "cloudflare",
        instructions: `Cloudflare MCP failed: ${message}. Use the CLI fallback below.`,
      };
    }
  }

  return {
    provider: "cloudflare",
    instructions:
      "Cloudflare MCP not configured. CLI fallback:\n" +
      "1) Install Wrangler: npm i -g wrangler\n" +
      `2) Run: pnpm --dir ${options.projectDir}/web build\n` +
      `3) Run: wrangler pages deploy ${options.projectDir}/web/dist --project-name ${options.projectName}\n` +
      "4) Set env vars in Cloudflare Pages using the provided secret names.",
  };
}
