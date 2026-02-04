import { describe, it, expect } from "vitest";
import { AppRequirementsSchema } from "./schema.js";

const base = {
  appType: "tool",
  targetUserAndSuccess: "Teams want a simple helper.",
  primaryFeatures: ["Feature A"],
  dataIntegrations: [],
  uiMode: "simple_ui",
  deployment: { provider: "vercel", envNames: [] },
};

describe("AppRequirementsSchema", () => {
  it("rejects more than 7 features", () => {
    const invalid = {
      ...base,
      primaryFeatures: [
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
      ],
    };
    const result = AppRequirementsSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
