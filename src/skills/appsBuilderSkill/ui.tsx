export type BuilderViewState = {
  stage: string;
  question?: { id: string; prompt: string; choices?: string[] } | null;
  logs?: string[];
  completeness?: { percent: number; ready: boolean } | null;
  validation?: { summary: string } | null;
  benchmark?: { passRate: number } | null;
};

export function normalizeStage(stage?: string) {
  return stage ?? "collecting";
}
