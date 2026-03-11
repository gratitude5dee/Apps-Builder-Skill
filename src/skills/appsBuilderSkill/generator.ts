import fs from "node:fs";

import type { AppRequirements, BuildPlan } from "./schema.js";
import { AppRequirementsSchema } from "./schema.js";
import { createBuildPlan } from "./planner.js";
import { renderProjectFiles } from "../../builder/render.js";
import { writeFiles } from "../../builder/filesystem.js";
import {
  validateGeneratedApp,
  type ValidationReport,
} from "../../builder/validate.js";
import { runBenchmarkSuite, type BenchmarkReport } from "../../mcp/benchmark.js";

export type GenerationIteration = {
  index: number;
  appSlug: string;
  projectDir: string;
  status: "passed" | "failed";
  notes: string[];
  validation: ValidationReport;
  benchmark: BenchmarkReport;
};

export type GenerateResult = {
  projectDir: string;
  filesWritten: number;
  plan: BuildPlan;
  validation: ValidationReport;
  benchmark: BenchmarkReport;
  iterations: GenerationIteration[];
  artifacts: BuildPlan["artifactPaths"];
};

function directoryHasFiles(dir: string) {
  return fs.existsSync(dir) && fs.readdirSync(dir).length > 0;
}

function nextAppName(baseName: string, iteration: number) {
  return `${baseName} v${iteration + 2}`;
}

function reviewAndImprove(
  requirements: AppRequirements,
  validation: ValidationReport,
  benchmark: BenchmarkReport,
  iteration: number
) {
  const refinements: string[] = [];

  if (validation.gates.some((gate) => gate.id === "widget-metadata" && !gate.passed)) {
    refinements.push("Reinforced widget metadata and cache-busting defaults.");
  }
  if (validation.gates.some((gate) => gate.id === "tests" && !gate.passed)) {
    refinements.push("Added generated server test coverage.");
  }
  if (!benchmark.ok) {
    refinements.push("Raised widget quality to satisfy smoke benchmark tasks.");
  }
  if (refinements.length === 0) {
    refinements.push(
      `Retry ${iteration + 2} reserved for deterministic re-render if needed.`
    );
  }

  return AppRequirementsSchema.parse({
    ...requirements,
    refinements: [...requirements.refinements, ...refinements],
  });
}

export async function generateApp(
  requirements: AppRequirements,
  _plan: BuildPlan
): Promise<GenerateResult> {
  let working = AppRequirementsSchema.parse(requirements);
  const iterations: GenerationIteration[] = [];
  let filesWritten = 0;

  for (let index = 0; index < working.refinementBudget; index += 1) {
    if (index > 0) {
      working = AppRequirementsSchema.parse({
        ...working,
        appName: nextAppName(requirements.appName, index - 1),
      });
    }

    let plan = createBuildPlan(working);
    const notes: string[] = [];

    if (directoryHasFiles(plan.artifactPaths.projectDir)) {
      working = AppRequirementsSchema.parse({
        ...working,
        appName: nextAppName(working.appName, index),
        refinements: [
          ...working.refinements,
          `Adjusted slug because ${plan.artifactPaths.projectDir} already existed.`,
        ],
      });
      plan = createBuildPlan(working);
      notes.push("Adjusted slug to avoid overwriting an existing generated app.");
    }

    const files = renderProjectFiles({ requirements: working, plan });
    await writeFiles(plan.artifactPaths.projectDir, files, { overwrite: false });
    filesWritten = files.length;

    const validation = await validateGeneratedApp(plan.artifactPaths.projectDir, plan);
    const benchmark = await runBenchmarkSuite({
      projectDir: plan.artifactPaths.projectDir,
      benchmarkPlan: plan.benchmarkPlan,
      validation,
      outputFile: plan.artifactPaths.benchmarkReport,
    });

    const status = validation.ok && benchmark.ok ? "passed" : "failed";
    iterations.push({
      index: index + 1,
      appSlug: plan.appSlug,
      projectDir: plan.artifactPaths.projectDir,
      status,
      notes,
      validation,
      benchmark,
    });

    if (status === "passed") {
      return {
        projectDir: plan.artifactPaths.projectDir,
        filesWritten,
        plan,
        validation,
        benchmark,
        iterations,
        artifacts: plan.artifactPaths,
      };
    }

    working = reviewAndImprove(working, validation, benchmark, index);
  }

  const lastIteration = iterations[iterations.length - 1];
  throw new Error(
    lastIteration
      ? `Generation stopped after ${iterations.length} iterations. Failing gates: ${lastIteration.validation.gates
          .filter((gate) => !gate.passed)
          .map((gate) => gate.id)
          .join(", ")}.`
      : "Generation failed before the first iteration completed."
  );
}
