export function renderServerTest() {
  return `import { describe, expect, it } from "vitest";

import { appConfig } from "./app.config.js";

describe("generated server scaffold", () => {
  it("uses a versioned widget resource URI", () => {
    expect(appConfig.widget.resourceUri).toContain("widget-v1");
  });

  it("exposes local preview hints", () => {
    expect(appConfig.localPreviewUrl).toContain("localhost");
    expect(appConfig.tunnelHints.length).toBeGreaterThan(0);
  });
});
`;
}
