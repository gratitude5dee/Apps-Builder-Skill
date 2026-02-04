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

export async function deployNetlify(
  options: DeploymentOptions
): Promise<DeploymentResult> {
  const url = process.env.NETLIFY_MCP_URL;
  const createTool = process.env.NETLIFY_MCP_TOOL_CREATE ?? "netlify_create_site";
  const envTool = process.env.NETLIFY_MCP_TOOL_SET_ENV ?? "netlify_set_env";
  const deployTool = process.env.NETLIFY_MCP_TOOL_DEPLOY ?? "netlify_deploy";

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
        provider: "netlify",
        url: deploymentUrl,
        instructions: deploymentUrl
          ? undefined
          : "Deployment triggered via Netlify MCP. Check your Netlify dashboard for the live URL.",
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Netlify MCP deployment failed";
      return {
        provider: "netlify",
        instructions: `Netlify MCP failed: ${message}. Use the CLI fallback below.`,
      };
    }
  }

  return {
    provider: "netlify",
    instructions:
      "Netlify MCP not configured. CLI fallback:\n" +
      "1) Install Netlify CLI: npm i -g netlify-cli\n" +
      `2) Run: pnpm --dir ${options.projectDir}/web build\n` +
      `3) Run: netlify deploy --prod --dir ${options.projectDir}/web/dist\n` +
      "4) Set env vars in Netlify UI using the provided secret names.",
  };
}
