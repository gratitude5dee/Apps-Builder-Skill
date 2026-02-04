import type { DeploymentProviderEnum } from "../skills/appsBuilderSkill/schema.js";
import { deployNetlify } from "./providers/netlify.js";
import { deployCloudflare } from "./providers/cloudflare.js";
import { deployVercel } from "./providers/vercel.js";

export type DeploymentResult = {
  provider: DeploymentProviderEnum;
  url?: string;
  instructions?: string;
};

export type DeploymentOptions = {
  provider: DeploymentProviderEnum;
  projectDir: string;
  projectName: string;
  envNames: string[];
};

export async function deployGeneratedApp(
  options: DeploymentOptions
): Promise<DeploymentResult> {
  switch (options.provider) {
    case "netlify":
      return deployNetlify(options);
    case "cloudflare":
      return deployCloudflare(options);
    case "vercel":
    default:
      return deployVercel(options);
  }
}
