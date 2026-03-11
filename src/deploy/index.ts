import { deployCloudflare } from "./providers/cloudflare.js";
import { deployLocal } from "./providers/local.js";
import { deployNetlify } from "./providers/netlify.js";
import { deployVercel } from "./providers/vercel.js";

export type DeploymentProvider =
  | "local"
  | "netlify"
  | "cloudflare"
  | "vercel";

export type DeploymentResult = {
  provider: DeploymentProvider;
  url?: string;
  instructions?: string;
};

export type DeploymentOptions = {
  provider: DeploymentProvider;
  projectDir: string;
  projectName: string;
  envNames: string[];
};

export async function deployGeneratedApp(
  options: DeploymentOptions
): Promise<DeploymentResult> {
  switch (options.provider) {
    case "local":
      return deployLocal(options);
    case "netlify":
      return deployNetlify(options);
    case "cloudflare":
      return deployCloudflare(options);
    case "vercel":
    default:
      return deployVercel(options);
  }
}
