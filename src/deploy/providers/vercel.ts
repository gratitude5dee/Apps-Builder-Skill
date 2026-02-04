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

export async function deployVercel(
  options: DeploymentOptions
): Promise<DeploymentResult> {
  const url = process.env.VERCEL_MCP_URL;
  const createTool = process.env.VERCEL_MCP_TOOL_CREATE ?? "vercel_create_project";
  const envTool = process.env.VERCEL_MCP_TOOL_SET_ENV ?? "vercel_set_env";
  const deployTool = process.env.VERCEL_MCP_TOOL_DEPLOY ?? "vercel_deploy";

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
        provider: "vercel",
        url: deploymentUrl,
        instructions: deploymentUrl
          ? undefined
          : "Deployment triggered via Vercel MCP. Check Vercel for the live URL.",
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Vercel MCP deployment failed";
      return {
        provider: "vercel",
        instructions: `Vercel MCP failed: ${message}. Use the CLI fallback below.`,
      };
    }
  }

  return {
    provider: "vercel",
    instructions:
      "Vercel MCP not configured. CLI fallback:\n" +
      "1) Install Vercel CLI: npm i -g vercel\n" +
      `2) Run: pnpm --dir ${options.projectDir}/web build\n` +
      `3) Run: vercel ${options.projectDir} --prod\n` +
      "4) Set env vars in Vercel using the provided secret names.",
  };
}
