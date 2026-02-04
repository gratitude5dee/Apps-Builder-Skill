import {
  AppRequirementsSchema,
  type AppRequirements,
  type DeploymentConfig,
} from "./schema.js";
import { createBuildPlan, buildPlanSummary, slugify } from "./planner.js";

export type Stage =
  | "collecting"
  | "confirm"
  | "generating"
  | "deploying"
  | "done"
  | "error";

export type Question = {
  id: string;
  prompt: string;
  choices?: string[];
};

export type SkillState = {
  requirements: Partial<AppRequirements>;
  lastQuestionId?: string;
  logs: string[];
  stage: Stage;
  buildPlan?: ReturnType<typeof createBuildPlan>;
  cancelled?: boolean;
};

const sessions = new Map<string, SkillState>();

const QUESTIONS: Question[] = [
  {
    id: "appType",
    prompt:
      "What are we building? Choose from: tool, content/guide, workflow/automation, dashboard, chat-first assistant, or custom.",
    choices: [
      "tool",
      "content/guide",
      "workflow/automation",
      "dashboard",
      "chat-first assistant",
      "custom",
    ],
  },
  {
    id: "targetUserAndSuccess",
    prompt:
      "Who is this for and what does success look like? (1-2 sentences)",
  },
  {
    id: "primaryFeatures",
    prompt: "List primary features (up to 7).",
  },
  {
    id: "dataIntegrations",
    prompt:
      "Data & integrations? (APIs, DB, files, auth). Say 'none' if not needed.",
  },
  {
    id: "uiMode",
    prompt:
      "UI needs? Choose: chat-only, simple UI, or multi-page UI.",
    choices: ["chat-only", "simple UI", "multi-page UI"],
  },
  {
    id: "deploymentProvider",
    prompt: "Deployment choice: Netlify MCP, Cloudflare MCP, or Vercel MCP?",
    choices: ["Netlify", "Cloudflare", "Vercel"],
  },
  {
    id: "envNames",
    prompt:
      "Optional: env secret names (names only, comma-separated), or 'none'.",
  },
];

function defaultState(): SkillState {
  return {
    requirements: {},
    logs: [],
    stage: "collecting",
  };
}

export function getSessionId(meta?: Record<string, unknown>): string {
  const session = meta?.["openai/session"] as string | undefined;
  const subject = meta?.["openai/subject"] as string | undefined;
  return session || subject || "default";
}

function getState(sessionId: string): SkillState {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, defaultState());
  }
  return sessions.get(sessionId)!;
}

function resetState(sessionId: string): SkillState {
  const next = defaultState();
  sessions.set(sessionId, next);
  return next;
}

function normalize(text?: string) {
  return (text ?? "").trim();
}

function parseList(input: string): string[] {
  const items = input
    .split(/\n|,|;|\u2022|\*/)
    .map((item) => item.replace(/^[-*\u2022\s]+/, "").trim())
    .filter(Boolean);
  return items;
}

function parseAppType(text: string): AppRequirements["appType"] | null {
  const value = text.toLowerCase();
  if (value.includes("tool")) return "tool";
  if (value.includes("content") || value.includes("guide"))
    return "content_guide";
  if (value.includes("workflow") || value.includes("automation"))
    return "workflow_automation";
  if (value.includes("dashboard")) return "dashboard";
  if (value.includes("chat-first") || value.includes("chat first"))
    return "chat_first_assistant";
  if (value.includes("custom")) return "custom";
  return null;
}

function parseUiMode(text: string): AppRequirements["uiMode"] | null {
  const value = text.toLowerCase();
  if (value.includes("chat")) return "chat_only";
  if (value.includes("multi")) return "multi_page_ui";
  if (value.includes("simple")) return "simple_ui";
  return null;
}

function parseProvider(text: string): DeploymentConfig["provider"] | null {
  const value = text.toLowerCase();
  if (value.includes("netlify")) return "netlify";
  if (value.includes("cloudflare")) return "cloudflare";
  if (value.includes("vercel")) return "vercel";
  return null;
}

function parseEnvNames(text: string): string[] {
  if (!text) return [];
  if (text.toLowerCase().includes("none")) return [];
  return parseList(text).map((name) => name.toUpperCase());
}

function inferAppName(text: string): string | undefined {
  const match = text.match(/(?:called|named)\s+"?([a-zA-Z0-9 _-]{3,})"?/i);
  if (match?.[1]) {
    return match[1].trim();
  }
  return undefined;
}

function inferFromPrompt(state: SkillState, message: string) {
  const appType = parseAppType(message);
  if (appType && !state.requirements.appType) {
    state.requirements.appType = appType;
  }

  const uiMode = parseUiMode(message);
  if (uiMode && !state.requirements.uiMode) {
    state.requirements.uiMode = uiMode;
  }

  const provider = parseProvider(message);
  if (provider && !state.requirements.deployment?.provider) {
    state.requirements.deployment = {
      provider,
      envNames: state.requirements.deployment?.envNames ?? [],
    };
  }

  const appName = inferAppName(message);
  if (appName && !state.requirements.appName) {
    state.requirements.appName = appName;
  }

  const bullets = message
    .split("\n")
    .filter((line) => /^\s*[-*\u2022]/.test(line));
  if (bullets.length && !state.requirements.primaryFeatures) {
    const features = parseList(bullets.join("\n")).slice(0, 7);
    if (features.length) {
      state.requirements.primaryFeatures = features;
    }
  }
}

function applyAnswer(state: SkillState, questionId: string, answer: string) {
  switch (questionId) {
    case "appType": {
      const appType = parseAppType(answer);
      if (appType) state.requirements.appType = appType;
      break;
    }
    case "targetUserAndSuccess":
      state.requirements.targetUserAndSuccess = answer;
      break;
    case "primaryFeatures": {
      const features = parseList(answer).slice(0, 7);
      if (features.length) state.requirements.primaryFeatures = features;
      break;
    }
    case "dataIntegrations": {
      const integrations = parseList(answer);
      state.requirements.dataIntegrations =
        answer.toLowerCase().includes("none") || integrations.length === 0
          ? []
          : integrations;
      break;
    }
    case "uiMode": {
      const uiMode = parseUiMode(answer);
      if (uiMode) state.requirements.uiMode = uiMode;
      break;
    }
    case "deploymentProvider": {
      const provider = parseProvider(answer);
      if (provider) {
        state.requirements.deployment = {
          provider,
          envNames: state.requirements.deployment?.envNames ?? [],
        };
      }
      break;
    }
    case "envNames":
      if (!state.requirements.deployment) {
        state.requirements.deployment = {
          provider: "vercel",
          envNames: [],
        };
      }
      state.requirements.deployment.envNames = parseEnvNames(answer);
      break;
    default:
      break;
  }
}

function missingQuestion(state: SkillState): Question | null {
  const req = state.requirements;
  for (const question of QUESTIONS) {
    switch (question.id) {
      case "appType":
        if (!req.appType) return question;
        break;
      case "targetUserAndSuccess":
        if (!req.targetUserAndSuccess) return question;
        break;
      case "primaryFeatures":
        if (!req.primaryFeatures || req.primaryFeatures.length === 0)
          return question;
        break;
      case "dataIntegrations":
        if (!req.dataIntegrations) return question;
        break;
      case "uiMode":
        if (!req.uiMode) return question;
        break;
      case "deploymentProvider":
        if (!req.deployment?.provider) return question;
        break;
      case "envNames":
        if (!req.deployment?.envNames) return question;
        break;
      default:
        break;
    }
  }
  return null;
}

function handleCommand(state: SkillState, command: string) {
  const normalized = command.toLowerCase();
  if (normalized.includes("restart")) {
    state.requirements = {};
    state.logs = ["Restarted the build interview."];
    state.stage = "collecting";
    return;
  }
  if (normalized.includes("stop") || normalized.includes("cancel")) {
    state.cancelled = true;
    state.stage = "done";
    state.logs = ["Build cancelled. Say 'restart' to begin again."];
    return;
  }
  if (normalized.includes("change deployment") || normalized.includes("provider")) {
    const provider = parseProvider(command);
    if (provider) {
      state.requirements.deployment = {
        provider,
        envNames: state.requirements.deployment?.envNames ?? [],
      };
      state.logs.push(`Deployment provider changed to ${provider}.`);
    }
  }
}

function buildRequirementsPreview(state: SkillState): Partial<AppRequirements> {
  return {
    ...state.requirements,
    appName: state.requirements.appName,
    dataIntegrations: state.requirements.dataIntegrations ?? [],
  };
}

export function runInterview(input: { message?: string; command?: string }, meta?: Record<string, unknown>) {
  const sessionId = getSessionId(meta);
  const state = getState(sessionId);
  const message = normalize(input.message);
  const command = normalize(input.command);

  if (command) {
    handleCommand(state, command);
  } else if (message) {
    if (!state.requirements.rawPrompt) {
      state.requirements.rawPrompt = message;
    }
    if (state.lastQuestionId) {
      applyAnswer(state, state.lastQuestionId, message);
      state.lastQuestionId = undefined;
    }
    inferFromPrompt(state, message);
  }

  if (state.cancelled) {
    return {
      stage: "done" as const,
      logs: state.logs,
      requirements: buildRequirementsPreview(state),
      buildPlan: null,
      deployment: null,
      question: null,
    };
  }

  const nextQuestion = missingQuestion(state);
  if (nextQuestion) {
    state.stage = "collecting";
    state.lastQuestionId = nextQuestion.id;
    return {
      stage: "collecting" as const,
      logs: state.logs,
      requirements: buildRequirementsPreview(state),
      buildPlan: null,
      deployment: null,
      question: nextQuestion,
    };
  }

  const parsed = AppRequirementsSchema.safeParse({
    ...state.requirements,
    dataIntegrations: state.requirements.dataIntegrations ?? [],
    deployment: state.requirements.deployment ?? {
      provider: "vercel",
      envNames: [],
    },
  });

  if (!parsed.success) {
    state.stage = "collecting";
    state.logs.push("Some fields need attention. Let's keep going.");
    return {
      stage: "collecting" as const,
      logs: state.logs,
      requirements: buildRequirementsPreview(state),
      buildPlan: null,
      deployment: null,
      question: missingQuestion(state),
    };
  }

  const requirements = parsed.data;
  if (!requirements.appName) {
    requirements.appName = slugify(requirements.targetUserAndSuccess);
  }

  state.buildPlan = createBuildPlan(requirements);
  state.requirements = requirements;
  state.stage = "confirm";

  return {
    stage: "confirm" as const,
    logs: state.logs,
    requirements,
    buildPlan: buildPlanSummary(state.buildPlan, requirements),
    deployment: { provider: requirements.deployment.provider },
    question: null,
  };
}

export function getConfirmedRequirements(meta?: Record<string, unknown>) {
  const sessionId = getSessionId(meta);
  const state = getState(sessionId);
  const parsed = AppRequirementsSchema.safeParse({
    ...state.requirements,
    dataIntegrations: state.requirements.dataIntegrations ?? [],
    deployment: state.requirements.deployment ?? {
      provider: "vercel",
      envNames: [],
    },
  });

  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}

export function updateState(meta: Record<string, unknown> | undefined, updates: Partial<SkillState>) {
  const sessionId = getSessionId(meta);
  const state = getState(sessionId);
  Object.assign(state, updates);
  return state;
}

export function resetInterview(meta?: Record<string, unknown>) {
  const sessionId = getSessionId(meta);
  return resetState(sessionId);
}
