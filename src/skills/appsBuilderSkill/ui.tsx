export type BuilderViewState = {
  stage: string;
  question?: { id: string; prompt: string; choices?: string[] } | null;
  logs?: string[];
};

export function normalizeStage(stage?: string) {
  return stage ?? "collecting";
}
