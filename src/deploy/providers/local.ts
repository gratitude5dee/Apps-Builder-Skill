import type { DeploymentOptions, DeploymentResult } from "../index.js";

export async function deployLocal(
  options: DeploymentOptions
): Promise<DeploymentResult> {
  return {
    provider: "local",
    url: "http://localhost:8787",
    instructions:
      "Local preview selected.\n" +
      `1) cd ${options.projectDir}\n` +
      "2) pnpm install\n" +
      "3) pnpm --dir web install\n" +
      "4) pnpm --dir web build\n" +
      "5) pnpm dev:server\n" +
      "6) Expose http://localhost:8787/mcp with cloudflared or ngrok.\n" +
      "   cloudflared example: cloudflared tunnel --url http://localhost:8787\n" +
      "   ngrok example: ngrok http http://localhost:8787\n" +
      "7) Add the HTTPS /mcp URL in ChatGPT Developer Mode.",
  };
}
